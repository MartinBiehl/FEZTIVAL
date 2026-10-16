import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { query, queryOne, transaction } from './db.js';
import { createSession } from './auth.js';
import { destinationFor, findOwnArtist } from './account.js';

/*
 * "Continuar com Google": OAuth 2.0 / OpenID Connect com code + PKCE, sem
 * biblioteca. Fluxo:
 *
 *   /auth/google           sorteia state, nonce e verificador PKCE, guarda no
 *                          cookie fz_google_oauth e manda a pessoa ao Google
 *   /auth/google/callback  confere o state, troca o code pelo ID token no
 *                          servidor e chama finishGoogleLogin
 *
 * O ID token chega direto do Google, por HTTPS, na resposta do token endpoint
 * (nao passa pelo navegador). Pela especificacao do OpenID Connect (3.1.3.7),
 * nesse caso a origem TLS dispensa conferir a assinatura; conferimos emissor,
 * audiencia, validade, nonce e e-mail verificado.
 *
 * Sem GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET o botao nem aparece.
 */

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

export const OAUTH_COOKIE = 'fz_google_oauth';
export const SIGNUP_COOKIE = 'fz_google_signup';
export const OAUTH_MAX_AGE = 10 * 60;
export const SIGNUP_MAX_AGE = 30 * 60;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    // Lax: a volta do Google e uma navegacao de outro site, e Strict a barraria.
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/* Mesmo endereco na ida e na troca do code; precisa estar cadastrado no Google. */
export function redirectUri(origin) {
  return new URL('/auth/google/callback', origin).toString();
}

/*
 * Monta a ida ao Google. Devolve a URL e o valor do cookie que a volta confere.
 * signupAs e a intencao da tela de origem ('contractor', 'artist' ou null).
 */
export function startGoogleLogin({ origin, signupAs, next }) {
  const state = newToken();
  const nonce = newToken();
  const verifier = newToken();
  const challenge = createHash('sha256').update(verifier).digest('base64url');

  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(origin),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  }).toString();

  const cookie = Buffer.from(JSON.stringify({
    state, nonce, verifier, signupAs, next,
  })).toString('base64url');
  return { url: url.toString(), cookie };
}

export function readOAuthCookie(value) {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function sameValue(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/*
 * Troca o code pelo ID token e devolve { sub, email, name } da conta Google,
 * ou null se algo nao conferir. Nunca registra o token nem o segredo.
 */
export async function exchangeGoogleCode({ code, verifier, nonce, origin }) {
  let response;
  try {
    response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(origin),
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
    });
  } catch (error) {
    console.error('Google: falha de rede na troca do code', error.message);
    return null;
  }
  if (!response.ok) {
    console.error('Google: troca do code recusada', response.status);
    return null;
  }

  const { id_token: idToken } = await response.json();
  let claims;
  try {
    claims = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  const valid = ISSUERS.includes(claims.iss)
    && claims.aud === process.env.GOOGLE_CLIENT_ID
    && Number(claims.exp) * 1000 > Date.now()
    && sameValue(claims.nonce, nonce)
    && typeof claims.sub === 'string' && claims.sub
    && typeof claims.email === 'string'
    // Sem e-mail verificado pelo Google nao ha prova de posse do e-mail.
    && (claims.email_verified === true || claims.email_verified === 'true');
  if (!valid) {
    console.error('Google: ID token nao conferiu');
    return null;
  }

  return {
    sub: claims.sub,
    email: claims.email.toLowerCase(),
    name: typeof claims.name === 'string' ? claims.name.slice(0, 120) : '',
  };
}

/*
 * Conta Google confirmada: entra numa conta existente ou abre o cadastro
 * pendente. Devolve { destination } com a sessao aberta,
 * { signupToken } para o cookie de /cadastro/completar, ou { error }.
 */
export async function finishGoogleLogin(identity, { signupAs, next }) {
  const userId = await transaction(async (tx) => {
    const linked = await tx.queryOne('select id from users where google_sub = $1', [identity.sub]);
    if (linked) return linked.id;

    const byEmail = await tx.queryOne(
      'select id, email_verified_at, google_sub from users where email = $1',
      [identity.email],
    );
    if (!byEmail) return null;

    if (!byEmail.email_verified_at) {
      /*
       * Cadastro por senha nunca confirmado: ninguem provou ser dono do
       * e-mail, entao os dados dele (senha, telefone, rascunho) nao valem. A
       * mesma regra de signUp: some, e a pessoa completa um cadastro novo.
       */
      await tx.query('delete from users where id = $1', [byEmail.id]);
      return null;
    }

    /*
     * E-mail confirmado dos dois lados: e a mesma pessoa. Vincula a conta
     * Google. Se ja houver outra conta Google vinculada (o e-mail mudou de dono
     * no Google, por exemplo), o vinculo existente nao e trocado.
     */
    if (byEmail.google_sub) return 'conflict';
    await tx.query('update users set google_sub = $2, failed_login_count = 0 where id = $1', [byEmail.id, identity.sub]);
    return byEmail.id;
  });

  if (userId === 'conflict') return { error: 'conta' };
  if (userId) {
    await createSession(userId);
    return { destination: next ?? destinationFor(await findOwnArtist(userId)) };
  }

  const token = newToken();
  await query('delete from google_signups where expires_at < now() or google_sub = $1', [identity.sub]);
  await query(
    `insert into google_signups (id, google_sub, email, full_name, signup_as, next_path, expires_at)
     values ($1, $2, $3, $4, $5, $6, now() + make_interval(secs => $7))`,
    [sha256(token), identity.sub, identity.email, identity.name || null, signupAs, next, SIGNUP_MAX_AGE],
  );
  return { signupToken: token };
}

/* Cadastro pendente do cookie, ou null se nao existe ou venceu. */
export function findGoogleSignup(token, db = { queryOne }) {
  if (!token) return null;
  return db.queryOne(
    `select id, google_sub, email, full_name, signup_as, next_path
       from google_signups where id = $1 and expires_at > now()`,
    [sha256(token)],
  );
}
