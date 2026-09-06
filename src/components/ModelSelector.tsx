import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Sparkles, Globe } from 'lucide-react';

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  inputPrice: number;
  outputPrice: number;
  context: string;
  defaultTemperature: number;
  maxTemperature: number;
}

export const MODELS: ModelInfo[] = [
  // Anthropic — flagship
  { id: 'claude-opus-5', name: 'Claude Opus 5', provider: 'Anthropic', description: 'Флагман Anthropic. Исключительно глубокий анализ, творческое письмо, сложный код и научные задачи.', inputPrice: 100, outputPrice: 5000, context: '200K', defaultTemperature: 0.7, maxTemperature: 1 },
  // OpenAI
  { id: 'gpt-5', name: 'GPT 5', provider: 'OpenAI', description: 'Самая мощная модель OpenAI. Идеальна для сложных задач: анализ данных, написание кода, глубокие рассуждения и креативные тексты.', inputPrice: 25, outputPrice: 2000, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gpt-5-mini', name: 'GPT 5 Mini', provider: 'OpenAI', description: 'Облегчённая версия GPT 5. Быстрые ответы при сохранении высокого качества. Подходит для повседневных задач и диалогов.', inputPrice: 5, outputPrice: 400, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gpt-4.1', name: 'GPT 4.1', provider: 'OpenAI', description: 'Универсальная модель для работы с текстом, кодом и изображениями. Отличный баланс скорости и качества.', inputPrice: 100, outputPrice: 1600, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gpt-4.1-mini', name: 'GPT 4.1 Mini', provider: 'OpenAI', description: 'Компактная и быстрая модель для простых задач: ответы на вопросы, перевод, суммаризация.', inputPrice: 20, outputPrice: 320, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gpt-4.1-nano', name: 'GPT 4.1 Nano', provider: 'OpenAI', description: 'Самая быстрая и дешёвая модель OpenAI. Для мгновенных ответов и лёгких задач.', inputPrice: 5, outputPrice: 80, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gpt-4o', name: 'GPT 4o', provider: 'OpenAI', description: 'Мультимодальная модель с поддержкой текста, изображений и аудио. Быстрая и точная.', inputPrice: 250, outputPrice: 2000, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gpt-4o-mini', name: 'GPT 4o Mini', provider: 'OpenAI', description: 'Экономичная мультимодальная модель. Хороша для анализа изображений и быстрых ответов.', inputPrice: 15, outputPrice: 120, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'o3', name: 'o3', provider: 'OpenAI', description: 'Модель-мыслитель с глубоким рассуждением. Решает математику, логические задачи и сложное программирование.', inputPrice: 100, outputPrice: 1600, context: '200K', defaultTemperature: 1, maxTemperature: 1 },
  { id: 'o3-mini', name: 'o3 Mini', provider: 'OpenAI', description: 'Быстрая версия o3 для задач, требующих рассуждения. Баланс между глубиной мысли и скоростью.', inputPrice: 110, outputPrice: 880, context: '200K', defaultTemperature: 1, maxTemperature: 1 },
  { id: 'o4-mini', name: 'o4 Mini', provider: 'OpenAI', description: 'Новейшая модель рассуждений. Улучшенная логика и математические способности.', inputPrice: 55, outputPrice: 880, context: '200K', defaultTemperature: 1, maxTemperature: 1 },
  // Anthropic
  { id: 'claude-sonnet-5', name: 'Claude Sonnet 5', provider: 'Anthropic', description: 'Новейшая модель Anthropic с отличным качеством кода и рассуждений.', inputPrice: 40, outputPrice: 2000, context: '200K', defaultTemperature: 0.7, maxTemperature: 1 },
  { id: 'claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', description: 'Сбалансированная модель для профессиональной работы. Код, тексты, анализ документов.', inputPrice: 60, outputPrice: 3000, context: '200K', defaultTemperature: 0.7, maxTemperature: 1 },
  { id: 'claude-haiku-4.5', name: 'Claude Haiku 4.5', provider: 'Anthropic', description: 'Быстрая и недорогая модель. Быстрые ответы, классификация, простые задачи.', inputPrice: 20, outputPrice: 1000, context: '200K', defaultTemperature: 0.7, maxTemperature: 1 },
  // Google
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Топ-модель Google с огромным контекстом. Анализ длинных документов, код, мультимодальность.', inputPrice: 25, outputPrice: 2000, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Быстрая модель для работы с большими объёмами данных. Суммаризация, поиск, ответы.', inputPrice: 6, outputPrice: 500, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', provider: 'Google', description: 'Новейшая быстрая модель Google с улучшенным качеством рассуждений.', inputPrice: 7.5, outputPrice: 375, context: '262K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', provider: 'Google', description: 'Мощная мультимодальная модель Google для агентов и кода.', inputPrice: 30, outputPrice: 1800, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  // DeepSeek
  { id: 'deepseek-v4-pro-0813', name: 'DeepSeek V4 Pro 0813', provider: 'DeepSeek', description: 'Мощнейшая модель DeepSeek. Программирование, математика и научные задачи на уровне топ-моделей.', inputPrice: 4.4, outputPrice: 396, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'deepseek-v4-flash-vision-exp', name: 'DeepSeek V4 Flash Vision Exp', provider: 'DeepSeek', description: 'Быстрая модель с поддержкой зрения. Анализ изображений, схем и документов.', inputPrice: 1.4, outputPrice: 132, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', description: 'Модель с цепочкой рассуждений. Математика, логика и сложные вычисления.', inputPrice: 70, outputPrice: 430, context: '128K', defaultTemperature: 0.6, maxTemperature: 1.5 },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', description: 'Универсальная и доступная модель. Код, тексты и общие задачи по низкой цене.', inputPrice: 4.18, outputPrice: 61.92, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  // Meta
  { id: 'llama-4-maverick', name: 'Llama 4 Maverick', provider: 'Meta', description: 'Открытая модель Meta с огромным контекстом. Универсальна для текста, кода и анализа.', inputPrice: 40, outputPrice: 139.2, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'llama-4-scout', name: 'Llama 4 Scout', provider: 'Meta', description: 'Лёгкая и быстрая модель для поиска информации и ответов на вопросы.', inputPrice: 20, outputPrice: 60, context: '512K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'llama-3.3-70b-instruct', name: 'Llama 3.3 70B', provider: 'Meta', description: 'Проверенная open-source модель. Хороша для разнообразных задач с балансом цена/качество.', inputPrice: 20, outputPrice: 64, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  // Mistral AI
  { id: 'mistral-large-2512', name: 'Mistral Large', provider: 'Mistral AI', description: 'Флагман Mistral. Рассуждения, код, многоязычность и следование сложным инструкциям.', inputPrice: 10, outputPrice: 300, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'mistral-medium-3-5', name: 'Mistral Medium 3.5', provider: 'Mistral AI', description: 'Обновлённая средняя модель Mistral. Улучшенный анализ текстов, изображений и документов. Отличный баланс цены и качества для бизнес-задач.', inputPrice: 300, outputPrice: 1500, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'mistral-small-2603', name: 'Mistral Small', provider: 'Mistral AI', description: 'Быстрая европейская модель. Отлично работает с многоязычным контентом.', inputPrice: 3, outputPrice: 120, context: '128K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'codestral-2508', name: 'Codestral', provider: 'Mistral AI', description: 'Специализированная модель для программирования. Генерация, рефакторинг и объяснение кода.', inputPrice: 6, outputPrice: 180, context: '256K', defaultTemperature: 0.3, maxTemperature: 2 },
  // Qwen
  { id: 'qwen3.8-flash', name: 'Qwen3.8 Flash', provider: 'Qwen', description: 'Быстрая модель от Alibaba. Многоязычная, отлично работает с азиатскими языками и кодом.', inputPrice: 1.2, outputPrice: 26, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'qwen3.8-27b', name: 'Qwen3.8 27b', provider: 'Qwen', description: 'Средняя модель Qwen с хорошим балансом. Универсальна для текста и кода.', inputPrice: 8, outputPrice: 600, context: '262K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'qwen3.8-2.4t-a95b', name: 'Qwen3.8 2.4t A95b', provider: 'Qwen', description: 'Крупнейшая модель Qwen. Глубокий анализ, сложные задачи и научные вычисления.', inputPrice: 40, outputPrice: 1200, context: '262K', defaultTemperature: 0.7, maxTemperature: 2 },
  // Z AI
  { id: 'glm-5.3-flash', name: 'GLM 5.3 Flash', provider: 'Z AI', description: 'Быстрая модель от Zhipu AI. Эффективна для диалогов и генерации контента.', inputPrice: 15, outputPrice: 50, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'glm-5.3', name: 'GLM 5.3', provider: 'Z AI', description: 'Мощная модель Zhipu для сложного анализа, рассуждений и работы с документами.', inputPrice: 52.08, outputPrice: 880, context: '1M', defaultTemperature: 0.7, maxTemperature: 2 },
  // xAI
  { id: 'grok-4.6', name: 'Grok 4.6', provider: 'xAI', description: 'Топовая модель xAI. Глубокое рассуждение, актуальные данные и креативные ответы.', inputPrice: 100, outputPrice: 1200, context: '500K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'grok-4.5', name: 'Grok 4.5', provider: 'xAI', description: 'Мощная модель xAI для аналитики и рассуждений.', inputPrice: 60, outputPrice: 1200, context: '500K', defaultTemperature: 0.7, maxTemperature: 2 },
  { id: 'grok-4.3', name: 'Grok 4.3', provider: 'xAI', description: 'Быстрая и доступная модель xAI для повседневных запросов и аналитики.', inputPrice: 21, outputPrice: 63, context: '131K', defaultTemperature: 0.7, maxTemperature: 2 },
  // ByteDance
  { id: 'seed-2-1-turbo', name: 'Seed 2 1 Turbo', provider: 'ByteDance Seed', description: 'Модель ByteDance для быстрой генерации контента, диалогов и творческих задач.', inputPrice: 100, outputPrice: 500, context: '262K', defaultTemperature: 0.7, maxTemperature: 2 },
  // Muse
  { id: 'muse-spark-1.2-contributor', name: 'Muse Spark 1.2 Contributor', provider: 'Meta', description: 'Креативная модель для генерации идей, текстов и художественного контента.', inputPrice: 0.4, outputPrice: 40, context: '1M', defaultTemperature: 0.9, maxTemperature: 2 },
];

const PROVIDERS = ['Все', 'OpenAI', 'Anthropic', 'Google', 'DeepSeek', 'Meta', 'Mistral AI', 'Qwen', 'Z AI', 'xAI'];

function ProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  const s = size;
  switch (provider) {
    case 'OpenAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M22.2 8.61c.2-.6.3-1.23.3-1.86A5.25 5.25 0 0017.44 1.5a5.2 5.2 0 00-4.56 2.67A5.24 5.24 0 009 3a5.25 5.25 0 00-4.87 7.25 5.25 5.25 0 00.68 10.32 5.2 5.2 0 004.56-2.67c1.1.7 2.4 1.1 3.76 1.1a5.25 5.25 0 004.87-7.25 5.25 5.25 0 001.3-3.14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M14.5 7.5L9 12m0 0l5.5 4.5M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'Anthropic':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M13.5 3L21 21h-4l-1.5-3.75h-7L7 21H3L10.5 3h3z" fill="currentColor"/>
        </svg>
      );
    case 'Google':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" fill="currentColor"/>
        </svg>
      );
    case 'DeepSeek':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="12" r="2" fill="currentColor"/>
        </svg>
      );
    case 'Meta':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 12c0-4 2-8 4-8s3 2 4 5c1 3 2 5 4 5s4-4 4-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <path d="M4 12c0 4 2 8 4 8s3-2 4-5c1-3 2-5 4-5s4 4 4 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'Mistral AI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="4" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="10" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="4" width="4" height="4" fill="currentColor"/>
          <rect x="4" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="10" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="10" width="4" height="4" fill="currentColor"/>
          <rect x="4" y="16" width="4" height="4" fill="currentColor"/>
          <rect x="16" y="16" width="4" height="4" fill="currentColor"/>
        </svg>
      );
    case 'Qwen':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M8 12a4 4 0 108 0 4 4 0 00-8 0z" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M14 14l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      );
    case 'Z AI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6 6h12L6 18h12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'xAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6 4l6 8-6 8M18 4l-6 8 6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'ByteDance Seed':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 3v8m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      );
  }
}

