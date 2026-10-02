'use client';

import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_KEY, SUPABASE_URL } from './supabaseConfig.js';

/*
 * Cliente do navegador, usado pelo AuthContext para saber quem esta logado e
 * reagir a login/logout, e pelo editor de perfil para enviar imagens direto ao
 * Storage (o arquivo nao passa pelo servidor do Next). As escritas no banco
 * passam pelas Server Actions.
 *
 * A sessao fica nos mesmos cookies que o servidor le, entao os dois lados
 * enxergam o mesmo usuario. createBrowserClient ja devolve uma instancia unica.
 */
export function getBrowserSupabase() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
