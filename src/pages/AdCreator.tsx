import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { downloadFile } from '@/lib/download';
import { useNavigate } from 'react-router-dom';
import ImageViewer from '@/components/ImageViewer';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Sparkles,
  Image as ImageIcon,
  Video,
  AudioLines,
  Download,
  Check,
  RefreshCw,
  Play,
  Pause,
  Film,
  FileText,
  ChevronDown,
  Trash2,
  Plus,
  GripVertical,
  Wallet,
  Minus,
  Upload,
  X,
  ZoomIn,
  Copy,
} from 'lucide-react';
import { getFreshSession, supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { VIDEO_MODELS } from '@/components/VideoModelSelector';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Scene {
  id: string;
  visual: string;
  screenText: string;
  voiceLine: string;
  imagePrompt: string;
  customImageUrl?: string;
  imageUrl?: string;
  analyzing?: boolean;
  imageLoading?: boolean;
  imageError?: string;
  videoUrl?: string;
  videoLoading?: boolean;
  videoError?: string;
  videoGenerationId?: string;
  audioUrl?: string;
  audioLoading?: boolean;
  audioError?: string;
  enhancingVoice?: boolean;
  videoPrompt?: string;
  enhancingVideoPrompt?: boolean;
}

type ContentType = 'app' | 'product' | 'service' | 'brand' | 'event' | 'custom';
type AspectRatioId = '9:16' | '16:9' | '1:1' | '4:5' | '3:4' | '4:3' | '21:9';

interface Brief {
  contentType: ContentType;
  projectName: string;
  description: string;
  audience: string;
  painPoint: string;
  aspectRatio: AspectRatioId;
  sceneDuration: number;
  sceneCount: number;
  style: string;
}

const CONTENT_TYPES: { id: ContentType; label: string; placeholder: string; descPlaceholder: string }[] = [
  { id: 'app', label: 'Приложение', placeholder: 'Avirond', descPlaceholder: 'Трекер тренировок с ИИ-тренером' },
  { id: 'product', label: 'Товар', placeholder: 'AirPods Max 2', descPlaceholder: 'Беспроводные наушники с шумоподавлением' },
  { id: 'service', label: 'Услуга', placeholder: 'SkillUp Academy', descPlaceholder: 'Онлайн-курсы по дизайну и разработке' },
  { id: 'brand', label: 'Бренд', placeholder: 'NordCraft', descPlaceholder: 'Скандинавская мебель ручной работы' },
  { id: 'event', label: 'Событие', placeholder: 'DevConf 2026', descPlaceholder: 'Конференция для разработчиков, 15 ноября' },
  { id: 'custom', label: 'Другое', placeholder: 'Название проекта', descPlaceholder: 'Опишите что рекламируете' },
];

const ASPECT_RATIOS: { id: AspectRatioId; label: string; desc: string }[] = [
  { id: '9:16', label: '9:16', desc: 'Вертикальное' },
  { id: '16:9', label: '16:9', desc: 'Горизонтальное' },
  { id: '1:1', label: '1:1', desc: 'Квадрат' },
  { id: '4:5', label: '4:5', desc: 'Портрет' },
  { id: '3:4', label: '3:4', desc: 'Портрет' },
  { id: '4:3', label: '4:3', desc: 'Ландшафт' },
  { id: '21:9', label: '21:9', desc: 'Кино' },
];

const DURATIONS = [4, 5, 8, 10, 15, 20, 30];
const SCENE_COUNTS = [3, 4, 5, 6, 7, 8, 10, 15, 20, 30, 50, 100];

const STYLES = [
  { id: '', label: 'Авто' },
  { id: 'cinematic', label: 'Кино' },
  { id: 'ugc', label: 'UGC' },
  { id: 'minimal', label: 'Минимализм' },
  { id: 'energetic', label: 'Динамика' },
  { id: 'luxury', label: 'Премиум' },
  { id: 'animation', label: 'Анимация' },
];

const STEP_LABELS = ['Бриф', 'Сценарий', 'Кадры', 'Видео', 'Озвучка'];
const STEP_ICONS = [FileText, Sparkles, ImageIcon, Video, AudioLines];

function StepIndicator({ current, total, onStepClick }: { current: number; total: number; onStepClick?: (step: number) => void }) {
  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const Icon = STEP_ICONS[i];
        const isActive = i === current;
        const isDone = i < current;
        const canClick = isDone && onStepClick;
        return (
          <div key={i} className="flex items-center gap-1 sm:gap-1.5">
            {i > 0 && (
              <div className={`w-3 sm:w-8 h-0.5 rounded-full transition-colors ${isDone ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-gray-800'}`} />
            )}
            <button
              type="button"
              disabled={!canClick}
              onClick={() => canClick && onStepClick(i)}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
              isActive
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30'
                : isDone
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 cursor-pointer'
                  : 'text-slate-400 dark:text-gray-600 cursor-default'
            }`}>
              {isDone ? <Check className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
              <span className="hidden md:inline">{STEP_LABELS[i]}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function CustomImageThumb({ url, analyzing, onRemove }: { url: string; analyzing?: boolean; onRemove: () => void }) {
  const [viewerOpen, setViewerOpen] = useState(false);
  return (
    <>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-slate-200 dark:border-gray-800 cursor-pointer group" onClick={() => setViewerOpen(true)}>
          <img src={url} alt="Загруженное" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
            <ZoomIn className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {analyzing && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-[10px] font-medium text-slate-400 dark:text-gray-500">{analyzing ? 'Обновляю тексты...' : 'Своё фото'}</span>
          <button onClick={onRemove} className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-500 transition-colors">
            <X className="w-3 h-3" />
            Удалить
          </button>
        </div>
      </div>
      {viewerOpen && <ImageViewer src={url} alt="Загруженное фото" onClose={() => setViewerOpen(false)} />}
    </>
  );
}

function SceneAudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(() => {});
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={() => {
          const a = audioRef.current;
          if (a && a.duration) setProgress((a.currentTime / a.duration) * 100);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <button onClick={toggle} className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 transition-colors">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-gray-800 overflow-hidden">
        <div className="h-full bg-cyan-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function friendlyError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('sensitivecontent') || lower.includes('sensitive_content') || lower.includes('privacy'))
    return 'Изображение отклонено: обнаружены лица реальных людей или личные данные. Попробуйте другое изображение без людей.';
  if (lower.includes('nsfw') || lower.includes('inappropriate'))
    return 'Изображение отклонено: содержит неподобающий контент. Используйте другое изображение.';
  if (lower.includes('content_policy') || lower.includes('content policy'))
    return 'Запрос отклонён из-за ограничений модерации контента. Измените изображение или текст и попробуйте снова.';
  if (lower.includes('rate_limit') || lower.includes('rate limit') || lower.includes('too many'))
    return 'Слишком много запросов. Подождите немного и попробуйте снова.';
  if (lower.includes('insufficient') || lower.includes('баланс') || lower.includes('недостаточно'))
    return 'Недостаточно средств на балансе. Пополните баланс в настройках.';
  if (lower.includes('timeout') || lower.includes('timed out'))
    return 'Сервер не ответил вовремя. Попробуйте повторить запрос.';
  if (lower.includes('model') && lower.includes('not found'))
    return 'Выбранная модель временно недоступна. Попробуйте другую модель.';
  if (raw.length > 120) return 'Произошла ошибка при генерации. Попробуйте другое изображение или повторите позже.';
  return raw;
}

async function callAPI(path: string, body: Record<string, unknown>, timeout = 120_000) {
  const session = await getFreshSession();
  if (!session) throw new Error('Необходима авторизация');
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(friendlyError(data.error || `Ошибка (${res.status})`));
  return data;
}

async function pollVideo(generationId: string, estimatedCost: number): Promise<string> {
  const maxAttempts = 180;
  let consecutiveErrors = 0;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const session = await getFreshSession();
    if (!session) throw new Error('Сессия истекла');
    const url = `${SUPABASE_URL}/functions/v1/generate-video?id=${encodeURIComponent(generationId)}&estimated_cost=${estimatedCost}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      consecutiveErrors++;
      if (consecutiveErrors >= 3) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error || `Ошибка сервера (${res.status})`);
      }
      continue;
    }
    consecutiveErrors = 0;
    const data = await res.json();
    if (data.status === 'completed' && data.url) return data.url;
    if (data.status === 'failed') throw new Error(friendlyError(data.error || 'Генерация видео не удалась'));
  }
  throw new Error('Превышено время ожидания генерации видео');
}

const COST_ESTIMATES: Record<string, Record<string, number>> = {
  script: { 'gpt-4o-mini': 1 },
  image: {
    'gpt-image-1': 25.83, 'gpt-image-1-mini': 10, 'gpt-image-2': 30,
    'gemini-3.1-flash-image': 8, 'seedream-5-0-lite': 10, 'flux.2-pro': 18,
    'grok-imagine-image-2.0': 15, 'recraft-v4.1': 12, 'muse-image': 10,
  },
  video_per_sec: {
    'seedance-2.0-mini': 6.75, 'seedance-2.0-fast': 26.99, 'seedance-2.0': 75.91,
    'seedance-2.5': 39.54, 'seedance-1-5-pro': 26.03, 'kling-v3.0-std': 21.42,
    'kling-v3.0-pro': 28.56, 'kling-video-o1': 19.04, 'hailuo-3': 22.1,
    'hailuo-2.3': 13.89, 'veo-3.1-lite': 13.6, 'veo-3.1-fast': 51,
    'veo-3.1': 102, 'wan-3.0': 28.9, 'wan-2.7': 17, 'sora-2-pro': 85,
    'gen-4.5': 20.4, 'aleph-2': 47.6, 'grok-imagine-video-1.5': 42.5,
    'grok-imagine-video': 11.9, 'flux-3-video': 90.1, 'happyhorse-1.1': 21.73,
  },
  tts: {
    'qwen-audio-3.0-tts-plus': 2, 'gpt-4o-mini-tts': 2, 'tts-1-hd': 3, 'tts-1': 1,
    'grok-voice-tts-1.0': 2, 'gemini-3.1-flash-tts-preview': 1,
    'kokoro-82m': 0.5, 'aura-2': 2,
  },
};

