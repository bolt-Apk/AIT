import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, Globe } from 'lucide-react';

const VOICE_LABELS: Record<string, string> = {
  'alloy': 'Сплав',
  'ash': 'Эш',
  'coral': 'Коралл',
  'echo': 'Эхо',
  'fable': 'Фэйбл',
  'onyx': 'Оникс',
  'nova': 'Нова',
  'sage': 'Сейдж',
  'shimmer': 'Шиммер',
  'ballad': 'Баллада',
  'verse': 'Верс',
  'marin': 'Марин',
  'cedar': 'Кедр',
  'eve': 'Ева',
  'ara': 'Ара',
  'rex': 'Рекс',
  'sal': 'Сэл',
  'leo': 'Лео',
  'Russian_HandsomeChildhoodFriend': 'Обаятельный друг',
  'Russian_BrightHeroine': 'Яркая героиня',
  'Russian_AmbitiousWoman': 'Амбициозная',
  'Russian_ReliableMan': 'Надёжный мужчина',
  'Russian_CrazyQueen': 'Дерзкая королева',
  'Russian_AttractiveGuy': 'Привлекательный',
  'Russian_PessimisticGirl': 'Пессимистка',
  'Russian_Bad-temperedBoy': 'Вспыльчивый парень',
  'Zephyr': 'Зефир',
  'Puck': 'Пак',
  'Charon': 'Харон',
  'Kore': 'Кора',
  'Fenrir': 'Фенрир',
  'Leda': 'Леда',
  'Orus': 'Орус',
  'Aoede': 'Аоэда',
  'Callirrhoe': 'Каллироя',
  'Autonoe': 'Автоноя',
  'Enceladus': 'Энцелад',
  'Iapetus': 'Япет',
  'Umbriel': 'Умбриэль',
  'Algieba': 'Алгиеба',
  'Despina': 'Деспина',
  'Erinome': 'Эриноме',
  'Algenib': 'Альгениб',
  'Rasalgethi': 'Расальгети',
  'Laomedeia': 'Лаомедея',
  'Achernar': 'Ахернар',
  'Alnilam': 'Альнилам',
  'Schedar': 'Шедар',
  'Gacrux': 'Гакрукс',
  'Pulcherrima': 'Пульхеррима',
  'Achird': 'Ахирд',
  'Zubenelgenubi': 'Зубенельгенуби',
  'Vindemiatrix': 'Виндемиатрикс',
  'Sadachbia': 'Садахбия',
  'Sadaltager': 'Садалтагер',
  'Sulafat': 'Сулафат',
  'loongjohn': 'Луньцзон',
  'longanhuan_v3.6': 'Лунаньхуань',
  'longanlingxin': 'Лунаньлинсинь',
  'longanlufeng': 'Луньаньлуфен',
};

function voiceLabel(voice: string): string {
  if (VOICE_LABELS[voice]) return VOICE_LABELS[voice];
  return voice
    .replace(/_/g, ' ')
    .replace(/^(af|am|bf|bm)\s/, (m) => {
      const map: Record<string, string> = { 'af ': 'Жен. ', 'am ': 'Муж. ', 'bf ': 'Брит.Ж ', 'bm ': 'Брит.М ' };
      return map[m] || m;
    });
}

function pluralVoices(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} голос`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} голоса`;
  return `${count} голосов`;
}

export interface TTSModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricePerMil: number;
  voices: string[];
  formats: string[];
  russianSupported: boolean;
  popular?: boolean;
  supportsVoiceClone?: boolean;
}

