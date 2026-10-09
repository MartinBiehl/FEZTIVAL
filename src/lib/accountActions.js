'use server';

import { cookies, headers } from 'next/headers';
import { query, queryOne, transaction } from './db.js';
import {
  burnPasswordCheck, consumePasswordResetGrant, createEmailVerificationToken,
  createPasswordResetCode, createSession, destroySession, exchangePasswordResetCode,
  hashPassword, verifyPassword,
} from './auth.js';
import { sendEmailConfirmation, sendPasswordResetCode } from './mail.js';
import {
  ARTIST_CATEGORIES, createAccountRows, destinationFor, findOwnArtist, safeNextPath,
} from './account.js';

/*
 * Server Actions de acesso: login, cadastro, saida e recuperacao de senha.
 *
 * Devolvem { ok, ... } ou { error } em vez de chamar redirect(): a tela precisa
 * atualizar o AuthContext (que vive no navegador) antes de navegar, senao o
 * Header continuaria mostrando "Entrar" ate um recarregamento.
 *
 * As mensagens de erro nunca repetem a senha nem o objeto de erro bruto.
 */

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/* Igual a CODE_LENGTH em PasswordRecovery.jsx. */
const RESET_CODE_LENGTH = 6;
/* Depois de 5 senhas erradas seguidas, o login daquele e-mail espera 15 minutos. */
const MAX_FAILED_LOGINS = 5;
const RESET_GRANT_COOKIE = 'fz_password_reset';

const GENERIC_ERROR = 'Não foi possível concluir agora. Tente novamente.';

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/* Origem da requisicao, para o link do e-mail de confirmacao. SITE_URL ainda e placeholder. */
async function requestOrigin() {
  const headerList = await headers();
  const origin = headerList.get('origin');
  if (origin) return origin;
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  const protocol = headerList.get('x-forwarded-proto') ?? 'https';
  return `${protocol}://${host}`;
}

export async function signIn(_prevState, formData) {
  const email = field(formData, 'email').toLowerCase();
  const password = formData.get('password');
  const next = safeNextPath(field(formData, 'next'));

  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || !password) {
    return { error: 'Informe e-mail e senha.' };
  }

  const user = await queryOne(
    `select id, password_hash, email_verified_at,
            failed_login_count >= $2 and last_failed_login_at > now() - interval '15 minutes' as locked
       from users where email = $1`,
    [email, MAX_FAILED_LOGINS],
  );

  if (!user) {
    await burnPasswordCheck(password);
    return { error: 'E-mail ou senha incorretos.' };
  }
  if (user.locked) return { error: 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.' };

  if (!(await verifyPassword(password, user.password_hash))) {
    // Fora da janela de 15 minutos a contagem recomeca.
    await query(
      `update users
          set failed_login_count = case when last_failed_login_at > now() - interval '15 minutes'
                                        then failed_login_count + 1 else 1 end,
              last_failed_login_at = now()
        where id = $1`,
      [user.id],
    );
    return { error: 'E-mail ou senha incorretos.' };
  }

  if (!user.email_verified_at) {
    return { error: 'Confirme seu e-mail pelo link que enviamos antes de entrar.' };
  }

  await query('update users set failed_login_count = 0 where id = $1', [user.id]);
  await createSession(user.id);
  return { ok: true, destination: next ?? destinationFor(await findOwnArtist(user.id)) };
}

