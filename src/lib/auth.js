import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import {
  createHash, randomBytes, randomInt, scrypt, timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { query, queryOne } from './db.js';

/*
 * Autenticacao propria: e-mail e senha, sessao em cookie httpOnly.
 *
 * - Senha: scrypt (N=2^15, r=8, p=3, parametros do OWASP), com sal por senha.
 * - Sessao: token aleatorio no cookie; o banco guarda so o SHA-256 dele, entao
 *   um vazamento da tabela sessions nao abre sessao de ninguem.
 * - Tokens de e-mail (confirmacao e codigo de recuperacao) seguem a mesma
 *   regra: so o hash vai para auth_tokens.
 *
 * Nada aqui roda no navegador.
 */

const scryptAsync = promisify(scrypt);
const SCRYPT = { N: 2 ** 15, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export const SESSION_COOKIE = 'fz_session';
const SESSION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');

/* ------------------------------------------------------------------------- */
/* Senhas                                                                    */
/* ------------------------------------------------------------------------- */

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, SCRYPT);
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64'), key.toString('base64')].join('$');
}

export async function verifyPassword(password, stored) {
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt') return false;
  const expected = Buffer.from(hash, 'base64');
  const key = await scryptAsync(password, Buffer.from(salt, 'base64'), expected.length, {
    N: Number(N), r: Number(r), p: Number(p), maxmem: SCRYPT.maxmem,
  });
  return timingSafeEqual(key, expected);
}

/*
 * Hash calculado quando o e-mail nao existe, para o login levar o mesmo tempo
 * com e sem conta -- senao a demora revelaria quais e-mails estao cadastrados.
 */
const dummyHash = hashPassword(randomBytes(16).toString('hex'));
export async function burnPasswordCheck(password) {
  await verifyPassword(password, await dummyHash);
}

/* ------------------------------------------------------------------------- */
/* Sessao                                                                    */
/* ------------------------------------------------------------------------- */

function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: maxAgeSeconds,
  };
}

/* Abre uma sessao e grava o cookie. So em Server Action ou Route Handler. */
export async function createSession(userId) {
  const token = newToken();
  await query(
    `insert into sessions (id, user_id, expires_at)
     values ($1, $2, now() + make_interval(days => $3))`,
    [sha256(token), userId, SESSION_DAYS],
  );
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) await query('delete from sessions where id = $1', [sha256(token)]);
  cookieStore.delete(SESSION_COOKIE);
}

/* Encerra todas as sessoes do usuario (troca de senha). */
export async function destroyAllSessions(userId) {
  await query('delete from sessions where user_id = $1', [userId]);
}

/*
 * Usuario da sessao atual ({ id, email }) ou null. Memorizado por requisicao:
 * a pagina e as funcoes que ela chama fazem uma unica consulta.
 *
 * A sessao desliza: passada a metade da validade, ganha mais 30 dias. Em
 * Server Component o cookie nao pode ser regravado (o Next proibe), entao so a
 * linha do banco e renovada ali; o cookie e renovado na proxima Server Action.
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne(
    `select u.id, u.email, s.expires_at
       from sessions s
       join users u on u.id = s.user_id
      where s.id = $1 and s.expires_at > now()`,
    [sha256(token)],
  );
  if (!row) return null;

  if (new Date(row.expires_at).getTime() - Date.now() < (SESSION_DAYS / 2) * DAY_MS) {
    await query(
      `update sessions set expires_at = now() + make_interval(days => $2) where id = $1`,
      [sha256(token), SESSION_DAYS],
    );
    try {
      cookieStore.set(SESSION_COOKIE, token, cookieOptions(SESSION_DAYS * 24 * 60 * 60));
    } catch {
      // Server Component: o cookie segue valido e e renovado depois.
    }
  }

  return { id: row.id, email: row.email };
});

/* ------------------------------------------------------------------------- */
/* Tokens enviados por e-mail                                                */
/* ------------------------------------------------------------------------- */

const MAX_CODE_ATTEMPTS = 5;

/* Link de confirmacao do cadastro. Devolve o token em claro, para o e-mail. */
export async function createEmailVerificationToken(tx, userId) {
  const token = newToken();
  await tx.query(
    `insert into auth_tokens (user_id, purpose, token_hash, expires_at)
     values ($1, 'email_verification', $2, now() + interval '24 hours')`,
    [userId, sha256(token)],
  );
  return token;
}

/* Consome o link de confirmacao. Devolve o id do usuario ou null. */
export async function consumeEmailVerificationToken(token) {
  const row = await queryOne(
    `delete from auth_tokens
      where token_hash = $1 and purpose = 'email_verification' and expires_at > now()
      returning user_id`,
    [sha256(token)],
  );
  if (!row) return null;
  await query('update users set email_verified_at = coalesce(email_verified_at, now()) where id = $1', [row.user_id]);
  return row.user_id;
}

/*
 * Codigo de 6 digitos da recuperacao de senha. Substitui um codigo anterior.
 * Devolve null (sem enviar nada) se um codigo foi pedido ha menos de 1 minuto.
 */
export async function createPasswordResetCode(userId, length) {
  const recent = await queryOne(
    `select 1 from auth_tokens
      where user_id = $1 and purpose = 'password_reset' and created_at > now() - interval '1 minute'`,
    [userId],
  );
  if (recent) return null;

  const code = String(randomInt(0, 10 ** length)).padStart(length, '0');
  await query(`delete from auth_tokens where user_id = $1 and purpose in ('password_reset', 'password_reset_grant')`, [userId]);
  await query(
    `insert into auth_tokens (user_id, purpose, token_hash, expires_at)
     values ($1, 'password_reset', $2, now() + interval '15 minutes')`,
    [userId, sha256(code)],
  );
  return code;
}

/*
 * Confere o codigo. Certo: troca por uma autorizacao de 15 minutos para gravar
 * a senha nova, devolvida em claro para ir num cookie. Errado: conta a
 * tentativa; na quinta o codigo e descartado.
 */
export async function exchangePasswordResetCode(email, code) {
  const row = await queryOne(
    `select t.id, t.token_hash, t.attempts
       from auth_tokens t
       join users u on u.id = t.user_id
      where u.email = $1 and t.purpose = 'password_reset' and t.expires_at > now()`,
    [email],
  );
  if (!row) return null;

  const matches = timingSafeEqual(Buffer.from(sha256(code)), Buffer.from(row.token_hash));
  if (!matches) {
    if (row.attempts + 1 >= MAX_CODE_ATTEMPTS) {
      await query('delete from auth_tokens where id = $1', [row.id]);
    } else {
      await query('update auth_tokens set attempts = attempts + 1 where id = $1', [row.id]);
    }
    return null;
  }

  const grant = newToken();
  await query(
    `update auth_tokens
        set purpose = 'password_reset_grant', token_hash = $2, expires_at = now() + interval '15 minutes'
      where id = $1`,
    [row.id, sha256(grant)],
  );
  return grant;
}

/* Consome a autorizacao de troca de senha. Devolve o id do usuario ou null. */
export async function consumePasswordResetGrant(tx, grant) {
  const row = await tx.queryOne(
    `delete from auth_tokens
      where token_hash = $1 and purpose = 'password_reset_grant' and expires_at > now()
      returning user_id`,
    [sha256(grant)],
  );
  return row?.user_id ?? null;
}