const TTS_MODELS: TTSModelInfo[] = [
  {
    id: 'qwen-audio-3.0-tts-plus',
    name: 'Qwen Audio 3.0 TTS Plus',
    provider: 'Qwen',
    description: 'Улучшенный синтез речи от Alibaba.',
    pricePerMil: 4000,
    voices: ['longanlingxin', 'longanlufeng'],
    formats: ['mp3', 'pcm'],
    russianSupported: false,
    popular: true,
  },
  {
    id: 'gpt-4o-mini-tts',
    name: 'GPT-4o Mini TTS',
    provider: 'OpenAI',
    description: 'Синтез речи с широким набором голосов и поддержкой инструкций.',
    pricePerMil: 3000,
    voices: ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'ballad', 'verse', 'marin', 'cedar'],
    formats: ['mp3', 'pcm'],
    russianSupported: true,
    popular: true,
  },
  {
    id: 'speech-2.8-turbo',
    name: 'Speech 2.8 Turbo',
    provider: 'MiniMax',
    description: 'Быстрый синтез с 8 русскими голосами.',
    pricePerMil: 12000,
    voices: ['Russian_HandsomeChildhoodFriend', 'Russian_BrightHeroine', 'Russian_AmbitiousWoman', 'Russian_ReliableMan', 'Russian_CrazyQueen', 'Russian_AttractiveGuy', 'Russian_PessimisticGirl', 'Russian_Bad-temperedBoy'],
    formats: ['mp3', 'pcm'],
    russianSupported: true,
    popular: true,
  },
  {
    id: 'gemini-3.1-flash-tts-preview',
    name: 'Gemini 3.1 Flash TTS',
    provider: 'Google',
    description: 'Синтез речи на 70+ языках с тегами эмоций. 30 голосов.',
    pricePerMil: 6000,
    voices: ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar', 'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi', 'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'],
    formats: ['pcm'],
    russianSupported: true,
    popular: true,
  },
  {
    id: 'grok-voice-tts-1.0',
    name: 'Grok Voice TTS 1.0',
    provider: 'xAI',
    description: 'Синтез речи на 20+ языках с тегами интонации.',
    pricePerMil: 3000,
    voices: ['eve', 'ara', 'rex', 'sal', 'leo'],
    formats: ['mp3', 'pcm'],
    russianSupported: true,
    popular: true,
  },
  {
    id: 'tts-1',
    name: 'TTS-1',
    provider: 'OpenAI',
    description: 'Базовый синтез речи. Баланс скорости и качества.',
    pricePerMil: 3000,
    voices: ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'],
    formats: ['mp3', 'pcm'],
    russianSupported: true,
  },
  {
    id: 'qwen-audio-3.0-tts-flash',
    name: 'Qwen Audio 3.0 TTS Flash',
    provider: 'Qwen',
    description: 'Быстрый синтез речи от Alibaba.',
    pricePerMil: 3000,
    voices: ['loongjohn', 'longanhuan_v3.6'],
    formats: ['mp3', 'pcm'],
    russianSupported: false,
  },
  {
    id: 'tts-1-hd',
    name: 'TTS-1 HD',
    provider: 'OpenAI',
    description: 'Синтез речи в высоком качестве с улучшенной детализацией.',
    pricePerMil: 6000,
    voices: ['alloy', 'ash', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer'],
    formats: ['mp3', 'pcm'],
    russianSupported: true,
  },
  {
    id: 'speech-2.8-hd',
    name: 'Speech 2.8 HD',
    provider: 'MiniMax',
    description: 'HD качество с 8 русскими голосами.',
    pricePerMil: 20000,
    voices: ['Russian_HandsomeChildhoodFriend', 'Russian_BrightHeroine', 'Russian_AmbitiousWoman', 'Russian_ReliableMan', 'Russian_CrazyQueen', 'Russian_AttractiveGuy', 'Russian_PessimisticGirl', 'Russian_Bad-temperedBoy'],
    formats: ['mp3', 'pcm'],
    russianSupported: true,
  },

  {
    id: 'voxtral-mini-tts-2603',
    name: 'Voxtral Mini TTS',
    provider: 'Mistral',
    description: 'Клонирование голоса или 30 готовых голосов с эмоциями.',
    pricePerMil: 3200,
    voices: ['en_paul_sad', 'en_paul_neutral', 'en_paul_happy', 'en_paul_frustrated', 'en_paul_excited', 'en_paul_confident', 'en_paul_cheerful', 'en_paul_angry', 'gb_oliver_neutral', 'gb_oliver_sad', 'gb_oliver_excited', 'gb_oliver_curious', 'gb_oliver_confident', 'gb_oliver_cheerful', 'gb_oliver_angry', 'gb_jane_sarcasm', 'gb_jane_confused', 'gb_jane_shameful', 'gb_jane_sad', 'gb_jane_neutral', 'gb_jane_jealousy', 'gb_jane_frustrated', 'gb_jane_curious', 'gb_jane_confident', 'fr_marie_sad', 'fr_marie_neutral', 'fr_marie_happy', 'fr_marie_excited', 'fr_marie_curious', 'fr_marie_angry'],
    formats: ['mp3', 'pcm'],
    russianSupported: false,
    popular: true,
    supportsVoiceClone: true,
  },
  {
    id: 'aura-2',
    name: 'Aura 2',
    provider: 'Deepgram',
    description: 'Высококачественный синтез речи с большим набором голосов.',
    pricePerMil: 3400,
    voices: ['aura-2-thalia-en', 'aura-2-andromeda-en', 'aura-2-arcas-en', 'aura-2-helios-en', 'aura-2-luna-en', 'aura-2-orpheus-en', 'aura-2-perseus-en', 'aura-2-stella-en'],
    formats: ['mp3'],
    russianSupported: false,
  },

  {
    id: 'orpheus-3b-0.1-ft',
    name: 'Orpheus 3B',
    provider: 'Canopy Labs',
    description: 'Экспрессивный синтез речи с 8 голосами.',
    pricePerMil: 2000,
    voices: ['tara', 'leah', 'jess', 'leo', 'dan', 'mia', 'zac', 'zoe'],
    formats: ['mp3', 'pcm'],
    russianSupported: false,
  },
  {
    id: 'kokoro-82m',
    name: 'Kokoro 82M',
    provider: 'Kokoro',
    description: 'Компактная и быстрая модель синтеза речи.',
    pricePerMil: 400,
    voices: ['af_bella', 'af_heart', 'af_sarah', 'am_adam', 'am_michael', 'bf_emma', 'bf_isabella', 'bm_george', 'bm_lewis'],
    formats: ['mp3', 'pcm'],
    russianSupported: false,
  },
];

