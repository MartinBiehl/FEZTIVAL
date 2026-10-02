/*
 * URL e chave do projeto Supabase, lidas em um unico lugar pelos tres
 * clientes (leitura publica, servidor com sessao e navegador).
 *
 * As variaveis sao NEXT_PUBLIC_* porque a chave publishable e publica por
 * design; a protecao dos dados vem da RLS, nao do sigilo da chave.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error(
    'Supabase nao configurado: defina NEXT_PUBLIC_SUPABASE_URL e '
    + 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY em .env.local.',
  );
}
