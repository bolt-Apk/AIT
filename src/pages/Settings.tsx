import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Coins, X, Gift, Copy, Check, Users, Share2, UserPlus, TrendingUp, User, Mail, Lock, Sun, Moon, Monitor, EyeOff, Eye, ArrowLeft, LogOut, AtSign, ChevronRight, Shield, Palette, Database, Sparkles, Heart, PartyPopper } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { getBalance, getFullBalance, updatePassword, updateProfile, createPayment } from '@/lib/api';
import { useTheme } from '@/lib/theme';

const TOKEN_PACKAGES = [
  { tokens: 100, price: 100, label: '100 ₽' },
  { tokens: 500, price: 500, label: '500 ₽' },
  { tokens: 1000, price: 1000, label: '1 000 ₽' },
  { tokens: 3000, price: 3000, label: '3 000 ₽' },
];

type Theme = 'light' | 'dark' | 'system';

export default function Settings() {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const [showBonus, setShowBonus] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(TOKEN_PACKAGES[1]);
  const [customTokens, setCustomTokens] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [nickname, setNickname] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameMessage, setNicknameMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState<{ earned: number; created_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    loadBalance();
  }, [user]);

  useEffect(() => {
    if (user) {
      setDisplayName(user.user_metadata?.display_name || '');
      setNewEmail(user.email || '');
    }
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    try {
      const data = await getFullBalance();
      setTokens(data.tokens);
      if (data.referral_code) setReferralCode(data.referral_code);
      setTotalEarnings(data.total_referral_earnings ?? 0);
      if (data.nickname) setNickname(data.nickname);
    } catch {}
  };

  const handleSaveName = async () => {
    setProfileSaving(true);
    setProfileMessage(null);
    try {
      await updateProfile({ display_name: displayName.trim() });
      setProfileMessage({ type: 'success', text: 'Имя обновлено' });
    } catch (error) {
      console.error('Failed to update display name:', error);
      setProfileMessage({ type: 'error', text: 'Не удалось обновить имя. Попробуйте позже.' });
    }
    setProfileSaving(false);
    setTimeout(() => setProfileMessage(null), 3000);
  };

  const handleSaveNickname = async () => {
    setNicknameSaving(true);
    setNicknameMessage(null);
    const trimmed = nickname.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!trimmed || trimmed.length < 3) {
      setNicknameMessage({ type: 'error', text: 'Минимум 3 символа (латиница, цифры, _ . -)' });
      setNicknameSaving(false);
      return;
    }
    if (trimmed.length > 24) {
      setNicknameMessage({ type: 'error', text: 'Максимум 24 символа' });
      setNicknameSaving(false);
      return;
    }
    try {
      await updateProfile({ nickname: trimmed });
      setNickname(trimmed);
      setNicknameMessage({ type: 'success', text: 'Никнейм сохранён' });
    } catch (error) {
      if (error instanceof Error && error.message.includes('занят')) setNicknameMessage({ type: 'error', text: 'Этот никнейм уже занят' });
      else { console.error('Failed to save nickname:', error); setNicknameMessage({ type: 'error', text: 'Не удалось сохранить никнейм. Попробуйте позже.' }); }
    }
    setNicknameSaving(false);
    setTimeout(() => setNicknameMessage(null), 3000);
  };

  const handleChangeEmail = async () => {
    setEmailSaving(true);
    setEmailMessage(null);
    setEmailMessage({ type: 'error', text: 'Смена email временно недоступна' });
    setEmailSaving(false);
    setTimeout(() => setEmailMessage(null), 5000);
  };

  const handleChangePassword = async () => {
    setPasswordSaving(true);
    setPasswordMessage(null);
    if (!newPassword || newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Пароль должен содержать минимум 6 символов' });
      setPasswordSaving(false);
      return;
    }
    try {
      await updatePassword(newPassword);
      setPasswordMessage({ type: 'success', text: 'Пароль успешно изменён' });
      setNewPassword('');
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error instanceof Error ? error.message : 'Не удалось изменить пароль' });
    }
    setPasswordSaving(false);
    setTimeout(() => setPasswordMessage(null), 3000);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };

  const handlePayment = async () => {
    setPaymentError(null);
    setPaymentLoading(true);

    const tokensToBy = customTokens ? parseInt(customTokens) : selectedPackage.tokens;
    if (!tokensToBy || tokensToBy < 1) {
      setPaymentError('Укажите сумму пополнения');
      setPaymentLoading(false);
      return;
    }

    try {
      const result = await createPayment(tokensToBy);

      if (result.payment_url) {
        window.location.href = result.payment_url;
      }
    } catch (err) {
      setPaymentError((err as Error).message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const referralLink = referralCode
    ? `https://ai-taip.com?ref=${referralCode}`
    : '';

  const referralShareText = referralLink
    ? `Попробуй AI-taip — ИИ-платформу для генерации изображений, видео, озвучки и чата с нейросетью. Регистрируйся по моей ссылке и получи 1 000 ₽ на баланс бесплатно!\n\n${referralLink}`
    : '';

  const handleCopyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralShareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Светлая', icon: Sun },
    { value: 'dark', label: 'Тёмная', icon: Moon },
    { value: 'system', label: 'Системная', icon: Monitor },
  ];

  const userInitial = (user?.user_metadata?.display_name?.[0] || user?.email?.[0] || 'U').toUpperCase();

  return (
    <div className="min-h-full pb-[max(3rem,calc(env(safe-area-inset-bottom)+1rem))] sm:pb-16">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-50/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-slate-200/40 dark:border-gray-800/40 pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="flex items-center gap-3 h-14 sm:h-16">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight">Настройки</h1>
            <button
              onClick={() => signOut()}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 active:bg-red-100 dark:active:bg-red-500/15 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-6 md:px-8 pt-5 sm:pt-8 space-y-5 sm:space-y-7">
        {/* Profile Card */}
        <div className="flex items-center gap-3.5 sm:gap-4 p-4 sm:p-5 bg-white/60 dark:bg-gray-900/50 rounded-2xl border border-slate-200/50 dark:border-gray-800/50">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-lg sm:text-xl font-bold text-white shrink-0 shadow-lg shadow-cyan-500/20">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-gray-100 truncate">
              {displayName || user?.email?.split('@')[0] || 'Пользователь'}
            </p>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Balance Section */}
        <section className="space-y-3">
          <SectionHeader icon={Coins} iconColor="text-amber-400" title="Баланс" />
          <div className="bg-white/60 dark:bg-gray-900/50 rounded-2xl border border-slate-200/50 dark:border-gray-800/50 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-800 dark:text-gray-100">
                    {tokens !== null ? tokens.toFixed(2) : '--'}
                  </span>
                  <span className="text-sm font-medium text-slate-400 dark:text-gray-500">₽</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-1">Стоимость зависит от модели и длины запроса</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowBonus(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-sm text-white font-medium shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 active:scale-[0.97] transition-all"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Gift className="w-4 h-4" />
                    Бонус
                  </span>
                </button>
                <button
                  onClick={() => setShowPromo(true)}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-sm text-white font-medium shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 active:scale-[0.97] transition-all"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <Coins className="w-4 h-4" />
                    Пополнить
                  </span>
                </button>
              </div>
            </div>
            {tokens !== null && tokens < 10 && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <p className="text-xs text-amber-600 dark:text-amber-300">Баланс заканчивается. Пополните, чтобы продолжить.</p>
              </div>
            )}
          </div>
        </section>

        {/* Profile Section */}
        <section className="space-y-3">
          <SectionHeader icon={User} iconColor="text-cyan-400" title="Профиль" />
          <div className="bg-white/60 dark:bg-gray-900/50 rounded-2xl border border-slate-200/50 dark:border-gray-800/50 divide-y divide-slate-200/50 dark:divide-gray-800/50">
            {/* Display Name */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <label className="text-xs font-medium text-slate-500 dark:text-gray-400">Имя пользователя</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Введите имя"
                  className="flex-1 bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all"
                />
                <SaveButton onClick={handleSaveName} loading={profileSaving} />
              </div>
              <FeedbackMessage message={profileMessage} />
            </div>

            {/* Nickname */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400">
                <AtSign className="w-3 h-3" />
                Никнейм
                <span className="text-slate-400/70 dark:text-gray-600 font-normal">(для получения медиа)</span>
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  placeholder="my_nickname"
                  maxLength={24}
                  className="flex-1 bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all font-mono"
                />
                <SaveButton onClick={handleSaveNickname} loading={nicknameSaving} />
              </div>
              <FeedbackMessage message={nicknameMessage} />
            </div>

            {/* Email */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400">
                <Mail className="w-3 h-3" />
                E-mail
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Новый e-mail"
                  className="flex-1 bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all"
                />
                <SaveButton onClick={handleChangeEmail} loading={emailSaving} label="Изменить" />
              </div>
              <FeedbackMessage message={emailMessage} />
            </div>

            {/* Password */}
            <div className="p-4 sm:p-5 space-y-2.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400">
                <Lock className="w-3 h-3" />
                Сменить пароль
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Новый пароль (мин. 6 символов)"
                    className="w-full bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <SaveButton onClick={handleChangePassword} loading={passwordSaving} disabled={!newPassword} label="Обновить" />
              </div>
              <FeedbackMessage message={passwordMessage} />
            </div>
          </div>
        </section>

        {/* Theme Section */}
        <section className="space-y-3">
          <SectionHeader icon={Palette} iconColor="text-violet-400" title="Оформление" />
          <div className="bg-white/60 dark:bg-gray-900/50 rounded-2xl border border-slate-200/50 dark:border-gray-800/50 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {themeOptions.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`relative flex flex-col items-center gap-2 sm:gap-2.5 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 active:scale-[0.97] ${
                    theme === value
                      ? 'border-cyan-500 bg-cyan-500/8 text-cyan-600 dark:text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'border-transparent bg-slate-50 dark:bg-gray-800/50 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-colors ${
                    theme === value
                      ? 'bg-cyan-500/15'
                      : 'bg-slate-200/50 dark:bg-gray-700/50'
                  }`}>
                    <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{label}</span>
                  {theme === value && (
                    <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Data Storage Section */}
        <section className="space-y-3">
          <SectionHeader icon={Database} iconColor="text-blue-400" title="Хранение данных" />
          <div className="bg-white/60 dark:bg-gray-900/50 rounded-2xl border border-slate-200/50 dark:border-gray-800/50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-gray-200 mb-1">Облачное хранение</p>
                <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 leading-relaxed">
                  Чаты, озвучки, изображения и видео сохраняются в облаке и привязаны к вашему аккаунту. Доступны с любого устройства после входа.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Bonus / Referral Modal */}
      {showBonus && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowBonus(false)}>
          <div className="absolute inset-0 bg-slate-900/50 dark:bg-gray-950/80 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 sm:space-y-5 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                  <Gift className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Бонусная программа</h3>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500">Зарабатывайте на рефералах</p>
                </div>
              </div>
              <button
                onClick={() => setShowBonus(false)}
                className="p-2.5 -mr-1 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 p-4">
              <div className="flex items-center justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-gray-200">Ваша комиссия</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">С каждого платежа реферала</p>
                </div>
                <span className="text-3xl font-bold text-cyan-500 dark:text-cyan-400">10%</span>
              </div>
              <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-3.5 sm:p-4 border border-slate-200/40 dark:border-gray-700/40">
                <Users className="w-4 h-4 text-cyan-400 mb-1.5" />
                <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100">{referralCount}</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Приглашено</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-800/50 rounded-xl p-3.5 sm:p-4 border border-slate-200/40 dark:border-gray-700/40">
                <TrendingUp className="w-4 h-4 text-emerald-400 mb-1.5" />
                <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-gray-100">{totalEarnings}</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Заработано, ₽</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-gray-300">Ваша реферальная ссылка</p>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-gray-800/60 border border-slate-200/50 dark:border-gray-700/40 rounded-xl p-1">
                <div className="flex-1 px-2.5 sm:px-3 py-2 text-xs sm:text-sm text-slate-600 dark:text-gray-300 truncate font-mono">
                  {referralLink || 'Загрузка...'}
                </div>
                <button
                  onClick={handleCopyLink}
                  className={`shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    copied
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300'
                      : 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-500/25'
                  }`}
                >
                  {copied ? (
                    <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Скопировано</span>
                  ) : (
                    <span className="flex items-center gap-1.5"><Copy className="w-3.5 h-3.5" /> Копировать</span>
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-600 dark:text-gray-300">Как это работает</p>
              <div className="space-y-1.5">
                {[
                  { icon: Share2, color: 'text-cyan-400', bg: 'bg-cyan-500/10', title: 'Поделитесь ссылкой', desc: 'Отправьте ссылку друзьям или коллегам' },
                  { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/10', title: 'Друг регистрируется', desc: 'Они создают аккаунт по вашей ссылке' },
                  { icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-500/10', title: 'Вы получаете 10%', desc: 'С каждого пополнения реферала' },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-50/50 dark:bg-gray-800/30 border border-slate-200/30 dark:border-gray-700/20">
                    <div className={`w-8 h-8 rounded-lg ${step.bg} flex items-center justify-center shrink-0`}>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{step.title}</p>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {referrals.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-600 dark:text-gray-300">Недавняя активность</p>
                <div className="space-y-1">
                  {referrals.map((r, i) => (
                    <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50/50 dark:bg-gray-800/20">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-200/50 dark:bg-gray-700/50 flex items-center justify-center">
                          <UserPlus className="w-3 h-3 text-slate-400 dark:text-gray-400" />
                        </div>
                        <span className="text-xs text-slate-500 dark:text-gray-400">Новый реферал</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {r.earned > 0 && (
                          <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400">+{r.earned}</span>
                        )}
                        <span className="text-[10px] text-slate-400 dark:text-gray-600">
                          {new Date(r.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Promo Notice Modal */}
      {showPromo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPromo(false)} />
          <div className="relative w-full max-w-md animate-[fadeScaleIn_0.35s_ease-out]">
            <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-slate-200/50 dark:border-gray-800/50 shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-emerald-500/10 pointer-events-none" />
              <div className="relative px-6 pt-8 pb-6 text-center">
                <div className="flex justify-center mb-5">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30">
                      <Gift className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg animate-bounce">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Бесплатный период!
                </h3>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-4">
                  <PartyPopper className="w-3.5 h-3.5" />
                  Сентябрь 2026
                </div>

                <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed mb-4">
                  До конца сентября пополнение счёта приостановлено. Мы дарим каждому пользователю{' '}
                  <span className="font-bold text-cyan-600 dark:text-cyan-400">1 000 ₽</span>{' '}
                  для тестирования нашего сервиса и новых моделей, которые мы внедрили.
                </p>

                <p className="text-sm text-slate-600 dark:text-gray-400 leading-relaxed mb-6">
                  Пробуйте генерацию изображений, видео, озвучку и чат — всё это уже доступно на вашем балансе.
                </p>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-gray-500 mb-6">
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                  <span>Спасибо, что выбрали нас!</span>
                  <Heart className="w-3.5 h-3.5 text-rose-400" />
                </div>

                <button
                  onClick={() => setShowPromo(false)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all duration-200"
                >
                  Понятно!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => { setShowPayment(false); setPaymentError(null); }}>
          <div className="absolute inset-0 bg-slate-900/50 dark:bg-gray-950/80 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 sm:space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto sm:hidden" />

            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Пополнить баланс</h3>
              <button
                onClick={() => { setShowPayment(false); setPaymentError(null); }}
                className="p-2.5 -mr-1 rounded-xl text-slate-400 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
              Выберите сумму пополнения в рублях. Средства списываются по факту использования моделей.
            </p>

            <div className="grid grid-cols-2 gap-2">
              {TOKEN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.tokens}
                  onClick={() => { setSelectedPackage(pkg); setCustomTokens(''); }}
                  className={`p-3 sm:p-3.5 rounded-xl border-2 text-center transition-all active:scale-[0.97] ${
                    !customTokens && selectedPackage.tokens === pkg.tokens
                      ? 'border-cyan-500 bg-cyan-500/8 text-cyan-600 dark:text-cyan-300 shadow-sm shadow-cyan-500/10'
                      : 'border-transparent bg-slate-50 dark:bg-gray-800/50 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <p className="text-lg sm:text-xl font-bold">{pkg.price.toLocaleString('ru-RU')}</p>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-0.5">руб.</p>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-gray-400 mb-1.5">Или введите свою сумму</label>
              <input
                type="number"
                min="1"
                max="100000"
                value={customTokens}
                onChange={(e) => setCustomTokens(e.target.value)}
                placeholder="Сумма в рублях"
                className="w-full bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700/60 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/30 transition-all"
              />
              {customTokens && (
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1.5">
                  К оплате: {customTokens} руб.
                </p>
              )}
            </div>

            {paymentError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-500 dark:text-red-300">{paymentError}</p>
              </div>
            )}

            <button
              onClick={handlePayment}
              disabled={paymentLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 active:scale-[0.98] transition-all duration-300 disabled:opacity-60"
            >
              {paymentLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Coins className="w-4 h-4" />
              )}
              {paymentLoading ? 'Переход к оплате...' : `Оплатить ${customTokens || selectedPackage.price} руб.`}
            </button>

            <p className="text-[11px] text-slate-400 dark:text-gray-500 text-center">
              Оплата проходит через ЮKassa. После оплаты средства зачислятся автоматически.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, iconColor, title }: { icon: typeof Coins; iconColor: string; title: string }) {
  return (
    <h2 className="text-sm font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2 px-1">
      <Icon className={`w-4 h-4 ${iconColor}`} />
      {title}
    </h2>
  );
}

function SaveButton({ onClick, loading, disabled, label = 'Сохранить' }: { onClick: () => void; loading: boolean; disabled?: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className="px-4 py-2.5 rounded-xl bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 text-sm font-medium hover:bg-cyan-500/20 active:scale-[0.97] transition-all disabled:opacity-40"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
    </button>
  );
}

function FeedbackMessage({ message }: { message: { type: 'success' | 'error'; text: string } | null }) {
  if (!message) return null;
  return (
    <p className={`text-xs ${message.type === 'success' ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
      {message.text}
    </p>
  );
}