const TTS_PROVIDERS = ['Все', 'OpenAI', 'MiniMax', 'Google', 'xAI', 'Qwen', 'Mistral', 'Deepgram', 'Canopy Labs', 'Kokoro'];

const PROVIDER_COLORS: Record<string, string> = {
  'OpenAI': 'text-emerald-400',
  'Google': 'text-blue-400',
  'xAI': 'text-slate-600 dark:text-gray-300',
  'Qwen': 'text-teal-400',
  'MiniMax': 'text-rose-400',
  'Mistral': 'text-orange-400',
  'Deepgram': 'text-cyan-400',

  'Canopy Labs': 'text-amber-400',
  'Kokoro': 'text-pink-400',
};

const PROVIDER_BG: Record<string, string> = {
  'OpenAI': 'bg-emerald-500/10 border-emerald-500/20',
  'Google': 'bg-blue-500/10 border-blue-500/20',
  'xAI': 'bg-gray-500/10 border-gray-500/20',
  'Qwen': 'bg-teal-500/10 border-teal-500/20',
  'MiniMax': 'bg-rose-500/10 border-rose-500/20',
  'Mistral': 'bg-orange-500/10 border-orange-500/20',
};

function TTSProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  const s = size;
  switch (provider) {
    case 'OpenAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M22.2 8.61c.2-.6.3-1.23.3-1.86A5.25 5.25 0 0017.44 1.5a5.2 5.2 0 00-4.56 2.67A5.24 5.24 0 009 3a5.25 5.25 0 00-4.87 7.25 5.25 5.25 0 00.68 10.32 5.2 5.2 0 004.56-2.67c1.1.7 2.4 1.1 3.76 1.1a5.25 5.25 0 004.87-7.25 5.25 5.25 0 001.3-3.14z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <path d="M14.5 7.5L9 12m0 0l5.5 4.5M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'Google':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8 2.4-7.2-6-4.8h7.6L12 2z" fill="currentColor"/>
        </svg>
      );
    case 'xAI':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M6 4l6 8-6 8M18 4l-6 8 6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
    case 'Mistral':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="16" y="3" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="3" y="16" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="16" y="16" width="5" height="5" rx="1" fill="currentColor"/>
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor"/>
        </svg>
      );
    case 'MiniMax':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <path d="M4 20V10l4 6 4-10 4 10 4-6v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="3" fill="currentColor"/>
        </svg>
      );
  }
}

interface TTSModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  selectedVoice: string;
  onSelectModel: (modelId: string) => void;
  onSelectVoice: (voice: string) => void;
}

