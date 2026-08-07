import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const STORAGE_KEY = 'feztival.authSession';

const demoProfiles = {
  contractor: {
    name: 'Bernardo',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&h=160&q=85',
    notificationCount: 3,
    destination: '/minhas-reservas',
  },
  artist: {
    name: 'DJ Kauan',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=160&h=160&q=85',
    notificationCount: 12,
    destination: '/painel',
  },
};

const AuthContext = createContext(null);

function normalizeStoredUser(value) {
  if (!value || !demoProfiles[value.role]) return null;

  const profile = demoProfiles[value.role];
  return {
    role: value.role,
    name: typeof value.name === 'string' && value.name.trim() ? value.name.trim() : profile.name,
    avatarUrl: typeof value.avatarUrl === 'string' ? value.avatarUrl : profile.avatarUrl,
    notificationCount: Number.isFinite(value.notificationCount)
      ? value.notificationCount
      : profile.notificationCount,
    destination: profile.destination,
  };
}

function readStoredUser() {
  try {
    return normalizeStoredUser(JSON.parse(window.localStorage.getItem(STORAGE_KEY)));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const completeAuth = useCallback(({ role, name }) => {
    const profile = demoProfiles[role];
    if (!profile) throw new Error('Tipo de perfil inválido.');

    const nextUser = {
      role,
      name: name?.trim() || profile.name,
      avatarUrl: profile.avatarUrl,
      notificationCount: profile.notificationCount,
      destination: profile.destination,
    };

    setUser(nextUser);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
    } catch {
      // A navegação continua funcionando mesmo quando o armazenamento local está indisponível.
    }

    return nextUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Sem ação adicional: a sessão em memória já foi encerrada.
    }
  }, []);

  const value = useMemo(() => ({ user, completeAuth, logout }), [completeAuth, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return context;
}

