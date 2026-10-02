import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL } from './lib/supabaseConfig.js';

/*
 * Renova o token da sessao Supabase antes de a requisicao chegar a pagina.
 *
 * Server Component nao consegue gravar cookies; sem este passo, um token
 * expirado nunca seria trocado e o usuario "cairia" da sessao. Aqui nao ha
 * autorizacao: quem decide acesso sao as paginas (redirect) e a RLS.
 */
export async function proxy(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // Nao insira codigo entre a criacao do cliente e getUser: e esta chamada
  // que dispara a renovacao.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  /*
   * Fora: arquivos estaticos e imagens. As paginas publicas tambem passam por
   * aqui, porque o Header delas mostra o usuario logado.
   */
  matcher: [
    '/((?!_next/static|_next/image|icon.png|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
