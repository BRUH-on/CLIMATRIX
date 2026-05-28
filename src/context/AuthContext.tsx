// ─── CLIMACORE AUTH CONTEXT ─────────────────────────────────────────────────────
import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User, Role, Page } from '../types';

// ─── CONTEXT SHAPE ─────────────────────────────────────────────────────────────
interface AuthContextType {
  user: User | null;
  lang: string;
  page: Page;
  notifications: number;
  login: (email: string, password: string, role: Role) => boolean;
  logout: () => void;
  setLang: (lang: string) => void;
  setPage: (page: Page) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── PROVIDER ──────────────────────────────────────────────────────────────────
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [lang, setLang] = useState<string>('en');
  const [page, setPage] = useState<Page>('dashboard');
  const [notifications] = useState<number>(3);

  const login = (email: string, _password: string, role: Role): boolean => {
    // Demo mode — accept any credentials
    if (!email || !role) return false;

    const nameFromEmail = email.split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const newUser: User = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name: nameFromEmail,
      email,
      role,
      facilityId: role === 'industry' ? 'FAC-001' : undefined,
    };

    setUser(newUser);
    setPage('dashboard');
    return true;
  };

  const logout = () => {
    setUser(null);
    setPage('dashboard');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        lang,
        page,
        notifications,
        login,
        logout,
        setLang,
        setPage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ─── HOOK ──────────────────────────────────────────────────────────────────────
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
