import { NextResponse } from 'next/server';
import { consumeEmailVerificationToken, createSession } from '../../../lib/auth.js';
import { destinationFor, findOwnArtist, safeNextPath } from '../../../lib/account.js';

/*
 * Destino do link de confirmacao de cadastro enviado por e-mail (signUp).
 *
 * Consome o token, marca o e-mail como confirmado, abre a sessao e leva o
 * usuario para a area dele. Link invalido ou vencido volta ao login com aviso.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const token = searchParams.get('token');
  const next = safeNextPath(searchParams.get('next'));
  const loginPath = '/entrar';

  const userId = token ? await consumeEmailVerificationToken(token) : null;
  if (!userId) {
    return NextResponse.redirect(new URL(`${loginPath}?erro=link`, origin));
  }

  await createSession(userId);
  return NextResponse.redirect(new URL(next ?? destinationFor(await findOwnArtist(userId)), origin));
}
