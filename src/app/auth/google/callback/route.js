import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  OAUTH_COOKIE, SIGNUP_COOKIE, SIGNUP_MAX_AGE, cookieOptions, exchangeGoogleCode,
  finishGoogleLogin, googleConfigured, readOAuthCookie, sameValue,
} from '../../../../lib/googleAuth.js';

/*
 * Volta do Google (o "URI de redirecionamento" cadastrado no Google Cloud).
 *
 * Confere que quem volta e quem saiu (state do cookie), troca o code pelo ID
 * token e entra na conta, ou leva a /cadastro/completar quem ainda nao tem
 * conta. Qualquer falha volta a /entrar com um aviso, sem detalhes.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const cookieStore = await cookies();
  const saved = readOAuthCookie(cookieStore.get(OAUTH_COOKIE)?.value ?? '');
  cookieStore.delete(OAUTH_COOKIE);

  const back = (erro) => NextResponse.redirect(new URL(`/entrar?erro=${erro}`, origin));

  // A pessoa desistiu na tela do Google.
  if (searchParams.get('error')) return back('google-cancelado');

  const code = searchParams.get('code');
  if (!googleConfigured() || !saved || !code || !sameValue(searchParams.get('state'), saved.state)) {
    return back('google');
  }

  const identity = await exchangeGoogleCode({
    code, verifier: saved.verifier, nonce: saved.nonce, origin,
  });
  if (!identity) return back('google');

  let result;
  try {
    result = await finishGoogleLogin(identity, { signupAs: saved.signupAs, next: saved.next });
  } catch (error) {
    console.error('Google: falha ao entrar', error.code ?? error.message);
    return back('google');
  }

  if (result.error) return back(`google-${result.error}`);
  if (result.destination) return NextResponse.redirect(new URL(result.destination, origin));

  cookieStore.set(SIGNUP_COOKIE, result.signupToken, cookieOptions(SIGNUP_MAX_AGE));
  return NextResponse.redirect(new URL('/cadastro/completar', origin));
}
