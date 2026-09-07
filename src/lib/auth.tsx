import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { ApiSession, ApiUser, getCurrentUser, getStoredSession, login, register, storeSession } from '@/lib/api';

interface AuthContextType {
  session: ApiSession | null;
  user: ApiUser | null;
  loading: boolean;
  isRecovery: boolean;
  isEmailVerified: boolean;
  clearEmailVerified: () => void;
  clearRecovery: () => void;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  getFreshSession: () => Promise<ApiSession | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApiSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const clearRecovery = () => setIsRecovery(false);
  const clearEmailVerified = () => setIsEmailVerified(false);

  useEffect(() => {
    const stored = getStoredSession();
    if (!stored) {
      setLoading(false);
      return;
    }
    getCurrentUser(stored.access_token)
      .then(({ user }) => setSession({ ...stored, user }))
      .catch(() => storeSession(null))
      .finally(() => setLoading(false));
  }, []);

  const signUp = async (email: string, password: string): Promise<string | null> => {
    try {
      const nextSession = await register(email, password);
      storeSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      console.error('signUp error:', error);
      const msg = error instanceof Error ? error.message : '';
      if (
        /already\s*(registered|exists)/i.test(msg) ||
        /не удалось создать/i.test(msg)
      ) {
        return 'Не удалось создать аккаунт с этими данными. Если аккаунт уже существует, войдите или восстановите пароль.';
      }
      if (/password/i.test(msg) || /пароль/i.test(msg)) {
        return 'Пароль слишком простой. Используйте не менее 8 символов, включая буквы и цифры.';
      }
      if (/rate/i.test(msg)) {
        return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
      }
      if (/valid/i.test(msg)) {
        return 'Некорректный email. Проверьте правильность адреса.';
      }
      if (/network/i.test(msg) || /fetch/i.test(msg)) {
        return 'Нет связи с сервером. Проверьте интернет-соединение.';
      }
      return `Не удалось создать аккаунт. Проверьте данные и попробуйте снова. (${msg})`;
    }
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    try {
      const nextSession = await login(email, password);
      storeSession(nextSession);
      setSession(nextSession);
    } catch (error) {
      console.error('signIn error:', error);
      // One identical message for every failure reason, so the response cannot be
      // used to tell an existing account from a missing one.
      return 'Неверный email или пароль.';
    }
    return null;
  };

  const signOut = async () => {
    storeSession(null);
    setSession(null);
  };

  const getFreshSession = async (): Promise<ApiSession | null> => {
    if (!session) return null;
    try {
      const { user } = await getCurrentUser(session.access_token);
      const nextSession = { ...session, user };
      storeSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } catch {
      storeSession(null);
      setSession(null);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isRecovery, isEmailVerified, clearEmailVerified, clearRecovery, signUp, signIn, signOut, getFreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
