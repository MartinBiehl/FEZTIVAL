import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js';

/*
 * Cliente anonimo das leituras publicas (catalogo, perfis, sitemap).
 *
 * Nao le cookies de proposito: as paginas publicas sao prerenderizadas, e ler a
 * sessao as tornaria dinamicas -- perdendo o HTML estatico que sustenta o SEO.
 * O que depende de usuario logado usa createServerSupabase, de
 * supabaseServer.js.
 *
 * Usa apenas a chave publishable, que respeita RLS. NAO introduza a
 * service_role aqui -- ela ignora RLS por completo e nao deve sair do servidor
 * em nenhuma hipotese.
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
