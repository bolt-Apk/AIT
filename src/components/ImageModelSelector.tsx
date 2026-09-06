import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Globe } from 'lucide-react';

export type ImageResolution = string;
export type ImageQuality = string;
export type ImageAspectRatio = string;
export type ImageSize = string;

export interface ImageModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  priceFrom: string;
  resolutions: string[];
  qualities: string[];
  aspectRatios: string[];
  outputFormats: string[];
  backgrounds: string[];
  maxN: number;
  supportsCombined: boolean;
  maxInputImages: number;
  usesSize?: boolean;
  popular?: boolean;
}

const IMAGE_MODELS: ImageModelInfo[] = [
  {
    id: 'gpt-image-2',
    name: 'GPT Image 2',
    provider: 'OpenAI',
    description: 'Высококачественная генерация и редактирование изображений',
    priceFrom: '1.53',
    resolutions: [],
    qualities: ['auto', 'low', 'medium', 'high'],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg', 'webp'],
    backgrounds: ['auto', 'opaque'],
    maxN: 10,
    supportsCombined: true,
    maxInputImages: 16,
    usesSize: true,
  },
  {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    provider: 'OpenAI',
    description: 'Генерация и правка изображений с точным текстом и прозрачностью',
    priceFrom: '2.04',
    resolutions: [],
    qualities: ['auto', 'low', 'medium', 'high'],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg', 'webp'],
    backgrounds: ['auto', 'transparent', 'opaque'],
    maxN: 10,
    supportsCombined: true,
    maxInputImages: 16,
    usesSize: true,
    popular: true,
  },
  {
    id: 'gpt-image-1-mini',
    name: 'GPT Image 1 Mini',
    provider: 'OpenAI',
    description: 'Экономичная генерация изображений с низкой задержкой',
    priceFrom: '0.41',
    resolutions: [],
    qualities: ['auto', 'low', 'medium', 'high'],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg', 'webp'],
    backgrounds: ['auto', 'transparent', 'opaque'],
    maxN: 10,
    supportsCombined: true,
    maxInputImages: 16,
    usesSize: true,
  },
  {
    id: 'muse-image',
    name: 'Muse Image',
    provider: 'Meta',
    description: 'Генерация и правка по тексту и референсам, композиция нескольких кадров',
    priceFrom: '1.70',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 16,
  },
  {
    id: 'gemini-3.1-flash-image',
    name: 'Gemini 3.1 Flash Image',
    provider: 'Google',
    description: 'Быстрая генерация и правка изображений с контролем пропорций',
    priceFrom: '5.10',
    resolutions: ['512', '1K', '2K', '4K'],
    qualities: [],
    aspectRatios: ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 14,
    popular: true,
  },
  {
    id: 'gemini-3.1-flash-lite-image',
    name: 'Gemini 3.1 Flash Lite Image',
    provider: 'Google',
    description: 'Самая быстрая экономичная генерация и правка изображений',
    priceFrom: '2.89',
    resolutions: ['1K'],
    qualities: [],
    aspectRatios: ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 14,
  },
  {
    id: 'gemini-3-pro-image',
    name: 'Gemini 3 Pro Image',
    provider: 'Google',
    description: 'Продвинутая генерация инфографики, диаграмм и сложных сцен',
    priceFrom: '11.90',
    resolutions: ['1K', '2K'],
    qualities: [],
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 14,
  },
  {
    id: 'gemini-2.5-flash-image',
    name: 'Gemini 2.5 Flash Image',
    provider: 'Google',
    description: 'Генерация и правка изображений с пониманием контекста',
    priceFrom: '5.95',
    resolutions: [],
    qualities: [],
    aspectRatios: ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 3,
  },
  {
    id: 'seedream-5-0-lite',
    name: 'Seedream 5.0 Lite',
    provider: 'ByteDance Seed',
    description: 'Профессиональная генерация по сложным промптам и визуальным референсам',
    priceFrom: '5.95',
    resolutions: ['2K', '4K'],
    qualities: [],
    aspectRatios: ['1:1', '1:2', '2:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:19.5', '19.5:9', '9:20', '20:9', '9:21', '21:9', 'auto'],
    outputFormats: [],
    backgrounds: [],
    maxN: 4,
    supportsCombined: false,
    maxInputImages: 14,
    popular: true,
  },
  {
    id: 'seedream-5-0-pro',
    name: 'Seedream 5.0 Pro',
    provider: 'ByteDance Seed',
    description: 'Коммерческая генерация и точное редактирование с реалистичными сценами',
    priceFrom: '7.65',
    resolutions: ['1K', '2K'],
    qualities: [],
    aspectRatios: ['1:1', '1:2', '2:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:19.5', '19.5:9', '9:20', '20:9', '9:21', '21:9', 'auto'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 14,
  },
  {
    id: 'seedream-4.5',
    name: 'Seedream 4.5',
    provider: 'ByteDance Seed',
    description: 'Генерация и согласованное редактирование с сохранением деталей',
    priceFrom: '6.80',
    resolutions: ['1K', '2K', '4K'],
    qualities: [],
    aspectRatios: ['1:1', '1:2', '2:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:19.5', '19.5:9', '9:20', '20:9', '9:21', '21:9', 'auto'],
    outputFormats: [],
    backgrounds: [],
    maxN: 10,
    supportsCombined: false,
    maxInputImages: 14,
  },
  {
    id: 'flux.2-klein-4b',
    name: 'Flux.2 Klein 4b',
    provider: 'Black Forest Labs',
    description: 'Самая быстрая и экономичная генерация изображений',
    priceFrom: '2.55',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg'],
    backgrounds: [],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 4,
  },
  {
    id: 'flux.2-pro',
    name: 'Flux.2 Pro',
    provider: 'Black Forest Labs',
    description: 'Качественная генерация и редактирование для продакшена',
    priceFrom: '5.44',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg'],
    backgrounds: [],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 8,
    popular: true,
  },
  {
    id: 'flux.2-max',
    name: 'Flux.2 Max',
    provider: 'Black Forest Labs',
    description: 'Максимальное качество генерации и согласованного редактирования',
    priceFrom: '12.58',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg'],
    backgrounds: [],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 8,
  },
  {
    id: 'flux.2-flex',
    name: 'Flux.2 Flex',
    provider: 'Black Forest Labs',
    description: 'Гибкая генерация с контролем шагов и guidance',
    priceFrom: '10.71',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg'],
    backgrounds: [],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 8,
  },
  {
    id: 'grok-imagine-image-2.0',
    name: 'Grok Imagine Image 2.0',
    provider: 'xAI',
    description: 'Генерация и редактирование изображений по тексту и референсам',
    priceFrom: '6.80',
    resolutions: ['1K', '2K'],
    qualities: ['low', 'medium'],
    aspectRatios: ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '9:19.5', '19.5:9', '9:20', '20:9', '1:2', '2:1', 'auto'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 3,
    popular: true,
  },
  {
    id: 'grok-imagine-image-quality',
    name: 'Grok Imagine Image Quality',
    provider: 'xAI',
    description: 'Генерация изображений с акцентом на качество',
    priceFrom: '8.50',
    resolutions: ['1K', '2K'],
    qualities: [],
    aspectRatios: ['1:1', '3:4', '4:3', '9:16', '16:9', '2:3', '3:2', '9:19.5', '19.5:9', '9:20', '20:9', '1:2', '2:1', 'auto'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 3,
  },
  {
    id: 'recraft-v4.1',
    name: 'Recraft V4.1',
    provider: 'Recraft',
    description: 'Высокоэстетичная генерация для концептов и повседневного креатива',
    priceFrom: '5.95',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: [],
    backgrounds: [],
    maxN: 6,
    supportsCombined: true,
    maxInputImages: 1,
  },
  {
    id: 'recraft-v4.1-pro',
    name: 'Recraft V4.1 Pro',
    provider: 'Recraft',
    description: 'Высокоэстетичная генерация повышенной детализации для продакшена',
    priceFrom: '35.70',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: [],
    backgrounds: [],
    maxN: 6,
    supportsCombined: true,
    maxInputImages: 1,
  },
  {
    id: 'recraft-v4.1-utility',
    name: 'Recraft V4.1 Utility',
    provider: 'Recraft',
    description: 'Сдержанная генерация для продуктов, мокапов и структурированных визуалов',
    priceFrom: '5.95',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: [],
    backgrounds: [],
    maxN: 6,
    supportsCombined: true,
    maxInputImages: 1,
  },
  {
    id: 'recraft-v4.1-utility-pro',
    name: 'Recraft V4.1 Utility Pro',
    provider: 'Recraft',
    description: 'Сдержанная генерация повышенной чёткости для продакшен-мокапов',
    priceFrom: '35.70',
    resolutions: [],
    qualities: [],
    aspectRatios: [],
    outputFormats: [],
    backgrounds: [],
    maxN: 6,
    supportsCombined: true,
    maxInputImages: 1,
  },
  {
    id: 'riverflow-v2.5-fast',
    name: 'Riverflow V2.5 Fast',
    provider: 'Sourceful',
    description: 'Быстрая генерация и правка для продакшена с низкой задержкой',
    priceFrom: '3.23',
    resolutions: ['1K', '2K'],
    qualities: [],
    aspectRatios: [],
    outputFormats: ['jpeg'],
    backgrounds: ['auto', 'transparent', 'opaque'],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 4,
  },
  {
    id: 'riverflow-v2.5-pro',
    name: 'Riverflow V2.5 Pro',
    provider: 'Sourceful',
    description: 'Генерация и правка с максимальным контролем и качеством',
    priceFrom: '22.10',
    resolutions: ['1K', '2K', '4K'],
    qualities: [],
    aspectRatios: [],
    outputFormats: ['png', 'jpeg', 'webp'],
    backgrounds: ['auto', 'transparent', 'opaque'],
    maxN: 1,
    supportsCombined: true,
    maxInputImages: 10,
  },
  {
    id: 'krea-2-medium',
    name: 'Krea 2 Medium',
    provider: 'Krea',
    description: 'Сбалансированная генерация для иллюстрации, аниме и живописи',
    priceFrom: '5.10',
    resolutions: ['1K'],
    qualities: [],
    aspectRatios: ['1:1', '4:3', '3:2', '16:9', '4:5', '2:3', '9:16'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 1,
  },
  {
    id: 'krea-2-large',
    name: 'Krea 2 Large',
    provider: 'Krea',
    description: 'Мощная генерация для фотореализма и выразительных художественных стилей',
    priceFrom: '10.20',
    resolutions: ['1K'],
    qualities: [],
    aspectRatios: ['1:1', '4:3', '3:2', '16:9', '4:5', '2:3', '9:16'],
    outputFormats: [],
    backgrounds: [],
    maxN: 1,
    supportsCombined: false,
    maxInputImages: 1,
  },
  {
    id: 'qwen-image-3-pro',
    name: 'Qwen Image 3 Pro',
    provider: 'Qwen',
    description: 'Генерация и редактирование изображений с точным рендерингом мелкого текста',
    priceFrom: '6.80',
    resolutions: ['1K', '2K'],
    qualities: [],
    aspectRatios: ['1:1', '1:2', '1:4', '2:1', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '9:16', '16:9'],
    outputFormats: [],
    backgrounds: [],
    maxN: 6,
    supportsCombined: false,
    maxInputImages: 4,
  },
  {
    id: 'qwen-image-3',
    name: 'Qwen Image 3',
    provider: 'Qwen',
    description: 'Унифицированная генерация и редактирование с точным рендерингом мелкого текста',
    priceFrom: '5.10',
    resolutions: ['1K', '2K'],
    qualities: [],
    aspectRatios: ['1:1', '1:2', '1:4', '2:1', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '9:16', '16:9'],
    outputFormats: [],
    backgrounds: [],
    maxN: 6,
    supportsCombined: false,
    maxInputImages: 4,
  },
];

const GPT_PRICE_TABLE: Record<string, Record<string, Record<string, number>>> = {
  'gpt-image-1': {
    low:    { '1024x1024': 2.04, '1024x1536': 3.06, '1536x1024': 3.06, auto: 2.04 },
    auto:   { '1024x1024': 4.08, '1024x1536': 6.12, '1536x1024': 6.12, auto: 4.08 },
    medium: { '1024x1024': 8.00, '1024x1536': 12.00, '1536x1024': 12.00, auto: 8.00 },
    high:   { '1024x1024': 31.80, '1024x1536': 47.60, '1536x1024': 47.60, auto: 31.80 },
  },
  'gpt-image-1-mini': {
    low:    { '1024x1024': 0.41, '1024x1536': 0.61, '1536x1024': 0.61, auto: 0.41 },
    auto:   { '1024x1024': 0.82, '1024x1536': 1.23, '1536x1024': 1.23, auto: 0.82 },
    medium: { '1024x1024': 2.86, '1024x1536': 4.29, '1536x1024': 4.29, auto: 2.86 },
    high:   { '1024x1024': 15.25, '1024x1536': 22.87, '1536x1024': 22.87, auto: 15.25 },
  },
  'gpt-image-2': {
    low:    { '1024x1024': 1.53, '1024x1536': 2.30, '1536x1024': 2.30, auto: 1.53 },
    auto:   { '1024x1024': 3.06, '1024x1536': 4.59, '1536x1024': 4.59, auto: 3.06 },
    medium: { '1024x1024': 5.35, '1024x1536': 8.03, '1536x1024': 8.03, auto: 5.35 },
    high:   { '1024x1024': 14.54, '1024x1536': 21.81, '1536x1024': 21.81, auto: 14.54 },
  },
};

const RESOLUTION_MULTIPLIER: Record<string, number> = {
  '512': 0.5,
  '1K': 1,
  '2K': 2,
  '4K': 4,
};

export function estimateImageCost(
  modelId: string,
  quality: string,
  size: string,
  resolution: string,
  n: number,
): { perImage: number; total: number } | null {
  const info = IMAGE_MODELS.find((m) => m.id === modelId);
  if (!info) return null;

  const gptTable = GPT_PRICE_TABLE[modelId];
  if (gptTable) {
    const q = quality || 'auto';
    const s = size || '1024x1024';
    const tier = gptTable[q] ?? gptTable['auto'];
    const perImage = tier?.[s] ?? tier?.['1024x1024'] ?? parseFloat(info.priceFrom);
    return { perImage, total: perImage * Math.max(1, n) };
  }

  let base = parseFloat(info.priceFrom);
  if (info.resolutions.length > 0 && resolution) {
    const mult = RESOLUTION_MULTIPLIER[resolution];
    const minRes = info.resolutions[0];
    const minMult = RESOLUTION_MULTIPLIER[minRes] ?? 1;
    if (mult && minMult && mult > minMult) {
      base = base * (mult / minMult);
    }
  }
  if (info.qualities.length > 0 && quality) {
    const qIdx = info.qualities.indexOf(quality);
    const baseIdx = info.qualities.indexOf(info.qualities[0]);
    if (qIdx > baseIdx) {
      base = base * (1 + (qIdx - baseIdx) * 0.5);
    }
  }

  return { perImage: base, total: base * Math.max(1, n) };
}

const IMAGE_PROVIDERS = [
  'Все', 'OpenAI', 'Google', 'Meta', 'xAI', 'Qwen',
  'ByteDance Seed', 'Black Forest Labs', 'Recraft', 'Krea', 'Sourceful',
];

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'text-emerald-400',
  Google: 'text-blue-400',
  Meta: 'text-sky-400',
  xAI: 'text-slate-600 dark:text-gray-300',
  Qwen: 'text-cyan-400',
  'ByteDance Seed': 'text-sky-400',
  Krea: 'text-amber-400',
  'Black Forest Labs': 'text-amber-400',
  Recraft: 'text-rose-400',
  Sourceful: 'text-teal-400',
};

const PROVIDER_BG: Record<string, string> = {
  OpenAI: 'bg-emerald-500/10 border-emerald-500/20',
  Google: 'bg-blue-500/10 border-blue-500/20',
  Meta: 'bg-sky-500/10 border-sky-500/20',
  xAI: 'bg-gray-500/10 border-gray-500/20',
  Qwen: 'bg-cyan-500/10 border-cyan-500/20',
  'ByteDance Seed': 'bg-sky-500/10 border-sky-500/20',
  Krea: 'bg-amber-500/10 border-amber-500/20',
  'Black Forest Labs': 'bg-amber-500/10 border-amber-500/20',
  Recraft: 'bg-rose-500/10 border-rose-500/20',
  Sourceful: 'bg-teal-500/10 border-teal-500/20',
};

const GPT_SIZES = ['1024x1024', '1024x1536', '1536x1024', 'auto'] as const;

const QUALITY_LABELS: Record<string, string> = {
  low: 'Низкое',
  medium: 'Среднее',
  high: 'Высокое',
  auto: 'Авто',
};

const SIZE_LABELS: Record<string, string> = {
  '1024x1024': '1024\u00d71024',
  '1024x1536': '1024\u00d71536',
  '1536x1024': '1536\u00d71024',
  auto: 'Авто',
};

interface ImageModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  selectedResolution: string;
  selectedQuality: string;
  selectedAspectRatio: string;
  selectedSize: string;
  onSelectModel: (modelId: string) => void;
  onSelectResolution: (res: string) => void;
  onSelectQuality: (quality: string) => void;
  onSelectAspectRatio: (ratio: string) => void;
  onSelectSize: (size: string) => void;
}

export default function ImageModelSelector({
  isOpen,
  onClose,
  selectedModel,
  selectedResolution,
  selectedQuality,
  selectedAspectRatio,
  selectedSize,
  onSelectModel,
  onSelectResolution,
  onSelectQuality,
  onSelectAspectRatio,
  onSelectSize,
}: ImageModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState('Все');

  const currentModelInfo = IMAGE_MODELS.find((m) => m.id === selectedModel) || IMAGE_MODELS[0];

  const filtered = useMemo(() => {
    let list = IMAGE_MODELS;
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

  const showQuality = currentModelInfo.qualities.length > 0;
  const showResolution = currentModelInfo.resolutions.length > 0;
  const showAspectRatio = currentModelInfo.aspectRatios.length > 0;
  const showSize = currentModelInfo.usesSize;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4 md:p-8">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[75vh] sm:max-h-[85vh] bg-white dark:bg-[#0d0d20] border-t sm:border border-slate-200/60 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/50 animate-in pb-[env(safe-area-inset-bottom)]">
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mt-2 sm:hidden" />
        {/* Search */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200/40 dark:border-gray-800/40">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти модель изображений..."
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
        <div className="shrink-0 flex items-center gap-1.5 px-3 sm:px-5 py-2 sm:py-3 overflow-x-auto border-b border-slate-200/30 dark:border-gray-800/30 scrollbar-hide">
          {IMAGE_PROVIDERS.map((provider) => (
            <button
              key={provider}
              onClick={() => setActiveProvider(provider)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                activeProvider === provider
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 dark:bg-[#1a1a2e] text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-300 dark:hover:bg-[#252540] border border-slate-200/50 dark:border-gray-800/50'
              }`}
            >
              {provider}
            </button>
          ))}
        </div>

        {/* Model list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((model) => {
            const isSelected = selectedModel === model.id;
            return (
              <button
                key={model.id}
                onClick={() => {
                  onSelectModel(model.id);
                  if (model.resolutions.length > 0 && !model.resolutions.includes(selectedResolution)) {
                    onSelectResolution(model.resolutions[0]);
                  }
                  if (model.qualities.length > 0 && !model.qualities.includes(selectedQuality)) {
                    onSelectQuality(model.qualities[0]);
                  }
                  if (model.aspectRatios.length > 0 && !model.aspectRatios.includes(selectedAspectRatio)) {
                    onSelectAspectRatio(model.aspectRatios[0]);
                  }
                  if (model.usesSize && !GPT_SIZES.includes(selectedSize as typeof GPT_SIZES[number])) {
                    onSelectSize('1024x1024');
                  }
                }}
                className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/20 dark:border-gray-800/20 hover:bg-slate-100/30 dark:hover:bg-gray-800/30 transition-colors text-left ${
                  isSelected ? 'bg-blue-500/5' : ''
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${PROVIDER_BG[model.provider] || 'bg-slate-200/50 dark:bg-gray-800/50 border-slate-300/40 dark:border-gray-700/40'}`}>
                  <span className={`text-xs font-bold ${PROVIDER_COLORS[model.provider] || 'text-slate-500 dark:text-gray-400'}`}>
                    {model.provider.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] sm:text-sm font-medium text-slate-800 dark:text-gray-100 truncate">{model.name}</p>
                    {model.popular && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                        ТОП
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400 dark:text-gray-500">{model.provider}</span>
                    <span className="text-[10px] text-slate-300 dark:text-gray-700">|</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-600 truncate">{model.description}</span>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-600 dark:text-gray-300 font-medium">от {model.priceFrom} ₽</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500 block">/ изобр.</span>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-blue-500 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                    </svg>
                  )}
                </div>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="w-8 h-8 text-slate-400 dark:text-gray-600 mb-3" />
              <p className="text-sm text-slate-500 dark:text-gray-400">Модель не найдена</p>
              <p className="text-xs text-slate-400 dark:text-gray-600 mt-1">Попробуйте другой запрос</p>
            </div>
          )}
        </div>

        {/* Parameters */}
        {(showQuality || showResolution || showAspectRatio || showSize) && (
          <div className="shrink-0 border-t border-slate-200/40 dark:border-gray-800/40 px-3 sm:px-5 py-2.5 sm:py-3">
            <p className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">
              Параметры — <span className="normal-case text-slate-600 dark:text-gray-300 font-medium">{currentModelInfo.name}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {showQuality && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Качество</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentModelInfo.qualities.map((q) => (
                      <button
                        key={q}
                        onClick={() => onSelectQuality(q)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          selectedQuality === q
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                        }`}
                      >
                        {QUALITY_LABELS[q] || q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showSize && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Размер</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {GPT_SIZES.map((sz) => (
                      <button
                        key={sz}
                        onClick={() => onSelectSize(sz)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          selectedSize === sz
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                        }`}
                      >
                        {SIZE_LABELS[sz] || sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showResolution && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Разрешение</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentModelInfo.resolutions.map((res) => (
                      <button
                        key={res}
                        onClick={() => onSelectResolution(res)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          selectedResolution === res
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                        }`}
                      >
                        {res}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {showAspectRatio && (
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 dark:text-gray-600 mb-1.5">Формат</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentModelInfo.aspectRatios.map((ratio) => (
                      <button
                        key={ratio}
                        onClick={() => onSelectAspectRatio(ratio)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          selectedAspectRatio === ratio
                            ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 ring-1 ring-blue-500/20'
                            : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 text-slate-700 dark:text-gray-200 hover:border-blue-500/20 hover:bg-blue-500/5'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-t border-slate-200/40 dark:border-gray-800/40 bg-slate-50/50 dark:bg-[#0a0a1a]/50 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="text-[11px] text-slate-400 dark:text-gray-500 truncate mr-3">
            <span className="text-slate-700 dark:text-gray-200 font-medium">{currentModelInfo.name}</span>
            {showQuality && <>{' \u00b7 '}<span>{QUALITY_LABELS[selectedQuality] || selectedQuality}</span></>}
            {showSize && <>{' \u00b7 '}<span>{SIZE_LABELS[selectedSize] || selectedSize}</span></>}
            {showResolution && <>{' \u00b7 '}<span>{selectedResolution}</span></>}
            {showAspectRatio && <>{' \u00b7 '}<span>{selectedAspectRatio}</span></>}
            {' \u00b7 '}
            <span>от {currentModelInfo.priceFrom} ₽</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20 shrink-0"
          >
            Готово
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function getImageModelDisplayName(modelId: string): string {
  return IMAGE_MODELS.find((m) => m.id === modelId)?.name || modelId;
}

export function getImageModelInfo(modelId: string): ImageModelInfo | null {
  return IMAGE_MODELS.find((m) => m.id === modelId) || null;
}

export { IMAGE_MODELS };
