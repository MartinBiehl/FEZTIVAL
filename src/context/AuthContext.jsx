'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBrowserSupabase } from '../lib/supabaseBrowser.js';

const AuthContext = createContext(null);

/*
 * Monta o usuario exibido no Header a partir da sessao Supabase.
 *
 * "role" aqui e so apresentacao: quem tem linha em artists ve o painel, o
 * resto ve as proprias reservas. Nao existe papel gravado no banco.
 */
async function loadSessionUser(supabase) {
  const { data } = await supabase.auth.getUser();
  const authUser = data?.user;
  if (!authUser) return null;

  const [{ data: profile }, { data: artist }] = await Promise.all([
    supabase.from('profiles').select('full_name, avatar_url').eq('id', authUser.id).maybeSingle(),
    supabase
      .from('artists')
      .select('id, stage_name')
      .eq('profile_id', authUser.id)
      .order('created_at')
      .limit(1)
      .maybeSingle(),
  ]);

  // Pendencia do artista: propostas aguardando resposta.
  let notificationCount = 0;
  if (artist) {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('artist_id', artist.id)
      .eq('status', 'pending');
    notificationCount = count ?? 0;
  }

  return {
    role: artist ? 'artist' : 'contractor',
    name: artist?.stage_name || profile?.full_name || authUser.user_metadata?.full_name || authUser.email,
    avatarUrl: profile?.avatar_url ?? null,
    notificationCount,
    destination: artist ? '/painel' : '/minhas-reservas',
  };
}

export function AuthProvider({ children }) {
  /*
   * A sessao e lida no navegador, e nao no layout raiz: ler cookies no servidor
   * tornaria todas as paginas dinamicas, perdendo o prerender dos perfis.
   * O estado comeca nulo e e preenchido no primeiro efeito.
   */
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const nextUser = await loadSessionUser(getBrowserSupabase());
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    refresh();

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Fora do callback: chamar o Supabase dentro dele pode travar o cliente.
        setTimeout(refresh, 0);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [refresh]);

  const logout = useCallback(async () => {
    await getBrowserSupabase().auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, refresh, logout }), [logout, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}
