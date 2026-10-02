import { NextResponse } from 'next/server';
import { createServerSupabase } from '../../../lib/supabaseServer.js';
import { destinationFor, ensureAccount, safeNextPath } from '../../../lib/account.js';

/*
 * Destino do link de confirmacao de cadastro enviado por e-mail.
 *
 * Aceita os dois formatos que o Supabase pode gerar: ?code= (fluxo PKCE, o
 * padrao do @supabase/ssr) e ?token_hash=&type= (template de e-mail
 * customizado). Em ambos, abre a sessao, completa a conta com os dados do
 * formulario (ensureAccount) e leva o usuario para a area dele.
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = safeNextPath(searchParams.get('next'));
  const loginPath = searchParams.get('perfil') === 'artista' ? '/entrar/artista' : '/entrar/contratante';

  const supabase = await createServerSupabase();

  let result = { data: null, error: new Error('Link sem codigo de confirmacao.') };
  if (code) {
    result = await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash && type) {
    result = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  }

  const user = result.data?.user;
  if (result.error || !user) {
    return NextResponse.redirect(new URL(`${loginPath}?erro=link`, origin));
  }

  const account = await ensureAccount(supabase, user);
  return NextResponse.redirect(new URL(next ?? destinationFor(account), origin));
}