export async function signUp(_prevState, formData) {
  const signupAs = field(formData, 'signupAs') === 'artist' ? 'artist' : 'contractor';
  const email = field(formData, 'email').toLowerCase();
  const password = formData.get('password');
  const next = safeNextPath(field(formData, 'next'));
  const fullName = field(formData, 'fullName');
  const stageName = field(formData, 'stageName');
  const category = field(formData, 'category');
  const phone = field(formData, 'phone').replace(/\D/g, '');

  if (!EMAIL_PATTERN.test(email) || email.length > 254) return { error: 'Informe um e-mail válido.' };
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (formData.get('terms') !== 'on') return { error: 'É preciso aceitar os termos para continuar.' };
  if (fullName.length < 2 || fullName.length > 120) return { error: 'Informe seu nome completo.' };

  /*
   * O WhatsApp e o canal de contato efetivo entre as duas partes depois do
   * aceite, entao vale para artista e contratante. As colunas sao nullable
   * (rascunho e seed), entao a obrigatoriedade mora aqui.
   */
  if (phone.length < 10 || phone.length > 11) return { error: 'Informe um WhatsApp com DDD.' };

  if (signupAs === 'artist') {
    if (stageName.length < 2 || stageName.length > 80) return { error: 'Informe seu nome artístico.' };
    if (!ARTIST_CATEGORIES.includes(category)) return { error: 'Escolha a categoria do seu trabalho.' };
  }

  const passwordHash = await hashPassword(password);
  let token;
  try {
    token = await transaction(async (tx) => {
      const existing = await tx.queryOne('select id, email_verified_at from users where email = $1', [email]);
      if (existing?.email_verified_at) return null;
      /*
       * Cadastro anterior nunca confirmado: ninguem provou ser dono do e-mail,
       * entao o novo cadastro o substitui (e um novo link e enviado).
       */
      if (existing) await tx.query('delete from users where id = $1', [existing.id]);

      const user = await tx.queryOne(
        'insert into users (email, password_hash) values ($1, $2) returning id',
        [email, passwordHash],
      );
      await createAccountRows(tx, user.id, {
        signupAs, fullName, phone, stageName, category,
      });
      return createEmailVerificationToken(tx, user.id);
    });
  } catch (error) {
    console.error('signUp falhou', error.code ?? error.message);
    return { error: GENERIC_ERROR };
  }

  if (!token) return { error: 'Já existe uma conta com este e-mail. Entre ou recupere sua senha.' };

  const confirmUrl = new URL('/auth/confirm', await requestOrigin());
  confirmUrl.searchParams.set('token', token);
  if (next) confirmUrl.searchParams.set('next', next);

  try {
    await sendEmailConfirmation(email, confirmUrl.toString());
  } catch (error) {
    console.error('Envio da confirmacao falhou', error.message);
    return { error: 'Não foi possível enviar o e-mail de confirmação. Tente novamente.' };
  }

  // A conta e ativada em /auth/confirm, quando o usuario clicar no link.
  return { ok: true, needsConfirmation: true };
}

export async function signOut() {
  await destroySession();
  return { ok: true };
}

/*
 * Sempre responde ok, exista ou nao a conta: responder diferente permitiria
 * descobrir quais e-mails estao cadastrados.
 */
export async function requestPasswordReset(_prevState, formData) {
  const email = field(formData, 'email').toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: 'Informe um e-mail válido.' };

  const user = await queryOne('select id from users where email = $1', [email]);
  const code = user ? await createPasswordResetCode(user.id, RESET_CODE_LENGTH) : null;
  if (code) {
    try {
      await sendPasswordResetCode(email, code);
    } catch (error) {
      console.error('Envio do codigo falhou', error.message);
      return { error: GENERIC_ERROR };
    }
  }

  return { ok: true, email };
}

/*
 * Confere o codigo do e-mail. Certo, grava num cookie httpOnly a autorizacao
 * de 15 minutos que a etapa seguinte usa para gravar a senha nova.
 */
export async function verifyRecoveryCode(_prevState, formData) {
  const email = field(formData, 'email').toLowerCase();
  const code = field(formData, 'code').replace(/\D/g, '');
  if (!EMAIL_PATTERN.test(email) || code.length !== RESET_CODE_LENGTH) {
    return { error: 'Informe o código recebido por e-mail.' };
  }

  const grant = await exchangePasswordResetCode(email, code);
  if (!grant) return { error: 'Código inválido ou expirado. Peça um novo código.' };

  (await cookies()).set(RESET_GRANT_COOKIE, grant, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 15 * 60,
  });
  return { ok: true };
}

/*
 * Grava a nova senha e encerra todas as sessoes do usuario: a tela seguinte
 * pede login com a senha nova. Concluir a recuperacao tambem prova que a
 * pessoa e dona do e-mail, entao a conta passa a confirmada.
 */
export async function updatePassword(_prevState, formData) {
  const password = formData.get('password');
  const confirmation = formData.get('confirmation');

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 200) {
    return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmation) return { error: 'As senhas precisam ser iguais.' };

  const cookieStore = await cookies();
  const grant = cookieStore.get(RESET_GRANT_COOKIE)?.value;
  const expired = { error: 'A sessão de recuperação expirou. Peça um novo código.' };
  if (!grant) return expired;

  const passwordHash = await hashPassword(password);
  const changed = await transaction(async (tx) => {
    const userId = await consumePasswordResetGrant(tx, grant);
    if (!userId) return false;
    await tx.query(
      `update users
          set password_hash = $2, failed_login_count = 0,
              email_verified_at = coalesce(email_verified_at, now())
        where id = $1`,
      [userId, passwordHash],
    );
    await tx.query('delete from sessions where user_id = $1', [userId]);
    return true;
  });

  cookieStore.delete(RESET_GRANT_COOKIE);
  return changed ? { ok: true } : expired;
}