const PROVIDER_COLORS: Record<string, string> = {
  'OpenAI': 'text-emerald-400',
  'Anthropic': 'text-orange-400',
  'Google': 'text-blue-400',
  'DeepSeek': 'text-cyan-400',
  'Meta': 'text-blue-300',
  'Mistral AI': 'text-amber-400',
  'Qwen': 'text-teal-400',
  'Z AI': 'text-rose-400',
  'xAI': 'text-slate-600 dark:text-gray-300',
  'ByteDance Seed': 'text-pink-400',
};

const PROVIDER_BG: Record<string, string> = {
  'OpenAI': 'bg-emerald-500/10 border-emerald-500/20',
  'Anthropic': 'bg-orange-500/10 border-orange-500/20',
  'Google': 'bg-blue-500/10 border-blue-500/20',
  'DeepSeek': 'bg-cyan-500/10 border-cyan-500/20',
  'Meta': 'bg-blue-400/10 border-blue-400/20',
  'Mistral AI': 'bg-amber-500/10 border-amber-500/20',
  'Qwen': 'bg-teal-500/10 border-teal-500/20',
  'Z AI': 'bg-rose-500/10 border-rose-500/20',
  'xAI': 'bg-gray-500/10 border-gray-500/20',
  'ByteDance Seed': 'bg-pink-500/10 border-pink-500/20',
};

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onSelect: (modelId: string) => void;
}

