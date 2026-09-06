import { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function ResetPassword() {
  const { clearRecovery } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов.');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают.');
      return;
    }

    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  };

  const handleContinue = () => {
    clearRecovery();
  };

  const inputClasses = (focused: boolean) =>
    `flex items-center gap-3 bg-white/90 dark:bg-gray-800/50 border rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 transition-all duration-200 ${
      focused
        ? 'border-cyan-500/50 ring-2 ring-cyan-500/20 shadow-sm shadow-cyan-500/10'
        : 'border-slate-200/80 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600'
    }`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl border border-white/30 dark:border-gray-800/50 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/5 dark:shadow-black/30 p-6 sm:p-8 space-y-6">
          {!done ? (
            <>
              <div className="space-y-2 text-center">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="w-6 h-6 text-cyan-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Новый пароль
                </h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  Придумайте новый пароль для вашего аккаунта
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 pl-0.5">
                    Новый пароль
                  </label>
                  <div className={inputClasses(passFocused)}>
                    <Lock className={`w-4 h-4 shrink-0 transition-colors ${passFocused ? 'text-cyan-500' : 'text-slate-400 dark:text-gray-500'}`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setPassFocused(true)}
                      onBlur={() => setPassFocused(false)}
                      required
                      minLength={6}
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
                      placeholder="Минимум 6 символов"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      tabIndex={-1}
                      className="p-1 -mr-1 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 pl-0.5">
                    Подтвердите пароль
                  </label>
                  <div className={inputClasses(confirmFocused)}>
                    <Lock className={`w-4 h-4 shrink-0 transition-colors ${confirmFocused ? 'text-cyan-500' : 'text-slate-400 dark:text-gray-500'}`} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      onFocus={() => setConfirmFocused(true)}
                      onBlur={() => setConfirmFocused(false)}
                      required
                      minLength={6}
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
                      placeholder="Повторите пароль"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      tabIndex={-1}
                      className="p-1 -mr-1 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20">
                    <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Сохранить пароль
                </button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                  Пароль обновлён
                </h2>
                <p className="text-sm text-slate-500 dark:text-gray-400">
                  Ваш пароль успешно изменён. Теперь вы можете продолжить работу.
                </p>
              </div>
              <button
                onClick={handleContinue}
                className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
              >
                Продолжить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
