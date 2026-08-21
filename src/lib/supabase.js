import { createClient } from '@supabase/supabase-js';

/*
 * Cliente Supabase, criado em um unico lugar.
 *
 * Usa apenas a chave publishable, que respeita RLS: nenhuma leitura desta fase
 * precisa ignorar as policies. NAO introduza a service_role aqui -- ela ignora
 * RLS por completo e nao deve sair do servidor em nenhuma hipotese.
 *
 * As variaveis sao NEXT_PUBLIC_* porque a chave publishable e publica por
 * design; a protecao dos dados vem da RLS, nao do sigilo da chave.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase nao configurado: defina NEXT_PUBLIC_SUPABASE_URL e '
    + 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    /*
     * Esta fase e somente leitura e roda em Server Component: nao ha sessao
     * para persistir nem token para renovar.
     */
    persistSession: false,
    autoRefreshToken: false,
  },
});
