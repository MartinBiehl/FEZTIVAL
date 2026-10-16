import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  OAUTH_COOKIE, OAUTH_MAX_AGE, cookieOptions, googleConfigured, publicOrigin, startGoogleLogin,
} from '../../../lib/googleAuth.js';
import { safeNextPath } from '../../../lib/account.js';

/*
 * Ida ao Google, aberta pelo botao "Continuar com Google".
 *
 *   /auth/google?como=artista&next=/reservar/x
 *
 * "como" vem das telas de cadastro (contratante ou artista); sem ele (tela de
 * entrar), quem ainda nao tem conta escolhe o tipo em /cadastro/completar.
 */
const SIGNUP_AS = { contratante: 'contractor', artista: 'artist' };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const origin = publicOrigin(request);
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL('/entrar?erro=google', origin));
  }

  const { url, cookie } = startGoogleLogin({
    origin,
    signupAs: SIGNUP_AS[searchParams.get('como')] ?? null,
    next: safeNextPath(searchParams.get('next')),
  });
  (await cookies()).set(OAUTH_COOKIE, cookie, cookieOptions(OAUTH_MAX_AGE));
  return NextResponse.redirect(url);
}
