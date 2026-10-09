'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { signOut } from '../lib/accountActions.js';

const AuthContext = createContext(null);

/* Usuario do Header ({ role, name, avatarUrl, notificationCount, destination }) ou null. */
async function loadSessionUser() {
  try {
    const response = await fetch('/api/session', { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()).user;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  /*
   * A sessao e lida no navegador, e nao no layout raiz: ler cookies no servidor
   * tornaria todas as paginas dinamicas, perdendo o prerender dos perfis.
   * O estado comeca nulo e e preenchido no primeiro efeito. As telas de login
   * chamam refresh() antes de navegar.
   */
  const [user, setUser] = useState(null);

  const refresh = useCallback(async () => {
    const nextUser = await loadSessionUser();
    setUser(nextUser);
    return nextUser;
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await signOut();
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
