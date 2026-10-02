'use server';

import { headers } from 'next/headers';
import { createServerSupabase, getCurrentUser } from './supabaseServer.js';
import {
  ARTIST_CATEGORIES, destinationFor, ensureAccount, safeNextPath,
} from './account.js';

/*
 * Server Actions de acesso: login, cadastro e recuperacao de senha.
 *
 * Devolvem { ok, ... } ou { error } em vez de chamar redirect(): a tela precisa
 * atualizar o AuthContext (que vive no navegador) antes de navegar, senao o
 * Header continuaria mostrando "Entrar" ate um recarregamento.
 *
 * As mensagens de erro nunca repetem a senha nem o objeto de erro bruto.
 */

const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function authErrorMessage(error) {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_not_confirmed':
      return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    case 'user_already_exists':
    case 'email_exists':
      return 'Já existe uma conta com este e-mail. Entre ou recupere sua senha.';
    case 'weak_password':
      return 'Escolha uma senha mais forte.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
    case 'otp_expired':
      return 'Código inválido ou expirado. Peça um novo código.';
    default:
      return 'Não foi possível concluir agora. Tente novamente.';
  }
}

export async function signIn(_prevState, formData) {
  const email = field(formData, 'email').toLowerCase();
  const password = formData.get('password');
  const next = safeNextPath(field(formData, 'next'));

  if (!EMAIL_PATTERN.test(email) || typeof password !== 'string' || !password) {
    return { error: 'Informe e-mail e senha.' };
  }

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error) };

  const account = await ensureAccount(supabase, data.user);
  return { ok: true, destination: next ?? destinationFor(account) };
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

  if (!EMAIL_PATTERN.test(email)) return { error: 'Informe um e-mail válido.' };
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (formData.get('terms') !== 'on') return { error: 'É preciso aceitar os termos para continuar.' };
  if (fullName.length < 2 || fullName.length > 120) return { error: 'Informe seu nome completo.' };

  const metadata = { signup_as: signupAs, full_name: fullName };

  /*
   * Artista sem nome e sem telefone nao e contratavel: o WhatsApp e o canal de
   * contato efetivo. As colunas sao nullable (rascunho e seed), entao a
   * obrigatoriedade mora aqui.
   */
  if (signupAs === 'artist') {
    if (stageName.length < 2 || stageName.length > 80) return { error: 'Informe seu nome artístico.' };
    if (!ARTIST_CATEGORIES.includes(category)) return { error: 'Escolha a categoria do seu trabalho.' };
    if (phone.length < 10 || phone.length > 11) return { error: 'Informe um WhatsApp com DDD.' };
    Object.assign(metadata, { stage_name: stageName, category, phone });
  }

  const supabase = await createServerSupabase();
  const origin = await requestOrigin();
  const confirmUrl = new URL('/auth/confirm', origin);
  confirmUrl.searchParams.set('perfil', signupAs === 'artist' ? 'artista' : 'contratante');
  if (next) confirmUrl.searchParams.set('next', next);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata, emailRedirectTo: confirmUrl.toString() },
  });
  if (error) return { error: authErrorMessage(error) };

  // Com confirmacao de e-mail ligada nao ha sessao ainda: a conta e
  // completada em /auth/confirm, quando o usuario clicar no link.
  if (!data.session) return { ok: true, needsConfirmation: true };

  const account = await ensureAccount(supabase, data.user);
  return { ok: true, destination: next ?? destinationFor(account) };
}

/*
 * Sempre responde ok, exista ou nao a conta: responder diferente permitiria
 * descobrir quais e-mails estao cadastrados.
 */
export async function requestPasswordReset(_prevState, formData) {
  const email = field(formData, 'email').toLowerCase();
  if (!EMAIL_PATTERN.test(email)) return { error: 'Informe um e-mail válido.' };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error && (error.code === 'over_email_send_rate_limit' || error.code === 'over_request_rate_limit')) {
    return { error: authErrorMessage(error) };
  }

  return { ok: true, email };
}

/* Troca o codigo do e-mail por uma sessao de recuperacao. */
export async function verifyRecoveryCode(_prevState, formData) {
  const email = field(formData, 'email').toLowerCase();
  const code = field(formData, 'code').replace(/\D/g, '');
  if (!EMAIL_PATTERN.test(email) || !code) return { error: 'Informe o código recebido por e-mail.' };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
  if (error) return { error: 'Código inválido ou expirado. Peça um novo código.' };

  return { ok: true };
}

/*
 * Grava a nova senha usando a sessao aberta pelo codigo e encerra essa sessao:
 * a tela seguinte pede login com a senha nova.
 */
export async function updatePassword(_prevState, formData) {
  const password = formData.get('password');
  const confirmation = formData.get('confirmation');

  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` };
  }
  if (password !== confirmation) return { error: 'As senhas precisam ser iguais.' };

  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'A sessão de recuperação expirou. Peça um novo código.' };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: authErrorMessage(error) };

  await supabase.auth.signOut();
  return { ok: true };
}
