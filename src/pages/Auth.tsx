import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, Gift, ChevronDown, Video, Image, Mic, MessageCircle, Mail, Lock, Eye, EyeOff, Users, Wifi, X, Sparkles, Zap, Crown, Check, ShieldCheck, type LucideIcon } from 'lucide-react';
import { FloatingIcons, MouseSpotlight, useMouseGlow } from '@/components/AnimatedBackground';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';



function useUserStats() {
  const [stats, setStats] = useState<{ total_users: number; online_users: number } | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/user-stats`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.total_users === 'number' && typeof data.online_users === 'number') {
        setStats(data);
      }
    } catch {
      // silently ignore
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  return stats;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString('ru-RU');
}

function StatsBar({ stats, variant }: { stats: { total_users: number; online_users: number } | null; variant: 'desktop' | 'mobile' }) {
  if (!stats) return null;

  if (variant === 'desktop') {
    return (
      <div className="flex items-center gap-6 mt-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xl font-bold text-white tabular-nums">{formatNumber(stats.total_users)}</p>
            <p className="text-[11px] text-gray-500">пользователей</p>
          </div>
        </div>
        <div className="w-px h-10 bg-white/10" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center relative">
            <Wifi className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div>
            <p className="text-xl font-bold text-white tabular-nums">{formatNumber(stats.online_users)}</p>
            <p className="text-[11px] text-gray-500">сейчас онлайн</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-4 sm:gap-6">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
          <Users className="w-4 h-4 text-cyan-500 dark:text-cyan-400" strokeWidth={1.5} />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums leading-tight">{formatNumber(stats.total_users)}</p>
          <p className="text-[10px] text-slate-400 dark:text-gray-500">пользователей</p>
        </div>
      </div>
      <div className="w-px h-8 bg-slate-200 dark:bg-white/10" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center relative">
          <Wifi className="w-4 h-4 text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums leading-tight">{formatNumber(stats.online_users)}</p>
          <p className="text-[10px] text-slate-400 dark:text-gray-500">онлайн</p>
        </div>
      </div>
    </div>
  );
}

interface ModelInfo {
  name: string;
  badge?: 'top' | 'new' | 'fast';
  description: string;
}

interface FeatureCategory {
  Icon: LucideIcon;
  title: string;
  desc: string;
  models: ModelInfo[];
}

const FEATURES: FeatureCategory[] = [
  {
    Icon: MessageCircle,
    title: 'Умный чат',
    desc: 'GPT 5, Claude Opus 5, Gemini 3.7 Flash, Grok 4.6, DeepSeek V4',
    models: [
      { name: 'GPT 5', badge: 'top', description: 'Самая мощная модель OpenAI. Идеальна для сложных задач: анализ данных, написание кода, глубокие рассуждения и креативные тексты.' },
      { name: 'GPT 5 Mini', badge: 'fast', description: 'Облегчённая версия GPT 5. Быстрые ответы при сохранении высокого качества. Подходит для повседневных задач и диалогов.' },
      { name: 'GPT 4.1', description: 'Универсальная модель для работы с текстом, кодом и изображениями. Отличный баланс скорости и качества.' },
      { name: 'GPT 4.1 Mini', badge: 'fast', description: 'Компактная и быстрая модель для простых задач: ответы на вопросы, перевод, суммаризация.' },
      { name: 'o4 Mini', badge: 'new', description: 'Новейшая модель рассуждений от OpenAI. Улучшенная логика и математические способности.' },
      { name: 'o3', description: 'Модель-мыслитель с глубоким рассуждением. Решает математику, логические задачи и сложное программирование.' },
      { name: 'Claude Opus 5', badge: 'top', description: 'Флагман Anthropic. Исключительно глубокий анализ, творческое письмо, сложный код и научные задачи.' },
      { name: 'Claude Sonnet 5', description: 'Новейшая модель Anthropic с отличным качеством кода и рассуждений.' },
      { name: 'Claude Sonnet 4', description: 'Сбалансированная модель для профессиональной работы. Код, тексты, анализ документов.' },
      { name: 'Claude Haiku 4.5', badge: 'fast', description: 'Быстрая и недорогая модель Anthropic для ежедневных задач. Мгновенные ответы, суммаризация.' },
      { name: 'Gemini 3.7 Flash', badge: 'new', description: 'Новейшая быстрая модель Google с улучшенным качеством рассуждений.' },
      { name: 'Gemini 3.5 Flash', description: 'Мощная мультимодальная модель Google для агентов и кода.' },
      { name: 'Gemini 2.5 Pro', badge: 'top', description: 'Топ-модель Google с огромным контекстом. Анализ длинных документов, код, мультимодальность.' },
      { name: 'Grok 4.6', badge: 'new', description: 'Топовая модель xAI. Глубокое рассуждение, актуальные данные и креативные ответы.' },
      { name: 'DeepSeek V4 Pro', description: 'Мощнейшая модель DeepSeek. Программирование, математика и научные задачи на уровне топ-моделей.' },
      { name: 'Llama 4 Maverick', description: 'Открытая модель от Meta нового поколения. Универсальная, мощная и доступная.' },
      { name: 'Mistral Large', description: 'Флагман Mistral. Рассуждения, код, многоязычность и следование сложным инструкциям.' },
    ],
  },
  {
    Icon: Image,
    title: 'Генерация изображений',
    desc: 'GPT Image 2, Flux.2 Max, Recraft V4.1, Seedream 5.0, Krea 2',
    models: [
      { name: 'GPT Image 2', badge: 'top', description: 'Генератор изображений от OpenAI нового поколения. Точно следует текстовым описаниям, создаёт фотореалистичные сцены, иллюстрации и дизайны.' },
      { name: 'GPT Image 1', description: 'Первое поколение генератора OpenAI. Стабильное качество и проверенная надёжность.' },
      { name: 'Flux.2 Max', badge: 'top', description: 'Самая мощная модель от Black Forest Labs. Невероятная детализация, реалистичные текстуры и точное следование промпту.' },
      { name: 'Flux.2 Pro', description: 'Профессиональная версия Flux 2. Высокое качество для студийных и рекламных задач.' },
      { name: 'Flux.2 Flex', description: 'Гибкая версия Flux 2 для быстрой итерации и экспериментов с изображениями.' },
      { name: 'Recraft V4.1', badge: 'new', description: 'Продвинутая модель для дизайнеров. Векторные иллюстрации, иконки, логотипы и брендированный контент.' },
      { name: 'Recraft V4.1 Pro', description: 'Профессиональная версия Recraft с повышенным качеством и детализацией.' },
      { name: 'Muse Image', description: 'Модель от Google для художественной генерации. Сильна в абстрактных стилях и концепт-арте.' },
      { name: 'Seedream 5.0 Pro', badge: 'new', description: 'Новейшая модель от ByteDance. Яркие, детализированные изображения с кинематографическим качеством.' },
      { name: 'Gemini 3.1 Flash Image', badge: 'fast', description: 'Быстрая генерация изображений от Google с натуральным качеством.' },
      { name: 'Grok Imagine Image 2.0', description: 'Генератор изображений от xAI. Креативные и выразительные визуализации.' },
      { name: 'Qwen Image 3 Pro', description: 'Модель от Alibaba с высоким качеством на азиатских и европейских стилях.' },
      { name: 'Krea 2 Large', badge: 'new', description: 'Мощная модель для создания высокодетализированных изображений.' },
      { name: 'Riverflow V2.5 Fast', badge: 'fast', description: 'Быстрая генерация с хорошим качеством для итеративной работы.' },
    ],
  },
  {
    Icon: Video,
    title: 'Создание видео',
    desc: 'Veo 3.1, Sora 2 Pro, Kling 3.0, Seedance 2.5, Hailuo 3',
    models: [
      { name: 'Veo 3.1', badge: 'top', description: 'Флагманская видеомодель Google. Кинематографические ролики со встроенным звуком и диалогами. Реалистичная физика.' },
      { name: 'Veo 3.1 Fast', badge: 'fast', description: 'Быстрая версия Veo 3.1. Оперативная генерация с высоким качеством.' },
      { name: 'Veo 3.1 Lite', description: 'Облегчённая версия Veo для быстрых итераций и тестирования идей.' },
      { name: 'Sora 2 Pro', badge: 'top', description: 'Топовая видеомодель OpenAI. Длинные связные сцены с кинематографическим качеством.' },
      { name: 'Kling 3.0 Pro', badge: 'new', description: 'Новейшая модель от Kuaishou. Впечатляющая работа с движением людей, динамичные сцены.' },
      { name: 'Kling Video o1', description: 'Модель Kling с расширенными рассуждениями для точного следования сценарию.' },
      { name: 'Seedance 2.5', badge: 'new', description: 'Модель от ByteDance для динамичных видео. Точное воспроизведение движений тела и хореографии.' },
      { name: 'Wan 3.0', description: 'Новое поколение видеомодели от Alibaba. Стилизованные ролики и визуальные эффекты.' },
      { name: 'Hailuo 3', description: 'Модель от MiniMax с фокусом на эмоциональные и атмосферные видео. Плавные переходы.' },
      { name: 'Gen 4.5', description: 'Модель от Runway для профессионального видеопроизводства.' },
      { name: 'Aleph 2', description: 'Модель для создания креативных и экспериментальных видеороликов.' },
      { name: 'Grok Imagine Video 1.5', badge: 'new', description: 'Видеогенерация от xAI с характерной выразительностью и стилем.' },
      { name: 'Flux 3 Video', description: 'Видеомодель от Black Forest Labs. Высокая детализация и реалистичные текстуры.' },
    ],
  },
  {
    Icon: Mic,
    title: 'Озвучка текста',
    desc: 'GPT-4o Mini TTS, Gemini 3.1 Flash TTS, Grok Voice, MAI Voice 2',
    models: [
      { name: 'GPT-4o Mini TTS', badge: 'top', description: 'Продвинутая модель озвучки от OpenAI. Естественная интонация, выразительное чтение с эмоциями. Множество голосов на выбор.' },
      { name: 'Speech 2.8 Turbo', badge: 'fast', description: 'Сверхбыстрый синтез речи. Мгновенная генерация с хорошим качеством для потоковой озвучки.' },
      { name: 'Gemini 3.1 Flash TTS', badge: 'fast', description: 'Быстрая озвучка от Google. Мгновенная генерация речи с натуральным звучанием.' },
      { name: 'Grok Voice TTS 1.0', badge: 'new', description: 'Голосовая модель xAI с характерной выразительностью. Живая и динамичная речь.' },
      { name: 'TTS-1', description: 'Универсальная модель синтеза речи от OpenAI. Стабильное качество и широкий выбор голосов.' },
      { name: 'TTS-1 HD', description: 'Версия повышенного качества от OpenAI. Чёткая и детализированная речь для профессиональных задач.' },
      { name: 'MAI Voice 2 Flash', badge: 'new', description: 'Быстрый синтез речи от Microsoft с поддержкой русского языка.' },
      { name: 'MAI Voice 2', description: 'Улучшенная модель озвучки от Microsoft. Высокое качество голоса.' },
      { name: 'Voxtral Mini TTS', description: '30 голосов с эмоциями и клонирование голоса от Mistral.' },
      { name: 'Aura 2', description: 'Высококачественный синтез речи от Deepgram с большим набором голосов.' },
      { name: 'Zonos Transformer', description: 'Клонирование голоса по образцу. Поддержка русского языка.' },
      { name: 'Orpheus 3B', description: 'Экспрессивный синтез речи с 8 голосами от Canopy Labs.' },
      { name: 'Kokoro 82M', badge: 'fast', description: 'Компактная и самая доступная модель синтеза речи.' },
      { name: 'Qwen Audio 3.0 TTS Flash', description: 'Быстрая модель озвучки от Alibaba.' },
      { name: 'Speech 2.8 HD', description: 'Версия высокого качества Speech 2.8. Подходит для аудиокниг и подкастов.' },
    ],
  },
];



function AVMonogram({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-black tracking-tighter select-none ${className}`}
      style={{ fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif" }}
      aria-hidden
    >
      AV
    </span>
  );
}

