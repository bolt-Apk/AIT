import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isRecovery: boolean;
  isEmailVerified: boolean;
  clearEmailVerified: () => void;
  clearRecovery: () => void;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  getFreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const clearRecovery = () => setIsRecovery(false);
  const clearEmailVerified = () => setIsEmailVerified(false);
  const initDone = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (!initDone.current) {
        initDone.current = true;
        setLoading(false);
      }
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
      if (event === 'SIGNED_IN') {
        const url = window.location.href;
        if (url.includes('type=signup') || url.includes('type=email')) {
          setIsEmailVerified(true);
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initDone.current) {
        setSession(session);
        initDone.current = true;
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error('signUp error:', error);
      // Never reveal whether an address is already registered: a distinguishable
      // response would let anyone enumerate which emails hold accounts.
      const code = (error as { code?: string }).code || '';
      const msg = error.message || '';
      if (
        code === 'user_already_exists' ||
        code === 'email_exists' ||
        /already\s*(registered|exists)/i.test(msg)
      ) {
        return 'Не удалось создать аккаунт с этими данными. Если аккаунт уже существует, войдите или восстановите пароль.';
      }
      if (code === 'weak_password' || /password/i.test(msg)) {
        return 'Пароль слишком простой. Используйте не менее 8 символов, включая буквы и цифры.';
      }
      if (code === 'over_request_rate_limit' || code === 'rate_limit' || /rate/i.test(msg)) {
        return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
      }
      if (code === 'validation_failed' || /valid/i.test(msg)) {
        return 'Некорректный email. Проверьте правильность адреса.';
      }
      if (/network/i.test(msg) || /fetch/i.test(msg)) {
        return 'Нет связи с сервером. Проверьте интернет-соединение.';
      }
      return `Не удалось создать аккаунт. Проверьте данные и попробуйте снова. (${code || msg})`;
    }
    return null;
  };

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('signIn error:', error);
      // One identical message for every failure reason, so the response cannot be
      // used to tell an existing account from a missing one.
      return 'Неверный email или пароль.';
    }
    return null;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('signOut error:', error.message);
    }
    setSession(null);
  };

  const getFreshSession = async (): Promise<Session | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
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
