import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { downloadFile, shareUrl } from '@/lib/download';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  Sparkles,
  X,
  Download,
  AlertCircle,
  Mic,
  Copy,
  Check,
  Trash2,
  Settings,
  Maximize2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  AudioLines,
  Video,
  Image as ImageIcon,
  Menu,
  Globe,
  Paperclip,
  Plus,
  Upload,
  RefreshCw,
  Wallet,
  Play,
  Pause,
  Square,
  FileAudio,
  Loader,
  ArrowRight,
  ArrowLeft,
  Palette,
  Share2,
  LogOut,
  User,
  Pencil,
  StopCircle,
  Lightbulb,
  Code,
  PenLine,
  Languages,
  FolderOpen,
  Loader2,
  Film,
  Type,
  Music,
  Wand2,
  Clapperboard,
  Headphones,
  RotateCcw,
  ImagePlus,
  BookOpen,
  Layers,
  LayoutGrid,
  Shapes,
  PenTool,
  Brush,
  Blend,
} from 'lucide-react';
import { supabase, getFreshSession } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import ModelSelector, { MODELS, getModelDisplayName, getModelInfo, getProviderColor, ProviderIcon } from '@/components/ModelSelector';
import TTSModelSelector, { getTTSModelDisplayName, getTTSModelInfo, voiceLabel } from '@/components/TTSModelSelector';
import VideoModelSelector, { getVideoModelDisplayName, getVideoModelInfo, getVideoPriceForResolution, getVideoPixelSize, type AspectRatio, type VideoResolution } from '@/components/VideoModelSelector';
import ImageModelSelector, { getImageModelDisplayName, getImageModelInfo, estimateImageCost } from '@/components/ImageModelSelector';
import ImageViewer from '@/components/ImageViewer';
import MediaLibrary, { type MediaItem } from '@/components/MediaLibrary';
import LibraryPanel, { type LibraryItem } from '@/components/LibraryPanel';
import PromptTemplates from '@/components/PromptTemplates';
import SlashCommandMenu, { useSlashCommands } from '@/components/SlashCommandMenu';
import VideoPromptInput, { type AttachedImage, type MediaType, stripImageMarkers, getImageMarkerIds } from '@/components/VideoPromptInput';
import type { TemplateTab } from '@/lib/promptTemplates';
import MessageContent from '@/components/MessageContent';
import { useHistory, type DBChatSession, type DBTTSEntry, type DBVideoEntry, type DBImageEntry } from '@/hooks/useHistory';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'error' | 'system';
  content: string;
  imageUrl?: string;
  attachedImage?: string;
  timestamp: Date;
}

interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
}

const TABS = [
  { id: 'chat', label: 'Чат', icon: MessageSquare },
  { id: 'speech', label: 'Генератор речи', icon: AudioLines },
  { id: 'video', label: 'Видео', icon: Video },
  { id: 'images', label: 'Картинки', icon: ImageIcon },
];

interface STTModelInfo {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricePerSec: number;
}

const STT_MODELS: STTModelInfo[] = [
  { id: 'whisper-large-v3-turbo', name: 'Whisper Turbo', provider: 'OpenAI', description: 'Самая быстрая и доступная модель. 99+ языков.', pricePerSec: 0.003 },
  { id: 'whisper-large-v3', name: 'Whisper Large v3', provider: 'OpenAI', description: 'Полноразмерная модель Whisper. Высокая точность.', pricePerSec: 0.006 },
  { id: 'whisper-1', name: 'Whisper 1', provider: 'OpenAI', description: 'Классическая модель. Субтитры (SRT/VTT).', pricePerSec: 0.020 },
  { id: 'gpt-4o-mini-transcribe', name: 'GPT-4o Mini Transcribe', provider: 'OpenAI', description: 'На базе GPT-4o. Акценты, шум, термины.', pricePerSec: 0.017 },
  { id: 'gpt-4o-transcribe', name: 'GPT-4o Transcribe', provider: 'OpenAI', description: 'Максимальная точность на базе GPT-4o.', pricePerSec: 0.030 },
  { id: 'gpt-transcribe', name: 'GPT Transcribe', provider: 'OpenAI', description: 'Новая модель транскрипции OpenAI.', pricePerSec: 0.015 },
  { id: 'gpt-4o-transcribe-diarize', name: 'GPT-4o Diarize', provider: 'OpenAI', description: 'Транскрипция с разделением по спикерам.', pricePerSec: 0.037 },
  { id: 'grok-stt-1.0', name: 'Grok STT 1.0', provider: 'xAI', description: 'Распознавание речи от xAI с диаризацией.', pricePerSec: 0.006 },
  { id: 'nova-3', name: 'Nova 3', provider: 'Deepgram', description: 'Быстрая модель Deepgram для реального времени.', pricePerSec: 0.015 },
  { id: 'mai-transcribe-1.5', name: 'MAI Transcribe 1.5', provider: 'Microsoft', description: 'Транскрипция от Microsoft.', pricePerSec: 0.020 },
  { id: 'voxtral-mini-transcribe', name: 'Voxtral Mini Transcribe', provider: 'Mistral', description: 'Оптимизирована для европейских языков.', pricePerSec: 0.010 },
  { id: 'voxtral-mini-3b-2507', name: 'Voxtral Mini 3B', provider: 'Mistral', description: 'Компактная модель Mistral для транскрипции.', pricePerSec: 0.003 },
  { id: 'voxtral-small-24b-2507-stt', name: 'Voxtral Small 24B', provider: 'Mistral', description: 'Большая модель Mistral. Высокая точность.', pricePerSec: 0.010 },
  { id: 'chirp-3', name: 'Chirp 3', provider: 'Google', description: 'Транскрипция от Google. Поддержка 100+ языков.', pricePerSec: 0.053 },
  { id: 'nemotron-3.5-asr-streaming-multilingual-0.6b', name: 'Nemotron ASR', provider: 'NVIDIA', description: 'Легкая многоязычная модель NVIDIA.', pricePerSec: 0.001 },
  { id: 'parakeet-tdt-0.6b-v3', name: 'Parakeet TDT', provider: 'NVIDIA', description: 'Быстрая модель NVIDIA для английского.', pricePerSec: 0.005 },
  { id: 'qwen3-asr-0.6b', name: 'Qwen3 ASR 0.6B', provider: 'Qwen', description: 'Компактная модель от Alibaba.', pricePerSec: 0.001 },
  { id: 'qwen3-asr-1.7b', name: 'Qwen3 ASR 1.7B', provider: 'Qwen', description: 'Улучшенная модель от Alibaba.', pricePerSec: 0.002 },
  { id: 'qwen3-asr-flash-2026-02-10', name: 'Qwen3 ASR Flash', provider: 'Qwen', description: 'Быстрая модель для массовой транскрипции.', pricePerSec: 0.007 },
];


function formatTime(date: Date): string {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function fixDataUrlMime(dataUrl: string): string {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return dataUrl;
  const raw = atob(m[2].slice(0, 24));
  const b = (i: number) => raw.charCodeAt(i);
  let mime = m[1];
  if (b(0) === 0xFF && b(1) === 0xD8) mime = 'image/jpeg';
  else if (b(0) === 0x89 && raw.slice(1, 4) === 'PNG') mime = 'image/png';
  else if (raw.slice(0, 4) === 'RIFF' && raw.slice(8, 12) === 'WEBP') mime = 'image/webp';
  else if (raw.slice(0, 3) === 'GIF') mime = 'image/gif';
  if (mime === m[1]) return dataUrl;
  return `data:${mime};base64,${m[2]}`;
}

function compressImageDataUrl(dataUrl: string, maxDim = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && dataUrl.length < 500_000) {
        resolve(dataUrl);
        return;
      }
      if (width > height) { if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; } }
      else { if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; } }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

async function ensureCompressedDataUrl(url: string, maxDim = 800, quality = 0.6): Promise<string> {
  if (url.startsWith('data:')) {
    return compressImageDataUrl(url, maxDim, quality);
  }
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('fetch failed');
  const blob = await resp.blob();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
  return compressImageDataUrl(dataUrl, maxDim, quality);
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function uploadDataUrlToStorage(dataUrl: string, userId: string, bucket = 'video-inputs', forceJpeg = false): Promise<string> {
  const res = await fetch(dataUrl);
  let blob = await res.blob();
  let mime = blob.type || 'image/png';

  if (forceJpeg && mime.startsWith('image/') && mime !== 'image/jpeg') {
    try {
      if (typeof OffscreenCanvas !== 'undefined') {
        const bmp = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bmp, 0, 0);
        blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.92 });
        mime = 'image/jpeg';
        bmp.close();
      } else {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('image load failed'));
          img.src = url;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const jpegBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), 'image/jpeg', 0.92);
        });
        blob = jpegBlob;
        mime = 'image/jpeg';
      }
    } catch {
      // keep original format if conversion fails
    }
  }

  const ext = mime.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: mime, upsert: false });
  if (error) throw new Error(`Не удалось загрузить изображение: ${error.message || 'неизвестная ошибка'}`);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function parseDates(sessions: ChatSession[]): ChatSession[] {
  return sessions.map((s) => ({
    ...s,
    createdAt: new Date(s.createdAt),
    messages: s.messages.map((m) => ({ ...m, timestamp: new Date(m.timestamp) })),
  }));
}

const LAYOUT_ICONS = [Layers, LayoutGrid, Shapes, PenTool, Brush, Blend, Palette] as const;

function CyclingLayoutButton({ onClick }: { onClick: () => void }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'out' | 'in'>('visible');
  const particleHost = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase('out');
      setTimeout(() => {
        setIdx(i => (i + 1) % LAYOUT_ICONS.length);
        setPhase('in');
        if (particleHost.current) {
          const host = particleHost.current;
          for (let i = 0; i < 6; i++) {
            const dot = document.createElement('span');
            const a = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * 10;
            const size = 2 + Math.random() * 2;
            Object.assign(dot.style, {
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: `hsl(${260 + Math.random() * 30}, 70%, ${55 + Math.random() * 25}%)`,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1)',
              opacity: '0.9',
              transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
            });
            host.appendChild(dot);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                dot.style.transform = `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0)`;
                dot.style.opacity = '0';
              });
            });
            setTimeout(() => dot.remove(), 450);
          }
        }
        setTimeout(() => setPhase('visible'), 180);
      }, 160);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const Icon = LAYOUT_ICONS[idx];
  const iconClass =
    phase === 'out'
      ? 'opacity-0 scale-0 rotate-180'
      : phase === 'in'
        ? 'opacity-100 scale-125 rotate-0'
        : 'opacity-100 scale-100 rotate-0';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all bg-gradient-to-r from-rose-500/10 to-orange-500/10 text-rose-600 dark:text-rose-400 hover:from-rose-500/20 hover:to-orange-500/20 border border-rose-500/20 dark:border-rose-500/20"
    >
      <span ref={particleHost} className="relative w-4 h-4 shrink-0 overflow-visible">
        <Icon
          className={`w-4 h-4 absolute inset-0 transition-all duration-200 ease-out ${iconClass}`}
        />
      </span>
      Макеты
    </button>
  );
}

const AD_ICONS = [Film, Clapperboard, Type, Music, Wand2, ImageIcon, Video] as const;

function CyclingAdButton({ onClick }: { onClick: () => void }) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'out' | 'in'>('visible');
  const particleHost = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase('out');
      setTimeout(() => {
        setIdx(i => (i + 1) % AD_ICONS.length);
        setPhase('in');
        if (particleHost.current) {
          const host = particleHost.current;
          for (let i = 0; i < 6; i++) {
            const dot = document.createElement('span');
            const a = Math.random() * Math.PI * 2;
            const r = 10 + Math.random() * 10;
            const size = 2 + Math.random() * 2;
            Object.assign(dot.style, {
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: '50%',
              background: `hsl(${185 + Math.random() * 20}, 80%, ${60 + Math.random() * 20}%)`,
              pointerEvents: 'none',
              transform: 'translate(-50%,-50%) scale(1)',
              opacity: '0.9',
              transition: 'all 0.4s cubic-bezier(0.22,1,0.36,1)',
            });
            host.appendChild(dot);
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                dot.style.transform = `translate(calc(-50% + ${Math.cos(a) * r}px), calc(-50% + ${Math.sin(a) * r}px)) scale(0)`;
                dot.style.opacity = '0';
              });
            });
            setTimeout(() => dot.remove(), 450);
          }
        }
        setTimeout(() => setPhase('visible'), 180);
      }, 160);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const Icon = AD_ICONS[idx];
  const iconClass =
    phase === 'out'
      ? 'opacity-0 scale-0 rotate-180'
      : phase === 'in'
        ? 'opacity-100 scale-125 rotate-0'
        : 'opacity-100 scale-100 rotate-0';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[13px] font-medium whitespace-nowrap transition-all bg-gradient-to-r from-cyan-500/10 to-blue-500/10 text-cyan-600 dark:text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 dark:border-cyan-500/20"
    >
      <span ref={particleHost} className="relative w-4 h-4 shrink-0 overflow-visible">
        <Icon
          className={`w-4 h-4 absolute inset-0 transition-all duration-200 ease-out ${iconClass}`}
        />
      </span>
      Ролик
    </button>
  );
}