const AD_CREATOR_STORAGE_KEY = 'ad-creator-state';

interface PersistedState {
  step: number;
  brief: Brief;
  scenes: Scene[];
  characterDescription: string;
  referenceImages: { id: string; url: string }[];
  imageModel: string;
  videoModel: string;
  ttsModel: string;
  ttsVoice: string;
}

function loadPersistedState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(AD_CREATOR_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedState;
    if (parsed.scenes) {
      parsed.scenes = parsed.scenes.map(s => ({
        ...s,
        imageLoading: false,
        videoLoading: false,
        audioLoading: false,
        analyzing: false,
        enhancingVoice: false,
        enhancingVideoPrompt: false,
        imageError: undefined,
        videoError: undefined,
        audioError: undefined,
      }));
    }
    return parsed;
  } catch { return {}; }
}

export default function AdCreator() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const saved = useRef(loadPersistedState()).current;

  const [step, setStep] = useState(saved.step ?? 0);
  const [brief, setBrief] = useState<Brief>(saved.brief ?? {
    contentType: 'app',
    projectName: '',
    description: '',
    audience: '',
    painPoint: '',
    aspectRatio: '9:16',
    sceneDuration: 5,
    sceneCount: 5,
    style: '',
  });
  const [scenes, setScenes] = useState<Scene[]>(saved.scenes ?? []);
  const scenesRef = useRef<Scene[]>([]);
  scenesRef.current = scenes;
  const [characterDescription, setCharacterDescription] = useState(saved.characterDescription ?? '');
  const [referenceImages, setReferenceImages] = useState<{ id: string; url: string; uploading?: boolean }[]>(saved.referenceImages ?? []);

  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError] = useState('');

  const [imageModel, setImageModel] = useState(saved.imageModel ?? 'gpt-image-1');
  const [videoModel, setVideoModel] = useState(saved.videoModel ?? 'seedance-2.0-mini');
  const [ttsModel, setTtsModel] = useState(saved.ttsModel ?? 'qwen-audio-3.0-tts-plus');
  const [ttsVoice, setTtsVoice] = useState(saved.ttsVoice ?? 'longanlingxin');
  const [showModelPicker, setShowModelPicker] = useState<string | null>(null);

  const [balance, setBalance] = useState<number | null>(null);
  const [prevBalance, setPrevBalance] = useState<number | null>(null);
  const [balanceFlash, setBalanceFlash] = useState(false);

  useEffect(() => {
    const state: PersistedState = {
      step, brief, characterDescription, imageModel, videoModel, ttsModel, ttsVoice,
      scenes: scenes.map(s => ({
        id: s.id, visual: s.visual, screenText: s.screenText, voiceLine: s.voiceLine,
        imagePrompt: s.imagePrompt, customImageUrl: s.customImageUrl, imageUrl: s.imageUrl,
        videoUrl: s.videoUrl, audioUrl: s.audioUrl, videoPrompt: s.videoPrompt,
      })),
      referenceImages: referenceImages.filter(r => !r.uploading).map(({ id, url }) => ({ id, url })),
    };
    localStorage.setItem(AD_CREATOR_STORAGE_KEY, JSON.stringify(state));
  }, [step, brief, scenes, characterDescription, referenceImages, imageModel, videoModel, ttsModel, ttsVoice]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('user_balances')
        .select('tokens')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setBalance(Number(data.tokens));
    };
    load();
    const channel = supabase
      .channel('ad-balance')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_balances', filter: `id=eq.${user.id}` },
        (payload) => {
          const t = payload.new?.tokens;
          if (typeof t === 'number') {
            setBalance((prev) => {
              if (prev !== null && prev !== t) {
                setPrevBalance(prev);
                setBalanceFlash(true);
                setTimeout(() => setBalanceFlash(false), 1200);
              }
              return t;
            });
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const aspectRatio = brief.aspectRatio;

  const updateBrief = (key: keyof Brief, value: string | number) => {
    setBrief(prev => ({ ...prev, [key]: value }));
  };

  const updateScene = useCallback((id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const addScene = useCallback(() => {
    setScenes(prev => [...prev, {
      id: crypto.randomUUID(),
      visual: '',
      screenText: '',
      voiceLine: '',
      imagePrompt: '',
      videoPrompt: '',
    }]);
  }, []);

  const removeScene = useCallback((id: string) => {
    setScenes(prev => prev.filter(s => s.id !== id));
  }, []);

  const contentTypeInfo = CONTENT_TYPES.find(c => c.id === brief.contentType) || CONTENT_TYPES[0];
  const contentLabel = brief.contentType === 'app' ? 'приложения'
    : brief.contentType === 'product' ? 'товара'
    : brief.contentType === 'service' ? 'услуги'
    : brief.contentType === 'brand' ? 'бренда'
    : brief.contentType === 'event' ? 'события'
    : 'проекта';

  const generateScript = useCallback(async () => {
    if (!brief.projectName.trim() || !brief.description.trim()) return;
    setScriptLoading(true);
    setScriptError('');

    const styleHint = brief.style ? `Стиль: ${brief.style}.` : '';

    try {
      const refUrls = referenceImages.filter(r => !r.uploading).map(r => r.url);
      const hasRefs = refUrls.length > 0;

      const systemPrompt = `Ты — креативный сценарист рекламных роликов. Создай сториборд из ${brief.sceneCount} сцен для "${brief.projectName}".

ГЛАВНОЕ ПРАВИЛО — ЕДИНАЯ ИСТОРИЯ:
Все ${brief.sceneCount} сцен — это ОДНА непрерывная история с началом, развитием и финалом. Каждая следующая сцена ПРОДОЛЖАЕТ предыдущую. Зритель должен следить за СЮЖЕТОМ, а не видеть набор разрозненных тем.

Придумай КОНКРЕТНЫЙ мини-сюжет (историю):
- Кто главный герой и какая у него цель/проблема?
- Что происходит по ходу ролика (путешествие, открытие, вызов, трансформация)?
- Какая развязка/финал?

Сцены связаны ПРИЧИННО-СЛЕДСТВЕННО: событие в сцене N приводит к событию в сцене N+1.

НЕ ДЕЛАЙ: список разных тем/ситуаций, не связанных друг с другом. Каждая сцена — следующая ГЛАВА одной истории.
${hasRefs ? `\nРЕФЕРЕНСНЫЕ ИЗОБРАЖЕНИЯ: используй персонажей, стиль рисовки и цветовую палитру с загруженных фото. Персонажи с референсов — главные герои истории.` : ''}

Ответь ТОЛЬКО валидным JSON без маркдауна и без \`\`\`:
{
  "story_synopsis": "Краткий пересказ всей истории ролика в 2-3 предложениях",
  "character_description": "Подробное описание повторяющихся персонажей: внешность, одежда, стиль рисовки — для визуальной консистентности между сценами",
  "scenes": [
    {
      "visual": "что КОНКРЕТНО видно в кадре — действия персонажей, локация, предметы",
      "screen_text": "текст на экране, макс 5 слов",
      "voice_line": "реплика озвучки, макс 10 слов, двигающая сюжет вперёд",
      "image_prompt": "детальный промпт 200+ символов для генерации изображения, ТОЧНО соответствующий visual: композиция, локация, действие, освещение, цвета, формат ${aspectRatio}${hasRefs ? ', в стиле загруженных референсов' : ''}. НЕ включай описание персонажей — оно будет добавлено из character_description."
    }
  ]
}

Длительность каждой сцены: ${brief.sceneDuration} сек. Все тексты на русском.
${styleHint}`;

      const userPrompt = `Проект: ${brief.projectName}
Описание: ${brief.description}
Тип: реклама ${contentLabel}
Аудитория: ${brief.audience || 'широкая'}
Боль / потребность: ${brief.painPoint || 'не указана'}
Формат видео: ${aspectRatio}
Количество сцен: ${brief.sceneCount}

ВАЖНО: Придумай ОДИН связный сюжет на все ${brief.sceneCount} сцен. Каждая сцена — продолжение предыдущей, а не отдельная тема. История должна захватывать с первой сцены и вести зрителя до финала.`;

      const userContent: Array<Record<string, unknown>> = [];
      if (hasRefs) {
        for (const url of refUrls) {
          userContent.push({ type: 'image_url', image_url: { url } });
        }
        userContent.push({ type: 'text', text: `Выше — референсные изображения. Используй этих персонажей и их стиль как главных героев ЕДИНОЙ ИСТОРИИ.\n\n${userPrompt}` });
      } else {
        userContent.push({ type: 'text', text: userPrompt });
      }

      const data = await callAPI('chat-completion', {
        model: refUrls.length > 0 ? 'gpt-4o' : 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
      });

      const content = data.choices?.[0]?.message?.content?.trim() || '';

      let parsedScenes: Record<string, string>[] = [];
      let charDesc = '';

      const objMatch = content.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          const obj = JSON.parse(objMatch[0]);
          if (obj.scenes && Array.isArray(obj.scenes)) {
            parsedScenes = obj.scenes;
            charDesc = obj.character_description || '';
          } else if (Array.isArray(obj)) {
            parsedScenes = obj;
          }
        } catch { /* fallback to array parse */ }
      }
      if (parsedScenes.length === 0) {
        const arrMatch = content.match(/\[[\s\S]*\]/);
        if (!arrMatch) throw new Error('Не удалось распознать сценарий');
        parsedScenes = JSON.parse(arrMatch[0]);
      }
      if (!Array.isArray(parsedScenes) || parsedScenes.length === 0) throw new Error('Пустой сценарий');

      setCharacterDescription(charDesc);
      setScenes(parsedScenes.map((s: Record<string, string>) => ({
        id: crypto.randomUUID(),
        visual: s.visual || '',
        screenText: s.screen_text || '',
        voiceLine: s.voice_line || '',
        imagePrompt: s.image_prompt || '',
        videoPrompt: s.visual || '',
      })));
      setStep(1);
    } catch (e) {
      console.error('Failed to generate ad script:', e);
      setScriptError('Не удалось сгенерировать сценарий. Попробуйте позже.');
    } finally {
      setScriptLoading(false);
    }
  }, [brief, aspectRatio, contentLabel, referenceImages]);

  const analyzeCustomImage = useCallback(async (sceneId: string, file: File) => {
    const scene = scenesRef.current.find(s => s.id === sceneId);
    if (!scene) return;
    updateScene(sceneId, { analyzing: true });
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await callAPI('chat-completion', {
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Ты — копирайтер для видеорекламы. Пользователь загрузил своё изображение для сцены ролика. Проанализируй что на изображении и сгенерируй тексты для этой сцены на русском языке. Ответ строго JSON без markdown:\n{"visual": "описание того что в кадре", "screen_text": "текст на экране макс 5 слов", "voice_line": "реплика озвучки макс 10 слов"}`,
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: base64 } },
              { type: 'text', text: `Контекст: проект "${brief.projectName}" — ${brief.description}. Опиши что на фото и предложи тексты для рекламной сцены.` },
            ],
          },
        ],
      });

      const raw = data.choices?.[0]?.message?.content?.trim() || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        updateScene(sceneId, {
          analyzing: false,
          visual: parsed.visual || scene.visual,
          screenText: parsed.screen_text || scene.screenText,
          voiceLine: parsed.voice_line || scene.voiceLine,
        });
      } else {
        updateScene(sceneId, { analyzing: false });
      }
    } catch {
      updateScene(sceneId, { analyzing: false });
    }
  }, [brief.projectName, brief.description, updateScene]);

  const uploadReferenceImage = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    setReferenceImages(prev => [...prev, { id, url: localUrl, uploading: true }]);

    try {
      const session = await getFreshSession();
      if (!session) throw new Error('Auth');
      const ext = file.name.split('.').pop() || 'png';
      const path = `${session.user.id}/ref-${id}.${ext}`;
      const { error } = await supabase.storage.from('generated-images').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(path);
      setReferenceImages(prev => prev.map(r => r.id === id ? { ...r, url: urlData.publicUrl, uploading: false } : r));
    } catch {
      setReferenceImages(prev => prev.filter(r => r.id !== id));
    }
  }, []);

  const removeReferenceImage = useCallback((id: string) => {
    setReferenceImages(prev => prev.filter(r => r.id !== id));
  }, []);

  const generateImage = useCallback(async (sceneId: string) => {
    const scene = scenesRef.current.find(s => s.id === sceneId);
    if (!scene) return;
    if (scene.customImageUrl && !scene.imageUrl) {
      updateScene(sceneId, { imageUrl: scene.customImageUrl, imageLoading: false, imageError: undefined });
      return;
    }
    updateScene(sceneId, { customImageUrl: undefined });
    updateScene(sceneId, { imageLoading: true, imageError: undefined });

    try {
      let basePrompt = scene.visual ? `${scene.visual}. ${scene.imagePrompt}` : scene.imagePrompt;
      if (characterDescription) {
        basePrompt = `[Персонажи ролика — сохраняй точное визуальное единство: ${characterDescription}]\n\n${basePrompt}`;
      }
      const refUrls = referenceImages.filter(r => !r.uploading).map(r => r.url);
      const supportsRefs = imageModel === 'gpt-image-1' || imageModel === 'gpt-image-2';
      if (refUrls.length > 0) {
        basePrompt = `ОБЯЗАТЕЛЬНО: воспроизведи персонажей, стиль рисовки, цветовую палитру и атмосферу с референсных изображений. Копируй стиль референсов.\n\n${basePrompt}`;
      }

      const buildPayload = (withRefs: boolean): Record<string, unknown> => {
        const p: Record<string, unknown> = {
          model: imageModel,
          prompt: basePrompt,
        };
        if (imageModel.startsWith('gpt-image')) {
          p.size = aspectRatio === '9:16' ? '1024x1536' : aspectRatio === '1:1' ? '1024x1024' : '1536x1024';
          p.quality = 'medium';
        } else {
          p.aspect_ratio = aspectRatio;
        }
        if (withRefs && refUrls.length > 0 && supportsRefs) {
          p.input_references = refUrls.map(u => ({ type: 'image_url', url: u }));
        }
        return p;
      };

      let result: Record<string, unknown> | undefined;
      try {
        result = await callAPI('generate-image', buildPayload(true), 300_000);
      } catch (firstErr) {
        if (refUrls.length > 0 && supportsRefs) {
          result = await callAPI('generate-image', buildPayload(false), 300_000);
        } else {
          throw firstErr;
        }
      }
      const data = result as { data?: { storage_url?: string; media_type?: string; b64_json?: string }[] };
      if (!data.data?.[0]) throw new Error('Нет изображения в ответе');

      const img = data.data[0];
      const url = img.storage_url || `data:${img.media_type || 'image/png'};base64,${img.b64_json}`;
      updateScene(sceneId, { imageUrl: url, imageLoading: false });
    } catch (e) {
      updateScene(sceneId, { imageLoading: false, imageError: (e as Error).message });
    }
  }, [imageModel, aspectRatio, updateScene, characterDescription, referenceImages]);

  const generateAllImages = useCallback(async () => {
    const pending = scenesRef.current.filter(s => !s.imageUrl && !s.imageLoading && !s.customImageUrl);
    await Promise.allSettled(pending.map(s => generateImage(s.id)));
  }, [generateImage]);

  const generateVideo = useCallback(async (sceneId: string) => {
    const scene = scenesRef.current.find(s => s.id === sceneId);
    if (!scene?.imageUrl) return;
    updateScene(sceneId, { videoLoading: true, videoError: undefined });

    try {
      let frameUrl = scene.imageUrl;
      if (frameUrl.startsWith('blob:') || frameUrl.startsWith('data:')) {
        const session = await getFreshSession();
        if (!session) throw new Error('Необходима авторизация');
        const resp = await fetch(frameUrl);
        const blob = await resp.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const path = `${session.user.id}/${Date.now()}_${sceneId}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('video-inputs')
          .upload(path, blob, { contentType: blob.type, upsert: true });
        if (upErr || !upData?.path) throw new Error('Не удалось загрузить изображение');
        const { data: pubData } = supabase.storage.from('video-inputs').getPublicUrl(upData.path);
        frameUrl = pubData.publicUrl;
      }

      const payload: Record<string, unknown> = {
        model: videoModel,
        prompt: `${scene.videoPrompt || scene.visual}. Camera slowly and smoothly moves. Subtle, smooth, minimal motion. Cinematic commercial look.`,
        duration: snapDuration(videoModel, brief.sceneDuration),
        aspect_ratio: aspectRatio,
        first_frame_url: frameUrl,
        resolution: VIDEO_MODELS.find(m => m.id === videoModel)?.defaultResolution || '720p',
      };

      const result = await callAPI('generate-video', payload, 30_000);
      const generationId = result.generation_id || result.id;
      if (!generationId) throw new Error('Нет ID генерации');

      const estimatedCost = result.estimated_cost || 30;
      updateScene(sceneId, { videoGenerationId: generationId });

      const videoUrl = await pollVideo(generationId, estimatedCost);
      updateScene(sceneId, { videoUrl, videoLoading: false });
    } catch (e) {
      updateScene(sceneId, { videoLoading: false, videoError: (e as Error).message });
    }
  }, [videoModel, brief.sceneDuration, aspectRatio, updateScene]);

  const generateAllVideos = useCallback(async () => {
    const pending = scenesRef.current.filter(s => s.imageUrl && !s.videoUrl && !s.videoLoading);
    await Promise.allSettled(pending.map(s => generateVideo(s.id)));
  }, [generateVideo]);

  const generateAudio = useCallback(async (sceneId: string) => {
    const scene = scenesRef.current.find(s => s.id === sceneId);
    if (!scene?.voiceLine) return;
    updateScene(sceneId, { audioLoading: true, audioError: undefined });

    try {
      const session = await getFreshSession();
      if (!session) throw new Error('Необходима авторизация');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/text-to-speech`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: scene.voiceLine,
          model: ttsModel,
          voice: ttsVoice,
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (!res.ok) {
        const ct = res.headers.get('Content-Type') || '';
        if (ct.includes('application/json')) {
          const err = await res.json();
          throw new Error(err.error || `Ошибка (${res.status})`);
        }
        throw new Error(`Ошибка (${res.status})`);
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      updateScene(sceneId, { audioUrl, audioLoading: false });
    } catch (e) {
      updateScene(sceneId, { audioLoading: false, audioError: (e as Error).message });
    }
  }, [ttsModel, ttsVoice, updateScene]);

  const generateAllAudio = useCallback(async () => {
    const pending = scenesRef.current.filter(s => s.voiceLine && !s.audioUrl && !s.audioLoading);
    await Promise.allSettled(pending.map(s => generateAudio(s.id)));
  }, [generateAudio]);

  const enhanceVoiceLine = useCallback(async (sceneId: string) => {
    const scene = scenesRef.current.find(s => s.id === sceneId);
    if (!scene?.voiceLine?.trim() || scene.enhancingVoice) return;
    updateScene(sceneId, { enhancingVoice: true });
    try {
      const session = await getFreshSession();
      if (!session) { updateScene(sceneId, { enhancingVoice: false }); return; }
      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-completion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'Ты профессиональный копирайтер для рекламных роликов. Улучши текст озвучки: сделай его более живым, эмоциональным и цепляющим для зрителя, сохраняя смысл и длину (максимум ±20% слов). Верни ТОЛЬКО улучшенный текст, без кавычек и пояснений. Пиши на том же языке, что и исходный текст.' },
            { role: 'user', content: scene.voiceLine },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        const isRefusal = enhanced && /(извинит|к сожалению|я не могу|не могу помочь|i can'?t|i'?m sorry|sorry,? i|i'?m unable|i cannot|i'?m not able|can'?t assist|can'?t help)/i.test(enhanced);
        if (enhanced && !isRefusal) {
          updateScene(sceneId, { voiceLine: enhanced });
        }
      }
    } catch { /* ignore */ }
    updateScene(sceneId, { enhancingVoice: false });
  }, [updateScene]);

  const enhanceVideoPrompt = useCallback(async (sceneId: string) => {
    const scene = scenesRef.current.find(s => s.id === sceneId);
    if (scene?.enhancingVideoPrompt) return;
    const raw = (scene?.videoPrompt || scene?.visual || '').trim();
    updateScene(sceneId, { enhancingVideoPrompt: true });
    try {
      const session = await getFreshSession();
      if (!session) { updateScene(sceneId, { enhancingVideoPrompt: false }); return; }

      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      if (raw) userContent.push({ type: 'text', text: raw });

      if (scene?.imageUrl) {
        let imgDataUrl = scene.imageUrl;
        if (!imgDataUrl.startsWith('data:')) {
          try {
            const imgResp = await fetch(imgDataUrl);
            const blob = await imgResp.blob();
            imgDataUrl = await new Promise<string>(resolve => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch { /* use url as-is */ }
        }
        userContent.push({ type: 'image_url', image_url: { url: imgDataUrl } });
      }

      if (userContent.length === 0) { updateScene(sceneId, { enhancingVideoPrompt: false }); return; }

      const systemText = scene?.imageUrl
        ? 'Ты профессиональный промпт-инженер для генерации рекламных видео. Внимательно рассмотри приложенное изображение. Опиши что на нём изображено и напиши промпт для генерации видео на основе этого кадра: добавь детали о движении камеры, динамике, освещении, стиле и атмосфере. Если пользователь дал текстовый контекст сцены — учти его. Верни ТОЛЬКО готовый промпт для видеогенерации, без кавычек и пояснений. Пиши на английском языке. Максимум 200 слов.'
        : 'Ты профессиональный промпт-инженер для генерации рекламных видео. Улучши промпт пользователя, добавив детали о движении камеры, динамике, освещении, стиле и атмосфере для создания эффектного рекламного ролика. Верни ТОЛЬКО улучшенный промпт, без кавычек и пояснений. Пиши на том же языке, что и исходный промпт. Максимум 200 слов.';

      const res = await fetch(`${SUPABASE_URL}/functions/v1/chat-completion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: scene?.imageUrl ? 'gpt-4o' : 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemText },
            { role: 'user', content: userContent },
          ],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const enhanced = data.choices?.[0]?.message?.content?.trim();
        const isRefusal = enhanced && /(извинит|к сожалению|я не могу|не могу помочь|i can'?t|i'?m sorry|sorry,? i|i'?m unable|i cannot|i'?m not able|can'?t assist|can'?t help)/i.test(enhanced);
        if (enhanced && !isRefusal) {
          updateScene(sceneId, { videoPrompt: enhanced });
        }
      }
    } catch { /* ignore */ }
    updateScene(sceneId, { enhancingVideoPrompt: false });
  }, [updateScene]);



  const canProceed = () => {
    switch (step) {
      case 0: return brief.projectName.trim().length > 0 && brief.description.trim().length > 0;
      case 1: return scenes.length > 0;
      case 2: return scenes.some(s => s.imageUrl);
      case 3: return scenes.some(s => s.videoUrl);
      case 4: return true;
      default: return false;
    }
  };

  const activeImgCount = scenes.filter(s => s.imageLoading).length;
  const activeVidCount = scenes.filter(s => s.videoLoading).length;
  const activeAudioCount = scenes.filter(s => s.audioLoading).length;

  const stepCost = (() => {
    switch (step) {
      case 0: return COST_ESTIMATES.script['gpt-4o-mini'] || 1;
      case 2: {
        const perImg = COST_ESTIMATES.image[imageModel] || 5;
        const pending = scenes.filter(s => !s.imageUrl && !s.imageLoading && !s.customImageUrl).length;
        return pending > 0 ? perImg * pending : perImg;
      }
      case 3: {
        const perSec = COST_ESTIMATES.video_per_sec[videoModel] || 14;
        const perVid = perSec * brief.sceneDuration;
        const pending = scenes.filter(s => s.imageUrl && !s.videoUrl && !s.videoLoading).length;
        return pending > 0 ? perVid * pending : perVid;
      }
      case 4: {
        const perAudio = COST_ESTIMATES.tts[ttsModel] || 2;
        const pending = scenes.filter(s => s.voiceLine && !s.audioUrl && !s.audioLoading).length;
        return pending > 0 ? perAudio * pending : perAudio;
      }
      default: return 0;
    }
  })();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-[#0d0d20]">
      {/* Header */}
      <div className="shrink-0 border-b border-slate-200/60 dark:border-gray-800/60 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button onClick={() => navigate('/')} className="shrink-0 p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Film className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-white" />
              </div>
              <h1 className="text-sm sm:text-base font-semibold text-slate-800 dark:text-gray-100 truncate">Конструктор ролика</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="hidden sm:block"><StepIndicator current={step} total={5} onStepClick={setStep} /></div>
            {balance !== null && (
              <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 ${
                balanceFlash
                  ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 scale-105'
                  : 'bg-slate-100 dark:bg-gray-800/60 text-slate-700 dark:text-gray-300'
              }`}>
                <Wallet className="w-3.5 h-3.5" />
                <span>{Math.round(balance)}</span>
                {balanceFlash && prevBalance !== null && (
                  <span className="text-xs font-medium text-red-500 dark:text-red-400 animate-pulse">
                    {balance - prevBalance > 0 ? '+' : ''}{Math.round(balance - prevBalance)}
                  </span>
                )}
                {stepCost > 0 && !balanceFlash && (
                  <span className="flex items-center text-xs font-medium text-slate-400 dark:text-gray-500">
                    <Minus className="w-2.5 h-2.5" />
                    ~{Math.round(stepCost)}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="sm:hidden px-3 pb-2.5 flex justify-center">
          <StepIndicator current={step} total={5} onStepClick={setStep} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          {step === 0 && (
            <BriefStep
              brief={brief}
              onChange={updateBrief}
              onGenerate={generateScript}
              loading={scriptLoading}
              error={scriptError}
              contentTypeInfo={contentTypeInfo}
            />
          )}

          {step === 1 && (
            <ScriptStep
              scenes={scenes}
              onUpdate={updateScene}
              onAdd={addScene}
              onRemove={removeScene}
              onRegenerate={generateScript}
              loading={scriptLoading}
              onAnalyzeImage={analyzeCustomImage}
            />
          )}

          {step === 2 && (
            <ImageStep
              scenes={scenes}
              imageModel={imageModel}
              onModelChange={setImageModel}
              onGenerate={generateImage}
              onGenerateAll={generateAllImages}
              onUpdate={updateScene}
              onDeleteImage={(id) => updateScene(id, { imageUrl: undefined, customImageUrl: undefined })}
              activeCount={activeImgCount}
              showModelPicker={showModelPicker}
              setShowModelPicker={setShowModelPicker}
              referenceImages={referenceImages}
              onUploadReference={uploadReferenceImage}
              onRemoveReference={removeReferenceImage}
            />
          )}

          {step === 3 && (
            <VideoStep
              scenes={scenes}
              videoModel={videoModel}
              onModelChange={setVideoModel}
              onGenerate={generateVideo}
              onGenerateAll={generateAllVideos}
              onUpdate={updateScene}
              onEnhanceVideoPrompt={enhanceVideoPrompt}
              activeCount={activeVidCount}
              showModelPicker={showModelPicker}
              setShowModelPicker={setShowModelPicker}
              sceneDuration={brief.sceneDuration}
              aspectRatio={aspectRatio}
            />
          )}

          {step === 4 && (
            <AudioStep
              scenes={scenes}
              ttsModel={ttsModel}
              ttsVoice={ttsVoice}
              onModelChange={(m: string) => {
                const newModel = TTS_MODEL_OPTIONS.find(o => o.id === m);
                setTtsModel(m);
                if (newModel?.voices && !newModel.voices.includes(ttsVoice)) {
                  setTtsVoice(newModel.voices[0]);
                }
              }}
              onVoiceChange={setTtsVoice}
              onGenerate={generateAudio}
              onGenerateAll={generateAllAudio}
              onDownload={downloadFile}
              onUpdate={updateScene}
              onEnhanceVoiceLine={enhanceVoiceLine}
              activeCount={activeAudioCount}
              showModelPicker={showModelPicker}
              setShowModelPicker={setShowModelPicker}
            />
          )}
        </div>
      </div>

      {/* Footer nav */}
      {step > 0 && (
        <div className="shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-t border-slate-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-[#0d0d20]/80 backdrop-blur-sm">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад
          </button>
          {step < 4 && (
            <button
              onClick={() => setStep(s => Math.min(4, s + 1))}
              disabled={!canProceed()}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-md shadow-cyan-500/20"
            >
              Далее
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Step Components ──────────────────────────── */

function BriefStep({ brief, onChange, onGenerate, loading, error, contentTypeInfo }: {
  brief: Brief;
  onChange: (key: keyof Brief, value: string | number) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string;
  contentTypeInfo: { id: string; label: string; placeholder: string; descPlaceholder: string };
}) {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100 mb-1">Расскажите о проекте</h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Заполните бриф, и ИИ создаст сценарий рекламного ролика с промтами для каждой сцены.</p>
      </div>

      <div className="space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50/30 dark:bg-gray-900/20 p-4 sm:p-5 space-y-4">
          <FieldGroup label="Что рекламируем">
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map(ct => (
                <button
                  key={ct.id}
                  onClick={() => onChange('contentType', ct.id)}
                  className={`px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    brief.contentType === ct.id
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60 border border-slate-200/60 dark:border-gray-700/60'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Название" required>
            <input
              value={brief.projectName}
              onChange={e => onChange('projectName', e.target.value)}
              placeholder={contentTypeInfo.placeholder}
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-slate-800 dark:text-gray-100 text-sm placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-shadow"
            />
          </FieldGroup>

          <FieldGroup label="Описание" required>
            <textarea
              value={brief.description}
              onChange={e => onChange('description', e.target.value)}
              placeholder={contentTypeInfo.descPlaceholder}
              rows={3}
              className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-slate-800 dark:text-gray-100 text-sm placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-shadow resize-none"
            />
          </FieldGroup>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldGroup label="Целевая аудитория">
              <input
                value={brief.audience}
                onChange={e => onChange('audience', e.target.value)}
                placeholder="Студенты 18-25, мамы, фрилансеры..."
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-slate-800 dark:text-gray-100 text-sm placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-shadow"
              />
            </FieldGroup>

            <FieldGroup label="Главная боль / потребность">
              <input
                value={brief.painPoint}
                onChange={e => onChange('painPoint', e.target.value)}
                placeholder="Нет времени, сложно, дорого..."
                className="w-full px-3.5 py-2.5 sm:py-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-slate-800 dark:text-gray-100 text-sm placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-shadow"
              />
            </FieldGroup>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50/30 dark:bg-gray-900/20 p-4 sm:p-5 space-y-4">
          <FieldGroup label="Стиль ролика">
            <div className="flex flex-wrap gap-2">
              {STYLES.map(s => (
                <button
                  key={s.id}
                  onClick={() => onChange('style', s.id)}
                  className={`px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    brief.style === s.id
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60 border border-slate-200/60 dark:border-gray-700/60'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <FieldGroup label="Формат видео">
            <div className="flex flex-wrap gap-2">
              {ASPECT_RATIOS.map(ar => (
                <button
                  key={ar.id}
                  onClick={() => onChange('aspectRatio', ar.id)}
                  className={`px-3 sm:px-3.5 py-2 sm:py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    brief.aspectRatio === ar.id
                      ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                      : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60 border border-slate-200/60 dark:border-gray-700/60'
                  }`}
                  title={ar.desc}
                >
                  {ar.label}
                </button>
              ))}
            </div>
          </FieldGroup>

          <div className="grid grid-cols-2 gap-4">
            <FieldGroup label="Длительность сцены">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => onChange('sceneDuration', d)}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      brief.sceneDuration === d
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60 border border-slate-200/60 dark:border-gray-700/60'
                    }`}
                  >
                    {d}с
                  </button>
                ))}
              </div>
            </FieldGroup>

            <FieldGroup label="Кол-во сцен">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {SCENE_COUNTS.map(c => (
                  <button
                    key={c}
                    onClick={() => onChange('sceneCount', c)}
                    className={`px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      brief.sceneCount === c
                        ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60 border border-slate-200/60 dark:border-gray-700/60'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </FieldGroup>
          </div>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        onClick={onGenerate}
        disabled={loading || !brief.projectName.trim() || !brief.description.trim()}
        className="w-full flex items-center justify-center gap-2 px-6 py-3.5 sm:py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98]"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Генерация сценария...' : 'Сгенерировать сценарий'}
      </button>
    </div>
  );
}

function ScriptStep({ scenes, onUpdate, onAdd, onRemove, onRegenerate, loading, onAnalyzeImage }: {
  scenes: Scene[];
  onUpdate: (id: string, updates: Partial<Scene>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  onRegenerate: () => void;
  loading: boolean;
  onAnalyzeImage: (id: string, file: File) => void;
}) {
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100 mb-0.5 sm:mb-1">Сценарий</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Отредактируйте сцены и промпты. Можно добавить или удалить сцены.</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-500/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Сцена
          </button>
          <button
            onClick={onRegenerate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Заново
          </button>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50/50 dark:bg-gray-900/30 overflow-hidden">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100/80 dark:bg-gray-800/40 border-b border-slate-200/40 dark:border-gray-800/40">
              <GripVertical className="w-3.5 h-3.5 text-slate-300 dark:text-gray-700 hidden sm:block" />
              <span className="w-6 h-6 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300 flex-1 truncate">Сцена {i + 1}</span>
              {scene.analyzing && (
                <span className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <Sparkles className="w-3 h-3 text-cyan-500 animate-spin shrink-0" style={{ animationDuration: '2s' }} />
                  <span className="text-[10px] sm:text-[11px] font-medium text-cyan-600 dark:text-cyan-400 animate-pulse truncate">ИИ обновляет тексты</span>
                </span>
              )}
              {scenes.length > 1 && (
                <button
                  onClick={() => onRemove(scene.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
                  title="Удалить сцену"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FieldGroup label="Что в кадре" compact>
                  <input
                    value={scene.visual}
                    onChange={e => onUpdate(scene.id, { visual: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </FieldGroup>
                <FieldGroup label="Текст на экране" compact>
                  <input
                    value={scene.screenText}
                    onChange={e => onUpdate(scene.id, { screenText: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                  />
                </FieldGroup>
              </div>
              <FieldGroup label="Озвучка" compact>
                <input
                  value={scene.voiceLine}
                  onChange={e => onUpdate(scene.id, { voiceLine: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                />
              </FieldGroup>
              <FieldGroup label="Изображение" compact>
                {scene.customImageUrl ? (
                  <CustomImageThumb
                    url={scene.customImageUrl}
                    analyzing={scene.analyzing}
                    onRemove={() => onUpdate(scene.id, { customImageUrl: undefined, imageUrl: undefined, analyzing: false })}
                  />
                ) : (
                  <>
                    <textarea
                      value={scene.imagePrompt}
                      onChange={e => onUpdate(scene.id, { imagePrompt: e.target.value })}
                      rows={3}
                      placeholder="Промпт для генерации..."
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
                    />
                    <label className="mt-2 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-gray-700 text-xs text-slate-500 dark:text-gray-400 hover:text-cyan-500 hover:border-cyan-500/50 dark:hover:text-cyan-400 dark:hover:border-cyan-500/40 cursor-pointer transition-colors active:scale-[0.98]">
                      <Upload className="w-3.5 h-3.5" />
                      Загрузить своё фото
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const url = URL.createObjectURL(file);
                          onUpdate(scene.id, { customImageUrl: url, imageUrl: url });
                          onAnalyzeImage(scene.id, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </>
                )}
              </FieldGroup>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const IMAGE_MODEL_OPTIONS = [
  { id: 'gpt-image-1', name: 'GPT Image 1', desc: 'Лучшее качество + редактирование' },
  { id: 'gpt-image-1-mini', name: 'GPT Image 1 Mini', desc: 'Быстро и дешево' },
  { id: 'gpt-image-2', name: 'GPT Image 2', desc: 'Новейшая модель OpenAI' },
  { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash', desc: 'Быстрая, до 4K' },
  { id: 'seedream-5-0-lite', name: 'Seedream 5.0 Lite', desc: 'Профессиональная, от ByteDance' },
  { id: 'muse-image', name: 'Muse Image', desc: 'Meta, композиция сцен' },
];

const VIDEO_MODEL_DURATIONS: Record<string, number[]> = {
  'veo-3.1-lite': [4, 6, 8],
  'veo-3.1-fast': [4, 6, 8],
  'veo-3.1': [4, 6, 8],
  'kling-video-o1': [5, 10],
  'hailuo-3': [4, 6, 8, 10],
  'hailuo-2.3': [4, 6, 8, 10],
  'wan-3.0': [4, 6, 8, 10],
  'wan-2.7': [4, 6, 8, 10],
  'gen-4.5': [5, 10],
  'aleph-2': [5, 10],
  'flux-3-video': [5, 10],
  'happyhorse-1.1': [5, 10],
  'grok-imagine-video': [5, 10],
  'grok-imagine-video-1.5': [5, 10, 15],
};

function snapDuration(model: string, desired: number): number {
  const allowed = VIDEO_MODEL_DURATIONS[model];
  if (!allowed) return Math.max(desired, 4);
  let best = allowed[0];
  let bestDiff = Math.abs(desired - best);
  for (const d of allowed) {
    const diff = Math.abs(desired - d);
    if (diff < bestDiff) { best = d; bestDiff = diff; }
  }
  return best;
}

const VIDEO_MODEL_OPTIONS = [
  { id: 'seedance-2.0-mini', name: 'Seedance 2.0 Mini', desc: 'Дешевая, до 15с' },
  { id: 'seedance-2.0-fast', name: 'Seedance 2.0 Fast', desc: 'Быстрая, до 15с' },
  { id: 'seedance-2.0', name: 'Seedance 2.0', desc: 'Высокое качество, до 15с, 1080p' },
  { id: 'seedance-2.5', name: 'Seedance 2.5', desc: 'Лучшая, до 30с, аудио' },
  { id: 'seedance-1-5-pro', name: 'Seedance 1.5 Pro', desc: 'Референсы, до 12с, 1080p' },
  { id: 'kling-v3.0-std', name: 'Kling 3.0 Std', desc: 'Хорошее качество, до 15с' },
  { id: 'kling-v3.0-pro', name: 'Kling 3.0 Pro', desc: 'Максимум от Kuaishou, до 15с' },
  { id: 'kling-video-o1', name: 'Kling Video o1', desc: 'Рассуждения для видео, до 10с' },
  { id: 'hailuo-3', name: 'Hailuo 3', desc: 'Высокое качество, до 10с, 1080p' },
  { id: 'hailuo-2.3', name: 'Hailuo 2.3', desc: 'Экономичная, до 10с, 1080p' },
  { id: 'veo-3.1-lite', name: 'Veo 3.1 Lite', desc: 'Экономичная Google, до 8с' },
  { id: 'veo-3.1-fast', name: 'Veo 3.1 Fast', desc: 'Быстрая, до 8с, 4K' },
  { id: 'veo-3.1', name: 'Veo 3.1', desc: 'Максимум Google, до 8с, 4K' },
  { id: 'wan-3.0', name: 'Wan 3.0', desc: 'Alibaba, до 10с, 1080p' },
  { id: 'wan-2.7', name: 'Wan 2.7', desc: 'Экономичная Alibaba, до 10с' },
  { id: 'sora-2-pro', name: 'Sora 2 Pro', desc: 'OpenAI, до 20с, 1080p, аудио' },
  { id: 'gen-4.5', name: 'Gen 4.5', desc: 'Runway, до 10с' },
  { id: 'aleph-2', name: 'Aleph 2', desc: 'Runway, до 10с, референсы' },
  { id: 'grok-imagine-video-1.5', name: 'Grok Video 1.5', desc: 'xAI, до 15с, 1080p' },
  { id: 'grok-imagine-video', name: 'Grok Video', desc: 'xAI, до 10с, экономичная' },
  { id: 'flux-3-video', name: 'Flux 3 Video', desc: 'BFL, до 10с' },
  { id: 'happyhorse-1.1', name: 'HappyHorse 1.1', desc: 'До 10с' },
];

const TTS_MODEL_OPTIONS = [
  { id: 'qwen-audio-3.0-tts-plus', name: 'Qwen Audio 3.0 TTS Plus', desc: 'Alibaba, высокое качество', voices: ['longanlingxin', 'longanlufeng'] },
  { id: 'gpt-4o-mini-tts', name: 'GPT-4o Mini TTS', desc: 'Естественная речь', voices: ['alloy', 'ash', 'coral', 'echo', 'fable', 'nova', 'onyx', 'sage', 'shimmer'] },
  { id: 'tts-1-hd', name: 'TTS-1 HD', desc: 'Высокое качество', voices: ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'] },
  { id: 'tts-1', name: 'TTS-1', desc: 'Быстрая', voices: ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'] },
  { id: 'grok-voice-tts-1.0', name: 'Grok Voice TTS', desc: 'xAI, выразительная', voices: ['cleo', 'calliope', 'ash', 'sol'] },
  { id: 'gemini-3.1-flash-tts-preview', name: 'Gemini TTS', desc: 'Google, высокое качество', voices: ['Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus', 'Aoede'] },
  { id: 'kokoro-82m', name: 'Kokoro', desc: 'Дешевая', voices: ['af_heart', 'af_star', 'am_adam', 'bf_emma', 'bm_george'] },
  { id: 'aura-2', name: 'Aura 2', desc: 'Deepgram, качественная', voices: ['aura-2-theia', 'aura-2-andromeda', 'aura-2-calliope', 'aura-2-arcas'] },
];

function ModelPickerDropdown({ options, selected, onSelect, open, setOpen, label, disabledInfo }: {
  options: { id: string; name: string; desc: string }[];
  selected: string;
  onSelect: (id: string) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
  label: string;
  disabledInfo?: Record<string, string>;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useEffect(() => {
    if (open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    }
  }, [open]);
  const current = options.find(o => o.id === selected);
  const isCurrentDisabled = disabledInfo && disabledInfo[selected];
  return (
    <div className="relative">
      <button
        ref={btnRef}
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${
          isCurrentDisabled
            ? 'border-amber-300 dark:border-amber-600/40 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
            : 'border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800/60'
        }`}
      >
        <span className="text-slate-400 dark:text-gray-500 text-xs">{label}:</span>
        <span className="font-medium truncate max-w-[120px]">{current?.name || selected}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
      </button>
      {isCurrentDisabled && (
        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1 ml-1">{disabledInfo[selected]}</p>
      )}
      {open && (
        <>
          {/* Desktop backdrop */}
          <div className="hidden sm:block fixed inset-0 bg-transparent" style={{ zIndex: 9998 }} onClick={() => setOpen(false)} />
          {/* Desktop dropdown */}
          {pos && (
            <div className="hidden sm:block fixed w-80 max-h-72 overflow-y-auto rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0d0d20] shadow-xl" style={{ zIndex: 9999, top: pos.top, right: pos.right }}>
              {options.map(opt => {
                const hint = disabledInfo?.[opt.id];
                return (
                  <button
                    key={opt.id}
                    onClick={() => { onSelect(opt.id); setOpen(false); }}
                    className={`w-full text-left px-3.5 py-2.5 transition-colors ${
                      hint
                        ? 'opacity-50 hover:opacity-70'
                        : opt.id === selected ? 'bg-cyan-50 dark:bg-cyan-500/10' : 'hover:bg-slate-50 dark:hover:bg-gray-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${hint ? 'text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-gray-100'}`}>{opt.name}</span>
                      {opt.id === selected && !hint && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{opt.desc}</p>
                    {hint && <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">{hint}</p>}
                  </button>
                );
              })}
            </div>
          )}
          {/* Mobile bottom sheet */}
          <div className="sm:hidden fixed inset-0 z-50 flex items-end" onClick={() => setOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
              className="relative w-full max-h-[70vh] flex flex-col bg-white dark:bg-[#0d0d20] rounded-t-2xl border-t border-slate-200/60 dark:border-gray-800/60 shadow-2xl animate-in slide-in-from-bottom duration-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-gray-800/60">
                <h3 className="text-base font-semibold text-slate-800 dark:text-gray-100">{label}</h3>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain py-1">
                {options.map(opt => {
                  const hint = disabledInfo?.[opt.id];
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { onSelect(opt.id); setOpen(false); }}
                      className={`w-full text-left px-5 py-3 transition-colors active:bg-slate-100 dark:active:bg-gray-800/60 ${
                        hint
                          ? 'opacity-50'
                          : opt.id === selected ? 'bg-cyan-50 dark:bg-cyan-500/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${hint ? 'text-slate-400 dark:text-gray-500' : 'text-slate-800 dark:text-gray-100'}`}>{opt.name}</span>
                        {opt.id === selected && !hint && <Check className="w-4 h-4 text-cyan-500" />}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">{opt.desc}</p>
                      {hint && <p className="text-[10px] text-amber-500 dark:text-amber-400 mt-0.5">{hint}</p>}
                    </button>
                  );
                })}
              </div>
              <div className="h-[max(env(safe-area-inset-bottom,0px),var(--sab-floor,0px))]" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BatchProgress({ active, label }: { active: number; label: string }) {
  if (active === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-medium">
      <Loader2 className="w-3 h-3 animate-spin" />
      {label}: {active}
    </div>
  );
}

function ImageStep({ scenes, imageModel, onModelChange, onGenerate, onGenerateAll, onUpdate, onDeleteImage, activeCount, showModelPicker, setShowModelPicker, referenceImages, onUploadReference, onRemoveReference }: {
  scenes: Scene[];
  imageModel: string;
  onModelChange: (m: string) => void;
  onGenerate: (id: string) => void;
  onGenerateAll: () => void;
  onUpdate: (id: string, updates: Partial<Scene>) => void;
  onDeleteImage: (id: string) => void;
  activeCount: number;
  showModelPicker: string | null;
  setShowModelPicker: (v: string | null) => void;
  referenceImages: { id: string; url: string; uploading?: boolean }[];
  onUploadReference: (file: File) => void;
  onRemoveReference: (id: string) => void;
}) {
  const refInputRef = useRef<HTMLInputElement>(null);
  const pending = scenes.filter(s => !s.imageUrl && !s.imageLoading && !s.customImageUrl).length;
  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Reference images upload */}
      <div className="rounded-2xl border-2 border-dashed border-cyan-500/50 dark:border-cyan-400/40 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/20 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 w-9 h-9 rounded-xl bg-cyan-500/15 dark:bg-cyan-500/20 flex items-center justify-center">
              <ImageIcon className="w-4.5 h-4.5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-800 dark:text-gray-100">Референсы</h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-snug">Загрузите фото персонажей, стиля или продукта — кадры будут на их основе</p>
            </div>
          </div>
          <button
            onClick={() => refInputRef.current?.click()}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-cyan-500 hover:bg-cyan-600 transition-colors active:scale-95 shadow-md shadow-cyan-500/20"
          >
            <Upload className="w-3.5 h-3.5" />
            Загрузить
          </button>
          <input
            ref={refInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              const files = e.target.files;
              if (files) Array.from(files).forEach(f => onUploadReference(f));
              e.target.value = '';
            }}
          />
        </div>
        {referenceImages.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-cyan-200/60 dark:border-cyan-800/30">
            {referenceImages.map(ref => (
              <div key={ref.id} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 border-white dark:border-gray-700 shadow-sm group">
                <img src={ref.url} alt="Референс" className="w-full h-full object-cover" />
                {ref.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  </div>
                )}
                <button
                  onClick={() => onRemoveReference(ref.id)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100 mb-0.5 sm:mb-1">Генерация кадров</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Создайте изображения для каждой сцены{referenceImages.length > 0 ? ' на основе ваших референсов' : ''}.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <BatchProgress active={activeCount} label="Генерация" />
          <ModelPickerDropdown
            options={IMAGE_MODEL_OPTIONS}
            selected={imageModel}
            onSelect={onModelChange}
            open={showModelPicker === 'image'}
            setOpen={v => setShowModelPicker(v ? 'image' : null)}
            label="Модель"
          />
          {pending > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={activeCount > 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 transition-colors shadow-md shadow-cyan-500/20"
            >
              {activeCount > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Все ({pending})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50/50 dark:bg-gray-900/30 overflow-hidden group">
            <div className="aspect-[4/5] sm:aspect-[4/5] relative bg-slate-100 dark:bg-gray-800/40 flex items-center justify-center">
              {scene.imageUrl ? (
                <>
                  <img src={scene.imageUrl} alt={`Сцена ${i + 1}`} className="w-full h-full object-cover" />
                  {!scene.imageLoading && (
                    <button
                      onClick={() => onDeleteImage(scene.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 hover:bg-red-500/80 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-90"
                      title="Удалить изображение"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {scene.imageLoading && (
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-2 animate-in fade-in duration-300">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                      <span className="text-xs text-white/80 font-medium">Перегенерация...</span>
                    </div>
                  )}
                </>
              ) : scene.imageLoading ? (
                <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                  <span className="text-xs">Генерация...</span>
                </div>
              ) : scene.imageError ? (
                <div className="p-4 text-center">
                  <p className="text-xs text-red-400 mb-2">{scene.imageError}</p>
                  <button onClick={() => onGenerate(scene.id)} className="text-xs text-cyan-500 hover:underline">Повторить</button>
                </div>
              ) : (
                <button
                  onClick={() => onGenerate(scene.id)}
                  className="flex flex-col items-center gap-2 text-slate-400 dark:text-gray-500 hover:text-cyan-500 transition-colors active:scale-95"
                >
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs font-medium">Сгенерировать</span>
                </button>
              )}
            </div>
            <div className="px-3 py-2.5 sm:py-3 border-t border-slate-200/40 dark:border-gray-800/40">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-slate-600 dark:text-gray-400">Сцена {i + 1}</span>
                <button
                  onClick={() => onGenerate(scene.id)}
                  disabled={scene.imageLoading}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 transition-colors active:scale-95"
                  title="Сгенерировать по промпту"
                >
                  <RefreshCw className={`w-3 h-3 ${scene.imageLoading ? 'animate-spin' : ''}`} />
                  {scene.imageUrl ? 'Заново' : 'Создать'}
                </button>
              </div>
              <textarea
                value={scene.imagePrompt}
                onChange={e => onUpdate(scene.id, { imagePrompt: e.target.value })}
                rows={3}
                className="w-full text-xs sm:text-[13px] leading-relaxed text-slate-600 dark:text-gray-400 bg-white/60 dark:bg-gray-800/30 border border-slate-200/60 dark:border-gray-700/40 rounded-xl px-2.5 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500/40 placeholder:text-slate-300 dark:placeholder:text-gray-600"
                placeholder="Опишите что должно быть на изображении..."
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoStep({ scenes, videoModel, onModelChange, onGenerate, onGenerateAll, onUpdate, onEnhanceVideoPrompt, activeCount, showModelPicker, setShowModelPicker, sceneDuration, aspectRatio }: {
  scenes: Scene[];
  videoModel: string;
  onModelChange: (m: string) => void;
  onGenerate: (id: string) => void;
  onGenerateAll: () => void;
  onUpdate: (id: string, patch: Partial<Scene>) => void;
  onEnhanceVideoPrompt: (id: string) => void;
  activeCount: number;
  showModelPicker: string | null;
  setShowModelPicker: (v: string | null) => void;
  sceneDuration: number;
  aspectRatio: string;
}) {
  const filteredVideoOptions = useMemo(() => {
    return VIDEO_MODEL_OPTIONS.filter(opt => {
      const info = VIDEO_MODELS.find(m => m.id === opt.id);
      if (!info) return true;
      if (!info.supportsFirstFrame) return false;
      if (!info.aspectRatios.includes(aspectRatio as any)) return false;
      return true;
    });
  }, [aspectRatio]);

  useEffect(() => {
    const isCurrentValid = filteredVideoOptions.some(o => o.id === videoModel);
    if (!isCurrentValid && filteredVideoOptions.length > 0) {
      onModelChange(filteredVideoOptions[0].id);
    }
  }, [filteredVideoOptions, videoModel, onModelChange]);

  const videoDisabledInfo = useMemo(() => {
    const info: Record<string, string> = {};
    for (const opt of filteredVideoOptions) {
      const allowed = VIDEO_MODEL_DURATIONS[opt.id];
      if (allowed && !allowed.includes(sceneDuration)) {
        info[opt.id] = `Нужна длительность ${allowed.join(', ')} сек (сейчас ${sceneDuration}с)`;
      }
    }
    return Object.keys(info).length > 0 ? info : undefined;
  }, [sceneDuration, filteredVideoOptions]);
  const withImage = scenes.filter(s => s.imageUrl);
  const pending = withImage.filter(s => !s.videoUrl && !s.videoLoading).length;
  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100 mb-0.5 sm:mb-1">Оживление кадров</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Превратите изображения в видеоклипы. Все запускаются параллельно.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <BatchProgress active={activeCount} label="В процессе" />
          <ModelPickerDropdown
            options={filteredVideoOptions}
            selected={videoModel}
            onSelect={onModelChange}
            disabledInfo={videoDisabledInfo}
            open={showModelPicker === 'video'}
            setOpen={v => setShowModelPicker(v ? 'video' : null)}
            label="Модель"
          />
          {pending > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={activeCount > 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 transition-colors shadow-md shadow-cyan-500/20"
            >
              {activeCount > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Все ({pending})
            </button>
          )}
        </div>
      </div>

      {withImage.length === 0 ? (
        <div className="text-center py-12 text-slate-400 dark:text-gray-500">
          <Video className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Сначала сгенерируйте кадры на предыдущем шаге</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {scenes.map((scene, i) => {
            if (!scene.imageUrl) return null;
            return (
              <div key={scene.id} className="rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50/50 dark:bg-gray-900/30 overflow-hidden">
                <div className="aspect-[4/5] sm:aspect-[4/5] relative bg-slate-100 dark:bg-gray-800/40 flex items-center justify-center">
                  {scene.videoUrl ? (
                    <video src={scene.videoUrl} controls className="w-full h-full object-cover" playsInline />
                  ) : scene.videoLoading ? (
                    <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-gray-500">
                      <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
                      <span className="text-xs">Генерация видео...</span>
                      <span className="text-[10px] text-slate-300 dark:text-gray-600">Может занять 1-5 мин</span>
                    </div>
                  ) : scene.videoError ? (
                    <div className="p-3 text-center">
                      <p className="text-xs text-red-400 mb-2">{scene.videoError}</p>
                      <button onClick={() => onGenerate(scene.id)} className="text-xs text-cyan-500 hover:underline">Повторить</button>
                    </div>
                  ) : (
                    <div className="relative w-full h-full">
                      <img src={scene.imageUrl} alt="" className="w-full h-full object-cover opacity-40" />
                      <button
                        onClick={() => onGenerate(scene.id)}
                        className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500 hover:text-cyan-500 transition-colors"
                      >
                        <Play className="w-10 h-10" />
                        <span className="text-xs font-medium">Оживить</span>
                      </button>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5 sm:py-3 border-t border-slate-200/40 dark:border-gray-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600 dark:text-gray-400">Сцена {i + 1}</span>
                    {scene.videoUrl && (
                      <button onClick={() => onGenerate(scene.id)} className="p-1 rounded-lg text-slate-400 hover:text-cyan-500 transition-colors" title="Перегенерировать">
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="relative group/vp">
                    <textarea
                      value={scene.videoPrompt ?? scene.visual}
                      onChange={e => onUpdate(scene.id, { videoPrompt: e.target.value })}
                      rows={4}
                      placeholder="Промпт для видео..."
                      className="w-full text-[13px] leading-relaxed text-slate-600 dark:text-gray-300 bg-white/60 dark:bg-gray-800/40 border border-slate-200/60 dark:border-gray-700/60 focus:border-cyan-400 dark:focus:border-cyan-500 rounded-xl px-3 py-2.5 pr-10 resize-y min-h-[80px] focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                    />
                    <div className="absolute right-1.5 top-1.5 flex flex-col gap-1 opacity-0 group-hover/vp:opacity-100 focus-within:opacity-100 transition-opacity">
                      {(scene.videoPrompt ?? scene.visual) && (
                        <>
                          <button
                            onClick={() => { navigator.clipboard.writeText(scene.videoPrompt ?? scene.visual); }}
                            className="p-1 rounded-md text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors"
                            title="Скопировать"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEnhanceVideoPrompt(scene.id)}
                            disabled={scene.enhancingVideoPrompt}
                            className="p-1 rounded-md text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 transition-colors disabled:opacity-100"
                            title="Улучшить промпт с помощью ИИ"
                          >
                            <Sparkles className={`w-3.5 h-3.5 ${scene.enhancingVideoPrompt ? 'animate-sparkle-enhance text-cyan-500' : ''}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AudioStep({ scenes, ttsModel, ttsVoice, onModelChange, onVoiceChange, onGenerate, onGenerateAll, onDownload, onUpdate, activeCount, showModelPicker, setShowModelPicker, onEnhanceVoiceLine }: {
  scenes: Scene[];
  ttsModel: string;
  ttsVoice: string;
  onModelChange: (m: string) => void;
  onVoiceChange: (v: string) => void;
  onGenerate: (id: string) => void;
  onGenerateAll: () => void;
  onDownload: (url: string, filename: string) => void;
  onUpdate: (id: string, patch: Partial<Scene>) => void;
  onEnhanceVoiceLine: (id: string) => void;
  activeCount: number;
  showModelPicker: string | null;
  setShowModelPicker: (v: string | null) => void;
}) {
  const pending = scenes.filter(s => s.voiceLine && !s.audioUrl && !s.audioLoading).length;
  const currentTTS = TTS_MODEL_OPTIONS.find(m => m.id === ttsModel);
  const voices = currentTTS?.voices || ['alloy', 'echo', 'fable', 'nova', 'onyx', 'shimmer'];

  const hasAnyResult = scenes.some(s => s.imageUrl || s.videoUrl || s.audioUrl);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-gray-100 mb-0.5 sm:mb-1">Озвучка</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Сгенерируйте голос и скачайте результат. Все запускаются параллельно.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          <BatchProgress active={activeCount} label="Озвучка" />
          <ModelPickerDropdown
            options={TTS_MODEL_OPTIONS}
            selected={ttsModel}
            onSelect={onModelChange}
            open={showModelPicker === 'tts'}
            setOpen={v => setShowModelPicker(v ? 'tts' : null)}
            label="Модель"
          />
          <div className="relative">
            <button
              onClick={() => setShowModelPicker(showModelPicker === 'voice' ? null : 'voice')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors"
            >
              <span className="text-slate-400 dark:text-gray-500 text-xs">Голос:</span>
              <span className="font-medium">{ttsVoice}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showModelPicker === 'voice' ? 'rotate-180' : ''}`} />
            </button>
            {showModelPicker === 'voice' && (
              <>
                {/* Desktop backdrop */}
                <div className="hidden sm:block fixed inset-0 bg-transparent" style={{ zIndex: 9998 }} onClick={() => setShowModelPicker(null)} />
                {/* Desktop dropdown */}
                <div className="hidden sm:block absolute right-0 top-full mt-1 w-56 max-h-52 overflow-y-auto rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-[#0d0d20] shadow-xl" style={{ zIndex: 9999 }}>
                  {voices.map(v => (
                    <button
                      key={v}
                      onClick={() => { onVoiceChange(v); setShowModelPicker(null); }}
                      className={`w-full text-left px-3.5 py-2 text-sm hover:bg-slate-50 dark:hover:bg-gray-800/40 transition-colors flex items-center justify-between ${v === ttsVoice ? 'bg-cyan-50 dark:bg-cyan-500/10' : ''}`}
                    >
                      <span className="text-slate-800 dark:text-gray-100">{v}</span>
                      {v === ttsVoice && <Check className="w-3.5 h-3.5 text-cyan-500" />}
                    </button>
                  ))}
                </div>
                {/* Mobile bottom sheet */}
                <div className="sm:hidden fixed inset-0 z-50 flex items-end" onClick={() => setShowModelPicker(null)}>
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  <div
                    className="relative w-full max-h-[60vh] flex flex-col bg-white dark:bg-[#0d0d20] rounded-t-2xl border-t border-slate-200/60 dark:border-gray-800/60 shadow-2xl animate-in slide-in-from-bottom duration-200"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-100 dark:border-gray-800/60">
                      <h3 className="text-base font-semibold text-slate-800 dark:text-gray-100">Голос</h3>
                      <button onClick={() => setShowModelPicker(null)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto overscroll-contain py-1">
                      {voices.map(v => (
                        <button
                          key={v}
                          onClick={() => { onVoiceChange(v); setShowModelPicker(null); }}
                          className={`w-full text-left px-5 py-3.5 text-sm transition-colors active:bg-slate-100 dark:active:bg-gray-800/60 flex items-center justify-between ${v === ttsVoice ? 'bg-cyan-50 dark:bg-cyan-500/10' : ''}`}
                        >
                          <span className="text-slate-800 dark:text-gray-100 font-medium">{v}</span>
                          {v === ttsVoice && <Check className="w-4 h-4 text-cyan-500" />}
                        </button>
                      ))}
                    </div>
                    <div className="h-[max(env(safe-area-inset-bottom,0px),var(--sab-floor,0px))]" />
                  </div>
                </div>
              </>
            )}
          </div>
          {pending > 0 && (
            <button
              onClick={onGenerateAll}
              disabled={activeCount > 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 disabled:opacity-40 transition-colors shadow-md shadow-cyan-500/20"
            >
              {activeCount > 0 ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AudioLines className="w-3.5 h-3.5" />}
              Все ({pending})
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <div key={scene.id} className="rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50/50 dark:bg-gray-900/30 p-3 sm:p-4">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-slate-100 dark:bg-gray-800/40 overflow-hidden">
                {scene.videoUrl ? (
                  <video src={scene.videoUrl} className="w-full h-full object-cover" muted />
                ) : scene.imageUrl ? (
                  <img src={scene.imageUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-gray-700">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-gray-300">Сцена {i + 1}</span>
                  <div className="flex items-center gap-0.5 sm:gap-1.5">
                    {scene.audioUrl && (
                      <button
                        onClick={() => onDownload(scene.audioUrl!, `scene-${i + 1}-voice.mp3`)}
                        className="p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Скачать аудио"
                      >
                        <AudioLines className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}
                    {scene.videoUrl && (
                      <button
                        onClick={() => onDownload(scene.videoUrl!, `scene-${i + 1}-video.mp4`)}
                        className="p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Скачать видео"
                      >
                        <Video className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}
                    {scene.imageUrl && !scene.videoUrl && (
                      <button
                        onClick={() => onDownload(scene.imageUrl!, `scene-${i + 1}-image.png`)}
                        className="p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                        title="Скачать картинку"
                      >
                        <Download className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                      </button>
                    )}
                  </div>
                </div>
                {scene.screenText && <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 mb-1">{scene.screenText}</p>}
                <div className="relative group/voice">
                  <textarea
                    value={scene.voiceLine}
                    onChange={e => onUpdate(scene.id, { voiceLine: e.target.value })}
                    rows={2}
                    className="w-full text-sm text-slate-700 dark:text-gray-200 italic bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-gray-700 focus:border-cyan-400 dark:focus:border-cyan-500 rounded-lg pl-2 pr-8 py-1 -mx-2 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-400/30 transition-colors"
                  />
                  {scene.voiceLine && (
                    <button
                      onClick={() => onEnhanceVoiceLine(scene.id)}
                      disabled={scene.enhancingVoice}
                      className="absolute right-0 top-1 p-1 rounded-md text-slate-300 dark:text-gray-600 hover:text-cyan-500 dark:hover:text-cyan-400 opacity-0 group-hover/voice:opacity-100 focus:opacity-100 transition-all disabled:opacity-100"
                      title="Улучшить текст с помощью ИИ"
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${scene.enhancingVoice ? 'animate-sparkle-enhance text-cyan-500' : ''}`} />
                    </button>
                  )}
                </div>

                {scene.audioUrl ? (
                  <div className="flex items-center gap-2 mt-2">
                    <SceneAudioPlayer url={scene.audioUrl} />
                    <button
                      onClick={() => onGenerate(scene.id)}
                      disabled={scene.audioLoading}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${scene.audioLoading ? 'text-cyan-500 animate-spin' : 'text-slate-400 hover:text-cyan-500'}`}
                      title="Перегенерировать"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : scene.audioLoading ? (
                  <div className="flex items-center gap-2 mt-2 text-cyan-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs">Генерация озвучки...</span>
                  </div>
                ) : scene.audioError ? (
                  <div className="mt-2">
                    <p className="text-xs text-red-400">{scene.audioError}</p>
                    <button onClick={() => onGenerate(scene.id)} className="text-xs text-cyan-500 hover:underline mt-1">Повторить</button>
                  </div>
                ) : scene.voiceLine ? (
                  <button
                    onClick={() => onGenerate(scene.id)}
                    className="flex items-center gap-1.5 mt-2 text-xs text-cyan-500 hover:text-cyan-600 transition-colors"
                  >
                    <AudioLines className="w-3.5 h-3.5" />
                    Озвучить
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasAnyResult && (
        <div className="rounded-2xl border-2 border-dashed border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-500/5 p-5 text-center">
          <Film className="w-8 h-8 mx-auto mb-2 text-cyan-500/60" />
          <p className="text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Все материалы готовы!</p>
          <p className="text-xs text-slate-500 dark:text-gray-400">Скачайте видеоклипы и озвучку, затем соберите ролик в CapCut, Canva или Descript.</p>
        </div>
      )}
    </div>
  );
}

function FieldGroup({ label, children, required, compact }: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  compact?: boolean;
}) {
  return (
    <div>
      <label className={`block font-medium text-slate-700 dark:text-gray-300 mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