export default function ModelSelector({ isOpen, onClose, selectedModel, onSelect }: ModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState('Все');

  const filtered = useMemo(() => {
    let list = MODELS;
    if (activeProvider !== 'Все') {
      list = list.filter((m) => m.provider === activeProvider);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.id.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, activeProvider]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 md:p-8">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[75vh] sm:max-h-[80vh] bg-white dark:bg-[#0d0d20] border-t sm:border border-slate-200/60 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/50 animate-in pb-[env(safe-area-inset-bottom)]">
        {/* Search header */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mt-2 sm:hidden" />
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200/40 dark:border-gray-800/40">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти модель или вставить openai/gpt-5"
            autoFocus={window.innerWidth >= 640}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100/60 dark:hover:bg-gray-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider tabs */}
        <div className="shrink-0 flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-3 overflow-x-auto border-b border-slate-200/30 dark:border-gray-800/30">
          {PROVIDERS.map((provider) => (
            <button
              key={provider}
              onClick={() => setActiveProvider(provider)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeProvider === provider
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-[#1a1a2e] text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-300 dark:hover:bg-[#252540] border border-slate-200/50 dark:border-gray-800/50'
              }`}
            >
              {provider !== 'Все' && (
                <span className={`${activeProvider === provider ? 'text-white' : PROVIDER_COLORS[provider] || 'text-slate-500 dark:text-gray-400'}`}>
                  <ProviderIcon provider={provider} size={12} />
                </span>
              )}
              {provider}
            </button>
          ))}
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto">
          {/* Auto option */}
          <button
            onClick={() => { onSelect('auto'); onClose(); }}
            className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-200/20 dark:border-gray-800/20 hover:bg-slate-100/30 dark:hover:bg-gray-800/30 transition-colors text-left ${
              selectedModel === 'auto' ? 'bg-blue-500/5' : ''
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white">Auto</p>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">Автовыбор лучшей модели под вашу задачу</p>
            </div>
          </button>

          {filtered.map((model) => (
            <button
              key={model.id}
              onClick={() => { onSelect(model.id); onClose(); }}
              className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/20 dark:border-gray-800/20 hover:bg-slate-100/30 dark:hover:bg-gray-800/30 transition-colors text-left ${
                selectedModel === model.id ? 'bg-blue-500/5' : ''
              }`}
            >
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${PROVIDER_BG[model.provider] || 'bg-slate-200/50 dark:bg-gray-800/50 border-slate-300/40 dark:border-gray-700/40'}`}>
                <span className={PROVIDER_COLORS[model.provider] || 'text-slate-500 dark:text-gray-400'}>
                  <ProviderIcon provider={model.provider} size={16} />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] sm:text-sm font-medium text-slate-800 dark:text-gray-100">{model.name}</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500">{model.provider}</p>
              </div>
              <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400 dark:text-gray-500 shrink-0">
                <span>
                  Ввод <span className="text-slate-600 dark:text-gray-300 font-medium">{model.inputPrice.toFixed(2)} ₽</span>
                </span>
                <span>
                  Вывод <span className="text-slate-600 dark:text-gray-300 font-medium">{model.outputPrice.toFixed(2)} ₽</span>
                </span>
                <span>
                  Контекст <span className="text-slate-600 dark:text-gray-300 font-medium">{model.context}</span>
                </span>
              </div>
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="w-8 h-8 text-slate-400 dark:text-gray-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-gray-400">Модель не найдена</p>
              <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">Попробуйте другой запрос или формат provider/model</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function getModelDisplayName(modelId: string): string {
  if (modelId === 'auto') return 'Auto';
  const model = MODELS.find((m) => m.id === modelId);
  return model?.name || modelId;
}

export function getModelInfo(modelId: string): ModelInfo | null {
  if (modelId === 'auto') return null;
  return MODELS.find((m) => m.id === modelId) || null;
}

export function getProviderColor(provider: string): string {
  return PROVIDER_COLORS[provider] || 'text-slate-500 dark:text-gray-400';
}

export { ProviderIcon };
