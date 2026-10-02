import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js';

/*
 * Cliente com a sessao do usuario, para Server Components, Server Actions e
 * Route Handlers. As queries saem com o JWT de quem esta logado, entao a RLS
 * filtra por auth.uid() -- e e ela, nao este codigo, que garante que cada um
 * so ve e altera o que e seu.
 *
 * Crie um cliente por requisicao: os cookies sao da requisicao atual.
 */
export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          /*
           * Server Component nao pode gravar cookies. A renovacao do token
           * acontece no proxy (src/proxy.js), entao ignorar aqui e seguro.
           */
        }
      },
    },
  });
}

/* Usuario autenticado, validado no servidor de Auth, ou null. */
export async function getCurrentUser(supabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}