export default function Generator() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const userInitial = user?.email?.[0]?.toUpperCase() || 'U';

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    function onResize() {
      const kh = Math.max(0, window.innerHeight - (vv!.height + vv!.offsetTop));
      setKeyboardHeight(kh > 40 ? kh : 0);
    }
    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => { vv.removeEventListener('resize', onResize); vv.removeEventListener('scroll', onResize); };
  }, []);

  const { loadChatSessions, saveChatSession, deleteChatSession: dbDeleteSession, loadTTSHistory, saveTTSEntry, deleteTTSEntry: dbDeleteTTS, loadVideoHistory, saveVideoEntry, deleteVideoEntry: dbDeleteVideo, loadImageHistory, saveImageEntry, deleteImageEntry: dbDeleteImage } = useHistory();
  const [chatLoaded, setChatLoaded] = useState(false);
  const [ttsLoaded, setTtsLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadFromStorage<ChatMessage[]>('chat_messages', []);
    return saved.map((m) => ({ ...m, timestamp: new Date(m.timestamp) }));
  });
  const [input, setInput] = useState(() => loadFromStorage('chat_input', ''));
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'image' | 'tts' | 'video'; id: string } | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showLibraryPanel, setShowLibraryPanel] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [unseenMediaCount, setUnseenMediaCount] = useState(0);
  const [unseenMediaByType, setUnseenMediaByType] = useState<{ image: number; video: number; audio: number }>({ image: 0, video: 0, audio: 0 });
  const [libraryContext, setLibraryContext] = useState<'chat' | 'image' | 'video-first' | 'video-last' | 'video-ref' | 'video-audio' | 'video-attach' | 'tts-ref'>('chat');

  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templatesTab, setTemplatesTab] = useState<TemplateTab>('chat');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedModel, setSelectedModel] = useState(() => {
    const stored = loadFromStorage('chat_model', 'gpt-4.1');
    return MODELS.some(m => m.id === stored) ? stored : 'gpt-4.1';
  });
  const [showSidebar, setShowSidebar] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => parseDates(loadFromStorage('chat_sessions', [])));
  const [activeChatId, setActiveChatId] = useState<string | null>(() => loadFromStorage('chat_active_id', null));
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [temperature, setTemperature] = useState(() => loadFromStorage('chat_temperature', 0.7));
  const [maxTokens, setMaxTokens] = useState(() => loadFromStorage('chat_max_tokens', 4096));
  const [topP, setTopP] = useState(() => loadFromStorage('chat_top_p', 1));
  const [frequencyPenalty, setFrequencyPenalty] = useState(() => loadFromStorage('chat_frequency_penalty', 0));
  const [presencePenalty, setPresencePenalty] = useState(() => loadFromStorage('chat_presence_penalty', 0));
  const [systemPrompt, setSystemPrompt] = useState(() => loadFromStorage('chat_system_prompt', ''));
  const [balance, setBalance] = useState<number | null>(null);
  const [supportUnread, setSupportUnread] = useState(0);
  const [showTTSModelDropdown, setShowTTSModelDropdown] = useState(false);
  const [showSTTModelDropdown, setShowSTTModelDropdown] = useState(false);
  const [selectedTTSModel, setSelectedTTSModel] = useState(() => loadFromStorage('tts_model', 'gpt-4o-mini-tts'));
  const [selectedTTSVoice, setSelectedTTSVoice] = useState(() => loadFromStorage('tts_voice', 'alloy'));
  const [ttsText, setTtsText] = useState('');
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [ttsHistory, setTtsHistory] = useState<Array<{ id: string; url: string; text: string; model: string; voice: string; timestamp: Date }>>([]);
  const [ttsPlayingId, setTtsPlayingId] = useState<string | null>(null);
  const [ttsEditingId, setTtsEditingId] = useState<string | null>(null);
  const [ttsRegeneratingId, setTtsRegeneratingId] = useState<string | null>(null);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const ttsHistoryEndRef = useRef<HTMLDivElement>(null);
  const ttsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [ttsRefAudioBase64, setTtsRefAudioBase64] = useState<string | null>(null);
  const [ttsRefTranscript, setTtsRefTranscript] = useState('');
  const [ttsRefFileName, setTtsRefFileName] = useState<string | null>(null);
  const ttsRefAudioInputRef = useRef<HTMLInputElement>(null);
  const [ttsRecording, setTtsRecording] = useState(false);
  const [ttsRecordingTime, setTtsRecordingTime] = useState(0);
  const ttsMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const ttsRecordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ttsRecordingChunksRef = useRef<Blob[]>([]);
  const [ttsRefPlaying, setTtsRefPlaying] = useState(false);
  const ttsRefPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [videoAudioPlaying, setVideoAudioPlaying] = useState(false);
  const videoAudioPreviewRef = useRef<HTMLAudioElement | null>(null);

  // STT state
  const [sttModel, setSttModel] = useState('whisper-large-v3-turbo');
  const [sttLoading, setSttLoading] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const [sttResult, setSttResult] = useState<string | null>(null);
  const [sttAudioBase64, setSttAudioBase64] = useState<string | null>(null);
  const [sttAudioFileName, setSttAudioFileName] = useState<string | null>(null);
  const [sttRecording, setSttRecording] = useState(false);
  const [sttRecordingTime, setSttRecordingTime] = useState(0);
  const sttMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sttRecordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sttRecordingChunksRef = useRef<Blob[]>([]);
  const sttFileInputRef = useRef<HTMLInputElement>(null);
  const [sttHistory, setSttHistory] = useState<Array<{ id: string; text: string; model: string; duration: number; timestamp: Date }>>(() => {
    try {
      const raw = localStorage.getItem('stt_history');
      if (!raw) return [];
      return JSON.parse(raw).map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
    } catch { return []; }
  });
  const [sttCopiedId, setSttCopiedId] = useState<string | null>(null);
  const [sttEditingId, setSttEditingId] = useState<string | null>(null);
  useEffect(() => { try { localStorage.setItem('stt_history', JSON.stringify(sttHistory)); } catch {} }, [sttHistory]);

  const [showVideoModelDropdown, setShowVideoModelDropdown] = useState(false);
  const [selectedVideoModel, setSelectedVideoModel] = useState(() => loadFromStorage('video_model', 'wan-3.0'));
  const [selectedVideoDuration, setSelectedVideoDuration] = useState(() => loadFromStorage('video_duration', 5));
  const [selectedVideoAspectRatio, setSelectedVideoAspectRatio] = useState<AspectRatio>(() => loadFromStorage('video_aspect_ratio', '16:9'));
  const [selectedVideoResolution, setSelectedVideoResolution] = useState<VideoResolution>(() => loadFromStorage('video_resolution', '1080p'));
  const [videoPrompt, setVideoPrompt] = useState('');
  const [activeVideoTasks, setActiveVideoTasks] = useState<Array<{ id: string; prompt: string; model: string; duration: number; status: 'submitting' | 'polling' | 'completed' | 'failed'; error?: string }>>([]);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoFirstFrame, setVideoFirstFrame] = useState<string | null>(null);
  const [videoLastFrame, setVideoLastFrame] = useState<string | null>(null);
  const [videoReferenceImage, setVideoReferenceImage] = useState<string | null>(null);
  const [videoAttachedImages, setVideoAttachedImages] = useState<AttachedImage[]>([]);

  // Sync attached images roles -> legacy slot states for handleVideoGenerate
  useEffect(() => {
    const imageAttachments = videoAttachedImages.filter(i => !i.mediaType || i.mediaType === 'image');
    const first = imageAttachments.find(i => i.role === 'first');
    const last = imageAttachments.find(i => i.role === 'last');
    const ref = imageAttachments.find(i => i.role === 'ref');
    setVideoFirstFrame(first?.dataUrl ?? null);
    setVideoLastFrame(last?.dataUrl ?? null);
    setVideoReferenceImage(ref?.dataUrl ?? null);
  }, [videoAttachedImages]);
  const [videoAudioFile, setVideoAudioFile] = useState<string | null>(null);
  const [videoAudioName, setVideoAudioName] = useState<string | null>(null);

  const [videoNegativePrompt, setVideoNegativePrompt] = useState('');
  const [showVideoNegativePrompt, setShowVideoNegativePrompt] = useState(false);
  const [videoRevealedBtn, setVideoRevealedBtn] = useState<string | null>(null);
  const [videoAttachModalOpen, setVideoAttachModalOpen] = useState(false);
  const [isEnhancingVideoPrompt, setIsEnhancingVideoPrompt] = useState(false);
  const videoFrameTargetRef = useRef<'first' | 'last' | 'ref'>('first');
  const videoAudioInputRef = useRef<HTMLInputElement>(null);
  const [videoHistory, setVideoHistory] = useState<Array<{ id: string; url: string; prompt: string; model: string; duration: number; timestamp: Date }>>([]);
  const [videoCopiedPromptId, setVideoCopiedPromptId] = useState<string | null>(null);
  const [expandedVideoPrompts, setExpandedVideoPrompts] = useState<Set<string>>(new Set());
  const videoHistoryEndRef = useRef<HTMLDivElement>(null);
  const videoTextareaRef = useRef<HTMLTextAreaElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = videoTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [videoPrompt]);

  const videoResumeRanRef = useRef(false);

  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState('gpt-image-1');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [imageQuality, setImageQuality] = useState('medium');
  const [imageAspectRatio, setImageAspectRatio] = useState('1:1');
  const [imageResolution, setImageResolution] = useState('1K');
  const [showImageModelDropdown, setShowImageModelDropdown] = useState(false);
  const [activeImageTasks, setActiveImageTasks] = useState<Array<{ id: string; prompt: string; model: string; status: 'generating' | 'completed' | 'failed'; error?: string; refs?: string[] }>>([]);
  const [imageHistory, setImageHistory] = useState<Array<{ id: string; url: string; prompt: string; model: string; timestamp: Date }>>([]);
  const imageHistoryEndRef = useRef<HTMLDivElement>(null);
  const imageTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = imageTextareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [imagePrompt]);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const libraryMediaItems = useMemo<MediaItem[]>(() => {
    const out: MediaItem[] = [];
    for (const i of imageHistory) out.push({ id: i.id, url: i.url, label: i.prompt || 'Изображение', type: 'image', timestamp: i.timestamp });
    for (const v of videoHistory) out.push({ id: v.id, url: v.url, label: v.prompt || 'Видео', type: 'video', timestamp: v.timestamp });
    for (const a of ttsHistory) out.push({ id: a.id, url: a.url, label: a.text?.slice(0, 60) || 'Аудио', type: 'audio', timestamp: a.timestamp });
    out.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return out;
  }, [imageHistory, videoHistory, ttsHistory]);
  const [imageAttachedRefs, setImageAttachedRefs] = useState<string[]>([]);
  const [imageCount, setImageCount] = useState(1);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isEnhancingImagePrompt, setIsEnhancingImagePrompt] = useState(false);

  const [prevBalance, setPrevBalance] = useState<number | null>(null);
  const [balanceFlash, setBalanceFlash] = useState(false);

  const tabFeedback = useCallback(() => {
    if (navigator.vibrate) navigator.vibrate(8);
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.06);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.06);
      osc.onended = () => ctx.close();
    } catch {}
  }, []);

  const chatPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroll = () => {
      const ref = activeTab === 'chat' ? chatEndRef
        : activeTab === 'speech' ? ttsHistoryEndRef
        : activeTab === 'video' ? videoHistoryEndRef
        : activeTab === 'images' ? imageHistoryEndRef
        : null;
      ref?.current?.scrollIntoView({ behavior: 'instant' });
    };
    const t1 = setTimeout(scroll, 100);
    const t2 = setTimeout(scroll, 400);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [activeTab]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSendRef = useRef<() => void>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const chatSlash = useSlashCommands('chat', textareaRef, input, setInput);
  const imageSlash = useSlashCommands('image', imageTextareaRef, imagePrompt, setImagePrompt);

  const playRecordSound = useCallback((start: boolean) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (start) {
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      } else {
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.18);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
      osc.onended = () => ctx.close();
    } catch {}
  }, []);

  const startRecording = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    playRecordSound(true);
    if (navigator.vibrate) navigator.vibrate(15);
    const recognition = new SR();
    recognition.lang = 'ru-RU';
    recognition.continuous = true;
    recognition.interimResults = true;
    const baseText = input;
    let finalTranscript = '';
    let hasFinal = false;

    const resetSilenceTimer = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (!hasFinal) return;
      silenceTimerRef.current = setTimeout(() => {
        recognition.stop();
      }, 2000);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += t;
          hasFinal = true;
        } else {
          interim = t;
        }
      }
      const voice = (finalTranscript + interim).trim();
      setInput(baseText ? baseText + ' ' + voice : voice);
      resetSilenceTimer();
    };
    recognition.onerror = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      setIsRecording(false);
      recognitionRef.current = null;
      if (hasFinal) {
        setTimeout(() => handleSendRef.current?.(), 150);
      }
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [playRecordSound, input]);

  const stopRecording = useCallback(() => {
    playRecordSound(false);
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  }, [playRecordSound]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Realtime balance subscription
  useEffect(() => {
    if (!user) return;

    const loadBalance = async () => {
      const { data } = await supabase
        .from('user_balances')
        .select('tokens')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setBalance(Number(data.tokens));
    };
    loadBalance();

    const channel = supabase
      .channel('balance-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_balances', filter: `id=eq.${user.id}` },
        (payload) => {
          const newTokens = payload.new?.tokens;
          if (typeof newTokens === 'number') {
            setBalance((prev) => {
              if (prev !== null && prev !== newTokens) {
                setPrevBalance(prev);
                setBalanceFlash(true);
                setTimeout(() => setBalanceFlash(false), 1200);
              }
              return newTokens;
            });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Support unread counter
  useEffect(() => {
    if (!user) return;
    const loadUnread = async () => {
      const { data } = await supabase
        .from('support_tickets')
        .select('unread_user')
        .eq('status', 'open');
      const total = (data || []).reduce((s, t) => s + (t.unread_user || 0), 0);
      setSupportUnread(total);
    };
    loadUnread();
    const ch = supabase
      .channel('support-unread-user')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_tickets', filter: `user_id=eq.${user.id}` }, () => loadUnread())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  // Realtime unseen shared media subscription + notification sound
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const loadCount = async () => {
      const { data } = await supabase
        .from('shared_media')
        .select('media_type')
        .eq('receiver_id', user.id)
        .eq('seen', false);
      if (mounted && data) {
        setUnseenMediaCount(data.length);
        const byType = { image: 0, video: 0, audio: 0 };
        for (const row of data) {
          const t = row.media_type as keyof typeof byType;
          if (t in byType) byType[t]++;
        }
        setUnseenMediaByType(byType);
      }
    };
    loadCount();

    const playNotificationSound = () => {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      } catch {}
    };

    const channelName = `shared-media-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'shared_media', filter: `receiver_id=eq.${user.id}` },
        (payload) => {
          if (!mounted) return;
          setUnseenMediaCount(prev => prev + 1);
          const mediaType = (payload.new as { media_type?: string })?.media_type;
          if (mediaType === 'image' || mediaType === 'video' || mediaType === 'audio') {
            setUnseenMediaByType(prev => ({ ...prev, [mediaType]: prev[mediaType] + 1 }));
          }
          playNotificationSound();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' && mounted) {
          setTimeout(() => {
            supabase.removeChannel(channel);
          }, 2000);
        }
      });

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user]);

  // Load each tab's history independently for faster perceived loading
  useEffect(() => {
    if (!user || chatLoaded) return;
    loadChatSessions().then(dbSessions => {
      if (dbSessions.length > 0) {
        setChatSessions(dbSessions.map((s: DBChatSession) => ({
          id: s.id,
          title: s.title,
          messages: s.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })),
          createdAt: new Date(s.created_at),
        })));
      }
      setChatLoaded(true);
    });
  }, [user, chatLoaded]);

  useEffect(() => {
    if (!user || ttsLoaded || (activeTab !== 'speech' && activeTab !== 'stt')) return;
    loadTTSHistory().then(dbTts => {
      if (dbTts.length > 0) {
        setTtsHistory(dbTts.map((t: DBTTSEntry) => ({
          id: t.id, url: t.audio_url, text: t.text, model: t.model, voice: t.voice, timestamp: new Date(t.created_at),
        })));
        setTimeout(() => ttsHistoryEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
      }
      setTtsLoaded(true);
    });
  }, [user, ttsLoaded, activeTab]);

  useEffect(() => {
    if (!user || videoLoaded || activeTab !== 'video') return;
    loadVideoHistory().then(dbVideos => {
      if (dbVideos.length > 0) {
        setVideoHistory(dbVideos.map((v: DBVideoEntry) => ({
          id: v.id, url: v.video_url, prompt: v.prompt, model: v.model, duration: v.duration, timestamp: new Date(v.created_at),
        })));
        setTimeout(() => videoHistoryEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
      }
      setVideoLoaded(true);
    });
  }, [user, videoLoaded, activeTab]);

  useEffect(() => {
    if (!user || imageLoaded || activeTab !== 'images') return;
    loadImageHistory().then(dbImages => {
      if (dbImages.length > 0) {
        setImageHistory(dbImages.map((img: DBImageEntry) => ({
          id: img.id, url: img.image_url, prompt: img.prompt, model: img.model, timestamp: new Date(img.created_at),
        })));
        setTimeout(() => imageHistoryEndRef.current?.scrollIntoView({ behavior: 'instant' }), 50);
      }
      setImageLoaded(true);
    });
  }, [user, imageLoaded, activeTab]);

  useEffect(() => {
    try { localStorage.setItem('chat_messages', JSON.stringify(messages)); } catch {}
    if (!user || messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 40) || 'Новый чат';
    if (activeChatId) {
      saveChatSession({ id: activeChatId, title, messages, model: selectedModel });
    } else if (messages.length >= 2) {
      saveChatSession({ title, messages, model: selectedModel }).then((id) => {
        if (id) {
          setActiveChatId(id);
          setChatSessions((prev) => [
            { id, title, messages: [...messages], createdAt: new Date() },
            ...prev,
          ]);
        }
      });
    }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem('chat_input', JSON.stringify(input)); } catch {}
  }, [input]);

  useEffect(() => {
    try { localStorage.setItem('chat_model', JSON.stringify(selectedModel)); } catch {}
  }, [selectedModel]);

  useEffect(() => {
    try { localStorage.setItem('chat_sessions', JSON.stringify(chatSessions)); } catch {}
  }, [chatSessions]);

  useEffect(() => {
    try { localStorage.setItem('chat_active_id', JSON.stringify(activeChatId)); } catch {}
  }, [activeChatId]);

  useEffect(() => {
    try { localStorage.setItem('chat_temperature', JSON.stringify(temperature)); } catch {}
  }, [temperature]);

  useEffect(() => {
    try { localStorage.setItem('chat_system_prompt', JSON.stringify(systemPrompt)); } catch {}
  }, [systemPrompt]);

  useEffect(() => {
    try { localStorage.setItem('chat_max_tokens', JSON.stringify(maxTokens)); } catch {}
  }, [maxTokens]);

  useEffect(() => {
    try { localStorage.setItem('chat_top_p', JSON.stringify(topP)); } catch {}
  }, [topP]);

  useEffect(() => {
    try { localStorage.setItem('chat_frequency_penalty', JSON.stringify(frequencyPenalty)); } catch {}
  }, [frequencyPenalty]);

  useEffect(() => {
    try { localStorage.setItem('chat_presence_penalty', JSON.stringify(presencePenalty)); } catch {}
  }, [presencePenalty]);

  useEffect(() => {
    try { localStorage.setItem('tts_model', JSON.stringify(selectedTTSModel)); } catch {}
  }, [selectedTTSModel]);

  useEffect(() => {
    try { localStorage.setItem('tts_voice', JSON.stringify(selectedTTSVoice)); } catch {}
  }, [selectedTTSVoice]);

  useEffect(() => {
    try { localStorage.setItem('video_model', JSON.stringify(selectedVideoModel)); } catch {}
  }, [selectedVideoModel]);

  useEffect(() => {
    try { localStorage.setItem('video_duration', JSON.stringify(selectedVideoDuration)); } catch {}
  }, [selectedVideoDuration]);

  useEffect(() => {
    try { localStorage.setItem('video_aspect_ratio', JSON.stringify(selectedVideoAspectRatio)); } catch {}
  }, [selectedVideoAspectRatio]);

  useEffect(() => {
    try { localStorage.setItem('video_resolution', JSON.stringify(selectedVideoResolution)); } catch {}
  }, [selectedVideoResolution]);

  const handleTTSGenerate = useCallback(async () => {
    const text = ttsText.trim();
    if (!text) return;

    const ttsModelInfo = getTTSModelInfo(selectedTTSModel);
    if (ttsModelInfo?.supportsVoiceClone && !ttsRefAudioBase64) {
      setTtsError('Для этой модели необходимо загрузить образец голоса. Нажмите на иконку скрепки и прикрепите аудиофайл.');
      return;
    }

    setTtsLoading(true);
    setTtsError(null);

    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
      setTtsPlayingId(null);
    }

    try {
      const session = await getFreshSession();
      if (!session) {
        setTtsError('Необходима авторизация');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const ttsModelInfo = getTTSModelInfo(selectedTTSModel);
      const bodyPayload: Record<string, unknown> = {
        text,
        model: selectedTTSModel,
        voice: selectedTTSVoice,
      };
      if (ttsModelInfo?.supportsVoiceClone && ttsRefAudioBase64) {
        const rawBase64 = ttsRefAudioBase64.includes(',') ? ttsRefAudioBase64.split(',')[1] : ttsRefAudioBase64;
        bodyPayload.ref_audio = rawBase64;
        const mimeMatch = ttsRefAudioBase64.match(/^data:([^;]+);/);
        if (mimeMatch) bodyPayload.ref_audio_mime = mimeMatch[1];
        if (ttsRefTranscript.trim()) {
          bodyPayload.ref_text = ttsRefTranscript.trim();
        }
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      const ct = res.headers.get('Content-Type') || '';

      if (!res.ok) {
        if (ct.includes('application/json')) {
          const err = await res.json();
          setTtsError(err.error || `Ошибка ${res.status}`);
        } else {
          const errText = await res.text();
          setTtsError(errText || `Ошибка ${res.status}`);
        }
        return;
      }

      if (ct.includes('application/json')) {
        const errBody = await res.json();
        setTtsError(errBody.error || 'Сервер вернул неожиданный ответ');
        return;
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        setTtsError('Сервер вернул пустой ответ');
        return;
      }

      const localUrl = URL.createObjectURL(blob);
      const entryId = crypto.randomUUID();

      // Add to local history immediately with blob URL for playback
      setTtsHistory(prev => [...prev, {
        id: entryId,
        url: localUrl,
        text: text,
        model: selectedTTSModel,
        voice: selectedTTSVoice,
        timestamp: new Date(),
      }]);
      setTimeout(() => ttsHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      const audio = new Audio(localUrl);
      ttsAudioRef.current = audio;
      audio.onended = () => setTtsPlayingId(null);
      try {
        await audio.play();
        setTtsPlayingId(entryId);
      } catch {
        setTtsPlayingId(null);
      }

      // Upload to storage + save to DB in background
      saveTTSEntry({ text, model: selectedTTSModel, voice: selectedTTSVoice, audioBlob: blob }).then((dbEntry) => {
        if (dbEntry) {
          setTtsHistory(prev => prev.map(e => e.id === entryId ? { ...e, id: dbEntry.id, url: dbEntry.audio_url } : e));
          URL.revokeObjectURL(localUrl);
        }
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        setTtsError('Превышено время ожидания (60 сек). Попробуйте короче текст.');
      } else {
        setTtsError((e as Error).message || 'Неизвестная ошибка');
      }
    } finally {
      setTtsLoading(false);
    }
  }, [ttsText, selectedTTSModel, selectedTTSVoice, ttsRefAudioBase64, ttsRefTranscript]);

  const convertBlobToWav = useCallback(async (blob: Blob): Promise<Blob> => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 24000 });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    const numChannels = 1;
    const sampleRate = decoded.sampleRate;
    const samples = decoded.getChannelData(0);
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeStr = (offset: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    audioCtx.close();
    return new Blob([buffer], { type: 'audio/wav' });
  }, []);

  const startTtsRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      ttsRecordingChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) ttsRecordingChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const rawBlob = new Blob(ttsRecordingChunksRef.current, { type: recorder.mimeType });
        if (rawBlob.size === 0) return;
        try {
          const wavBlob = await convertBlobToWav(rawBlob);
          setTtsRefFileName('recording.wav');
          const reader = new FileReader();
          reader.onload = () => setTtsRefAudioBase64(reader.result as string);
          reader.readAsDataURL(wavBlob);
        } catch {
          setTtsRefFileName('recording.webm');
          const reader = new FileReader();
          reader.onload = () => setTtsRefAudioBase64(reader.result as string);
          reader.readAsDataURL(rawBlob);
        }
      };
      ttsMediaRecorderRef.current = recorder;
      recorder.start();
      setTtsRecording(true);
      setTtsRecordingTime(0);
      ttsRecordingTimerRef.current = setInterval(() => setTtsRecordingTime(t => t + 1), 1000);
    } catch {
      setTtsError('Не удалось получить доступ к микрофону');
    }
  }, [convertBlobToWav]);

  const stopTtsRecording = useCallback(() => {
    if (ttsMediaRecorderRef.current && ttsMediaRecorderRef.current.state !== 'inactive') {
      ttsMediaRecorderRef.current.stop();
    }
    ttsMediaRecorderRef.current = null;
    setTtsRecording(false);
    if (ttsRecordingTimerRef.current) { clearInterval(ttsRecordingTimerRef.current); ttsRecordingTimerRef.current = null; }
  }, []);

  // --- STT handlers ---
  const startSttRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      sttRecordingChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) sttRecordingChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(sttRecordingChunksRef.current, { type: recorder.mimeType });
        if (blob.size === 0) return;
        const ext = recorder.mimeType.includes('webm') ? 'webm' : 'm4a';
        setSttAudioFileName(`recording.${ext}`);
        const reader = new FileReader();
        reader.onload = () => setSttAudioBase64(reader.result as string);
        reader.readAsDataURL(blob);
      };
      sttMediaRecorderRef.current = recorder;
      recorder.start();
      setSttRecording(true);
      setSttRecordingTime(0);
      sttRecordingTimerRef.current = setInterval(() => setSttRecordingTime(t => t + 1), 1000);
    } catch {
      setSttError('Не удалось получить доступ к микрофону');
    }
  }, []);

  const stopSttRecording = useCallback(() => {
    if (sttMediaRecorderRef.current && sttMediaRecorderRef.current.state !== 'inactive') {
      sttMediaRecorderRef.current.stop();
    }
    sttMediaRecorderRef.current = null;
    setSttRecording(false);
    if (sttRecordingTimerRef.current) { clearInterval(sttRecordingTimerRef.current); sttRecordingTimerRef.current = null; }
  }, []);

  const handleSttTranscribe = useCallback(async () => {
    if (!sttAudioBase64) return;
    setSttLoading(true);
    setSttError(null);
    setSttResult(null);
    try {
      const session = await getFreshSession();
      if (!session) { setSttError('Необходима авторизация'); return; }
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ audio_data: sttAudioBase64, model: sttModel }),
        }
      );

      const balanceHeader = res.headers.get('X-Balance-Remaining');
      if (balanceHeader) setBalance(parseFloat(balanceHeader));

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `Ошибка ${res.status}` }));
        throw new Error(err.error || `Ошибка ${res.status}`);
      }

      const data = await res.json();
      setSttResult(data.text);
      const entryId = crypto.randomUUID();
      setSttHistory(prev => [{ id: entryId, text: data.text, model: sttModel, duration: data.duration || 0, timestamp: new Date() }, ...prev]);
    } catch (e) {
      setSttError((e as Error).message || 'Неизвестная ошибка');
    } finally {
      setSttLoading(false);
    }
  }, [sttAudioBase64, sttModel]);

  const playTTSEntry = useCallback((entry: { id: string; url: string }) => {
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
    }
    if (ttsPlayingId === entry.id) {
      setTtsPlayingId(null);
      return;
    }
    const audio = new Audio(entry.url);
    ttsAudioRef.current = audio;
    audio.onended = () => setTtsPlayingId(null);
    audio.play().catch(() => setTtsPlayingId(null));
    setTtsPlayingId(entry.id);
  }, [ttsPlayingId]);

  const downloadTTSEntry = useCallback((url: string) => {
    downloadFile(url, `speech_${Date.now()}.mp3`);
  }, []);

  const pollVideoGeneration = useCallback(async (
    generationId: string,
    estimatedCost: number,
    prompt: string,
    model: string,
    duration: number,
    pendingRowId?: string,
    taskId?: string,
  ) => {
    const removeTask = (tid?: string) => { if (tid) setActiveVideoTasks(prev => prev.filter(t => t.id !== tid)); };
    const failTask = (tid?: string, err?: string) => { if (tid) setActiveVideoTasks(prev => prev.map(t => t.id === tid ? { ...t, status: 'failed', error: err } : t)); };

    const maxAttempts = 120;
    let consecutiveErrors = 0;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const session = await getFreshSession();
        if (!session) {
          failTask(taskId, 'Сессия истекла. Обновите страницу.');
          return;
        }

        const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`;
        const pollUrl = `${baseUrl}?id=${encodeURIComponent(generationId)}`;
        const pollRes = await fetch(pollUrl, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!pollRes.ok) {
          const errBody = await pollRes.json().catch(() => null);
          const errMsg = errBody?.error || `Ошибка сервера (${pollRes.status})`;
          consecutiveErrors++;
          if (consecutiveErrors >= 3) {
            failTask(taskId, errMsg);
            if (pendingRowId) {
              await supabase.from('pending_generations').update({ status: 'failed', error_message: errMsg, updated_at: new Date().toISOString() }).eq('id', pendingRowId);
            }
            return;
          }
          continue;
        }

        consecutiveErrors = 0;
        const pollData = await pollRes.json();

        if (pollData.status === 'completed' && pollData.url) {
          if (pendingRowId) {
            await supabase.from('pending_generations').update({ status: 'completed', result_url: pollData.url, updated_at: new Date().toISOString() }).eq('id', pendingRowId);
          }
          removeTask(taskId);
          // Avoid duplicate: use functional state check
          const entryId = crypto.randomUUID();
          setVideoHistory(prev => {
            if (prev.some(e => e.url === pollData.url)) return prev;
            return [...prev, { id: entryId, url: pollData.url, prompt, model, duration, timestamp: new Date() }];
          });
          setTimeout(() => videoHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          saveVideoEntry({ prompt, model, duration, video_url: pollData.url }).then((dbEntry) => {
            if (dbEntry) setVideoHistory(prev => prev.map(e => e.id === entryId ? { ...e, id: dbEntry.id } : e));
          });
          return;
        }

        if (pollData.status === 'failed') {
          if (pendingRowId) {
            await supabase.from('pending_generations').update({ status: 'failed', error_message: pollData.error || 'Ошибка', updated_at: new Date().toISOString() }).eq('id', pendingRowId);
          }
          failTask(taskId, pollData.error || 'Генерация завершилась с ошибкой');
          return;
        }
      } catch {
        consecutiveErrors++;
        if (consecutiveErrors >= 5) {
          failTask(taskId, 'Потеряна связь с сервером');
          if (pendingRowId) {
            await supabase.from('pending_generations').update({ status: 'failed', error_message: 'Потеряна связь', updated_at: new Date().toISOString() }).eq('id', pendingRowId);
          }
          return;
        }
      }
    }

    if (pendingRowId) {
      await supabase.from('pending_generations').update({ status: 'failed', error_message: 'Тайм-аут', updated_at: new Date().toISOString() }).eq('id', pendingRowId);
    }
    failTask(taskId, 'Превышено время ожидания (10 мин)');
  }, []);

  // Resume / recover video tasks on page load (runs once)
  useEffect(() => {
    if (!user || !videoLoaded || videoResumeRanRef.current) return;
    videoResumeRanRef.current = true;
    (async () => {
      // 1) Restore completed rows that have a result_url but might be missing from video_history
      const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: completedRows } = await supabase
        .from('pending_generations')
        .select('*')
        .eq('status', 'completed')
        .not('result_url', 'is', null)
        .gt('created_at', recentCutoff);

      if (completedRows && completedRows.length > 0) {
        const currentUrls = new Set(videoHistory.map(e => e.url));
        const newEntries: typeof videoHistory = [];
        for (const row of completedRows) {
          if (currentUrls.has(row.result_url!)) continue;
          currentUrls.add(row.result_url!);
          newEntries.push({
            id: row.id,
            url: row.result_url!,
            prompt: row.prompt,
            model: row.model,
            duration: row.duration || 5,
            timestamp: new Date(row.created_at),
          });
          saveVideoEntry({ prompt: row.prompt, model: row.model, duration: row.duration || 5, video_url: row.result_url! });
        }
        if (newEntries.length > 0) {
          setVideoHistory(prev => {
            const existingUrls = new Set(prev.map(e => e.url));
            const filtered = newEntries.filter(e => !existingUrls.has(e.url));
            return filtered.length > 0 ? [...prev, ...filtered] : prev;
          });
        }
      }

      // 2) Fetch only PENDING rows (not failed — those stay failed)
      // Fetch PENDING rows + stale RESUMING rows (crashed before finishing recovery)
      const staleCutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { data: pendingRows } = await supabase
        .from('pending_generations')
        .select('*')
        .eq('status', 'pending')
        .gt('created_at', recentCutoff)
        .order('created_at', { ascending: true });
      const { data: staleResumingRows } = await supabase
        .from('pending_generations')
        .select('*')
        .eq('status', 'resuming')
        .lt('updated_at', staleCutoff)
        .gt('created_at', recentCutoff)
        .order('created_at', { ascending: true });
      const pending = [...(pendingRows || []), ...(staleResumingRows || [])];

      if (pending.length === 0) return;

      // Mark them as 'resuming' immediately so another tab/refresh won't double-pick
      const pendingIds = pending.map(t => t.id);
      await supabase
        .from('pending_generations')
        .update({ status: 'resuming', updated_at: new Date().toISOString() })
        .in('id', pendingIds);

      const session = await getFreshSession();
      if (!session) {
        // Can't check — put them back to pending for next visit
        await supabase.from('pending_generations').update({ status: 'pending' }).in('id', pendingIds);
        return;
      }

      // 3) One-shot status check for each row (silently, no UI cards yet)
      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`;
      const stillProcessing: typeof pending = [];

      for (const task of pending) {
        try {
          const pollUrl = `${baseUrl}?id=${encodeURIComponent(task.generation_id)}&estimated_cost=${task.estimated_cost || 0}`;
          const res = await fetch(pollUrl, {
            method: 'GET',
            headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          });
          if (!res.ok) {
            stillProcessing.push(task);
            continue;
          }
          const data = await res.json();

          if (data.status === 'completed' && data.url) {
            await supabase.from('pending_generations').update({ status: 'completed', result_url: data.url, updated_at: new Date().toISOString() }).eq('id', task.id);
            setVideoHistory(prev => {
              if (prev.some(e => e.url === data.url)) return prev;
              return [...prev, { id: task.id, url: data.url, prompt: task.prompt, model: task.model, duration: task.duration || 5, timestamp: new Date(task.created_at) }];
            });
            saveVideoEntry({ prompt: task.prompt, model: task.model, duration: task.duration || 5, video_url: data.url });
          } else if (data.status === 'failed') {
            await supabase.from('pending_generations').update({ status: 'failed', error_message: data.error || 'Ошибка', updated_at: new Date().toISOString() }).eq('id', task.id);
          } else {
            // Still generating — need full polling
            stillProcessing.push(task);
          }
        } catch {
          stillProcessing.push(task);
        }
      }

      // 4) Only show cards and start polling for genuinely in-progress tasks
      if (stillProcessing.length === 0) return;

      // Put them back to 'pending' for the poll loop to manage
      await supabase
        .from('pending_generations')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .in('id', stillProcessing.map(t => t.id));

      setActiveTab('video');
      setActiveVideoTasks(prev => [...prev, ...stillProcessing.map(task => ({
        id: task.id,
        prompt: task.prompt,
        model: task.model,
        duration: task.duration || 5,
        status: 'polling' as const,
      }))]);

      await Promise.all(stillProcessing.map(task =>
        pollVideoGeneration(
          task.generation_id,
          task.estimated_cost || 0,
          task.prompt,
          task.model,
          task.duration || 5,
          task.id,
          task.id,
        )
      ));
    })();
  }, [user, videoLoaded]);

  const handleImageGenerate = useCallback(async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) return;

    const taskId = crypto.randomUUID();
    const taskModel = imageModel;

    const taskRefs = imageAttachedRefs.length > 0 ? [...imageAttachedRefs] : undefined;
    setActiveImageTasks(prev => [...prev, { id: taskId, prompt, model: taskModel, status: 'generating', refs: taskRefs }]);
    setImagePrompt('');
    setImageAttachedRefs([]);
    if (imageTextareaRef.current) { imageTextareaRef.current.style.height = 'auto'; }
    setTimeout(() => imageHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    try {
      const session = await getFreshSession();
      if (!session) {
        setActiveImageTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: 'Необходима авторизация' } : t));
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(300_000),
        body: JSON.stringify((() => {
          const info = getImageModelInfo(taskModel);
          const payload: Record<string, unknown> = { model: taskModel, prompt };
          const maxN = info?.maxN || 1;
          const safeN = Math.min(Math.max(1, imageCount), maxN);
          if (safeN > 1) payload.n = safeN;
          if (info) {
            if (info.aspectRatios.length > 0) payload.aspect_ratio = imageAspectRatio;
            if (info.usesSize) payload.size = imageSize;
            else if (info.resolutions.length > 0) payload.resolution = imageResolution;
            if (info.qualities.length > 0) payload.quality = imageQuality;
          }
          if (imageAttachedRefs.length > 0) {
            payload.input_references = imageAttachedRefs.map(url => ({ type: 'image_url', image_url: { url } }));
          }
          return payload;
        })()),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        const errMsg = response.status === 504
          ? 'Генерация заняла слишком много времени. Попробуйте снизить разрешение или выбрать другую модель.'
          : (result.error || `Ошибка (${response.status})`);
        setActiveImageTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: errMsg } : t));
        return;
      }
      if (!result.data || result.data.length === 0) {
        setActiveImageTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: 'API не вернул изображений' } : t));
        return;
      }

      const resolveImageUrl = async (imageData: Record<string, unknown>): Promise<string> => {
        let url = (imageData.storage_url as string) || '';
        if (!url && imageData.b64_json) {
          try {
            const { data: { session: freshSess } } = await supabase.auth.getSession();
            if (freshSess) {
              const binaryStr = atob(imageData.b64_json as string);
              const bytes = new Uint8Array(binaryStr.length);
              for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);
              const ext = ((imageData.media_type as string) || 'image/png').includes('webp') ? 'webp' : 'png';
              const fileName = `${freshSess.user.id}/${crypto.randomUUID()}.${ext}`;
              const { error: upErr } = await supabase.storage.from('generated-images').upload(fileName, bytes.buffer, { contentType: (imageData.media_type as string) || 'image/png' });
              if (!upErr) {
                const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(fileName);
                url = urlData.publicUrl;
              }
            }
          } catch {}
        }
        if (!url && imageData.b64_json) {
          url = `data:${(imageData.media_type as string) || 'image/png'};base64,${imageData.b64_json}`;
        }
        return url;
      };

      setActiveImageTasks(prev => prev.filter(t => t.id !== taskId));
      const now = new Date();
      for (const imageData of result.data) {
        const imageUrl = await resolveImageUrl(imageData);
        if (!imageUrl) continue;
        const entryId = crypto.randomUUID();
        setImageHistory(prev => [...prev, { id: entryId, url: imageUrl, prompt, model: taskModel, timestamp: now }]);
        saveImageEntry({ prompt, model: taskModel, image_url: imageUrl }).then((dbEntry) => {
          if (dbEntry) setImageHistory(prev => prev.map(e => e.id === entryId ? { ...e, id: dbEntry.id } : e));
        });
      }
      setTimeout(() => imageHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e) {
      setActiveImageTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: (e as Error).message || 'Неизвестная ошибка' } : t));
    }
  }, [imagePrompt, imageModel, imageSize, imageQuality, imageAspectRatio, imageResolution, imageAttachedRefs, imageCount, saveImageEntry]);

  const enhanceImagePrompt = useCallback(async () => {
    const raw = imagePrompt.trim();
    const hasImages = imageAttachedRefs.length > 0;
    if ((!raw && !hasImages) || isEnhancingImagePrompt) return;
    setIsEnhancingImagePrompt(true);
    try {
      const session = await getFreshSession();
      if (!session) { setIsEnhancingImagePrompt(false); return; }

      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      if (raw) userContent.push({ type: 'text', text: raw });
      if (hasImages) {
        const processed = (await Promise.all(imageAttachedRefs.map(async (url) => {
          try { return await ensureCompressedDataUrl(url, 1024, 0.7); } catch { return null; }
        }))).filter((u): u is string => !!u && u.startsWith('data:'));
        for (const ref of processed) {
          userContent.push({ type: 'image_url', image_url: { url: ref } });
        }
      }
      const hasRefs = userContent.some(c => c.type === 'image_url');

      let systemText: string;
      if (hasRefs && !raw) {
        systemText = 'Ты профессиональный промпт-инженер для генерации изображений. Внимательно проанализируй приложенное фото. Опиши всё, что видишь: объекты, сцену, стиль, цветовую палитру, освещение, композицию и атмосферу. Сгенерируй детальный промпт, который позволит воссоздать или развить это изображение при генерации. Верни ТОЛЬКО готовый промпт, без кавычек и пояснений. Пиши на английском языке. Максимум 300 слов.';
      } else if (hasRefs) {
        systemText = 'Ты профессиональный промпт-инженер для генерации изображений. Пользователь прикрепил фотографию и дал текстовый запрос. Проанализируй изображение и учти запрос пользователя как направление. Сгенерируй детальный промпт на основе фото и запроса: опиши объекты, сцену, стиль, освещение, композицию и атмосферу. Верни ТОЛЬКО готовый промпт, без пояснений. Пиши на том же языке, что и запрос пользователя. Максимум 300 слов.';
      } else {
        systemText = 'Ты профессиональный промпт-инженер для генерации изображений. Улучши текстовый промпт пользователя, добавив детали о стиле, освещении, цветовой палитре, композиции и атмосфере. Не выдумывай деталей, которых нет в запросе, и не меняй тему. Верни ТОЛЬКО улучшенный промпт, без объяснений. Пиши на том же языке, что и исходный промпт. Максимум 300 слов.';
      }

      const useVision = hasRefs;
      let msgContent: string | typeof userContent;
      if (!useVision) {
        msgContent = raw;
      } else {
        if (!userContent.some(c => c.type === 'text')) {
          userContent.unshift({ type: 'text', text: 'Проанализируй это изображение.' });
        }
        msgContent = userContent;
      }

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: useVision ? 'gpt-4.1' : 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemText },
            { role: 'user', content: msgContent },
          ],
        }),
      });
      if (!res.ok) {
        let errMsg = 'Не удалось улучшить промпт';
        try { const errBody = await res.json(); errMsg = errBody?.error || errMsg; } catch {}
        setIsEnhancingImagePrompt(false); setImageError(errMsg); return;
      }
      const data = await res.json();
      const enhanced = data.choices?.[0]?.message?.content?.trim();
      const isRefusal = enhanced && /(извинит|к сожалению|я не могу|не могу помочь|i can'?t|i'?m sorry|sorry,? i|i'?m unable|i cannot|i'?m not able|can'?t assist|can'?t help)/i.test(enhanced);
      if (enhanced && !isRefusal) {
        setImagePrompt(enhanced);
        if (imageTextareaRef.current) {
          imageTextareaRef.current.style.height = 'auto';
          imageTextareaRef.current.style.height = Math.min(imageTextareaRef.current.scrollHeight, 200) + 'px';
        }
      }
    } catch (e) {
      setImageError((e as Error).message || 'Ошибка при улучшении промпта');
    }
    setIsEnhancingImagePrompt(false);
  }, [imagePrompt, isEnhancingImagePrompt, imageAttachedRefs]);

  const handleVideoGenerate = useCallback(async () => {
    const prompt = stripImageMarkers(videoPrompt).trim();
    const hasAttachments = !!(videoFirstFrame || videoLastFrame || videoReferenceImage || videoAudioFile || videoAttachedImages.length > 0);
    if (!prompt && !hasAttachments) return;

    let taskId: string;
    try {
      taskId = crypto.randomUUID();
    } catch {
      taskId = Math.random().toString(36).slice(2);
    }
    const taskModel = selectedVideoModel;
    const taskDuration = selectedVideoDuration;
    const taskAspect = selectedVideoAspectRatio;
    const taskResolution = selectedVideoResolution;
    const modelCaps = getVideoModelInfo(taskModel);
    const taskFirstFrame = modelCaps?.supportsFirstFrame ? videoFirstFrame : null;
    const taskLastFrame = modelCaps?.supportsLastFrame ? videoLastFrame : null;
    const taskRef = modelCaps?.supportsReferences ? videoReferenceImage : null;
    const taskAudio = modelCaps?.supportsAudio ? videoAudioFile : null;
    const taskAllRefs = modelCaps?.supportsReferences ? videoAttachedImages.filter(i => (i.mediaType === 'image' || !i.mediaType) && i.role === 'ref').map(i => i.dataUrl) : [];
    const taskVideoRefs = modelCaps?.supportsVideoRefs ? videoAttachedImages.filter(i => i.mediaType === 'video').map(i => i.dataUrl) : [];
    const taskAudioRefs = modelCaps?.supportsAudio ? videoAttachedImages.filter(i => i.mediaType === 'audio').map(i => i.dataUrl) : [];
    const taskNegativePrompt = (videoNegativePrompt || '').trim() || undefined;

    setActiveVideoTasks(prev => [...prev, { id: taskId, prompt: prompt || '(медиа)', model: taskModel, duration: taskDuration, status: 'submitting' }]);
    setVideoPrompt('');
    setVideoAttachedImages([]);
    setVideoError(null);
    if (videoTextareaRef.current) { videoTextareaRef.current.style.height = 'auto'; }
    setTimeout(() => videoHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    try {
      const session = await getFreshSession();
      if (!session) {
        setActiveVideoTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: 'Необходима авторизация' } : t));
        return;
      }

      const baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video`;
      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const uid = session.user.id;
      const needsJpeg = true;
      const ensureUploaded = (url: string | undefined, jpeg: boolean) => {
        if (!url) return Promise.resolve(undefined);
        if (url.startsWith('data:')) return uploadDataUrlToStorage(url, uid, 'video-inputs', jpeg);
        return Promise.resolve(url);
      };
      const [firstUrl, lastUrl, refUrl, audioUrl, ...extraRefUrls] = await Promise.all([
        ensureUploaded(taskFirstFrame, needsJpeg),
        ensureUploaded(taskLastFrame, needsJpeg),
        ensureUploaded(taskRef, needsJpeg),
        ensureUploaded(taskAudio, false),
        ...taskAllRefs.map(u => ensureUploaded(u, needsJpeg)),
        ...taskVideoRefs.map(u => ensureUploaded(u, false)),
        ...taskAudioRefs.map(u => ensureUploaded(u, false)),
      ]);
      const allImageRefUrls = extraRefUrls.slice(0, taskAllRefs.length).filter(Boolean) as string[];
      const allVideoRefUrls = extraRefUrls.slice(taskAllRefs.length, taskAllRefs.length + taskVideoRefs.length).filter(Boolean) as string[];
      const allAudioRefUrls = extraRefUrls.slice(taskAllRefs.length + taskVideoRefs.length).filter(Boolean) as string[];

      const submitRes = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt,
          model: taskModel,
          duration: taskDuration,
          aspect_ratio: taskAspect,
          resolution: taskResolution,
          ...(getVideoPixelSize(taskModel, taskAspect, taskResolution) ? { size: getVideoPixelSize(taskModel, taskAspect, taskResolution) } : {}),
          ...(firstUrl ? { first_frame_url: firstUrl } : {}),
          ...(lastUrl ? { last_frame_url: lastUrl } : {}),
          ...(refUrl ? { reference_url: refUrl } : {}),
          ...(allImageRefUrls.length > 0 ? { reference_urls: allImageRefUrls } : {}),
          ...(allVideoRefUrls.length > 0 ? { video_reference_urls: allVideoRefUrls } : {}),
          ...(audioUrl ? { audio_url: audioUrl } : {}),
          ...(allAudioRefUrls.length > 0 ? { audio_reference_urls: allAudioRefUrls } : {}),
          ...(taskNegativePrompt ? { negative_prompt: taskNegativePrompt } : {}),
        }),
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok || submitData.error) {
        const errMsg = submitData.error || `Ошибка ${submitRes.status}`;
        setVideoError(errMsg);
        setActiveVideoTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: errMsg } : t));
        return;
      }

      if (submitData.status === 'completed' && submitData.url) {
        setActiveVideoTasks(prev => prev.filter(t => t.id !== taskId));
        const entryId = crypto.randomUUID();
        setVideoHistory(prev => [...prev, { id: entryId, url: submitData.url, prompt, model: taskModel, duration: taskDuration, timestamp: new Date() }]);
        setTimeout(() => videoHistoryEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        saveVideoEntry({ prompt, model: taskModel, duration: taskDuration, video_url: submitData.url }).then((dbEntry) => {
          if (dbEntry) setVideoHistory(prev => prev.map(e => e.id === entryId ? { ...e, id: dbEntry.id } : e));
        });
        return;
      }

      const generationId = submitData.generation_id;
      if (!generationId) {
        setVideoError('Не удалось запустить генерацию');
        setActiveVideoTasks(prev => prev.filter(t => t.id !== taskId));
        return;
      }

      const estimatedCost = submitData.estimated_cost ?? 0;

      const { data: pendingRow } = await supabase.from('pending_generations').insert({
        generation_id: generationId,
        prompt,
        model: taskModel,
        duration: taskDuration,
        aspect_ratio: taskAspect,
        estimated_cost: estimatedCost,
        type: 'video',
      }).select('id').maybeSingle();

      setActiveVideoTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'polling' } : t));

      pollVideoGeneration(generationId, estimatedCost, prompt, taskModel, taskDuration, pendingRow?.id, taskId);
    } catch (e) {
      const msg = (e as Error).message || String(e);
      const userMsg = msg.includes('загрузить') || msg.includes('Upload') ? msg : `Ошибка: ${msg.slice(0, 200)}`;
      setActiveVideoTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'failed', error: userMsg } : t));
      setVideoError(userMsg);
    }
  }, [videoPrompt, selectedVideoModel, selectedVideoDuration, selectedVideoAspectRatio, selectedVideoResolution, videoFirstFrame, videoLastFrame, videoReferenceImage, videoAudioFile, videoNegativePrompt, videoAttachedImages, pollVideoGeneration]);

  const enhanceVideoPrompt = useCallback(async () => {
    const raw = videoPrompt.trim();
    const hasAttachments = videoAttachedImages.length > 0;
    if ((!raw && !hasAttachments) || isEnhancingVideoPrompt) return;
    setIsEnhancingVideoPrompt(true);
    try {
      const session = await getFreshSession();
      if (!session) { setIsEnhancingVideoPrompt(false); return; }

      const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
      if (raw) userContent.push({ type: 'text', text: raw });
      {
        const framesToConvert = videoAttachedImages.map(i => i.dataUrl);
        if (framesToConvert.length > 0) {
          const processed = (await Promise.all(framesToConvert.map(async (url) => {
            try { return await ensureCompressedDataUrl(url, 512, 0.4); } catch { return null; }
          }))).filter((u): u is string => !!u && u.startsWith('data:'));
          for (const ref of processed) {
            userContent.push({ type: 'image_url', image_url: { url: ref } });
          }
        }
      }
      const hasImages = userContent.some(c => c.type === 'image_url');

      const imageLabels: string[] = videoAttachedImages.map(img => {
        if (img.role === 'first') return 'первый кадр';
        if (img.role === 'last') return 'последний кадр';
        if (img.role === 'ref') return 'референс стиля';
        return img.label;
      });

      const systemText = hasImages
        ? `Ты профессиональный промпт-инженер для генерации видео. Пользователь прикрепил ${imageLabels.length} изображени${imageLabels.length === 1 ? 'е' : 'я'} (${imageLabels.join(', ')}). Внимательно проанализируй каждое: опиши сцену, объекты, стиль, атмосферу. Учти роль каждого изображения — первый кадр определяет начало видео, последний кадр — финал, референс — общий стиль и настроение. Добавь детали о движении камеры, переходах, освещении и динамике. ${raw ? 'Пользователь также указал текстовый запрос — учти его как направление, но основывайся на реальном содержимом фото.' : 'Текстового запроса нет — сгенерируй промпт полностью на основе изображений.'} Не выдумывай деталей, которых нет на изображениях. Верни ТОЛЬКО готовый промпт для генерации видео, без объяснений. Пиши на русском языке. Максимум 400 слов.`
        : 'Ты профессиональный промпт-инженер для генерации видео. Улучши текстовый промпт пользователя, добавив детали о движении камеры, освещении, стиле, атмосфере и динамике. Не выдумывай деталей, которых нет в запросе, и не меняй тему. Верни ТОЛЬКО улучшенный промпт, без объяснений. Пиши на том же языке, что и исходный промпт. Максимум 400 слов.';

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-completion`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: hasImages ? 'gpt-4.1' : 'gpt-4.1-mini',
          messages: [
            { role: 'system', content: systemText },
            { role: 'user', content: hasImages ? userContent : raw },
          ],
        }),
      });
      if (!res.ok) {
        let errMsg = 'Не удалось улучшить промпт';
        try { const errBody = await res.json(); errMsg = errBody?.error || errMsg; } catch {}
        setIsEnhancingVideoPrompt(false); setVideoError(errMsg); return;
      }
      const data = await res.json();
      const enhanced = data.choices?.[0]?.message?.content?.trim();
      const isRefusal = enhanced && /(извинит|к сожалению|я не могу|не могу помочь|i can'?t|i'?m sorry|sorry,? i|i'?m unable|i cannot|i'?m not able|can'?t assist|can'?t help)/i.test(enhanced);
      if (enhanced && !isRefusal) {
        setVideoPrompt(enhanced);
        if (videoTextareaRef.current) {
          videoTextareaRef.current.style.height = 'auto';
          videoTextareaRef.current.style.height = Math.min(videoTextareaRef.current.scrollHeight, 200) + 'px';
        }
      }
    } catch (e) {
      setVideoError((e as Error).message || 'Ошибка при улучшении промпта');
    }
    setIsEnhancingVideoPrompt(false);
  }, [videoPrompt, isEnhancingVideoPrompt, videoAttachedImages]);

  const handleVideoImageAttach = useCallback((target: 'first' | 'last' | 'ref') => {
    videoFrameTargetRef.current = target;
    videoFileInputRef.current?.click();
  }, []);

  const handleVideoFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setVideoError('Необходимо выбрать изображение');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setVideoError('Изображение слишком большое (максимум 10 МБ)');
      return;
    }
    const reader = new FileReader();
    const target = videoFrameTargetRef.current;
    reader.onload = () => {
      if (target === 'last') {
        setVideoLastFrame(reader.result as string);
      } else if (target === 'ref') {
        setVideoReferenceImage(reader.result as string);
      } else {
        setVideoFirstFrame(reader.result as string);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);



  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  };

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Изображение слишком большое (максимум 20 МБ)');
      e.target.value = '';
      return;
    }
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(fixDataUrlMime(reader.result as string));
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const detectImageRequest = (text: string): boolean => {
    const imageKeywords = [
      'нарисуй', 'создай изображение', 'сгенерируй картинку', 'сгенерируй изображение',
      'нарисовать', 'создай картинку', 'generate image', 'draw', 'create image',
      'сделай картинку', 'визуализируй', 'изобрази', 'нарисуй мне',
      'создай фото', 'сгенерируй фото',
    ];
    const lower = text.toLowerCase();
    return imageKeywords.some((kw) => lower.includes(kw));
  };

  const generateText = async (userText: string, image: string | null, overrideMessages?: ChatMessage[]) => {
    const chatHistory = (overrideMessages || messages)
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => {
        if (m.role === 'user' && m.attachedImage) {
          return {
            role: 'user',
            content: [
              { type: 'text', text: m.content || 'Что на этом изображении?' },
              { type: 'image_url', image_url: { url: m.attachedImage } },
            ],
          };
        }
        return { role: m.role, content: m.content };
      });

    const currentMsg = image
      ? {
          role: 'user',
          content: [
            { type: 'text', text: userText || 'Что на этом изображении?' },
            { type: 'image_url', image_url: { url: image } },
          ],
        }
      : { role: 'user', content: userText };

    const modelDisplayName = getModelDisplayName(selectedModel);
    const identityInstruction = `Ты — ${modelDisplayName}. Если пользователь спросит какая ты модель, отвечай что ты ${modelDisplayName}.`;
    const fullSystemPrompt = systemPrompt
      ? `${identityInstruction}\n\n${systemPrompt}`
      : identityInstruction;

    const apiMessages = [
      { role: 'system', content: fullSystemPrompt },
      ...chatHistory,
      currentMsg,
    ];
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const freshSession = await getFreshSession();
    if (!freshSession) { setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'error', content: 'Необходимо войти в аккаунт', timestamp: new Date() }]); setIsLoading(false); return; }
    const token = freshSession.access_token;

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const response = await fetch(`${supabaseUrl}/functions/v1/chat-completion`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: apiMessages, model: selectedModel, temperature, max_tokens: maxTokens, top_p: topP, frequency_penalty: frequencyPenalty, presence_penalty: presencePenalty }),
      signal: controller.signal,
    });

    let result: any;
    try { result = await response.json(); } catch { throw new Error(`Ошибка сервера (${response.status})`); }
    if (!response.ok || result.error) {
      throw new Error(result.error || `Ошибка (${response.status})`);
    }

    const assistantContent = result.choices?.[0]?.message?.content || 'Нет ответа';
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const generateImage = async (userText: string, image: string | null) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const freshSession = await getFreshSession();
    if (!freshSession) { setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'error', content: 'Необходимо войти в аккаунт', timestamp: new Date() }]); return; }
    const token = freshSession.access_token;

    const payload: Record<string, unknown> = {
      model: imageModel,
      prompt: userText,
    };
    if (image) {
      payload.input_references = [{ type: 'image_url', image_url: { url: image } }];
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    let result: any;
    try { result = await response.json(); } catch { throw new Error(`Ошибка сервера (${response.status})`); }
    if (!response.ok || result.error) {
      throw new Error(result.error || `Ошибка (${response.status})`);
    }
    if (!result.data || result.data.length === 0) {
      throw new Error('API не вернул изображений');
    }

    const imageData = result.data[0];
    let imageUrl = imageData.storage_url || '';

    if (!imageUrl && imageData.b64_json) {
      try {
        const { data: { session: freshSess } } = await supabase.auth.getSession();
        if (freshSess) {
          const binaryStr = atob(imageData.b64_json);
          const bytes = new Uint8Array(binaryStr.length);
          for (let j = 0; j < binaryStr.length; j++) bytes[j] = binaryStr.charCodeAt(j);
          const ext = (imageData.media_type || 'image/png').includes('webp') ? 'webp' : 'png';
          const fileName = `${freshSess.user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('generated-images').upload(fileName, bytes.buffer, { contentType: imageData.media_type || 'image/png' });
          if (!upErr) {
            const { data: urlData } = supabase.storage.from('generated-images').getPublicUrl(fileName);
            imageUrl = urlData.publicUrl;
          }
        }
      } catch {}
    }

    if (!imageUrl && imageData.b64_json) {
      imageUrl = `data:${imageData.media_type || 'image/png'};base64,${imageData.b64_json}`;
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: 'Вот сгенерированное изображение:',
      imageUrl,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
  };

  const handleSend = useCallback(async () => {
    if (isLoading) return;
    if (!input.trim() && !attachedImage) return;

    let storedImage = attachedImage || undefined;
    if (storedImage && user) {
      try {
        storedImage = await uploadDataUrlToStorage(storedImage, user.id, 'generated-images');
      } catch { /* keep original if upload fails */ }
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      attachedImage: storedImage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input.trim();
    const currentImage = storedImage;
    setInput('');
    setAttachedImage(null);
    setUploadError(null);    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      if (detectImageRequest(currentInput)) {
        await generateImage(currentInput, currentImage);
      } else {
        await generateText(currentInput, currentImage);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'error',
        content: (err as Error).message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [input, attachedImage, messages, selectedModel]);

  handleSendRef.current = handleSend;

  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      if (file.size > 20 * 1024 * 1024) {
        setUploadError('Изображение слишком большое (максимум 20 МБ)');
        return;
      }
      setUploadError(null);
      const reader = new FileReader();
      reader.onload = () => setAttachedImage(fixDataUrlMime(reader.result as string));
      reader.readAsDataURL(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (chatSlash.slashHandleKeyDown(e)) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setActiveChatId(null);
  };

  const startNewChat = () => {
    if (messages.length > 0) {
      const title = messages[0]?.content?.slice(0, 40) || 'Новый чат';
      const session = { title, messages: [...messages], model: selectedModel };
      saveChatSession(activeChatId ? { ...session, id: activeChatId } : session).then((id) => {
        if (id) {
          setChatSessions((prev) => {
            const filtered = prev.filter(s => s.id !== activeChatId);
            return [{ id, title, messages: [...messages], createdAt: new Date() }, ...filtered];
          });
        }
      });
    }
    setMessages([]);
    setActiveChatId(null);
  };

  const loadChat = (session: ChatSession) => {
    if (messages.length > 0 && !activeChatId) {
      const title = messages[0]?.content?.slice(0, 40) || 'Новый чат';
      saveChatSession({ title, messages: [...messages], model: selectedModel }).then((id) => {
        if (id) {
          setChatSessions((prev) => [
            { id, title, messages: [...messages], createdAt: new Date() },
            ...prev.filter((s) => s.id !== session.id),
          ]);
        }
      });
    }
    setMessages(session.messages);
    setActiveChatId(session.id);
    setShowSidebar(false);
  };

  const deleteSession = (id: string) => {
    dbDeleteSession(id);
    setChatSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeChatId === id) {
      setMessages([]);
      setActiveChatId(null);
    }
  };

  const regenerateLastResponse = useCallback(async () => {
    const lastUserIdx = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserIdx === -1) return;
    const actualIdx = messages.length - 1 - lastUserIdx;
    const lastUserMsg = messages[actualIdx];
    const trimmedMessages = messages.slice(0, actualIdx + 1);
    setMessages(trimmedMessages);
    setIsLoading(true);
    try {
      if (detectImageRequest(lastUserMsg.content)) {
        await generateImage(lastUserMsg.content, lastUserMsg.attachedImage || null);
      } else {
        await generateText(lastUserMsg.content, lastUserMsg.attachedImage || null, trimmedMessages);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'error',
        content: (err as Error).message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  }, [messages, selectedModel]);

  const downloadChat = () => {
    if (messages.length === 0) return;
    const lines = messages
      .filter((m) => m.role !== 'error' && m.role !== 'system')
      .map((m) => {
        const who = m.role === 'user' ? 'Вы' : 'GPT 5.6 Terra Pro';
        const time = m.timestamp.toLocaleString('ru-RU');
        return `[${time}] ${who}:\n${m.content}${m.imageUrl ? '\n[Изображение]' : ''}\n`;
      })
      .join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      chatPanelRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Page header — desktop tabs (hidden on mobile) */}
      <div className="shrink-0 px-3 sm:px-5 md:px-8 pt-14 sm:pt-16 pb-2 sm:pb-3 hidden sm:block space-y-2">
        {/* Top row: Макеты + Ролик on the right */}
        <div className="flex items-center justify-end gap-1.5">
          <CyclingLayoutButton onClick={() => window.open('/image-creator', '_blank')} />
          <CyclingAdButton onClick={() => window.open('/ad-creator', '_blank')} />
        </div>
        {/* Bottom row: tabs + library & profile */}
        <div className="flex items-center gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-1 lg:gap-1.5 p-1 rounded-2xl bg-slate-100/80 dark:bg-[#12122a]/80 border border-slate-200/40 dark:border-gray-800/40 shrink-0">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.label}
                  className={`flex items-center justify-center gap-1.5 px-2.5 lg:px-3.5 py-2 lg:py-2.5 rounded-xl text-[13px] lg:text-sm font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                      : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-white/5'
                  }`}
                >
                  <TabIcon className="w-4 h-4 shrink-0" />
                  <span className="hidden lg:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 lg:gap-1.5 ml-auto shrink-0">
            <button
              onClick={() => { setShowLibraryPanel(true); }}
              className="relative flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl text-[13px] md:text-sm font-medium whitespace-nowrap transition-all bg-slate-100 dark:bg-[#1a1a2e] text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-200 dark:hover:bg-[#252540] border border-slate-200/40 dark:border-gray-800/40"
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline">Библиотека</span>
              {unseenMediaCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-lg shadow-red-500/30 animate-pulse">
                  {unseenMediaCount > 99 ? '99+' : unseenMediaCount}
                </span>
              )}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex items-center gap-2 pl-2.5 pr-3 md:pl-3 md:pr-4 py-1.5 md:py-2 rounded-xl text-[13px] md:text-sm font-medium whitespace-nowrap transition-all bg-slate-100 dark:bg-[#1a1a2e] text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-[#252540] border border-slate-200/40 dark:border-gray-800/40"
            >
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {userInitial}
              </div>
              <span className="hidden lg:inline">Профиль</span>
            </button>
          </div>
        </div>
      </div>

      {/* Per-tab loading state */}
      {((activeTab === 'chat' && !chatLoaded) || (activeTab === 'speech' && !ttsLoaded) || (activeTab === 'stt' && !chatLoaded) || (activeTab === 'video' && !videoLoaded) || (activeTab === 'images' && !imageLoaded)) && (
        <div className="flex-1 flex flex-col min-h-0 sm:rounded-2xl sm:border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] overflow-hidden mx-0 sm:mx-4 md:mx-8 sm:mb-4" style={{ marginBottom: `calc(54px + max(env(safe-area-inset-bottom, 0px), var(--sab-floor, 0px)))` }}>
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 dark:from-blue-500/20 dark:to-cyan-500/20 flex items-center justify-center">
                {activeTab === 'chat' && <MessageSquare className="w-6 h-6 text-blue-400 animate-pulse" />}
                {activeTab === 'speech' && <AudioLines className="w-6 h-6 text-blue-400 animate-pulse" />}
                {activeTab === 'video' && <Video className="w-6 h-6 text-blue-400 animate-pulse" />}
                {activeTab === 'images' && <ImageIcon className="w-6 h-6 text-blue-400 animate-pulse" />}
              </div>
              <Loader2 className="absolute -top-1 -right-1 w-4 h-4 text-cyan-400 animate-spin" />
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-sm font-medium text-slate-500 dark:text-gray-400">Загрузка...</p>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-400/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat panel */}
      {chatLoaded && activeTab === 'chat' && (
        <div
          ref={chatPanelRef}
          className={`flex-1 flex flex-col min-h-0 sm:rounded-2xl sm:border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] overflow-hidden relative ${
            isFullscreen ? 'm-0' : 'mx-0 sm:mx-4 md:mx-8 sm:mb-4'
          }`}
          style={!isFullscreen ? { marginBottom: `calc(54px + max(env(safe-area-inset-bottom, 0px), var(--sab-floor, 0px)) + ${keyboardHeight}px)` } : undefined}
        >
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 pt-[max(8px,var(--sat))] sm:pt-3 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800/50 active:scale-90 transition-all"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Model selector */}
              <button
                onClick={() => setShowModelDropdown(!showModelDropdown)}
                className="flex items-center gap-2 px-3 py-2 sm:py-1.5 rounded-full bg-slate-100 dark:bg-[#1a1a2e] border border-slate-200/50 dark:border-gray-700/50 hover:border-blue-500/40 active:scale-95 transition-all"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-medium text-slate-700 dark:text-gray-200">{getModelDisplayName(selectedModel)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500" />
              </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => navigate('/support')}
                className="relative p-2.5 sm:p-2 rounded-xl sm:rounded-lg text-slate-400 dark:text-gray-500 hover:text-cyan-500 dark:hover:text-cyan-400 hover:bg-cyan-500/10 active:scale-90 transition-all"
                title="Техподдержка"
              >
                <Headphones className="w-4 h-4" />
                {supportUnread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold px-0.5 shadow-lg shadow-red-500/30 animate-pulse">
                    {supportUnread > 99 ? '99+' : supportUnread}
                  </span>
                )}
              </button>
              <button
                onClick={downloadChat}
                disabled={messages.length === 0}
                className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800/50 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Скачать чат"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={clearChat}
                disabled={messages.length === 0}
                className="p-2.5 sm:p-2 rounded-xl sm:rounded-lg text-slate-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                title="Очистить чат"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowChatSettings(!showChatSettings)}
                className={`p-2.5 sm:p-2 rounded-xl sm:rounded-lg active:scale-90 transition-all ${
                  showChatSettings ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800/50'
                }`}
                title="Настройки модели"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={toggleFullscreen}
                className={`hidden sm:inline-flex p-2 rounded-lg transition-colors ${
                  isFullscreen ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800/50'
                }`}
                title="На весь экран"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sidebar overlay + panel */}
          {showSidebar && (
            <div className="absolute inset-0 z-40 flex">
              <div
                className="absolute inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm"
                onClick={() => setShowSidebar(false)}
              />
              <div className="relative w-72 h-full bg-white dark:bg-[#0d0d20] border-r border-slate-200/60 dark:border-gray-800/60 flex flex-col animate-slide-in-left">
                {/* Sidebar header */}
                <div className="flex items-center gap-2 p-4 pt-[max(1rem,var(--sat))] border-b border-slate-200/40 dark:border-gray-800/40">
                  <button
                    onClick={() => { startNewChat(); setShowSidebar(false); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Новый чат
                  </button>
                  <button
                    onClick={() => {
                      const data = chatSessions.map(s => ({
                        id: s.id,
                        title: s.title,
                        createdAt: s.createdAt,
                        messages: s.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
                      }));
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `chats-export-${new Date().toISOString().slice(0, 10)}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="ml-auto p-2 rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800/50 transition-colors"
                    title="Экспорт чатов"
                  >
                    <Upload className="w-4 h-4" />
                  </button>
                </div>

                {/* Chat list */}
                <div className="flex-1 overflow-y-auto">
                  {chatSessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-4">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                      </div>
                      <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed">
                        Чатов пока нет. Начните новый, чтобы поговорить.
                      </p>
                    </div>
                  ) : (
                    <div className="py-2">
                      {chatSessions.map((session) => (
                        <div
                          key={session.id}
                          className={`group flex items-center gap-2 mx-2 px-3 py-3 rounded-xl cursor-pointer transition-all ${
                            activeChatId === session.id
                              ? 'bg-blue-600/15 border border-blue-500/20'
                              : 'hover:bg-slate-100/50 dark:hover:bg-gray-800/50 border border-transparent'
                          }`}
                          onClick={() => loadChat(session)}
                        >
                          <MessageSquare className="w-4 h-4 text-slate-400 dark:text-gray-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-700 dark:text-gray-200 truncate">{session.title}</p>
                            <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-0.5">
                              {session.messages.length} сообщ. &middot; {session.createdAt.toLocaleDateString('ru-RU')}
                            </p>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Settings panel */}
          {showChatSettings && (() => {
            const currentModelInfo = getModelInfo(selectedModel);
            const maxTemp = currentModelInfo?.maxTemperature ?? 2;
            const defaultTemp = currentModelInfo?.defaultTemperature ?? 0.7;
            return (
            <div className="shrink-0 border-b border-slate-200/40 dark:border-gray-800/40 bg-white dark:bg-[#0d0d20] px-4 py-4 animate-in max-h-[45vh] overflow-y-auto">
              <div className="max-w-3xl mx-auto space-y-4">
                <div>
                  <label className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2 block">Системный промпт</label>
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Задайте роль или контекст для модели..."
                    rows={2}
                    className="w-full bg-slate-100 dark:bg-[#12122a] border border-slate-300/50 dark:border-gray-700/50 rounded-xl px-3 py-2.5 text-sm text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/30 transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Temperature */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Температура</label>
                      <div className="flex items-center gap-2">
                        {temperature !== defaultTemp && (
                          <button
                            onClick={() => setTemperature(defaultTemp)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Сбросить
                          </button>
                        )}
                        <span className="text-xs font-mono text-blue-400">{temperature.toFixed(1)}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={maxTemp}
                      step="0.1"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                      <span>Точный</span>
                      {maxTemp <= 1 && <span className="text-amber-500/80">Макс. {maxTemp.toFixed(1)}</span>}
                      <span>Креативный</span>
                    </div>
                  </div>

                  {/* Max tokens */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Макс. токенов</label>
                      <div className="flex items-center gap-2">
                        {maxTokens !== 4096 && (
                          <button
                            onClick={() => setMaxTokens(4096)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Сбросить
                          </button>
                        )}
                        <span className="text-xs font-mono text-blue-400">{maxTokens.toLocaleString('ru-RU')}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="256"
                      max="16384"
                      step="256"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                      <span>256</span>
                      <span>16 384</span>
                    </div>
                  </div>

                  {/* Top P */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Top P</label>
                      <div className="flex items-center gap-2">
                        {topP !== 1 && (
                          <button
                            onClick={() => setTopP(1)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Сбросить
                          </button>
                        )}
                        <span className="text-xs font-mono text-blue-400">{topP.toFixed(2)}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={topP}
                      onChange={(e) => setTopP(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                      <span>Узкий выбор</span>
                      <span>Все варианты</span>
                    </div>
                  </div>

                  {/* Frequency penalty */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Штраф за повторы</label>
                      <div className="flex items-center gap-2">
                        {frequencyPenalty !== 0 && (
                          <button
                            onClick={() => setFrequencyPenalty(0)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Сбросить
                          </button>
                        )}
                        <span className="text-xs font-mono text-blue-400">{frequencyPenalty.toFixed(1)}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={frequencyPenalty}
                      onChange={(e) => setFrequencyPenalty(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                      <span>Повторять</span>
                      <span>Разнообразить</span>
                    </div>
                  </div>

                  {/* Presence penalty */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] text-slate-400 dark:text-gray-500 uppercase tracking-wider">Штраф за тему</label>
                      <div className="flex items-center gap-2">
                        {presencePenalty !== 0 && (
                          <button
                            onClick={() => setPresencePenalty(0)}
                            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Сбросить
                          </button>
                        )}
                        <span className="text-xs font-mono text-blue-400">{presencePenalty.toFixed(1)}</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={presencePenalty}
                      onChange={(e) => setPresencePenalty(parseFloat(e.target.value))}
                      className="w-full accent-blue-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 dark:text-gray-600 mt-1">
                      <span>Одна тема</span>
                      <span>Новые темы</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Messages area */}
          <div
            className={`flex-1 overflow-y-auto relative ${isDragging ? 'ring-2 ring-inset ring-blue-500/40 bg-blue-500/5' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            {isDragging && (
              <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/90 dark:bg-gray-900/90 border-2 border-dashed border-blue-500/50 shadow-xl backdrop-blur-sm">
                  <Upload className="w-5 h-5 text-blue-400" />
                  <span className="text-sm font-medium text-blue-500">Перетащите изображение сюда</span>
                </div>
              </div>
            )}
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
              {messages.filter(m => m.role !== 'system').length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-14 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-5 animate-pulse-glow">
                    <MessageSquare className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-1.5 sm:mb-2">Чем я могу помочь?</h2>
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 mb-5 sm:mb-8">Задайте вопрос, напишите текст или попросите помощь с любой задачей</p>



                  {(() => {
                    const modelInfo = getModelInfo(selectedModel);
                    if (modelInfo) {
                      return (
                        <div className="max-w-xs w-full relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-gray-800/50 bg-white dark:bg-[#0d0d20] mb-4 shadow-md shadow-slate-900/5 dark:shadow-black/20">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10 pointer-events-none" />
                          <div className="relative px-3 sm:px-4 pt-3 sm:pt-3.5 pb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                                <span className="text-white">
                                  <ProviderIcon provider={modelInfo.provider} size={18} />
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{modelInfo.name}</p>
                                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5 capitalize">{modelInfo.provider}</p>
                              </div>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 leading-relaxed mt-2 line-clamp-2">{modelInfo.description}</p>
                          </div>
                          <div className="relative grid grid-cols-3 gap-px bg-slate-100/80 dark:bg-gray-800/40 border-t border-slate-100 dark:border-gray-800/60">
                            <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Контекст</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5 truncate max-w-full px-2">{modelInfo.context}</span>
                            </div>
                            <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Ввод</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{modelInfo.inputPrice} &#8381;</span>
                            </div>
                            <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Вывод</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{modelInfo.outputPrice} &#8381;</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="grid grid-cols-2 gap-2 w-full max-w-sm mt-2">
                    {[
                      { icon: 'lightbulb', text: 'Объясни простыми словами', prompt: 'Объясни простыми словами, как работает ' },
                      { icon: 'code', text: 'Помоги с кодом', prompt: 'Помоги написать код для ' },
                      { icon: 'penline', text: 'Напиши текст', prompt: 'Напиши текст на тему ' },
                      { icon: 'languages', text: 'Переведи', prompt: 'Переведи на английский: ' },
                    ].map((item) => (
                      <button
                        key={item.text}
                        onClick={() => { setInput(item.prompt); setTimeout(() => textareaRef.current?.focus(), 50); }}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-gray-800/50 bg-white dark:bg-[#12122a] hover:border-blue-500/30 hover:bg-blue-50/50 dark:hover:bg-blue-500/5 transition-all text-left group/q"
                      >
                        {item.icon === 'lightbulb' && <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />}
                        {item.icon === 'code' && <Code className="w-4 h-4 text-emerald-400 shrink-0" />}
                        {item.icon === 'penline' && <PenLine className="w-4 h-4 text-blue-400 shrink-0" />}
                        {item.icon === 'languages' && <Languages className="w-4 h-4 text-sky-400 shrink-0" />}
                        <span className="text-xs text-slate-600 dark:text-gray-400 group-hover/q:text-slate-800 dark:group-hover/q:text-gray-200 transition-colors">{item.text}</span>
                      </button>
                    ))}
                  </div>

                </div>
              )}

              {/* Messages */}
              <div className="space-y-6">
                {messages.map((msg, msgIdx) => (
                  <div key={msg.id}>
                    {msg.role === 'system' && (
                      <div className="flex justify-center animate-sys-toast">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-[#12122a] border border-slate-200/40 dark:border-gray-800/40">
                          <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-slate-500 dark:text-gray-400">{msg.content}</span>
                        </div>
                      </div>
                    )}

                    {msg.role === 'user' && (
                      <div className="flex justify-end animate-msg-user">
                        <div className="max-w-[85%] md:max-w-lg group/msg">
                          {msg.attachedImage && (
                            <div className="mb-2 rounded-2xl overflow-hidden max-w-[220px] ml-auto shadow-lg shadow-black/10 dark:shadow-black/30">
                              <img src={msg.attachedImage} alt="" className="w-full h-auto" />
                            </div>
                          )}
                          <div className="relative bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-600 dark:to-blue-800 rounded-2xl rounded-br-sm px-4 py-3 shadow-md shadow-blue-900/10 dark:shadow-blue-900/30">
                            <p className="text-sm text-white whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                          </div>
                          <div className="flex justify-end items-center gap-2 mt-1.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-1 rounded-md text-slate-400 dark:text-gray-600 hover:text-slate-600 dark:hover:text-gray-400 transition-colors"
                              title="Копировать"
                            >
                              {copiedId === msg.id ? <Check className="w-3 h-3 text-blue-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <span className="text-[10px] text-slate-400 dark:text-gray-600">{formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.role === 'assistant' && (
                      <div className="flex justify-start gap-3 animate-msg-in">
                        <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mt-0.5 shadow-md shadow-blue-500/20">
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                        <div className="max-w-[85%] md:max-w-2xl space-y-3 group/msg min-w-0">
                          <div className="bg-slate-50 dark:bg-[#14142b] border border-slate-200/50 dark:border-gray-800/40 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                            <MessageContent content={msg.content} />
                          </div>
                          {msg.imageUrl && (
                            <div className="rounded-2xl overflow-hidden bg-slate-200/30 dark:bg-gray-800/30 border border-slate-200/60 dark:border-gray-800/60 max-w-xs shadow-lg shadow-black/5 dark:shadow-black/20">
                              <img
                                src={msg.imageUrl}
                                alt="Сгенерировано"
                                className="w-full h-auto cursor-zoom-in hover:brightness-105 transition-all"
                                onClick={() => setViewerImage(msg.imageUrl!)}
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => copyToClipboard(msg.content, msg.id)}
                              className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/60 dark:hover:bg-gray-800/60 transition-colors"
                              title="Копировать"
                            >
                              {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-blue-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            {msg.imageUrl && (
                              <>
                                <button
                                  onClick={() => {
                                    setAttachedImage(msg.imageUrl!);
                                    setTimeout(() => textareaRef.current?.focus(), 100);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                                  title="Редактировать"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => downloadFile(msg.imageUrl!, `terra-${msg.id}.png`)}
                                  className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/60 dark:hover:bg-gray-800/60 transition-colors"
                                  title="Скачать"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {msgIdx === messages.length - 1 && (
                              <button
                                onClick={regenerateLastResponse}
                                disabled={isLoading}
                                className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/60 dark:hover:bg-gray-800/60 transition-colors disabled:opacity-30"
                                title="Сгенерировать заново"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span className="text-[10px] text-slate-400 dark:text-gray-600 ml-1">{formatTime(msg.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {msg.role === 'error' && (
                      <div className="flex justify-start gap-3 animate-msg-in">
                        <div className="shrink-0 w-8 h-8 rounded-xl bg-red-500/15 border border-red-500/20 flex items-center justify-center mt-0.5">
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        </div>
                        <div className="max-w-sm">
                          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 dark:border-red-500/20">
                            <p className="text-sm text-red-600 dark:text-red-300 leading-relaxed">{msg.content}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={regenerateLastResponse}
                              disabled={isLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 bg-slate-100/60 dark:bg-gray-800/40 hover:bg-slate-200/60 dark:hover:bg-gray-800/60 border border-slate-200/50 dark:border-gray-700/30 transition-all disabled:opacity-30"
                            >
                              <RefreshCw className="w-3 h-3" />
                              Попробовать снова
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start gap-3 animate-msg-in">
                    <div className="shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mt-0.5 shadow-md shadow-blue-500/20 animate-pulse-glow">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-slate-50 dark:bg-[#14142b] border border-slate-200/50 dark:border-gray-800/40 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-blue-500 typing-dot" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 rounded-full bg-blue-400 typing-dot" style={{ animationDelay: '200ms' }} />
                            <div className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" style={{ animationDelay: '400ms' }} />
                          </div>
                          <span className="text-xs text-slate-400 dark:text-gray-500">Генерирую ответ...</span>
                        </div>
                      </div>
                      <button
                        onClick={handleStop}
                        className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-gray-800/60 border border-slate-200/60 dark:border-gray-700/40 text-slate-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 transition-all text-xs font-medium"
                      >
                        <Square className="w-3 h-3 fill-current" />
                        Остановить
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pb-2" ref={chatEndRef} />
            </div>
          </div>

          {uploadError && (
            <div className="shrink-0 px-4 py-2 border-t border-red-500/20 bg-red-500/5">
              <div className="max-w-3xl mx-auto flex items-center gap-2 text-sm text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
                <button onClick={() => setUploadError(null)} className="ml-auto p-0.5 hover:bg-red-500/10 rounded"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          )}

          {/* Attached image preview */}
          {attachedImage && (
            <div className="shrink-0 border-t border-slate-200/40 dark:border-gray-800/40 bg-white dark:bg-[#0d0d20] px-4 py-2">
              <div className="max-w-3xl mx-auto flex items-center gap-3">
                <div className="relative">
                  <img src={attachedImage} alt="" className="w-12 h-12 object-cover rounded-lg border border-slate-300/40 dark:border-gray-700/40" />
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-200 dark:bg-gray-800 border border-slate-300 dark:border-gray-700 flex items-center justify-center hover:bg-red-500/20 hover:border-red-500/40 transition-colors"
                  >
                    <X className="w-3 h-3 text-slate-500 dark:text-gray-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-400 dark:text-gray-500">Изображение прикреплено</p>
              </div>
            </div>
          )}

          {/* Input bar */}
          <div className="shrink-0 px-3 sm:px-4 py-2 sm:py-4 border-t border-slate-200/40 dark:border-gray-800/40">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end gap-2 bg-slate-100 dark:bg-[#12122a] border border-slate-300/50 dark:border-gray-700/50 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30 transition-all">
                <button
                  onClick={() => { setLibraryContext('chat'); setLibraryOpen(true); }}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-blue-400 transition-colors"
                  title="Прикрепить файл"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setTemplatesTab('chat'); setTemplatesOpen(true); }}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                  title="Шаблоны промптов"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => { chatSlash.slashHandleChange(e); autoResize(); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Введите запрос..."
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 resize-none focus:outline-none py-1"
                  style={{ minHeight: '24px', maxHeight: '200px' }}
                />
                {isLoading ? (
                  <button
                    onClick={handleStop}
                    className="shrink-0 p-2.5 sm:p-2 rounded-xl bg-red-500/80 text-white hover:bg-red-500 active:scale-90 transition-all shadow-lg shadow-red-500/20"
                    title="Остановить генерацию"
                  >
                    <StopCircle className="w-4 h-4" />
                  </button>
                ) : input.trim() || attachedImage ? (
                  <button
                    onClick={handleSend}
                    className="shrink-0 p-2.5 sm:p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-500 active:scale-90 transition-all shadow-lg shadow-blue-600/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`shrink-0 p-1.5 rounded-lg transition-all ${
                      isRecording
                        ? 'text-red-400 bg-red-500/15 animate-pulse hover:bg-red-500/25'
                        : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'
                    }`}
                    title={isRecording ? 'Остановить запись' : 'Голосовой ввод'}
                  >
                    {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-5 h-5" />}
                  </button>
                )}
              </div>
              {/* Balance counter — realtime */}
              <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-1.5">
                  <Wallet className={`w-3.5 h-3.5 transition-colors duration-300 ${balanceFlash ? 'text-red-400' : balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-600'}`} />
                  <span className={`text-[11px] font-medium tabular-nums transition-colors duration-300 ${balanceFlash ? 'text-red-400' : balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-500'}`}>
                    {balance !== null ? `${balance.toFixed(2)} ₽` : '...'}
                  </span>
                  {balanceFlash && prevBalance !== null && balance !== null && (
                    <span className="text-[10px] font-medium text-red-400 animate-fade-out">
                      -{(prevBalance - balance).toFixed(2)} ₽
                    </span>
                  )}
                  {!balanceFlash && balance !== null && balance < 10 && (
                    <span className="text-[10px] text-amber-400/70 ml-1">-- пополните баланс</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 dark:text-gray-600">обновляется в реальном времени</span>
              </div>
            </div>
          </div>

          <ModelSelector
            isOpen={showModelDropdown}
            onClose={() => setShowModelDropdown(false)}
            selectedModel={selectedModel}
            onSelect={(modelId) => {
              if (modelId !== selectedModel) {
                const info = getModelInfo(modelId);
                const name = info ? info.name : getModelDisplayName(modelId);
                const sysId = crypto.randomUUID();
                setMessages(prev => [...prev, {
                  id: sysId,
                  role: 'system' as const,
                  content: `Модель переключена на ${name}`,
                  timestamp: new Date(),
                }]);
                setTimeout(() => setMessages(prev => prev.filter(m => m.id !== sysId)), 2000);
                if (info) {
                  setTemperature(info.defaultTemperature);
                }
              }
              setSelectedModel(modelId);
            }}
          />
        </div>
      )}

      {/* Speech tab */}
      {ttsLoaded && activeTab === 'speech' && (
        <div className="flex-1 flex flex-col min-h-0 sm:rounded-2xl sm:border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] overflow-hidden relative mx-0 sm:mx-4 md:mx-8 sm:mb-4" style={{ marginBottom: `calc(54px + max(env(safe-area-inset-bottom, 0px), var(--sab-floor, 0px)) + ${keyboardHeight}px)` }}>
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 pt-[max(8px,var(--sat))] sm:pt-3 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setShowTTSModelDropdown(!showTTSModelDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-200 dark:bg-[#1a1a2e] border border-slate-300/50 dark:border-gray-700/50 hover:border-blue-500/40 transition-all min-w-0"
              >
                <AudioLines className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">{getTTSModelDisplayName(selectedTTSModel)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500 shrink-0" />
              </button>
              {getTTSModelInfo(selectedTTSModel)?.supportsVoiceClone ? (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-orange-400">
                  <Mic className="w-3 h-3" />
                  <span>{ttsRefFileName ? ttsRefFileName : 'Клон голоса'}</span>
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                  <span>голос:</span>
                  <span className="text-slate-600 dark:text-gray-300">{voiceLabel(selectedTTSVoice)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => setActiveTab('stt')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-200 dark:bg-[#1a1a2e] border border-slate-300/50 dark:border-gray-700/50 hover:border-blue-500/40 transition-all"
              title="Расшифровка речи"
            >
              <FileAudio className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-slate-700 dark:text-gray-200 hidden sm:inline">Расшифровка</span>
            </button>
          </div>

          {/* Content area - Chat history */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
              {ttsHistory.length === 0 && !ttsLoading && !ttsError ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-14 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-5 animate-pulse-glow">
                    <AudioLines className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-1.5 sm:mb-2">Генератор речи</h2>
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 mb-5 sm:mb-8">Введите текст и получите озвучку с помощью ИИ</p>

                  {(() => {
                    const ttsInfo = getTTSModelInfo(selectedTTSModel);
                    if (!ttsInfo) return null;
                    return (
                      <div className="max-w-xs w-full relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-gray-800/50 bg-white dark:bg-[#0d0d20] mb-4 shadow-md shadow-slate-900/5 dark:shadow-black/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-violet-500/5 dark:from-blue-500/10 dark:to-violet-500/10 pointer-events-none" />
                        <div className="relative px-3 sm:px-4 pt-3 sm:pt-3.5 pb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                              <AudioLines className="w-[18px] h-[18px] text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{ttsInfo.name}</p>
                              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5">{ttsInfo.supportsVoiceClone ? 'Клон голоса' : `${ttsInfo.voices.length} голосов`}</p>
                            </div>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 leading-relaxed mt-2 line-clamp-2">{ttsInfo.description}</p>
                        </div>
                        <div className="relative grid grid-cols-3 gap-px bg-slate-100/80 dark:bg-gray-800/40 border-t border-slate-100 dark:border-gray-800/60">
                          <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">{ttsInfo.supportsVoiceClone ? 'Тип' : 'Голос'}</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5 truncate max-w-full px-2">{ttsInfo.supportsVoiceClone ? 'Клон' : voiceLabel(selectedTTSVoice)}</span>
                          </div>
                          <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">{ttsInfo.supportsVoiceClone ? 'Формат' : 'Голоса'}</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{ttsInfo.supportsVoiceClone ? 'MP3' : ttsInfo.voices.length}</span>
                          </div>
                          <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Цена</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{ttsInfo.pricePerMil.toLocaleString('ru-RU')} &#8381;</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {ttsHistory.map((entry) => (
                    <div key={entry.id} className="group bg-gradient-to-br from-slate-50 dark:from-[#12122a] to-white dark:to-[#0d0d20] border border-slate-200/40 dark:border-gray-800/40 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                      {/* User text bubble */}
                      <div className="relative mb-3">
                        {ttsEditingId === entry.id ? (
                          <textarea
                            autoFocus
                            value={entry.text}
                            onChange={(e) => setTtsHistory(prev => prev.map(h => h.id === entry.id ? { ...h, text: e.target.value } : h))}
                            className="w-full text-xs text-slate-500 dark:text-gray-400 bg-slate-100/60 dark:bg-[#0a0a1a]/60 border border-blue-400/40 rounded-xl p-3 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-blue-500/50 min-h-[60px]"
                            rows={Math.max(3, entry.text.split('\n').length)}
                          />
                        ) : (
                          <div className="text-xs text-slate-500 dark:text-gray-400 bg-slate-100/60 dark:bg-[#0a0a1a]/60 rounded-xl p-3 max-h-24 overflow-y-auto leading-relaxed select-text cursor-text">
                            {entry.text}
                          </div>
                        )}
                      </div>
                      {/* Audio controls */}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => playTTSEntry(entry)}
                          disabled={ttsRegeneratingId === entry.id}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center justify-center shadow-lg shadow-blue-600/30 shrink-0"
                        >
                          {ttsRegeneratingId === entry.id ? (
                            <Loader className="w-4 h-4 sm:w-5 sm:h-5 text-white animate-spin" />
                          ) : ttsPlayingId === entry.id ? (
                            <Pause className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          ) : (
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white ml-0.5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-gray-100">{getTTSModelDisplayName(entry.model)}</p>
                          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5 truncate">
                            {voiceLabel(entry.voice)} · {entry.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {ttsEditingId === entry.id ? (
                            <>
                              <button
                                onClick={async () => {
                                  setTtsEditingId(null);
                                  if (!entry.text.trim()) return;
                                  setTtsRegeneratingId(entry.id);
                                  try {
                                    const session = await getFreshSession();
                                    if (!session) { setTtsError('Необходима авторизация'); return; }
                                    const res = await fetch(
                                      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
                                      {
                                        method: 'POST',
                                        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ text: entry.text.trim(), model: entry.model, voice: entry.voice }),
                                      }
                                    );
                                    if (!res.ok) { const err = await res.json().catch(() => null); setTtsError(err?.error || `Ошибка ${res.status}`); return; }
                                    const blob = await res.blob();
                                    if (blob.size === 0) { setTtsError('Сервер вернул пустой ответ'); return; }
                                    const localUrl = URL.createObjectURL(blob);
                                    setTtsHistory(prev => prev.map(h => h.id === entry.id ? { ...h, url: localUrl, timestamp: new Date() } : h));
                                    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; setTtsPlayingId(null); }
                                    const audio = new Audio(localUrl);
                                    ttsAudioRef.current = audio;
                                    audio.onended = () => setTtsPlayingId(null);
                                    try { await audio.play(); setTtsPlayingId(entry.id); } catch {}
                                    dbDeleteTTS(entry.id);
                                    saveTTSEntry({ text: entry.text.trim(), model: entry.model, voice: entry.voice, audioBlob: blob }).then((dbEntry) => {
                                      if (dbEntry) setTtsHistory(prev => prev.map(e => e.id === entry.id ? { ...e, id: dbEntry.id, url: dbEntry.audio_url } : e));
                                    });
                                  } catch (e) {
                                    setTtsError((e as Error).message || 'Ошибка перегенерации');
                                  } finally {
                                    setTtsRegeneratingId(null);
                                  }
                                }}
                                disabled={ttsRegeneratingId === entry.id}
                                className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-500 hover:bg-teal-500/20 disabled:opacity-50 transition-colors"
                                title="Перегенерировать"
                              >
                                <RefreshCw className={`w-4 h-4 ${ttsRegeneratingId === entry.id ? 'animate-spin' : ''}`} />
                              </button>
                              <button
                                onClick={() => setTtsEditingId(null)}
                                className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1a1a2e] border border-slate-300/30 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
                                title="Отмена"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setTtsEditingId(entry.id)}
                                className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1a1a2e] border border-slate-300/30 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 hover:text-blue-400 transition-colors"
                                title="Редактировать и перегенерировать"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => downloadTTSEntry(entry.url)}
                                className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1a1a2e] border border-slate-300/30 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 hover:text-blue-400 transition-colors"
                                title="Скачать"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm({ type: 'tts', id: entry.id })}
                                className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1a1a2e] border border-slate-300/30 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 hover:text-red-400 transition-colors"
                                title="Удалить"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {ttsLoading && (
                    <div className="group relative rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.07] via-cyan-500/[0.04] to-transparent shadow-lg shadow-blue-500/[0.05] overflow-hidden transition-all duration-500">
                      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.08] to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />
                      </div>
                      <div className="relative flex items-center gap-3.5 py-4 px-4">
                        <div className="relative w-11 h-11 rounded-xl bg-blue-600/10 border border-blue-500/25 flex items-center justify-center shrink-0">
                          <div className="absolute inset-0 rounded-xl bg-blue-400/20 animate-ping opacity-30" />
                          <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-gray-200">Генерация аудио...</p>
                          <div className="mt-2.5 h-1 rounded-full bg-blue-500/10 overflow-hidden">
                            <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500/60 to-cyan-400/60 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {ttsError && (
                    <div className="relative rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-500/5 via-red-500/[0.02] to-transparent overflow-hidden transition-all duration-500">
                      <div className="relative flex items-center gap-3.5 py-4 px-4">
                        <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-400">{ttsError}</p>
                        </div>
                        <button
                          onClick={() => setTtsError(null)}
                          className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pb-2" ref={ttsHistoryEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input bar */}
          <div className="shrink-0 px-3 sm:px-4 py-2 sm:py-4 border-t border-slate-200/40 dark:border-gray-800/40">
            <div className="max-w-3xl mx-auto">
              {/* Voice clone reference upload */}
              {getTTSModelInfo(selectedTTSModel)?.supportsVoiceClone && (
                <div className="mb-2.5">
                  <input
                    ref={ttsRefAudioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        setTtsError('Файл слишком большой (максимум 10 МБ)');
                        return;
                      }
                      const needsConversion = !file.type.includes('wav') && !file.type.includes('mpeg') && !file.type.includes('mp3');
                      if (needsConversion) {
                        try {
                          const wavBlob = await convertBlobToWav(file);
                          setTtsRefFileName(file.name.replace(/\.[^.]+$/, '.wav'));
                          const reader = new FileReader();
                          reader.onload = () => setTtsRefAudioBase64(reader.result as string);
                          reader.readAsDataURL(wavBlob);
                        } catch {
                          setTtsRefFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = () => setTtsRefAudioBase64(reader.result as string);
                          reader.readAsDataURL(file);
                        }
                      } else {
                        setTtsRefFileName(file.name);
                        const reader = new FileReader();
                        reader.onload = () => setTtsRefAudioBase64(reader.result as string);
                        reader.readAsDataURL(file);
                      }
                      e.target.value = '';
                    }}
                  />
                  {ttsRecording ? (
                    <button
                      onClick={stopTtsRecording}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-red-500/40 bg-red-500/10 hover:bg-red-500/15 transition-all group animate-pulse"
                    >
                      <div className="w-9 h-9 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                        <Square className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-medium text-red-300">Идёт запись...</p>
                        <p className="text-[11px] text-red-400/70 mt-0.5 tabular-nums">{Math.floor(ttsRecordingTime / 60).toString().padStart(2, '0')}:{(ttsRecordingTime % 60).toString().padStart(2, '0')}</p>
                      </div>
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                    </button>
                  ) : !ttsRefAudioBase64 ? (
                    <div className="flex gap-1.5">
                      <button
                        onClick={startTtsRecording}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-orange-500/30 hover:border-orange-500/50 bg-orange-500/5 hover:bg-orange-500/10 transition-all group"
                      >
                        <Mic className="w-3.5 h-3.5 text-orange-400" />
                        <span className="text-[10px] font-medium text-slate-700 dark:text-gray-200">Записать</span>
                      </button>
                      <button
                        onClick={() => { setLibraryContext('tts-ref'); setLibraryOpen(true); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-dashed border-slate-300/40 dark:border-gray-700/40 hover:border-orange-500/40 bg-slate-500/5 hover:bg-orange-500/5 transition-all group"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 group-hover:text-orange-400 transition-colors" />
                        <span className="text-[10px] font-medium text-slate-700 dark:text-gray-200">Файл</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <button
                          onClick={() => {
                            if (ttsRefPlaying && ttsRefPreviewRef.current) {
                              ttsRefPreviewRef.current.pause();
                              ttsRefPreviewRef.current.currentTime = 0;
                              setTtsRefPlaying(false);
                            } else if (ttsRefAudioBase64) {
                              const audio = new Audio(ttsRefAudioBase64);
                              ttsRefPreviewRef.current = audio;
                              audio.onended = () => setTtsRefPlaying(false);
                              audio.play();
                              setTtsRefPlaying(true);
                            }
                          }}
                          className="w-7 h-7 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 flex items-center justify-center shrink-0 transition-colors"
                          title={ttsRefPlaying ? 'Остановить' : 'Прослушать'}
                        >
                          {ttsRefPlaying ? (
                            <Square className="w-3 h-3 text-orange-400 fill-orange-400" />
                          ) : (
                            <Play className="w-3 h-3 text-orange-400 fill-orange-400 ml-0.5" />
                          )}
                        </button>
                        <span className="text-xs text-slate-700 dark:text-gray-200 font-medium truncate flex-1">{ttsRefFileName}</span>
                        <button
                          onClick={() => { setLibraryContext('tts-ref'); setLibraryOpen(true); }}
                          className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors shrink-0"
                        >
                          Заменить
                        </button>
                        <button
                          onClick={() => {
                            if (ttsRefPreviewRef.current) { ttsRefPreviewRef.current.pause(); ttsRefPreviewRef.current = null; }
                            setTtsRefPlaying(false); setTtsRefAudioBase64(null); setTtsRefFileName(null); setTtsRefTranscript('');
                          }}
                          className="p-1 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors shrink-0"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <input
                        type="text"
                        value={ttsRefTranscript}
                        onChange={(e) => setTtsRefTranscript(e.target.value)}
                        placeholder="Расшифровка образца (необязательно, но улучшает качество)"
                        className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-[#12122a] border border-slate-300/40 dark:border-gray-700/40 text-xs text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                      />
                    </div>
                  )}
                </div>
              )}
              <div className="flex items-end gap-2 bg-slate-100 dark:bg-[#12122a] border border-slate-300/50 dark:border-gray-700/50 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30 transition-all">
                <textarea
                  ref={ttsTextareaRef}
                  value={ttsText}
                  onChange={(e) => {
                    setTtsText(e.target.value);
                    const el = e.target;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTTSGenerate();
                    }
                  }}
                  placeholder={getTTSModelInfo(selectedTTSModel)?.supportsVoiceClone ? 'Введите текст для озвучки клонированным голосом...' : 'Введите текст для озвучки...'}
                  rows={1}
                  className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 resize-none focus:outline-none py-1"
                  style={{ minHeight: '24px', maxHeight: '200px' }}
                />
                <button
                  onClick={handleTTSGenerate}
                  disabled={!ttsText.trim() || ttsLoading || ttsText.length > 4096 || (getTTSModelInfo(selectedTTSModel)?.supportsVoiceClone && !ttsRefAudioBase64)}
                  className={`shrink-0 p-2 rounded-xl transition-all ${
                    ttsText.trim() && !ttsLoading && ttsText.length <= 4096 && !(getTTSModelInfo(selectedTTSModel)?.supportsVoiceClone && !ttsRefAudioBase64)
                      ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95'
                      : 'bg-slate-200 dark:bg-gray-800 text-slate-400 dark:text-gray-600 cursor-not-allowed'
                  }`}
                  title="Озвучить"
                >
                  {ttsLoading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className={`w-3.5 h-3.5 transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-600'}`} />
                    <span className={`text-[11px] font-medium tabular-nums transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-500'}`}>
                      {balance !== null ? `${balance.toFixed(2)} ₽` : '...'}
                    </span>
                  </div>
                  {ttsText.length > 0 && (() => {
                    const info = getTTSModelInfo(selectedTTSModel);
                    if (!info) return null;
                    const cost = (ttsText.length / 1_000_000) * info.pricePerMil;
                    const formatted = cost < 0.01 ? '< 0.01' : cost.toFixed(2);
                    return (
                      <>
                        <span className="text-slate-300 dark:text-gray-700">|</span>
                        <span className="text-[11px] tabular-nums text-blue-400 font-medium">
                          -{formatted} ₽
                        </span>
                      </>
                    );
                  })()}
                  {balance !== null && balance < 10 && (
                    <span className="text-[10px] text-amber-400/70">-- пополните баланс</span>
                  )}
                </div>
                <span className={`text-[10px] tabular-nums ${ttsText.length > 4096 ? 'text-red-400' : 'text-slate-400 dark:text-gray-600'}`}>
                  {ttsText.length.toLocaleString('ru-RU')} / 4 096 симв.
                </span>
              </div>
            </div>
          </div>
          <TTSModelSelector
            isOpen={showTTSModelDropdown}
            onClose={() => setShowTTSModelDropdown(false)}
            selectedModel={selectedTTSModel}
            selectedVoice={selectedTTSVoice}
            onSelectModel={(model: string) => {
              setSelectedTTSModel(model);
              const info = getTTSModelInfo(model);
              if (info && !info.supportsVoiceClone && info.voices.length > 0 && !info.voices.includes(selectedTTSVoice)) {
                setSelectedTTSVoice(info.voices[0]);
              }
            }}
            onSelectVoice={setSelectedTTSVoice}
          />
        </div>
      )}

      {/* STT tab */}
      {chatLoaded && activeTab === 'stt' && (
        <div className="flex-1 flex flex-col min-h-0 sm:rounded-2xl sm:border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] overflow-hidden relative mx-0 sm:mx-4 md:mx-8 sm:mb-4" style={{ marginBottom: `calc(54px + max(env(safe-area-inset-bottom, 0px), var(--sab-floor, 0px)) + ${keyboardHeight}px)` }}>
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 pt-[max(8px,var(--sat))] sm:pt-3 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setActiveTab('speech')}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors"
                title="Назад к генератору речи"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-gray-400" />
              </button>
              <button
                onClick={() => setShowSTTModelDropdown(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-200 dark:bg-[#1a1a2e] border border-slate-300/50 dark:border-gray-700/50 hover:border-teal-500/40 transition-all min-w-0"
              >
                <FileAudio className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">{STT_MODELS.find(m => m.id === sttModel)?.name || sttModel}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500 shrink-0" />
              </button>
              <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-gray-500 truncate">
                {STT_MODELS.find(m => m.id === sttModel)?.description}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-medium tabular-nums transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-500'}`}>
                {balance !== null ? `${balance.toFixed(2)} ₽` : ''}
              </span>
            </div>
          </div>

          {/* STT Model selector modal */}
          {showSTTModelDropdown && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowSTTModelDropdown(false)}>
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <div
                className="relative w-full max-w-2xl max-h-[80vh] m-0 sm:m-4 rounded-t-2xl sm:rounded-2xl bg-white dark:bg-[#0d0d20] border border-slate-200/60 dark:border-gray-800/60 shadow-2xl overflow-hidden flex flex-col"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-gray-800/60">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">Модель расшифровки</h3>
                  <button onClick={() => setShowSTTModelDropdown(false)} className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors">
                    <X className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {STT_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setSttModel(m.id); setShowSTTModelDropdown(false); }}
                        className={`text-left p-3.5 rounded-xl border transition-all ${
                          sttModel === m.id
                            ? 'border-teal-500/50 bg-teal-500/5 dark:bg-teal-500/10 ring-1 ring-teal-500/20'
                            : 'border-slate-200/60 dark:border-gray-800/60 hover:border-teal-500/30 bg-white dark:bg-gray-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-slate-800 dark:text-gray-100">{m.name}</span>
                          {sttModel === m.id && <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 leading-relaxed">{m.description}</p>
                        <div className="mt-1.5 text-[10px] text-slate-400 dark:text-gray-500">{m.pricePerSec} ₽/сек</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STT Content area */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
            {/* Upload / Record area */}
            <div className="rounded-xl border border-dashed border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-900/40 p-4 sm:p-6">
              <input
                ref={sttFileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 25 * 1024 * 1024) { setSttError('Максимальный размер файла 25 МБ'); return; }
                  setSttAudioFileName(file.name);
                  const reader = new FileReader();
                  reader.onload = () => setSttAudioBase64(reader.result as string);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />

              {!sttAudioBase64 && !sttRecording ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <FileAudio className="w-7 h-7 text-teal-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200">Загрузите аудио или запишите голос</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">Поддержка MP3, WAV, WebM, M4A до 25 МБ</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => sttFileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 dark:hover:bg-gray-700 text-sm font-medium text-slate-700 dark:text-gray-200 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Файл
                    </button>
                    <button
                      onClick={startSttRecording}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium transition-all"
                    >
                      <Mic className="w-4 h-4" />
                      Записать
                    </button>
                  </div>
                </div>
              ) : sttRecording ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center animate-pulse">
                    <Mic className="w-7 h-7 text-red-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-500">Запись: {Math.floor(sttRecordingTime / 60).toString().padStart(2, '0')}:{(sttRecordingTime % 60).toString().padStart(2, '0')}</p>
                  </div>
                  <button
                    onClick={stopSttRecording}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition-all"
                  >
                    <Square className="w-4 h-4" />
                    Остановить
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                      <FileAudio className="w-5 h-5 text-teal-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{sttAudioFileName}</p>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500">Готово к расшифровке</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setSttAudioBase64(null); setSttAudioFileName(null); setSttResult(null); }}
                      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 dark:text-gray-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSttTranscribe}
                      disabled={sttLoading}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
                    >
                      {sttLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      {sttLoading ? 'Расшифровка...' : 'Расшифровать'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {sttError && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {sttError}
              </div>
            )}

            {/* Result */}
            {sttResult && (
              <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-teal-500">Результат расшифровки</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(sttResult); setSttCopiedId('result'); setTimeout(() => setSttCopiedId(null), 2000); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-teal-500/10 text-xs text-teal-500 transition-colors"
                  >
                    {sttCopiedId === 'result' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {sttCopiedId === 'result' ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
                <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{sttResult}</p>
              </div>
            )}

            {/* History */}
            {sttHistory.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-slate-400 dark:text-gray-500 uppercase tracking-wider">История расшифровок</h3>
                  <button
                    onClick={() => { if (window.confirm('Очистить всю историю расшифровок?')) setSttHistory([]); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Очистить</span>
                  </button>
                </div>
                {sttHistory.map(entry => (
                  <div key={entry.id} className="rounded-xl border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-gray-900/30 p-3 sm:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-gray-500">
                        <span>{STT_MODELS.find(m => m.id === entry.model)?.name || entry.model}</span>
                        <span className="text-slate-300 dark:text-gray-700">|</span>
                        <span>{entry.duration > 0 ? `${Math.round(entry.duration)} сек` : ''}</span>
                        <span className="text-slate-300 dark:text-gray-700">|</span>
                        <span>{entry.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {sttEditingId === entry.id ? (
                          <button
                            onClick={() => setSttEditingId(null)}
                            className="p-1.5 rounded-lg bg-teal-500/10 text-teal-500 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setSttEditingId(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 dark:text-gray-500 transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => { navigator.clipboard.writeText(entry.text); setSttCopiedId(entry.id); setTimeout(() => setSttCopiedId(null), 2000); }}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 dark:text-gray-500 transition-colors"
                        >
                          {sttCopiedId === entry.id ? <Check className="w-3.5 h-3.5 text-teal-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setSttHistory(prev => prev.filter(e => e.id !== entry.id))}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {sttEditingId === entry.id ? (
                      <textarea
                        autoFocus
                        value={entry.text}
                        onChange={(e) => setSttHistory(prev => prev.map(h => h.id === entry.id ? { ...h, text: e.target.value } : h))}
                        className="w-full text-sm text-slate-700 dark:text-gray-200 leading-relaxed bg-slate-50 dark:bg-gray-800/50 border border-slate-200/60 dark:border-gray-700/50 rounded-lg p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500/50 min-h-[80px]"
                        rows={Math.max(3, entry.text.split('\n').length)}
                      />
                    ) : (
                      <p className="text-sm text-slate-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{entry.text}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video tab */}
      {videoLoaded && activeTab === 'video' && (
        <div className="flex-1 flex flex-col min-h-0 sm:rounded-2xl sm:border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] overflow-hidden relative mx-0 sm:mx-4 md:mx-8 sm:mb-4" style={{ marginBottom: `calc(54px + max(env(safe-area-inset-bottom, 0px), var(--sab-floor, 0px)) + ${keyboardHeight}px)` }}>
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 pt-[max(8px,var(--sat))] sm:pt-3 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setShowVideoModelDropdown(!showVideoModelDropdown)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-200 dark:bg-[#1a1a2e] border border-slate-300/50 dark:border-gray-700/50 hover:border-blue-500/40 transition-all min-w-0"
              >
                <Video className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">{getVideoModelDisplayName(selectedVideoModel)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500 shrink-0" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                <span>{selectedVideoDuration} сек</span>
                <span className="text-slate-300 dark:text-gray-700">·</span>
                <span>{selectedVideoAspectRatio}</span>
              </div>
            </div>
          </div>

          {/* Content area - Video history */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6">
              {videoHistory.length === 0 && activeVideoTasks.length === 0 && !videoError ? (
                <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-14 text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center mb-4 sm:mb-5 animate-pulse-glow">
                    <Video className="w-5 h-5 sm:w-7 sm:h-7 text-blue-400" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-1.5 sm:mb-2">Генератор видео</h2>
                  <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 mb-5 sm:mb-8">Опишите сцену и получите видео с помощью ИИ</p>

                  {(() => {
                    const videoInfo = getVideoModelInfo(selectedVideoModel);
                    if (!videoInfo) return null;
                    return (
                      <div className="max-w-xs w-full relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-gray-800/50 bg-white dark:bg-[#0d0d20] mb-4 shadow-md shadow-slate-900/5 dark:shadow-black/20">
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-orange-500/5 dark:from-rose-500/10 dark:to-orange-500/10 pointer-events-none" />
                        <div className="relative px-3 sm:px-4 pt-3 sm:pt-3.5 pb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-rose-500 to-orange-400 flex items-center justify-center shrink-0 shadow-md shadow-rose-500/20">
                              <Video className="w-[18px] h-[18px] text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{videoInfo.name}</p>
                              <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5 capitalize">{videoInfo.provider}</p>
                            </div>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 leading-relaxed mt-2 line-clamp-2">{videoInfo.description}</p>
                        </div>
                        <div className="relative grid grid-cols-3 gap-px bg-slate-100/80 dark:bg-gray-800/40 border-t border-slate-100 dark:border-gray-800/60">
                          <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Длит.</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{selectedVideoDuration} сек</span>
                          </div>
                          <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Провайдер</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{videoInfo.provider}</span>
                          </div>
                          <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                            <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Цена</span>
                            <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{videoInfo.pricePerSec} &#8381;/с</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {videoHistory.map((entry) => (
                    <div key={entry.id} className="group bg-gradient-to-br from-slate-50 dark:from-[#12122a] to-white dark:to-[#0d0d20] border border-slate-200/40 dark:border-gray-800/40 rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="relative mb-3">
                        <div className="text-xs text-slate-500 dark:text-gray-400 bg-slate-100/60 dark:bg-[#0a0a1a]/60 rounded-xl p-3 pr-9 leading-relaxed select-text cursor-text" style={{ maxHeight: expandedVideoPrompts.has(entry.id) ? 'none' : '5rem', overflow: expandedVideoPrompts.has(entry.id) ? 'visible' : 'hidden' }}>
                          {entry.prompt}
                        </div>
                        <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5">
                          <button
                            onClick={() => { navigator.clipboard.writeText(entry.prompt); setVideoCopiedPromptId(entry.id); setTimeout(() => setVideoCopiedPromptId(null), 2000); }}
                            className="p-1.5 rounded-lg bg-white/60 dark:bg-gray-800/60 hover:bg-white dark:hover:bg-gray-800 text-slate-400 dark:text-gray-500 hover:text-teal-500 transition-all"
                            title="Копировать промпт"
                          >
                            {videoCopiedPromptId === entry.id ? <Check className="w-3 h-3 text-teal-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {entry.prompt.length > 200 && (
                          <button
                            onClick={() => setExpandedVideoPrompts(prev => { const next = new Set(prev); if (next.has(entry.id)) next.delete(entry.id); else next.add(entry.id); return next; })}
                            className="mt-1 text-[11px] text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            {expandedVideoPrompts.has(entry.id) ? 'Свернуть' : 'Показать полностью'}
                          </button>
                        )}
                      </div>
                      <div className="rounded-xl overflow-hidden bg-black mb-3">
                        <video
                          src={entry.url}
                          controls
                          playsInline
                          className="w-full max-h-[360px] object-contain"
                          preload="metadata"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-gray-100">{getVideoModelDisplayName(entry.model)}</p>
                          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                            {entry.duration} сек · {entry.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadFile(entry.url, `video_${Date.now()}.mp4`)}
                            className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1a1a2e] border border-slate-300/30 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 hover:text-blue-400 transition-colors"
                            title="Скачать"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ type: 'video', id: entry.id })}
                            className="p-2 rounded-xl bg-slate-200/50 dark:bg-[#1a1a2e] border border-slate-300/30 dark:border-gray-700/30 text-slate-500 dark:text-gray-400 hover:text-red-400 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {activeVideoTasks.map(task => (
                    <div key={task.id} className={`group relative rounded-2xl border transition-all duration-500 overflow-hidden ${
                      task.status === 'failed'
                        ? 'border-red-500/25 bg-gradient-to-br from-red-500/5 via-red-500/[0.02] to-transparent'
                        : 'border-blue-500/20 bg-gradient-to-br from-blue-500/[0.07] via-cyan-500/[0.04] to-transparent shadow-lg shadow-blue-500/[0.05]'
                    }`}>
                      {task.status !== 'failed' && (
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/[0.08] to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />
                        </div>
                      )}
                      <div className="relative flex items-center gap-3.5 py-4 px-4">
                        <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          task.status === 'failed'
                            ? 'bg-red-500/10 border border-red-500/25'
                            : 'bg-blue-600/10 border border-blue-500/25'
                        }`}>
                          {task.status === 'failed' ? (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          ) : (
                            <>
                              <div className="absolute inset-0 rounded-xl bg-blue-400/20 animate-ping opacity-30" />
                              <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                            </>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${task.status === 'failed' ? 'text-red-400' : 'text-slate-700 dark:text-gray-200'}`}>
                            {task.status === 'failed' ? (task.error || 'Ошибка генерации') : task.status === 'submitting' ? 'Отправка запроса...' : 'Генерация видео...'}
                          </p>
                          <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate mt-1">{task.prompt}</p>
                          {task.status !== 'failed' && (
                            <div className="mt-2.5 h-1 rounded-full bg-blue-500/10 overflow-hidden">
                              <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-blue-500/60 to-cyan-400/60 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
                            </div>
                          )}
                        </div>
                        {task.status === 'failed' && (
                          <>
                            <button
                              onClick={() => {
                                setActiveVideoTasks(prev => prev.filter(t => t.id !== task.id));
                                setVideoPrompt(task.prompt);
                              }}
                              title="Вернуть промпт и повторить"
                              className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all active:scale-90"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setActiveVideoTasks(prev => prev.filter(t => t.id !== task.id))}
                              title="Закрыть"
                              className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}

                  {videoError && (
                    <div className="relative rounded-2xl border border-red-500/25 bg-gradient-to-br from-red-500/5 via-red-500/[0.02] to-transparent overflow-hidden transition-all duration-500">
                      <div className="relative flex items-center gap-3.5 py-4 px-4">
                        <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center shrink-0">
                          <AlertCircle className="w-5 h-5 text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-red-400">{videoError}</p>
                        </div>
                        <button
                          onClick={() => setVideoError(null)}
                          className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="pb-2" ref={videoHistoryEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Input bar */}
          <div className="shrink min-h-0 overflow-y-auto px-3 sm:px-4 py-2 sm:py-4 border-t border-slate-200/40 dark:border-gray-800/40">
            <div className="max-w-3xl mx-auto">
              <input
                ref={videoFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleVideoFileChange}
              />
              <input
                ref={videoAudioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!file.type.startsWith('audio/')) {
                    setVideoError('Необходимо выбрать аудиофайл');
                    return;
                  }
                  if (file.size > 20 * 1024 * 1024) {
                    setVideoError('Аудиофайл слишком большой (максимум 20 МБ)');
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    setVideoAudioFile(reader.result as string);
                    setVideoAudioName(file.name);
                  };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
              {/* Audio chip + negative prompt toggle */}
              {(videoAudioFile || videoAttachedImages.length > 0) && (
                <div className="mb-2 flex items-center gap-1.5">
                  {videoAudioFile && (
                    <div className="relative group flex items-center gap-1.5 bg-slate-100/80 dark:bg-[#12122a] border border-violet-500/30 rounded-lg px-1.5 py-1">
                      <button
                        onClick={() => {
                          if (videoAudioPlaying && videoAudioPreviewRef.current) {
                            videoAudioPreviewRef.current.pause();
                            videoAudioPreviewRef.current.currentTime = 0;
                            setVideoAudioPlaying(false);
                          } else if (videoAudioFile) {
                            const audio = new Audio(videoAudioFile);
                            videoAudioPreviewRef.current = audio;
                            audio.onended = () => setVideoAudioPlaying(false);
                            audio.play();
                            setVideoAudioPlaying(true);
                          }
                        }}
                        className="w-8 h-8 rounded bg-violet-500/10 ring-1 ring-violet-500/30 flex items-center justify-center shrink-0 hover:bg-violet-500/20 transition-colors"
                        title={videoAudioPlaying ? 'Остановить' : 'Прослушать'}
                      >
                        {videoAudioPlaying ? (
                          <Square className="w-3 h-3 text-violet-400 fill-violet-400" />
                        ) : (
                          <Play className="w-3 h-3 text-violet-400 fill-violet-400 ml-px" />
                        )}
                      </button>
                      <span className="text-[10px] font-medium text-violet-400 truncate max-w-[80px]">{videoAudioName || 'Аудио'}</span>
                      <button
                        onClick={() => { if (videoAudioPreviewRef.current) { videoAudioPreviewRef.current.pause(); videoAudioPreviewRef.current = null; } setVideoAudioPlaying(false); setVideoAudioFile(null); setVideoAudioName(null); }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-300 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-500 hover:text-white"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                  <div className="ml-auto shrink-0">
                    <button
                      onClick={() => setShowVideoNegativePrompt(prev => !prev)}
                      className={`p-1.5 rounded-lg transition-all ${
                        showVideoNegativePrompt
                          ? 'text-red-400 bg-red-500/10 ring-1 ring-red-400/30'
                          : videoNegativePrompt
                            ? 'text-red-400/60 bg-red-500/10'
                            : 'text-slate-400 dark:text-gray-600 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                      title={showVideoNegativePrompt ? 'Скрыть негатив-промпт' : 'Негатив-промпт'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
              {showVideoNegativePrompt && (
                <div className="mb-3 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-semibold text-red-400/80">Негативный промпт</span>
                    <span className="text-[9px] text-slate-400 dark:text-gray-600">Чего НЕ должно быть в видео</span>
                  </div>
                  <textarea
                    value={videoNegativePrompt}
                    onChange={(e) => setVideoNegativePrompt(e.target.value)}
                    placeholder="Размытие, мерцание, искажения лиц, дрожание камеры..."
                    rows={2}
                    className="w-full bg-slate-100 dark:bg-[#12122a] border border-red-400/20 dark:border-red-500/15 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-600 resize-none focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400/30 transition-all"
                    style={{ maxHeight: '100px' }}
                  />
                </div>
              )}

              <div className="bg-slate-100 dark:bg-[#12122a] border border-slate-300/50 dark:border-gray-700/50 rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30 transition-all">
                <VideoPromptInput
                  value={videoPrompt}
                  onChange={setVideoPrompt}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleVideoGenerate();
                    }
                  }}
                  placeholder={(() => {
                    const modelInfo = getVideoModelInfo(selectedVideoModel);
                    const parts: string[] = [];
                    if (modelInfo?.supportsFirstFrame) parts.push('кадры');
                    if (modelInfo?.supportsReferences) parts.push('референс');
                    if (parts.length > 0) return `Опишите видео... Можно прикрепить ${parts.join(' и ')}`;
                    return 'Опишите видео, которое хотите создать...';
                  })()}
                  images={videoAttachedImages}
                  onImagesChange={setVideoAttachedImages}
                  maxImages={(() => {
                    const mi = getVideoModelInfo(selectedVideoModel);
                    return (mi?.supportsFirstFrame ? 1 : 0) + (mi?.supportsLastFrame ? 1 : 0) + (mi?.supportsReferences ? (mi.maxReferences ?? 5) : 0);
                  })()}
                  supportsFirstFrame={!!getVideoModelInfo(selectedVideoModel)?.supportsFirstFrame}
                  supportsLastFrame={!!getVideoModelInfo(selectedVideoModel)?.supportsLastFrame}
                  supportsReferences={!!getVideoModelInfo(selectedVideoModel)?.supportsReferences}
                  supportsVideoRefs={!!getVideoModelInfo(selectedVideoModel)?.supportsVideoRefs}
                  supportsAudioRefs={!!getVideoModelInfo(selectedVideoModel)?.supportsAudio}
                  maxVideoRefs={getVideoModelInfo(selectedVideoModel)?.maxVideoRefs ?? 0}
                  maxAudioRefs={getVideoModelInfo(selectedVideoModel)?.maxAudioRefs ?? 0}
                  textareaRef={videoTextareaRef}
                  canAttachMore={!!(getVideoModelInfo(selectedVideoModel)?.supportsFirstFrame || getVideoModelInfo(selectedVideoModel)?.supportsLastFrame || getVideoModelInfo(selectedVideoModel)?.supportsReferences || getVideoModelInfo(selectedVideoModel)?.supportsVideoRefs)}
                  onAttachClick={() => {
                    const mi = getVideoModelInfo(selectedVideoModel);
                    const maxImgs = (mi?.supportsFirstFrame ? 1 : 0) + (mi?.supportsLastFrame ? 1 : 0) + (mi?.supportsReferences ? (mi.maxReferences ?? 5) : 0);
                    const remaining = maxImgs - videoAttachedImages.length;
                    if (remaining <= 0) return;
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = `image/*${mi?.supportsVideoRefs ? ',video/*' : ''}${mi?.supportsAudio ? ',audio/*' : ''}`;
                    input.multiple = true;
                    input.onchange = () => {
                      if (!input.files) return;
                      Array.from(input.files).forEach(file => {
                        if (file.size > 100 * 1024 * 1024) return;
                        let mt: 'image' | 'video' | 'audio' | null = null;
                        if (file.type.startsWith('image/')) mt = 'image';
                        else if (file.type.startsWith('video/') && mi?.supportsVideoRefs) mt = 'video';
                        else if (file.type.startsWith('audio/') && mi?.supportsAudio) mt = 'audio';
                        if (!mt) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const id = Math.random().toString(36).slice(2, 8);
                          const labels = { image: 'Изображение', video: 'Видео', audio: 'Аудио' };
                          setVideoAttachedImages(prev => [...prev, { id, dataUrl: reader.result as string, label: `${labels[mt!]} ${prev.filter(p => (p.mediaType || 'image') === mt).length + 1}`, role: mt === 'image' ? 'none' as const : 'ref' as const, mediaType: mt! as any, fileName: file.name }]);
                        };
                        reader.readAsDataURL(file);
                      });
                    };
                    input.click();
                  }}
                />
                {/* Action buttons row */}
                <div className="flex items-center gap-1 mt-1.5 -mb-0.5">
                  {(() => {
                    const mi = getVideoModelInfo(selectedVideoModel);
                    const hasAnySupport = mi?.supportsFirstFrame || mi?.supportsLastFrame || mi?.supportsReferences || mi?.supportsVideoRefs;
                    return (
                      <button
                        onClick={() => {
                          if (!hasAnySupport) return;
                          setLibraryContext('video-attach');
                          setLibraryOpen(true);
                        }}
                        className={`shrink-0 p-1.5 rounded-lg transition-colors relative ${
                          !hasAnySupport
                            ? 'text-slate-300 dark:text-gray-700 cursor-not-allowed'
                            : 'text-slate-400 dark:text-gray-500 hover:text-rose-500 hover:bg-rose-500/10'
                        }`}
                        title={!hasAnySupport ? 'Эта модель не поддерживает вложения' : 'Прикрепить файлы'}
                      >
                        <ImagePlus className="w-5 h-5" />
                        {videoAttachedImages.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center">{videoAttachedImages.length}</span>
                        )}
                      </button>
                    );
                  })()}
                  <button
                    onClick={() => { setTemplatesTab('video'); setTemplatesOpen(true); }}
                    className="p-1.5 rounded-lg text-blue-400/50 hover:text-blue-400 hover:bg-blue-500/10 transition-all active:scale-95"
                    title="Шаблоны промптов"
                  >
                    <BookOpen className="w-4.5 h-4.5" />
                  </button>
                  {(isEnhancingVideoPrompt || videoPrompt.trim() || videoAttachedImages.length > 0) && (
                    <button
                      onClick={() => { if ((videoPrompt.trim() || videoAttachedImages.length > 0) && !isEnhancingVideoPrompt) enhanceVideoPrompt(); }}
                      disabled={isEnhancingVideoPrompt}
                      className={`p-1.5 rounded-lg transition-all animate-[scaleIn_0.15s_ease-out] ${
                        isEnhancingVideoPrompt
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 active:scale-95'
                      }`}
                      title={
                        videoAttachedImages.length > 0 && !videoPrompt.trim()
                          ? 'Проанализировать вложения и создать промпт'
                          : videoAttachedImages.length > 0
                            ? 'Улучшить промпт с учётом вложений'
                            : 'Улучшить промпт с помощью ИИ'
                      }
                    >
                      <Sparkles className={`w-4.5 h-4.5 transition-transform ${isEnhancingVideoPrompt ? 'animate-sparkle-enhance' : ''}`} />
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={handleVideoGenerate}
                    disabled={!videoPrompt.trim() && videoAttachedImages.length === 0 && !videoAudioFile}
                    className={`p-2 rounded-xl transition-all ${
                      (videoPrompt.trim() || videoAttachedImages.length > 0 || videoAudioFile)
                        ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95'
                        : 'bg-slate-200 dark:bg-gray-800 text-slate-400 dark:text-gray-600 cursor-not-allowed'
                    }`}
                    title={activeVideoTasks.length > 0 ? `Генерируется: ${activeVideoTasks.length}` : 'Сгенерировать видео'}
                  >
                    {activeVideoTasks.length > 0 ? (
                      <div className="relative">
                        <Send className="w-4 h-4" />
                        <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center">
                          {activeVideoTasks.filter(t => t.status !== 'failed').length}
                        </span>
                      </div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Wallet className={`w-3.5 h-3.5 transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-600'}`} />
                    <span className={`text-[11px] font-medium tabular-nums transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-500'}`}>
                      {balance !== null ? `${balance.toFixed(2)} ₽` : '...'}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400/70 dark:text-gray-600 tabular-nums">
                    ~{(getVideoPriceForResolution(selectedVideoModel, selectedVideoResolution) * selectedVideoDuration).toFixed(0)} ₽/видео
                  </span>
                  {balance !== null && balance < 10 && (
                    <span className="text-[10px] text-amber-400/70">-- пополните баланс</span>
                  )}
                </div>
                <span className={`text-[10px] tabular-nums ${videoPrompt.length > 10000 ? 'text-red-400' : videoPrompt.length > 2000 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-600'}`}>
                  {videoPrompt.length.toLocaleString('ru-RU')} / 10 000 симв.{videoPrompt.length > 2000 && videoPrompt.length <= 10000 ? ' (некоторые модели ограничивают длину)' : ''}
                </span>
              </div>
            </div>
          </div>
          <VideoModelSelector
            isOpen={showVideoModelDropdown}
            onClose={() => setShowVideoModelDropdown(false)}
            selectedModel={selectedVideoModel}
            selectedDuration={selectedVideoDuration}
            selectedAspectRatio={selectedVideoAspectRatio}
            selectedResolution={selectedVideoResolution}
            onSelectModel={(m) => {
              setSelectedVideoModel(m);
              const info = getVideoModelInfo(m);
              if (info) {
                if (!info.supportsFirstFrame) setVideoFirstFrame(null);
                if (!info.supportsLastFrame) setVideoLastFrame(null);
                if (!info.supportsReferences) setVideoReferenceImage(null);
                if (!info.supportsAudio) { setVideoAudioFile(null); setVideoAudioName(null); }
                // Clear attached images whose roles are unsupported
                setVideoAttachedImages(prev => prev.filter(img => {
                  if (img.role === 'first' && !info.supportsFirstFrame) return false;
                  if (img.role === 'last' && !info.supportsLastFrame) return false;
                  if (img.role === 'ref' && !info.supportsReferences) return false;
                  return true;
                }));
              }
            }}
            onSelectDuration={setSelectedVideoDuration}
            onSelectAspectRatio={setSelectedVideoAspectRatio}
            onSelectResolution={setSelectedVideoResolution}
          />
        </div>
      )}


      {imageLoaded && activeTab === 'images' && (
        <div className="flex-1 flex flex-col min-h-0 sm:rounded-2xl sm:border border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] overflow-hidden relative mx-0 sm:mx-4 md:mx-8 sm:mb-4" style={{ marginBottom: `calc(54px + max(env(safe-area-inset-bottom, 0px), var(--sab-floor, 0px)) + ${keyboardHeight}px)` }}>
          {/* Toolbar */}
          <div className="shrink-0 flex items-center justify-between px-3 sm:px-4 pt-[max(8px,var(--sat))] sm:pt-3 pb-2 sm:pb-3 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <button
                onClick={() => setShowImageModelDropdown(true)}
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-200 dark:bg-[#1a1a2e] border border-slate-300/50 dark:border-gray-700/50 hover:border-emerald-500/40 transition-all min-w-0"
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">{getImageModelDisplayName(imageModel)}</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-gray-500 shrink-0" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-gray-500">
                {(() => { const info = getImageModelInfo(imageModel); if (!info) return null; return (<>
                  {info.qualities.length > 0 && <><span>кач.:</span><span className="text-slate-600 dark:text-gray-300">{imageQuality === 'auto' ? 'авто' : imageQuality === 'low' ? 'низ.' : imageQuality === 'medium' ? 'сред.' : 'выс.'}</span><span className="text-slate-300 dark:text-gray-700">|</span></>}
                  {info.usesSize ? <><span>разм.:</span><span className="text-slate-600 dark:text-gray-300">{imageSize}</span><span className="text-slate-300 dark:text-gray-700">|</span></> : info.resolutions.length > 1 ? <><span>разр.:</span><span className="text-slate-600 dark:text-gray-300">{imageResolution}</span><span className="text-slate-300 dark:text-gray-700">|</span></> : null}
                  {info.aspectRatios.length > 0 && <><span>формат:</span><span className="text-slate-600 dark:text-gray-300">{imageAspectRatio}</span></>}
                </>); })()}
              </div>
            </div>
          </div>
          <ImageModelSelector
            isOpen={showImageModelDropdown}
            onClose={() => setShowImageModelDropdown(false)}
            selectedModel={imageModel}
            selectedResolution={imageResolution}
            selectedSize={imageSize}
            selectedQuality={imageQuality}
            selectedAspectRatio={imageAspectRatio}
            onSelectModel={(id) => {
              setImageModel(id);
              const info = getImageModelInfo(id);
              const max = info?.maxInputImages || 0;
              setImageAttachedRefs(prev => prev.slice(0, max));
              const newMaxN = info?.maxN || 1;
              setImageCount(prev => Math.min(prev, newMaxN));
            }}
            onSelectResolution={setImageResolution}
            onSelectSize={setImageSize}
            onSelectQuality={setImageQuality}
            onSelectAspectRatio={setImageAspectRatio}
          />

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-6">
              {imageHistory.length === 0 && activeImageTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 sm:py-10 md:py-14 text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center mb-4 sm:mb-5 animate-pulse-glow">
                      <ImageIcon className="w-5 h-5 sm:w-7 sm:h-7 text-emerald-400" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-white mb-1.5 sm:mb-2">Генератор картинок</h2>
                    <p className="text-xs sm:text-sm text-slate-400 dark:text-gray-500 mb-5 sm:mb-8">Опишите изображение и получите результат за секунды</p>

                    {(() => {
                      const imgInfo = getImageModelInfo(imageModel);
                      if (!imgInfo) return null;
                      return (
                        <div className="max-w-xs w-full relative overflow-hidden rounded-xl border border-slate-200/50 dark:border-gray-800/50 bg-white dark:bg-[#0d0d20] mb-4 shadow-md shadow-slate-900/5 dark:shadow-black/20">
                          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10 pointer-events-none" />
                          <div className="relative px-3 sm:px-4 pt-3 sm:pt-3.5 pb-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
                                <ImageIcon className="w-[18px] h-[18px] text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{imgInfo.name}</p>
                                <p className="text-[11px] sm:text-xs text-slate-400 dark:text-gray-500 mt-0.5 capitalize">{imgInfo.provider}</p>
                              </div>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-gray-400 leading-relaxed mt-2 line-clamp-2">{imgInfo.description}</p>
                          </div>
                          <div className="relative grid grid-cols-3 gap-px bg-slate-100/80 dark:bg-gray-800/40 border-t border-slate-100 dark:border-gray-800/60">
                            <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Цена от</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{imgInfo.priceFrom} &#8381;</span>
                            </div>
                            <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">До штук</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{imgInfo.maxN}</span>
                            </div>
                            <div className="flex flex-col items-center py-2 sm:py-2.5 bg-white dark:bg-[#0d0d20]">
                              <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-gray-500 uppercase tracking-widest font-medium">Рефов</span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 mt-0.5">{imgInfo.maxInputImages}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                      {[
                        { icon: 'sparkles', text: 'Фэнтези-пейзаж', prompt: 'Волшебный фэнтези-пейзаж с парящими островами, водопадами в облаках и мягким золотым светом заката' },
                        { icon: 'user', text: 'Стильный портрет', prompt: 'Кинематографический портрет человека в неоновом освещении, мягкий боке на фоне, стиль журнальной обложки' },
                        { icon: 'palette', text: 'Абстрактный арт', prompt: 'Абстрактная композиция из жидких металлических форм, радужные переливы, глубина и объём' },
                        { icon: 'globe', text: 'Футуристический город', prompt: 'Футуристический город будущего на закате, летающие машины, неоновые вывески, отражения в стеклянных небоскрёбах' },
                      ].map((item) => (
                        <button
                          key={item.text}
                          onClick={() => { setImagePrompt(item.prompt); setTimeout(() => imageTextareaRef.current?.focus(), 50); }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-slate-200/60 dark:border-gray-800/50 bg-white dark:bg-[#12122a] hover:border-emerald-500/30 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all text-left group/q"
                        >
                          {item.icon === 'sparkles' && <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />}
                          {item.icon === 'user' && <User className="w-4 h-4 text-rose-400 shrink-0" />}
                          {item.icon === 'palette' && <Palette className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {item.icon === 'globe' && <Globe className="w-4 h-4 text-sky-400 shrink-0" />}
                          <span className="text-xs text-slate-600 dark:text-gray-400 group-hover/q:text-slate-800 dark:group-hover/q:text-gray-200 transition-colors">{item.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5 sm:gap-4">
                    {imageHistory.map((entry) => (
                      <div key={entry.id} className="group">
                        <div className="flex items-start gap-2 sm:gap-3 mb-2">
                          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-300 leading-relaxed">{entry.prompt}</p>
                            <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-0.5">{entry.model} -- {entry.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                        <div className="relative ml-9 sm:ml-11 rounded-xl overflow-hidden border border-slate-200/30 dark:border-gray-800/30 max-w-[calc(100%-2.25rem)] sm:max-w-sm">
                          {entry.url ? (
                          <img
                            src={entry.url}
                            alt={entry.prompt}
                            loading="lazy"
                            className="w-full cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => setViewerImage(entry.url)}
                            onError={(e) => {
                              const img = e.currentTarget;
                              if (!img.dataset.retried) {
                                img.dataset.retried = '1';
                                img.src = entry.url + (entry.url.includes('?') ? '&' : '?') + 't=' + Date.now();
                              } else {
                                img.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'w-full aspect-square flex flex-col items-center justify-center gap-2 bg-slate-100 dark:bg-gray-800/50 text-slate-400 dark:text-gray-500';
                                fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="text-xs">Изображение недоступно</span>';
                                img.parentElement?.appendChild(fallback);
                              }
                            }}
                          />
                          ) : (
                          <div className="w-full aspect-square flex items-center justify-center bg-slate-100 dark:bg-gray-800/50">
                            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
                          </div>
                          )}
                          <div className="absolute top-2 right-2 flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => shareUrl(entry.url, entry.prompt)}
                              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/80 hover:text-blue-300 transition-colors"
                              title="Поделиться"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => downloadFile(entry.url, `image_${Date.now()}.png`)}
                              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/80 hover:text-white transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setImageAttachedRefs([entry.url]);
                                setImagePrompt('');
                                setTimeout(() => imageTextareaRef.current?.focus(), 100);
                              }}
                              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/80 hover:text-blue-300 transition-colors"
                              title="Редактировать"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ type: 'image', id: entry.id })}
                              className="p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/80 hover:text-red-400 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {activeImageTasks.map(task => (
                      <div key={task.id} className={`group relative rounded-2xl border transition-all duration-500 overflow-hidden ${
                        task.status === 'failed'
                          ? 'border-red-500/25 bg-gradient-to-br from-red-500/5 via-red-500/[0.02] to-transparent'
                          : 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] via-teal-500/[0.04] to-transparent shadow-lg shadow-emerald-500/[0.05]'
                      }`}>
                        {task.status !== 'failed' && (
                          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/[0.08] to-transparent -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]" />
                          </div>
                        )}
                        {task.refs && task.refs.length > 0 && task.status !== 'failed' && (
                          <div className="relative px-3.5 pt-3.5 pb-1">
                            <div className="flex gap-2.5 overflow-x-auto scrollbar-hide">
                              {task.refs.map((ref, i) => (
                                <div key={i} className="relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-emerald-500/25 shadow-md shadow-emerald-500/10">
                                  <img src={ref} alt="" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="relative flex items-center gap-3.5 py-4 px-4">
                          <div className={`relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            task.status === 'failed'
                              ? 'bg-red-500/10 border border-red-500/25'
                              : 'bg-[#0a1a1a] border border-emerald-500/30 overflow-hidden'
                          }`}>
                            {task.status === 'failed' ? (
                              <AlertCircle className="w-5 h-5 text-red-400" />
                            ) : (
                              <div className="gen-4d-cube">
                                <div className="gen-4d-face gen-4d-front" />
                                <div className="gen-4d-face gen-4d-back" />
                                <div className="gen-4d-face gen-4d-left" />
                                <div className="gen-4d-face gen-4d-right" />
                                <div className="gen-4d-face gen-4d-top" />
                                <div className="gen-4d-face gen-4d-bottom" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${task.status === 'failed' ? 'text-red-400' : 'text-slate-700 dark:text-gray-200'}`}>
                              {task.status === 'failed' ? (task.error || 'Ошибка генерации') : 'Генерация изображения...'}
                            </p>
                            <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate mt-1">{task.prompt}</p>
                            {task.status !== 'failed' && (
                              <div className="mt-2.5 h-1 rounded-full bg-emerald-500/10 overflow-hidden">
                                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500/60 to-teal-400/60 animate-[indeterminate_1.5s_ease-in-out_infinite]" />
                              </div>
                            )}
                          </div>
                          {task.status === 'failed' && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setActiveImageTasks(prev => prev.filter(t => t.id !== task.id));
                                  setImagePrompt(task.prompt);
                                  handleImageGenerate();
                                }}
                                className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-90"
                                title="Повторить"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setActiveImageTasks(prev => prev.filter(t => t.id !== task.id))}
                                className="shrink-0 p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                                title="Закрыть"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="pb-2" ref={imageHistoryEndRef} />
                  </div>
                )}
              </div>
            </div>

            {/* Input bar */}
            <div className="shrink-0 px-3 sm:px-4 py-2 sm:py-4 border-t border-slate-200/40 dark:border-gray-800/40">
              <div className="max-w-3xl mx-auto">
                {imageError && (
                  <div className="flex items-center gap-2 mb-2 px-1 py-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-sm text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="flex-1 min-w-0 truncate">{imageError}</span>
                    <button onClick={() => setImageError(null)} className="p-0.5 hover:bg-red-500/10 rounded shrink-0"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const info = getImageModelInfo(imageModel);
                    const max = info?.maxInputImages || 1;
                    const remaining = max - imageAttachedRefs.length;
                    if (remaining <= 0) { e.target.value = ''; return; }
                    const toProcess = Array.from(files).slice(0, remaining);
                    for (const file of toProcess) {
                      if (file.size > 20 * 1024 * 1024) {
                        setImageError('Изображение «' + file.name + '» слишком большое (максимум 20 МБ)');
                        continue;
                      }
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        const dataUrl = ev.target?.result as string;
                        const fixed = fixDataUrlMime(dataUrl);
                        setImageAttachedRefs(prev => {
                          if (prev.length >= max) return prev;
                          return [...prev, fixed];
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                    e.target.value = '';
                  }}
                />
                <div className="bg-slate-100 dark:bg-[#12122a] border border-slate-300/50 dark:border-gray-700/50 rounded-2xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500/30 transition-all overflow-hidden">
                  {imageAttachedRefs.length > 0 && (
                    <div className="flex items-center gap-2 px-3 sm:px-4 pt-2.5 pb-1 overflow-x-auto scrollbar-hide">
                      {imageAttachedRefs.map((ref, idx) => (
                        <div key={idx} className="relative group shrink-0">
                          <img src={ref} alt="" className="w-14 h-14 object-cover rounded-xl border border-slate-200/60 dark:border-gray-700/50 shadow-sm" />
                          <button
                            onClick={() => setImageAttachedRefs(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-slate-800/80 dark:bg-gray-200/90 text-white dark:text-gray-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md backdrop-blur-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <span className="text-[10px] text-slate-400 dark:text-gray-500 whitespace-nowrap font-medium">
                        {imageAttachedRefs.length}/{(() => { const info = getImageModelInfo(imageModel); return info?.maxInputImages || 1; })()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-end gap-1.5 px-3 sm:px-4 py-2.5 sm:py-3">
                    <button
                      onClick={() => {
                        const info = getImageModelInfo(imageModel);
                        const max = info?.maxInputImages || 1;
                        if (imageAttachedRefs.length >= max) return;
                        setLibraryContext('image');
                        setLibraryOpen(true);
                      }}
                      className={`shrink-0 p-1.5 rounded-lg transition-colors ${
                        (() => { const info = getImageModelInfo(imageModel); return imageAttachedRefs.length >= (info?.maxInputImages || 1); })()
                          ? 'text-slate-300 dark:text-gray-700 cursor-not-allowed'
                          : 'text-slate-400 dark:text-gray-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                      }`}
                      title={(() => {
                        const info = getImageModelInfo(imageModel);
                        const max = info?.maxInputImages || 1;
                        if (max === 0) return 'Эта модель не поддерживает референсы';
                        if (imageAttachedRefs.length >= max) return `Максимум ${max} референсов`;
                        return `Прикрепить фото (${imageAttachedRefs.length}/${max})`;
                      })()}
                    >
                      <ImagePlus className="w-5 h-5" />
                    </button>
                    <textarea
                      ref={imageTextareaRef}
                      value={imagePrompt}
                      onChange={(e) => { imageSlash.slashHandleChange(e); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; }}
                      onKeyDown={(e) => { if (imageSlash.slashHandleKeyDown(e)) return; if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleImageGenerate(); } }}
                      placeholder={imageAttachedRefs.length > 0 ? 'Опишите что сделать с фото, или нажмите ✦ для анализа...' : 'Опишите изображение...'}
                      rows={1}
                      className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 resize-none focus:outline-none py-1"
                      style={{ minHeight: '24px', maxHeight: '200px' }}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setTemplatesTab('images'); setTemplatesOpen(true); }}
                        className="p-1.5 rounded-lg text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all active:scale-95"
                        title="Шаблоны промптов"
                      >
                        <BookOpen className="w-4.5 h-4.5" />
                      </button>
                      {(isEnhancingImagePrompt || imagePrompt.trim().length >= 1 || imageAttachedRefs.length > 0) && (
                        <button
                          onClick={enhanceImagePrompt}
                          disabled={isEnhancingImagePrompt}
                          className={`p-1.5 rounded-lg transition-all animate-[scaleIn_0.15s_ease-out] ${
                            isEnhancingImagePrompt
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'text-amber-400/60 hover:text-amber-400 hover:bg-amber-500/10 active:scale-95'
                          }`}
                          title={imageAttachedRefs.length > 0 && !imagePrompt.trim() ? 'Проанализировать фото и придумать промпт' : 'Улучшить промпт с помощью ИИ'}
                        >
                          <Sparkles className={`w-4.5 h-4.5 transition-transform ${isEnhancingImagePrompt ? 'animate-sparkle-enhance' : ''}`} />
                        </button>
                      )}
                      {(imagePrompt.trim().length >= 1 || imageAttachedRefs.length > 0) && (
                        <button
                          onClick={handleImageGenerate}
                          disabled={!imagePrompt.trim()}
                          className={`p-1.5 rounded-lg transition-all animate-[scaleIn_0.15s_ease-out] ${
                            imagePrompt.trim()
                              ? 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-95'
                              : 'bg-slate-200 dark:bg-gray-800 text-slate-400 dark:text-gray-600 cursor-not-allowed'
                          }`}
                          title={activeImageTasks.length > 0 ? `Генерируется: ${activeImageTasks.length}` : 'Сгенерировать'}
                        >
                          {activeImageTasks.length > 0 ? (
                            <div className="relative">
                              <Send className="w-4 h-4" />
                              <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-[8px] font-bold text-white flex items-center justify-center">
                                {activeImageTasks.filter(t => t.status !== 'failed').length}
                              </span>
                            </div>
                          ) : (
                            <Send className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <div className="flex items-center gap-1.5">
                    <Wallet className={`w-3.5 h-3.5 transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-600'}`} />
                    <span className={`text-[11px] font-medium tabular-nums transition-colors duration-300 ${balance !== null && balance < 10 ? 'text-amber-400' : 'text-slate-400 dark:text-gray-500'}`}>
                      {balance !== null ? `${balance.toFixed(2)} ₽` : '...'}
                    </span>
                    {(() => {
                      const est = estimateImageCost(imageModel, imageQuality, imageSize, imageResolution, Math.min(imageCount, getImageModelInfo(imageModel)?.maxN || 1));
                      if (!est) return null;
                      const warn = balance !== null && est.total > balance;
                      return (
                        <span className={`text-[10px] tabular-nums font-medium ${warn ? 'text-red-400' : 'text-emerald-500 dark:text-emerald-400'}`} title={est.total !== est.perImage ? `${est.perImage.toFixed(2)} ₽ × ${Math.min(imageCount, getImageModelInfo(imageModel)?.maxN || 1)}` : ''}>
                          ~{est.total.toFixed(2)} ₽
                        </span>
                      );
                    })()}
                  </div>
                  {(() => {
                    const info = getImageModelInfo(imageModel);
                    const maxN = info?.maxN || 1;
                    if (maxN <= 1) return null;
                    const safeCount = Math.min(imageCount, maxN);
                    return (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setImageCount(c => Math.max(1, c - 1))}
                          disabled={safeCount <= 1}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold transition-colors bg-slate-200/60 dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-300/60 dark:hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          &minus;
                        </button>
                        <span className="text-[11px] font-semibold tabular-nums text-slate-600 dark:text-gray-300 min-w-[20px] text-center">
                          {safeCount}
                        </span>
                        <button
                          onClick={() => setImageCount(c => Math.min(maxN, c + 1))}
                          disabled={safeCount >= maxN}
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[11px] font-bold transition-colors bg-slate-200/60 dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-300/60 dark:hover:bg-gray-700/60 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500 ml-0.5">шт.</span>
                      </div>
                    );
                  })()}
                  <span className={`text-[10px] tabular-nums ${imagePrompt.length > 10000 ? 'text-red-400' : 'text-slate-400 dark:text-gray-600'}`}>
                    {imagePrompt.length.toLocaleString('ru-RU')} / 10 000 симв.
                  </span>
                </div>
              </div>
            </div>
          </div>
      )}



      {viewerImage && (
        <ImageViewer src={viewerImage} alt="Результат" onClose={() => setViewerImage(null)} />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-white dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800/60 rounded-2xl p-6 w-full max-w-xs shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-slate-900 dark:text-white text-center">Удалить?</h3>
            <p className="text-sm text-slate-500 dark:text-gray-400 text-center">Это действие нельзя отменить</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const { type, id } = deleteConfirm;
                  if (type === 'image') { dbDeleteImage(id); setImageHistory(prev => prev.filter(e => e.id !== id)); }
                  else if (type === 'tts') { dbDeleteTTS(id); setTtsHistory(prev => prev.filter(e => e.id !== id)); }
                  else if (type === 'video') { dbDeleteVideo(id); setVideoHistory(prev => prev.filter(e => e.id !== id)); }
                  setDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <LibraryPanel
        open={showLibraryPanel}
        onClose={() => setShowLibraryPanel(false)}
        items={libraryMediaItems as LibraryItem[]}
        onDelete={(item) => {
          if (item.type === 'image') { dbDeleteImage(item.id); setImageHistory(prev => prev.filter(h => h.id !== item.id)); }
          else if (item.type === 'video') { dbDeleteVideo(item.id); setVideoHistory(prev => prev.filter(h => h.id !== item.id)); }
          else if (item.type === 'audio') { dbDeleteTTS(item.id); setTtsHistory(prev => prev.filter(h => h.id !== item.id)); }
        }}
        onPreviewImage={(url) => setViewerImage(url)}
        unseenByType={unseenMediaByType}
        onSeenAll={() => {
          setUnseenMediaCount(0);
          setUnseenMediaByType({ image: 0, video: 0, audio: 0 });
          if (user) supabase.from('shared_media').update({ seen: true }).eq('receiver_id', user.id).eq('seen', false).then();
        }}
      />

      {/* Video attach modal removed — multi-image attachment is now inline via VideoPromptInput */}
      {false && (() => {
        const mi = getVideoModelInfo(selectedVideoModel);
        const slots: { key: string; label: string; desc: string; gradient: string; bgHover: string; dotColor: string; value: string | null; setter: (v: string | null) => void; context: 'video-first' | 'video-last' | 'video-ref' | 'video-audio'; supported: boolean; isAudio?: boolean }[] = [
          { key: 'first', label: 'Первый кадр', desc: 'Начальное изображение видео', gradient: 'from-emerald-500/20 to-emerald-500/5', bgHover: 'hover:border-emerald-400/50 hover:shadow-emerald-500/5', dotColor: 'bg-emerald-400', value: videoFirstFrame, setter: setVideoFirstFrame, context: 'video-first', supported: !!mi?.supportsFirstFrame },
          { key: 'last', label: 'Последний кадр', desc: 'Конечное изображение видео', gradient: 'from-amber-500/20 to-amber-500/5', bgHover: 'hover:border-amber-400/50 hover:shadow-amber-500/5', dotColor: 'bg-amber-400', value: videoLastFrame, setter: setVideoLastFrame, context: 'video-last', supported: !!mi?.supportsLastFrame },
          { key: 'ref', label: 'Референс', desc: 'Стиль или объект для видео', gradient: 'from-sky-500/20 to-sky-500/5', bgHover: 'hover:border-sky-400/50 hover:shadow-sky-500/5', dotColor: 'bg-sky-400', value: videoReferenceImage, setter: setVideoReferenceImage, context: 'video-ref', supported: !!mi?.supportsReferences },
          { key: 'audio', label: 'Аудио', desc: 'Звуковая дорожка для видео', gradient: 'from-violet-500/20 to-violet-500/5', bgHover: 'hover:border-violet-400/50 hover:shadow-violet-500/5', dotColor: 'bg-violet-400', value: videoAudioFile, setter: setVideoAudioFile as (v: string | null) => void, context: 'video-audio', supported: !!mi?.supportsAudio, isAudio: true },
        ];
        const available = slots.filter(s => s.supported);
        const filledCount = available.filter(s => s.value).length;
        return (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setVideoAttachModalOpen(false)} />
            <div className="relative w-full sm:max-w-[420px] mx-auto bg-white dark:bg-[#101028] rounded-t-3xl sm:rounded-2xl border border-slate-200/50 dark:border-gray-700/40 shadow-2xl shadow-black/20 max-h-[85dvh] flex flex-col overflow-hidden">
              <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mt-3 sm:hidden" />
              <div className="flex items-center justify-between px-5 pt-4 sm:pt-5 pb-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center">
                    <ImagePlus className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-slate-800 dark:text-gray-100 leading-tight">Вложения</h3>
                    <p className="text-[11px] text-slate-400 dark:text-gray-500">{filledCount}/{available.length} добавлено</p>
                  </div>
                </div>
                <button
                  onClick={() => setVideoAttachModalOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-600 dark:hover:text-gray-300 transition-all active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2.5">
                {available.map(slot => (
                  <div
                    key={slot.key}
                    className={`relative rounded-xl border border-slate-200/60 dark:border-gray-700/40 bg-gradient-to-r ${slot.gradient} dark:bg-none dark:bg-[#12122a] p-3.5 transition-all duration-200 ${slot.bgHover} hover:shadow-lg group/slot`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${slot.dotColor}`} />
                          <p className="text-[13px] font-medium text-slate-700 dark:text-gray-200">{slot.label}</p>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-gray-500 ml-3.5">{slot.desc}</p>
                      </div>
                      {slot.value ? (
                        <div className="relative group shrink-0">
                          {slot.isAudio ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (videoAudioPlaying) {
                                  document.querySelectorAll<HTMLAudioElement>('audio[data-attach-preview]').forEach(a => { a.pause(); a.currentTime = 0; });
                                  setVideoAudioPlaying(false);
                                } else {
                                  const audio = new Audio(slot.value!);
                                  audio.setAttribute('data-attach-preview', '');
                                  audio.onended = () => setVideoAudioPlaying(false);
                                  audio.play();
                                  setVideoAudioPlaying(true);
                                }
                              }}
                              className="w-16 h-16 rounded-lg bg-violet-500/10 ring-1 ring-violet-400/30 flex items-center justify-center hover:bg-violet-500/20 transition-colors active:scale-95"
                            >
                              {videoAudioPlaying ? <Pause className="w-5 h-5 text-violet-400" /> : <Play className="w-5 h-5 text-violet-400 ml-0.5" />}
                            </button>
                          ) : (
                            <img
                              src={slot.value}
                              alt={slot.label}
                              className="w-16 h-16 rounded-lg object-cover ring-1 ring-slate-200/60 dark:ring-gray-700/50 shadow-sm"
                            />
                          )}
                          <button
                            onClick={() => slot.setter(null)}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md shadow-red-500/30 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150 hover:scale-110 active:scale-90"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => {
                              if (slot.isAudio) {
                                videoAudioInputRef.current?.click();
                              } else {
                                const target = slot.key === 'last' ? 'last' : slot.key === 'ref' ? 'ref' : 'first';
                                videoFrameTargetRef.current = target;
                                videoFileInputRef.current?.click();
                              }
                            }}
                            className="w-16 h-16 shrink-0 rounded-lg border border-dashed border-slate-300/70 dark:border-gray-600/50 flex flex-col items-center justify-center gap-0.5 transition-all hover:border-slate-400 dark:hover:border-gray-500 hover:bg-white/60 dark:hover:bg-gray-800/40 active:scale-95"
                            title="Загрузить с устройства"
                          >
                            <Upload className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                            <span className="text-[9px] text-slate-400 dark:text-gray-500">Файл</span>
                          </button>
                          {libraryMediaItems.filter(i => slot.isAudio ? i.type === 'audio' : i.type === 'image').length > 0 && (
                            <button
                              onClick={() => { setLibraryContext(slot.context); setLibraryOpen(true); }}
                              className="w-16 h-16 shrink-0 rounded-lg border border-dashed border-slate-300/70 dark:border-gray-600/50 flex flex-col items-center justify-center gap-0.5 transition-all hover:border-slate-400 dark:hover:border-gray-500 hover:bg-white/60 dark:hover:bg-gray-800/40 active:scale-95"
                              title="Выбрать из библиотеки"
                            >
                              <ImagePlus className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                              <span className="text-[9px] text-slate-400 dark:text-gray-500">Медиа</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {available.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-3">
                      <ImagePlus className="w-5 h-5 text-slate-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-slate-400 dark:text-gray-500">Эта модель не поддерживает вложения</p>
                  </div>
                )}
              </div>
              {filledCount > 0 && (
                <div className="px-5 pb-4 pt-1">
                  <button
                    onClick={() => setVideoAttachModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20"
                  >
                    Готово
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <MediaLibrary
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        selectableTypes={
          libraryContext === 'video-audio' || libraryContext === 'tts-ref'
            ? ['audio']
            : libraryContext === 'video-attach'
              ? (['image', ...(getVideoModelInfo(selectedVideoModel)?.supportsVideoRefs ? ['video'] : []), ...(getVideoModelInfo(selectedVideoModel)?.supportsAudio ? ['audio'] : [])] as ('image' | 'video' | 'audio')[])
              : ['image']
        }
        multiple={libraryContext === 'image' || libraryContext === 'video-attach'}
        maxSelect={libraryContext === 'image' ? (() => { const info = getImageModelInfo(imageModel); return (info?.maxInputImages || 1) - imageAttachedRefs.length; })() : libraryContext === 'video-attach' ? 10 : 1}
        items={libraryMediaItems}
        title="Библиотека"
        onSelect={(url, type) => {
          switch (libraryContext) {
            case 'chat':
              setAttachedImage(url);
              break;
            case 'image': {
              const info = getImageModelInfo(imageModel);
              const max = info?.maxInputImages || 1;
              setImageAttachedRefs(prev => prev.length < max ? [...prev, url] : prev);
              break;
            }
            case 'video-first':
              setVideoFirstFrame(url);
              break;
            case 'video-last':
              setVideoLastFrame(url);
              break;
            case 'video-ref':
              setVideoReferenceImage(url);
              break;
            case 'video-audio':
              setVideoAudioFile(url);
              setVideoAudioName('Из библиотеки');
              break;
            case 'video-attach': {
              const mt: 'image' | 'video' | 'audio' = type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'image';
              const id = Math.random().toString(36).slice(2, 8);
              const labels = { image: 'Изображение', video: 'Видео', audio: 'Аудио' };
              setVideoAttachedImages(prev => [...prev, { id, dataUrl: url, label: `${labels[mt]} ${prev.filter(p => (p.mediaType || 'image') === mt).length + 1}`, role: mt === 'image' ? 'none' as const : 'ref' as const, mediaType: mt as any }]);
              break;
            }
            case 'tts-ref': {
              // Library returns a URL; fetch it and convert to data URL for voice clone
              (async () => {
                try {
                  const resp = await fetch(url);
                  const blob = await resp.blob();
                  const reader = new FileReader();
                  reader.onload = () => {
                    setTtsRefAudioBase64(reader.result as string);
                    setTtsRefFileName('Из библиотеки');
                  };
                  reader.readAsDataURL(blob);
                } catch {
                  setTtsRefAudioBase64(url);
                  setTtsRefFileName('Из библиотеки');
                }
              })();
              break;
            }
          }
        }}
      />

      <SlashCommandMenu
        open={chatSlash.slashState.open}
        query={chatSlash.slashState.query}
        scope="chat"
        anchorRect={chatSlash.slashState.anchorRect}
        onSelect={chatSlash.slashSelectCommand}
        onClose={chatSlash.slashClose}
        selectedIndex={chatSlash.slashState.selectedIndex}
        onSelectedIndexChange={chatSlash.setSlashSelectedIndex}
      />
      <SlashCommandMenu
        open={imageSlash.slashState.open}
        query={imageSlash.slashState.query}
        scope="image"
        anchorRect={imageSlash.slashState.anchorRect}
        onSelect={imageSlash.slashSelectCommand}
        onClose={imageSlash.slashClose}
        selectedIndex={imageSlash.slashState.selectedIndex}
        onSelectedIndexChange={imageSlash.setSlashSelectedIndex}
      />

      <PromptTemplates
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        tab={templatesTab}
        onSelect={(prompt) => {
          if (templatesTab === 'chat') {
            setInput(prompt);
            setTimeout(() => textareaRef.current?.focus(), 100);
          } else if (templatesTab === 'video') {
            setVideoPrompt(prompt);
            setTimeout(() => {
              if (videoTextareaRef.current) {
                videoTextareaRef.current.style.height = 'auto';
                videoTextareaRef.current.style.height = Math.min(videoTextareaRef.current.scrollHeight, 200) + 'px';
                videoTextareaRef.current.focus();
              }
            }, 100);
          } else if (templatesTab === 'images') {
            setImagePrompt(prompt);
            setTimeout(() => {
              if (imageTextareaRef.current) {
                imageTextareaRef.current.style.height = 'auto';
                imageTextareaRef.current.style.height = Math.min(imageTextareaRef.current.scrollHeight, 200) + 'px';
                imageTextareaRef.current.focus();
              }
            }, 100);
          }
        }}
      />

      {/* Mobile "More" bottom sheet */}
      {showMoreMenu && (
        <div className="sm:hidden fixed inset-0 z-[60]" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/30 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#111128] rounded-t-2xl border-t border-slate-200/50 dark:border-white/[0.06] shadow-2xl shadow-black/20 animate-in slide-in-from-bottom duration-250 pb-[max(12px,env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-gray-700 mx-auto mt-3 mb-2" />

            {/* Balance */}
            <div className="mx-4 mb-3 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/8 to-blue-500/8 dark:from-cyan-500/10 dark:to-blue-500/10 border border-cyan-500/15 dark:border-cyan-400/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-gray-400">Баланс</p>
                    <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">
                      {balance !== null ? `${balance.toFixed(2)} \u20BD` : '...'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowMoreMenu(false); navigate('/settings'); }}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold active:scale-95 transition-all shadow-md shadow-cyan-500/20"
                >
                  Пополнить
                </button>
              </div>
            </div>

            {/* Menu items */}
            <div className="mx-4 mb-2 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/40 dark:border-white/[0.04] overflow-hidden divide-y divide-slate-200/40 dark:divide-white/[0.04]">
              <button
                onClick={() => { setShowMoreMenu(false); setShowLibraryPanel(true); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-100 dark:hover:bg-white/[0.04] active:bg-slate-200/60 dark:active:bg-white/[0.06] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
                  <FolderOpen className="w-[18px] h-[18px] text-blue-500 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-gray-100">Библиотека</p>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500">Медиа, изображения, видео</p>
                </div>
                {unseenMediaCount > 0 && (
                  <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {unseenMediaCount > 99 ? '99+' : unseenMediaCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setShowMoreMenu(false); navigate('/support'); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-100 dark:hover:bg-white/[0.04] active:bg-slate-200/60 dark:active:bg-white/[0.06] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 dark:bg-cyan-400/10 flex items-center justify-center">
                  <Headphones className="w-[18px] h-[18px] text-cyan-500 dark:text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-gray-100">Поддержка</p>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500">Чат с техподдержкой</p>
                </div>
                {supportUnread > 0 && (
                  <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                    {supportUnread > 99 ? '99+' : supportUnread}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setShowMoreMenu(false); navigate('/settings'); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-slate-100 dark:hover:bg-white/[0.04] active:bg-slate-200/60 dark:active:bg-white/[0.06] transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-200/60 dark:bg-white/[0.06] flex items-center justify-center">
                  <User className="w-[18px] h-[18px] text-slate-500 dark:text-gray-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-gray-100">Профиль</p>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500">Настройки, тема, данные</p>
                </div>
              </button>
              <button
                onClick={() => { setShowMoreMenu(false); signOut(); }}
                className="w-full flex items-center gap-3.5 px-4 py-3.5 text-left hover:bg-red-50 dark:hover:bg-red-500/5 active:bg-red-100 dark:active:bg-red-500/10 transition-colors"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 dark:bg-red-400/10 flex items-center justify-center">
                  <LogOut className="w-[18px] h-[18px] text-red-500 dark:text-red-400" />
                </div>
                <p className="text-sm font-medium text-red-500 dark:text-red-400">Выйти</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <div
        className="sm:hidden fixed left-0 right-0 z-50 transition-[bottom] duration-150"
        style={{ bottom: keyboardHeight > 0 ? `${keyboardHeight}px` : '0px' }}
      >
        <div className="bg-white dark:bg-[#111128] border-t border-slate-200/50 dark:border-white/[0.06] shadow-lg shadow-black/5 dark:shadow-black/30 px-1 pb-[env(safe-area-inset-bottom,0px)]">
          <div className="flex items-stretch h-[54px]">
            {TABS.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => { tabFeedback(); setActiveTab(tab.id); }}
                  className="relative flex-1 flex flex-col items-center justify-center gap-1 active:scale-[0.90] transition-transform duration-150"
                >
                  <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-all duration-250 ${
                    isActive
                      ? 'bg-blue-500/12 dark:bg-blue-400/15'
                      : 'bg-transparent'
                  }`}>
                    <TabIcon
                      className={`w-[20px] h-[20px] transition-all duration-250 ${
                        isActive
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400 dark:text-gray-500'
                      }`}
                      strokeWidth={isActive ? 2.2 : 1.6}
                    />
                  </div>
                  <span className={`text-[10px] leading-none transition-all duration-250 ${
                    isActive
                      ? 'text-blue-600 dark:text-blue-400 font-semibold'
                      : 'text-slate-400 dark:text-gray-500 font-medium'
                  }`}>
                    {tab.id === 'speech' ? 'Речь' : tab.id === 'images' ? 'Фото' : tab.id === 'stt' ? 'STT' : tab.label}
                  </span>
                </button>
              );
            })}

            {/* Ad Creator button */}
            <div className="relative flex flex-col items-center justify-center flex-1">
              <button
                onClick={() => { tabFeedback(); navigate('/ad-creator'); }}
                className="active:scale-[0.90] transition-transform duration-150 flex flex-col items-center gap-1"
              >
                <div className="flex items-center justify-center w-10 h-7 rounded-full bg-transparent">
                  <Clapperboard
                    className="w-[20px] h-[20px] text-slate-400 dark:text-gray-500 transition-all duration-250"
                    strokeWidth={1.6}
                  />
                </div>
                <span className="text-[10px] leading-none font-medium text-slate-400 dark:text-gray-500">Ролик</span>
              </button>
            </div>

            {/* More button */}
            <div className="relative flex flex-col items-center justify-center flex-1">
              <button
                onClick={() => { tabFeedback(); setShowMoreMenu(true); }}
                className="active:scale-[0.90] transition-transform duration-150 flex flex-col items-center gap-1"
              >
                <div className="flex items-center justify-center w-10 h-7 rounded-full bg-transparent">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white/80 dark:ring-white/10">
                    {userInitial}
                  </div>
                </div>
                <span className="text-[10px] leading-none font-medium text-slate-400 dark:text-gray-500">Ещё</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