const BADGE_CONFIG = {
  top: { label: 'Топ', icon: Crown, colors: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  new: { label: 'Новая', icon: Sparkles, colors: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  fast: { label: 'Быстрая', icon: Zap, colors: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
} as const;

function FeatureModal({ feature, onClose }: { feature: FeatureCategory; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-2xl max-h-[85vh] bg-gray-950 border border-gray-800/60 rounded-2xl shadow-2xl shadow-black/50 flex flex-col animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
              <feature.Icon className="w-5 h-5 text-cyan-400" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{feature.title}</h3>
              <p className="text-xs text-gray-500">{feature.models.length} моделей доступно</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 active:bg-white/15 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 pt-4 space-y-3 overscroll-contain">
          {feature.models.map((model) => {
            const badge = model.badge ? BADGE_CONFIG[model.badge] : null;
            return (
              <div
                key={model.name}
                className="group bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] hover:border-cyan-500/15 rounded-xl p-4 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {model.name}
                  </h4>
                  {badge && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${badge.colors}`}>
                      <badge.icon className="w-2.5 h-2.5" />
                      {badge.label}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{model.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 1, label: 'Слабый', color: 'bg-red-400' };
  if (score <= 2) return { level: 2, label: 'Средний', color: 'bg-amber-400' };
  if (score <= 3) return { level: 3, label: 'Хороший', color: 'bg-cyan-400' };
  return { level: 4, label: 'Надёжный', color: 'bg-emerald-400' };
}

function PasswordStrength({ password }: { password: string }) {
  const { level, label, color } = getPasswordStrength(password);
  return (
    <div className="flex items-center gap-2.5 mt-2">
      <div className="flex-1 flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= level ? color : 'bg-slate-200 dark:bg-gray-700/50'
            }`}
          />
        ))}
      </div>
      <span className={`text-[10px] font-semibold shrink-0 transition-colors ${
        level <= 1 ? 'text-red-400' : level <= 2 ? 'text-amber-400' : level <= 3 ? 'text-cyan-400' : 'text-emerald-400'
      }`}>
        {label}
      </span>
    </div>
  );
}

function BrandPanel({ stats, mousePos, setActiveFeature }: { stats: { total_users: number; online_users: number } | null; mousePos: { x: number; y: number } | null; setActiveFeature: (f: FeatureCategory) => void }) {
  return (
    <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 flex-col items-center justify-center p-12 overflow-hidden">
      <FloatingIcons mousePos={mousePos} />
      <MouseSpotlight pos={mousePos} />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-blue-600/[0.06] pointer-events-none" />

      <div className="relative z-10 max-w-md space-y-10">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-white tracking-tight leading-tight">
            Создавайте контент<br />с помощью ИИ
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Единая платформа для генерации текста, изображений, видео и озвучки на базе лучших моделей искусственного интеллекта.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {FEATURES.map((feature) => (
            <button
              key={feature.title}
              type="button"
              onClick={() => setActiveFeature(feature)}
              className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-4 space-y-2 hover:bg-white/[0.07] hover:border-cyan-500/20 transition-all duration-300 text-left group cursor-pointer"
            >
              <feature.Icon className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-white">{feature.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">{feature.desc}</p>
            </button>
          ))}
        </div>

        <StatsBar stats={stats} variant="desktop" />
      </div>
    </div>
  );
}

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const stats = useUserStats();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [showRequisites, setShowRequisites] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [isForgot, setIsForgot] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setRefCode(ref);
      setIsLogin(false);
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl,
    });
    if (resetErr) {
      console.error('Password reset error:', resetErr);
      setError('Не удалось отправить ссылку. Попробуйте позже.');
    } else {
      setSuccess('Ссылка для сброса пароля отправлена на вашу почту. Проверьте входящие и папку «Спам».');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (isLogin) {
      const err = await signIn(email, password);
      if (err) setError(err);
    } else {
      if (password !== confirmPassword) {
        setError('Пароли не совпадают');
        setLoading(false);
        return;
      }
      const err = await signUp(email, password);
      if (err) {
        setError(err);
      } else {
        setSuccess('verify_email');
        if (refCode) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
              await fetch(`${supabaseUrl}/functions/v1/register-referral`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ referral_code: refCode }),
              });
            }
          } catch {
            // Silently ignore referral errors
          }
        }
      }
    }
    setLoading(false);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useMouseGlow(containerRef);
  const [activeFeature, setActiveFeature] = useState<FeatureCategory | null>(null);

  return (
    <div ref={containerRef} className="h-full flex flex-col lg:flex-row relative">
      {/* Left: brand showcase (desktop only) */}
      <BrandPanel stats={stats} mousePos={mousePos} setActiveFeature={setActiveFeature} />

      {activeFeature && (
        <FeatureModal feature={activeFeature} onClose={() => setActiveFeature(null)} />
      )}

      {/* Desktop AV monogram at the seam between panels */}
      <div className="hidden lg:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
        <AVMonogram className="text-[260px] xl:text-[320px] text-transparent bg-clip-text bg-gradient-to-r from-cyan-500/[0.10] via-cyan-400/[0.06] to-transparent" />
      </div>

      {/* Right: form panel */}
      <div className="flex-1 relative bg-slate-50 dark:bg-gray-950 overflow-y-auto">
        {/* Mobile-only floating icons */}
        <div className="lg:hidden">
          <FloatingIcons mousePos={null} />
        </div>

        {/* Radial glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] lg:w-[500px] lg:h-[500px] bg-cyan-500/[0.06] dark:bg-cyan-500/[0.04] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center min-h-full px-5 sm:px-8 py-10 safe-pb">
          <div className="w-full max-w-[400px] space-y-6 relative">

            {/* Mobile decorative AV monogram behind card */}
            <div className="lg:hidden absolute left-1/2 -translate-x-1/2 -top-24 sm:-top-28 pointer-events-none">
              <AVMonogram className="text-[200px] sm:text-[260px] text-transparent bg-clip-text bg-gradient-to-b from-cyan-500/[0.08] via-cyan-400/[0.05] to-transparent dark:from-cyan-400/[0.07] dark:via-cyan-500/[0.04] dark:to-transparent" />
            </div>

            {/* Glass card */}
            <div className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-xl border border-white/30 dark:border-gray-800/50 rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/5 dark:shadow-black/30 p-6 sm:p-8 space-y-6">

              {/* Header */}
              {isForgot ? (
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center mx-auto mb-3">
                    <Mail className="w-5.5 h-5.5 text-cyan-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Сброс пароля</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Восстановите доступ к аккаунту</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                      {isLogin ? 'Добро пожаловать' : 'Создайте аккаунт'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">
                      {isLogin ? 'Войдите для доступа к платформе' : 'Присоединяйтесь к AviRond'}
                    </p>
                  </div>
                  {/* Segmented tab switcher */}
                  <div className="relative flex bg-slate-100 dark:bg-gray-800/60 rounded-xl p-1">
                    <div
                      className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white dark:bg-gray-700/80 rounded-lg shadow-sm transition-transform duration-300 ease-out ${
                        isLogin ? 'translate-x-0' : 'translate-x-[calc(100%+8px)]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => { setIsLogin(true); setError(null); setSuccess(null); setConfirmPassword(''); }}
                      className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                        isLogin ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                      }`}
                    >
                      Вход
                    </button>
                    <button
                      type="button"
                      onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
                      className={`relative z-10 flex-1 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                        !isLogin ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                      }`}
                    >
                      Регистрация
                    </button>
                  </div>
                </div>
              )}

              {refCode && !isLogin && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Gift className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-200">Вы регистрируетесь по реферальной ссылке</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={isForgot ? handleForgotPassword : handleSubmit} className="space-y-4 sm:space-y-5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 pl-0.5">Email</label>
                  <div className={`flex items-center gap-3 bg-white/90 dark:bg-gray-800/50 border rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 transition-all duration-200 ${
                    emailFocused
                      ? 'border-cyan-500/50 ring-2 ring-cyan-500/20 shadow-sm shadow-cyan-500/10'
                      : 'border-slate-200/80 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600'
                  }`}>
                    <Mail className={`w-4 h-4 shrink-0 transition-colors ${emailFocused ? 'text-cyan-500' : 'text-slate-400 dark:text-gray-500'}`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      required
                      className="w-full bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                {!isForgot && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 pl-0.5">Пароль</label>
                        {isLogin && (
                          <button
                            type="button"
                            onClick={() => { setIsForgot(true); setError(null); setSuccess(null); }}
                            className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors font-medium"
                          >
                            Забыли пароль?
                          </button>
                        )}
                      </div>
                      <div className={`flex items-center gap-3 bg-white/90 dark:bg-gray-800/50 border rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 transition-all duration-200 ${
                        passFocused
                          ? 'border-cyan-500/50 ring-2 ring-cyan-500/20 shadow-sm shadow-cyan-500/10'
                          : 'border-slate-200/80 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600'
                      }`}>
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
                          placeholder={isLogin ? 'Введите пароль' : 'Минимум 6 символов'}
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
                      {/* Password strength (registration only) */}
                      {!isLogin && password.length > 0 && (
                        <PasswordStrength password={password} />
                      )}
                    </div>

                    {/* Confirm password (registration only) */}
                    {!isLogin && (
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-slate-600 dark:text-gray-400 pl-0.5">Подтверждение пароля</label>
                        <div className={`flex items-center gap-3 bg-white/90 dark:bg-gray-800/50 border rounded-xl px-3.5 sm:px-4 py-3 sm:py-3.5 transition-all duration-200 ${
                          confirmFocused
                            ? 'border-cyan-500/50 ring-2 ring-cyan-500/20 shadow-sm shadow-cyan-500/10'
                            : confirmPassword && confirmPassword === password
                              ? 'border-emerald-400/50 dark:border-emerald-500/40'
                              : confirmPassword && confirmPassword !== password
                                ? 'border-red-400/50 dark:border-red-500/40'
                                : 'border-slate-200/80 dark:border-gray-700/50 hover:border-slate-300 dark:hover:border-gray-600'
                        }`}>
                          <ShieldCheck className={`w-4 h-4 shrink-0 transition-colors ${
                            confirmFocused ? 'text-cyan-500'
                              : confirmPassword && confirmPassword === password ? 'text-emerald-500'
                                : 'text-slate-400 dark:text-gray-500'
                          }`} />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            onFocus={() => setConfirmFocused(true)}
                            onBlur={() => setConfirmFocused(false)}
                            required
                            minLength={6}
                            className="w-full bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
                            placeholder="Повторите пароль"
                          />
                          {confirmPassword && confirmPassword === password && (
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isForgot && (
                  <p className="text-xs text-slate-500 dark:text-gray-400 leading-relaxed">
                    Введите ваш email выше и нажмите кнопку. Мы отправим ссылку для сброса пароля.
                  </p>
                )}

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200/60 dark:border-red-500/20">
                    <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
                  </div>
                )}

                {success === 'verify_email' ? (
                  <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200/60 dark:border-cyan-500/20 space-y-2.5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <Mail className="w-4.5 h-4.5 text-cyan-500 dark:text-cyan-400" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <p className="text-sm font-semibold text-cyan-800 dark:text-cyan-200">Подтвердите почту</p>
                        <p className="text-xs text-cyan-700/80 dark:text-cyan-300/70 leading-relaxed">
                          Мы отправили ссылку на <span className="font-medium text-cyan-800 dark:text-cyan-200">{email}</span>. Откройте письмо и нажмите на ссылку, чтобы активировать аккаунт.
                        </p>
                        <p className="text-[11px] text-cyan-600/60 dark:text-cyan-400/50">Проверьте папку «Спам», если не видите письмо</p>
                      </div>
                    </div>
                  </div>
                ) : success && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200/60 dark:border-emerald-500/20">
                    <p className="text-xs text-emerald-600 dark:text-emerald-300">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:brightness-110 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isForgot ? 'Отправить ссылку' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                </button>
              </form>

              {isForgot && (
                <div className="text-center">
                  <button
                    onClick={() => { setIsForgot(false); setError(null); setSuccess(null); }}
                    className="text-sm text-slate-500 dark:text-gray-400 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                  >
                    Вспомнили пароль? <span className="font-semibold text-cyan-600 dark:text-cyan-400">Войдите</span>
                  </button>
                </div>
              )}
            </div>

            {/* Mobile stats */}
            <div className="lg:hidden">
              <StatsBar stats={stats} variant="mobile" />
            </div>

            {/* Footer */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <Link to="/privacy" className="text-[11px] text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  Политика конфиденциальности
                </Link>
                <span className="text-slate-300 dark:text-gray-700 text-[8px]">&#x2022;</span>
                <Link to="/terms" className="text-[11px] text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors">
                  Условия использования
                </Link>
              </div>
              <button
                onClick={() => setShowRequisites(v => !v)}
                className="flex items-center justify-center gap-1.5 mx-auto text-[11px] text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
              >
                Реквизиты
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${showRequisites ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ease-in-out ${showRequisites ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="bg-white/40 dark:bg-gray-900/30 backdrop-blur-sm border border-white/20 dark:border-gray-800/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 mt-1">
                    <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-2">
                      <div>
                        <p className="text-[10px] text-slate-400/80 dark:text-gray-600">ИП</p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-tight">Индивидуальный предприниматель</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400/80 dark:text-gray-600">Дата регистрации</p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400">20 апреля 2026 г.</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400/80 dark:text-gray-600">ОГРНИП</p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">326930100026381</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400/80 dark:text-gray-600">ИНН</p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 font-mono">614065786992</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