export default function TTSModelSelector({
  isOpen,
  onClose,
  selectedModel,
  selectedVoice,
  onSelectModel,
  onSelectVoice,
}: TTSModelSelectorProps) {
  const [search, setSearch] = useState('');
  const [activeProvider, setActiveProvider] = useState('Все');

  const currentModelInfo = TTS_MODELS.find((m) => m.id === selectedModel) || TTS_MODELS[0];

  const filtered = useMemo(() => {
    let list = TTS_MODELS;
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
      <div className="relative w-full sm:max-w-3xl max-h-[75vh] sm:max-h-[85vh] bg-white dark:bg-[#0d0d20] border-t sm:border border-slate-200/60 dark:border-gray-800/60 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl shadow-black/50 animate-in pb-[env(safe-area-inset-bottom)]">
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mt-2 sm:hidden" />
        {/* Search header */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 py-2.5 sm:py-4 border-b border-slate-200/40 dark:border-gray-800/40">
          <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Найти модель озвучки..."
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
          {TTS_PROVIDERS.map((provider) => (
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
                  if (model.voices.length > 0 && !model.voices.includes(selectedVoice)) {
                    onSelectVoice(model.voices[0]);
                  }
                }}
                className={`w-full flex items-center gap-3 sm:gap-4 px-3 sm:px-5 py-2.5 sm:py-3.5 border-b border-slate-200/20 dark:border-gray-800/20 hover:bg-slate-100/30 dark:hover:bg-gray-800/30 transition-colors text-left ${
                  isSelected ? 'bg-blue-500/5' : ''
                }`}
              >
                <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shrink-0 ${PROVIDER_BG[model.provider] || 'bg-slate-200/50 dark:bg-gray-800/50 border-slate-300/40 dark:border-gray-700/40'}`}>
                  <span className={PROVIDER_COLORS[model.provider] || 'text-slate-500 dark:text-gray-400'}>
                    <TTSProviderIcon provider={model.provider} size={14} />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] sm:text-sm font-medium text-slate-800 dark:text-gray-100">{model.name}</p>
                    {model.popular && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        ТОП
                      </span>
                    )}
                    {model.russianSupported && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        RU
                      </span>
                    )}
                    {model.supportsVoiceClone && (
                      <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                        КЛОН
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">{model.provider} · {pluralVoices(model.voices.length)}</p>
                </div>
                <div className="hidden sm:block text-[11px] text-right shrink-0">
                  <span className="text-slate-600 dark:text-gray-300 font-medium">{model.pricePerMil.toLocaleString('ru-RU')} ₽</span>
                  <span className="text-slate-400 dark:text-gray-500"> / 1M симв.</span>
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

        {/* Voice selection for current model */}
        {currentModelInfo.supportsVoiceClone ? (
          <div className="shrink-0 border-t border-slate-200/40 dark:border-gray-800/40 px-3 sm:px-5 py-3 sm:py-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-400">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-gray-200">Клонирование голоса</p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">Загрузите образец голоса в области ввода текста ниже</p>
              </div>
            </div>
          </div>
        ) : (
        <div className="shrink-0 border-t border-slate-200/40 dark:border-gray-800/40 max-h-[30vh] flex flex-col">
          <div className="px-3 sm:px-5 py-2 sm:py-3 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">
              Голос — <span className="normal-case text-slate-600 dark:text-gray-300 font-medium">{currentModelInfo.name}</span>
            </p>
            <span className="text-[11px] text-slate-400 dark:text-gray-500">{pluralVoices(currentModelInfo.voices.length)}</span>
          </div>
          <div className="flex-1 overflow-y-auto px-3 sm:px-5 pb-2 sm:pb-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
              {currentModelInfo.voices.map((voice) => {
                const isRussian = voice.startsWith('Russian_') || voice.startsWith('ru-');
                return (
                <button
                  key={voice}
                  onClick={() => onSelectVoice(voice)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-left ${
                    selectedVoice === voice
                      ? 'bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20'
                      : 'bg-slate-100/50 dark:bg-[#12122a] border-slate-200/40 dark:border-gray-800/40 hover:border-blue-500/20 hover:bg-blue-500/5'
                  }`}
                >
                  <span className={`text-xs font-medium truncate ${selectedVoice === voice ? 'text-blue-400' : 'text-slate-700 dark:text-gray-200'}`}>
                    {voiceLabel(voice)}
                  </span>
                  {isRussian && (
                    <span className="shrink-0 text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                      RU
                    </span>
                  )}
                </button>
                );
              })}
            </div>
          </div>
        </div>
        )}

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-2.5 sm:py-3 border-t border-slate-200/40 dark:border-gray-800/40 bg-slate-50/50 dark:bg-[#0a0a1a]/50 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
          <div className="text-[10px] sm:text-[11px] text-slate-400 dark:text-gray-500 truncate mr-3">
            <span className="text-slate-700 dark:text-gray-200 font-medium">{currentModelInfo.name}</span>
            {' · '}
            <span>{currentModelInfo.supportsVoiceClone ? 'Клон голоса' : voiceLabel(selectedVoice)}</span>
            {' · '}
            <span>{currentModelInfo.pricePerMil.toLocaleString('ru-RU')} ₽ / 1M</span>
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

export function getTTSModelDisplayName(modelId: string): string {
  const model = TTS_MODELS.find((m) => m.id === modelId);
  return model?.name || modelId;
}

export function getTTSModelInfo(modelId: string): TTSModelInfo | null {
  return TTS_MODELS.find((m) => m.id === modelId) || null;
}

export { TTS_MODELS, voiceLabel };
