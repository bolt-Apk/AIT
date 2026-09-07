import { useState, useRef, useCallback, useEffect } from 'react';
import { downloadFile } from '@/lib/download';
import { createPortal } from 'react-dom';
import {
  X,
  ImageIcon,
  Video,
  AudioLines,
  Search,
  Download,
  Trash2,
  Share2,
  Play,
  Pause,
  Eye,
  Calendar,
  FolderOpen,
  Send,
  Inbox,
  Loader2,
  Check,
  AtSign,
  ArrowRight,
  User,
  Clock,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type MediaType = 'image' | 'video' | 'audio';

export interface LibraryItem {
  id: string;
  url: string;
  label: string;
  type: MediaType;
  timestamp: Date;
}

export interface ReceivedItem {
  id: string;
  url: string;
  label: string;
  type: MediaType;
  timestamp: Date;
  senderNickname: string;
  seen: boolean;
}

interface LibraryPanelProps {
  open: boolean;
  onClose: () => void;
  items: LibraryItem[];
  onDelete: (item: LibraryItem) => void;
  onPreviewImage?: (url: string) => void;
  unseenByType?: { image: number; video: number; audio: number };
  onSeenAll?: () => void;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AudioPlayer({ url }: { url: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    const onEnd = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnd);
    return () => { audio.removeEventListener('timeupdate', onTime); audio.removeEventListener('ended', onEnd); };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); } else { audio.play().catch(() => {}); }
    setPlaying(!playing);
  };

  return (
    <div className="flex items-center gap-2">
      <audio ref={audioRef} src={url} preload="metadata" />
      <button onClick={toggle} className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
      </button>
      <div className="flex-1 h-1 rounded-full bg-slate-200 dark:bg-gray-800 overflow-hidden">
        <div className="h-full bg-blue-500 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}



async function nativeShare(item: LibraryItem | ReceivedItem) {
  const shareData: ShareData = { title: item.label, text: item.label, url: item.url };
  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData).catch(() => {});
  } else {
    await navigator.clipboard.writeText(item.url);
  }
}

const MEDIA_TABS: { type: MediaType; label: string; icon: typeof ImageIcon }[] = [
  { type: 'image', label: 'Фото', icon: ImageIcon },
  { type: 'video', label: 'Видео', icon: Video },
  { type: 'audio', label: 'Аудио', icon: AudioLines },
];

function SendDialog({
  item,
  onClose,
  onSent,
}: {
  item: LibraryItem;
  onClose: () => void;
  onSent: () => void;
}) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ id: string; nickname: string }[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [recentContacts, setRecentContacts] = useState<{ id: string; nickname: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem('recent_send_contacts') || '[]'); } catch { return []; }
  });

  const saveContact = (contact: { id: string; nickname: string }) => {
    setRecentContacts(prev => {
      const filtered = prev.filter(c => c.id !== contact.id);
      const updated = [contact, ...filtered].slice(0, 10);
      localStorage.setItem('recent_send_contacts', JSON.stringify(updated));
      return updated;
    });
  };

  const removeContact = (id: string) => {
    setRecentContacts(prev => {
      const updated = prev.filter(c => c.id !== id);
      localStorage.setItem('recent_send_contacts', JSON.stringify(updated));
      return updated;
    });
  };

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setSearching(true);
    setError(null);
    const { data, error: err } = await supabase.rpc('search_users_by_nickname', { p_query: q });
    if (err) {
      setError('Ошибка поиска');
    } else {
      setResults((data || []).map((u: { id: string; nickname: string }) => ({ id: u.id, nickname: u.nickname })));
    }
    setSearching(false);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(query.trim()), 350);
    return () => clearTimeout(debounceRef.current);
  }, [query, searchUsers]);

  const handleSend = async (receiverId: string, receiverNickname: string) => {
    if (!item.url) {
      setError('Файл ещё загружается, подождите');
      return;
    }
    setSending(receiverId);
    setError(null);
    const { error: insertErr } = await supabase.from('shared_media').insert({
      receiver_id: receiverId,
      media_type: item.type,
      media_url: item.url,
      label: item.label,
    });
    if (insertErr) {
      setError('Не удалось отправить');
      setSending(null);
    } else {
      setSent(receiverNickname);
      setSending(null);
      saveContact({ id: receiverId, nickname: receiverNickname });
      setTimeout(() => { onSent(); onClose(); }, 1200);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-sm bg-white dark:bg-[#111128] border border-slate-200/60 dark:border-gray-800/60 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Send className="w-4 h-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-gray-100">Отправить пользователю</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-gray-900/50 border-b border-slate-200/40 dark:border-gray-800/40">
          <div className="flex items-center gap-3">
            {item.type === 'image' && (
              <img src={item.url} alt="" className="w-12 h-12 rounded-lg object-cover" />
            )}
            {item.type === 'video' && (
              <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-gray-800 flex items-center justify-center">
                <Video className="w-5 h-5 text-slate-400 dark:text-gray-500" />
              </div>
            )}
            {item.type === 'audio' && (
              <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-gray-800 flex items-center justify-center">
                <AudioLines className="w-5 h-5 text-slate-400 dark:text-gray-500" />
              </div>
            )}
            <p className="text-xs text-slate-600 dark:text-gray-400 line-clamp-2 flex-1">{item.label}</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {sent ? (
            <div className="flex flex-col items-center py-4 gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Отправлено @{sent}</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                  placeholder="Введите никнейм..."
                  autoFocus
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-gray-800/60 text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 border border-transparent focus:border-blue-500/40 outline-none transition-colors font-mono"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />}
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <div className="max-h-48 overflow-y-auto space-y-1">
                {results.length === 0 && query.length >= 2 && !searching && (
                  <p className="text-xs text-slate-400 dark:text-gray-600 text-center py-4">Пользователь не найден</p>
                )}
                {results.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSend(u.id, u.nickname)}
                    disabled={sending === u.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors text-left group"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <span className="text-sm font-mono text-slate-700 dark:text-gray-300 flex-1">@{u.nickname}</span>
                    {sending === u.id ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-slate-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                    )}
                  </button>
                ))}
              </div>

              {query.length < 2 && recentContacts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-gray-600 flex items-center gap-1 px-1 mb-2">
                    <Clock className="w-3 h-3" /> Недавние
                  </p>
                  {recentContacts.map((c) => (
                    <div key={c.id} className="flex items-center gap-1">
                      <button
                        onClick={() => handleSend(c.id, c.nickname)}
                        disabled={!!sending}
                        className="flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors text-left group"
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                        </div>
                        <span className="text-sm font-mono text-slate-700 dark:text-gray-300 flex-1">@{c.nickname}</span>
                        {sending === c.id ? (
                          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                        ) : (
                          <ArrowRight className="w-4 h-4 text-slate-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors" />
                        )}
                      </button>
                      <button
                        onClick={() => removeContact(c.id)}
                        className="p-1.5 rounded-lg text-slate-300 dark:text-gray-700 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {query.length < 2 && recentContacts.length === 0 && (
                <p className="text-[11px] text-slate-400 dark:text-gray-600 text-center">
                  Введите минимум 2 символа для поиска
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LibraryPanel({ open, onClose, items, onDelete, onPreviewImage, unseenByType, onSeenAll }: LibraryPanelProps) {
  const [activeType, setActiveType] = useState<MediaType>('image');
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);
  const [sendingItem, setSendingItem] = useState<LibraryItem | null>(null);
  const [showReceived, setShowReceived] = useState(false);
  const totalUnseen = unseenByType ? unseenByType.image + unseenByType.video + unseenByType.audio : 0;
  const [received, setReceived] = useState<ReceivedItem[]>([]);
  const [receivedLoading, setReceivedLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setSearch('');
      setConfirmDeleteId(null);
      setSharedId(null);
      setSendingItem(null);
      if (totalUnseen > 0) {
        setShowReceived(true);
        const topType = unseenByType && (unseenByType.video > 0 ? 'video' : unseenByType.audio > 0 ? 'audio' : 'image');
        if (topType) setActiveType(topType);
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { count } = await supabase
        .from('shared_media')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('seen', false);
      if (!cancelled) setUnreadCount(count ?? 0);
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const loadReceived = useCallback(async () => {
    setReceivedLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setReceivedLoading(false); return; }

    const { data } = await supabase
      .from('shared_media')
      .select('id, media_type, media_url, label, seen, created_at, sender_id')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      const senderIds = [...new Set(data.map(d => d.sender_id))];
      const { data: senders } = await supabase.rpc('get_nicknames_by_ids', { p_ids: senderIds });
      const senderMap = new Map((senders || []).map((s: { id: string; nickname: string }) => [s.id, s.nickname || 'unknown']));

      setReceived(data.map(d => ({
        id: d.id,
        url: d.media_url,
        label: d.label,
        type: d.media_type as MediaType,
        timestamp: new Date(d.created_at),
        senderNickname: senderMap.get(d.sender_id) || 'unknown',
        seen: d.seen,
      })));

      const unseenIds = data.filter(d => !d.seen).map(d => d.id);
      if (unseenIds.length > 0) {
        await supabase.from('shared_media').update({ seen: true }).in('id', unseenIds);
        setUnreadCount(0);
        onSeenAll?.();
      }
    } else {
      setReceived([]);
    }
    setReceivedLoading(false);
  }, [onSeenAll]);

  useEffect(() => {
    if (open && showReceived) loadReceived();
  }, [open, showReceived, loadReceived]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const ch = supabase
        .channel(`lib-received-${user.id}-${Date.now()}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'shared_media', filter: `receiver_id=eq.${user.id}` },
          () => { if (!cancelled) loadReceived(); }
        )
        .subscribe();
      return ch;
    };
    let channel: Awaited<ReturnType<typeof setupRealtime>>;
    setupRealtime().then(ch => { channel = ch; });
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [open, loadReceived]);

  const handleDeleteReceived = async (id: string) => {
    await supabase.from('shared_media').delete().eq('id', id);
    setReceived(prev => prev.filter(r => r.id !== id));
  };

  const filtered = items.filter(
    (item) => item.type === activeType && (search === '' || item.label.toLowerCase().includes(search.toLowerCase()))
  );

  const tabCounts = {
    image: items.filter((i) => i.type === 'image').length,
    video: items.filter((i) => i.type === 'video').length,
    audio: items.filter((i) => i.type === 'audio').length,
  };

  const handleDelete = useCallback((item: LibraryItem) => {
    if (confirmDeleteId === item.id) {
      onDelete(item);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(item.id);
      setTimeout(() => setConfirmDeleteId((prev) => (prev === item.id ? null : prev)), 3000);
    }
  }, [confirmDeleteId, onDelete]);

  const handleNativeShare = useCallback(async (item: LibraryItem) => {
    await nativeShare(item);
    setSharedId(item.id);
    setTimeout(() => setSharedId((prev) => (prev === item.id ? null : prev)), 2000);
  }, []);

  const getFilename = (item: LibraryItem | ReceivedItem) => {
    const ext = item.type === 'image' ? 'png' : item.type === 'video' ? 'mp4' : 'mp3';
    const safe = item.label.slice(0, 30).replace(/[^a-zA-Zа-яА-Я0-9]/g, '_');
    return `${safe}.${ext}`;
  };

  const receivedFiltered = received.filter(
    (item) => item.type === activeType && (search === '' || item.label.toLowerCase().includes(search.toLowerCase()))
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[140] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div
        ref={panelRef}
        className="relative z-10 w-full max-w-md h-full bg-white dark:bg-[#0d0d20] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-slate-200/60 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              {showReceived ? <Inbox className="w-4 h-4 text-white" /> : <FolderOpen className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100">
                {showReceived ? 'Входящие' : 'Библиотека'}
              </h2>
              <p className="text-[11px] text-slate-400 dark:text-gray-500">
                {showReceived ? `${received.length} файлов` : `${items.length} файлов`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowReceived(!showReceived)}
              className={`relative p-2 rounded-xl transition-colors ${
                showReceived
                  ? 'text-blue-500 bg-blue-500/10'
                  : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800/60'
              }`}
              title={showReceived ? 'Моя библиотека' : 'Входящие'}
            >
              {showReceived ? <FolderOpen className="w-5 h-5" /> : <Inbox className="w-5 h-5" />}
              {!showReceived && (totalUnseen > 0 || unreadCount > 0) && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm">
                  {(totalUnseen || unreadCount) > 99 ? '99+' : (totalUnseen || unreadCount)}
                </span>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="shrink-0 flex gap-1 px-4 sm:px-5 pt-3 pb-2">
          {MEDIA_TABS.map(({ type, label, icon: Icon }) => {
            const isActive = activeType === type;
            const count = showReceived
              ? received.filter(i => i.type === type).length
              : tabCounts[type];
            return (
              <button
                key={type}
                onClick={() => { setActiveType(type); setSearch(''); setConfirmDeleteId(null); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                    : 'bg-slate-100 dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
                {showReceived && unseenByType && unseenByType[type] > 0 && (
                  <span className={`min-w-[16px] h-[16px] flex items-center justify-center rounded-full text-[9px] font-bold px-0.5 shadow-sm ${
                    isActive
                      ? 'bg-white/30 text-white'
                      : 'bg-red-500 text-white animate-pulse'
                  }`}>
                    {unseenByType[type] > 99 ? '99+' : unseenByType[type]}
                  </span>
                )}
                {(!showReceived || !unseenByType || unseenByType[type] === 0) && (
                  <span className={`text-[10px] ml-0.5 ${isActive ? 'text-white/70' : 'text-slate-400 dark:text-gray-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="shrink-0 px-4 sm:px-5 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по описанию..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-gray-800/60 text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 border border-transparent focus:border-blue-500/40 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-4 min-h-0">
          {showReceived ? (
            receivedLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              </div>
            ) : receivedFiltered.length === 0 ? (
              <EmptyState type={activeType} search={search} isReceived />
            ) : (
              <div className="flex flex-col gap-3">
                {receivedFiltered.map((item) => (
                  <ReceivedCard
                    key={item.id}
                    item={item}
                    onPreviewImage={onPreviewImage}
                    onDownload={() => downloadFile(item.url, getFilename(item))}
                    onDelete={() => handleDeleteReceived(item.id)}
                  />
                ))}
              </div>
            )
          ) : filtered.length === 0 ? (
            <EmptyState type={activeType} search={search} isReceived={false} />
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map((item) => (
                <OwnCard
                  key={item.id}
                  item={item}
                  onPreviewImage={onPreviewImage}
                  sharedId={sharedId}
                  confirmDeleteId={confirmDeleteId}
                  onNativeShare={() => handleNativeShare(item)}
                  onSendToUser={() => setSendingItem(item)}
                  onDownload={() => downloadFile(item.url, getFilename(item))}
                  onDelete={() => handleDelete(item)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {sendingItem && (
        <SendDialog
          item={sendingItem}
          onClose={() => setSendingItem(null)}
          onSent={() => setSendingItem(null)}
        />
      )}
    </div>,
    document.body
  );
}

function EmptyState({ type, search, isReceived }: { type: MediaType; search: string; isReceived: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-gray-800 flex items-center justify-center mb-4">
        {type === 'image' && <ImageIcon className="w-6 h-6 text-slate-300 dark:text-gray-600" />}
        {type === 'video' && <Video className="w-6 h-6 text-slate-300 dark:text-gray-600" />}
        {type === 'audio' && <AudioLines className="w-6 h-6 text-slate-300 dark:text-gray-600" />}
      </div>
      <p className="text-sm font-medium text-slate-400 dark:text-gray-500">
        {search ? 'Ничего не найдено' : 'Пока пусто'}
      </p>
      <p className="text-xs text-slate-300 dark:text-gray-600 mt-1">
        {!search && (isReceived ? 'Здесь появятся файлы, которые вам отправят' : 'Сгенерируйте контент, и он появится здесь')}
      </p>
    </div>
  );
}

function OwnCard({
  item,
  onPreviewImage,
  sharedId,
  confirmDeleteId,
  onNativeShare,
  onSendToUser,
  onDownload,
  onDelete,
}: {
  item: LibraryItem;
  onPreviewImage?: (url: string) => void;
  sharedId: string | null;
  confirmDeleteId: string | null;
  onNativeShare: () => void;
  onSendToUser: () => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50 dark:bg-gray-900/50 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-gray-700">
      <MediaPreview item={item} onPreviewImage={onPreviewImage} />
      <div className="px-4 py-3">
        <p className="text-xs text-slate-700 dark:text-gray-300 line-clamp-2 leading-relaxed mb-2">{item.label}</p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-gray-600">
            <Calendar className="w-3 h-3" />
            {formatDate(item.timestamp)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onSendToUser}
              className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-500/10 transition-colors"
              title="Отправить пользователю"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNativeShare}
              className={`p-1.5 rounded-lg transition-colors ${
                sharedId === item.id
                  ? 'text-green-500 bg-green-500/10'
                  : 'text-slate-400 dark:text-gray-600 hover:text-blue-500 hover:bg-blue-500/10'
              }`}
              title="Поделиться ссылкой"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDownload}
              className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              title="Скачать"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className={`p-1.5 rounded-lg transition-colors ${
                confirmDeleteId === item.id
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-slate-400 dark:text-gray-600 hover:text-red-500 hover:bg-red-500/10'
              }`}
              title={confirmDeleteId === item.id ? 'Нажмите ещё раз для удаления' : 'Удалить'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceivedCard({
  item,
  onPreviewImage,
  onDownload,
  onDelete,
}: {
  item: ReceivedItem;
  onPreviewImage?: (url: string) => void;
  onDownload: () => void;
  onDelete: () => void;
}) {
  const [confirmDel, setConfirmDel] = useState(false);

  const handleDel = () => {
    if (confirmDel) { onDelete(); return; }
    setConfirmDel(true);
    setTimeout(() => setConfirmDel(false), 3000);
  };

  return (
    <div className="group rounded-2xl border border-slate-200/60 dark:border-gray-800/60 bg-slate-50 dark:bg-gray-900/50 overflow-hidden transition-all hover:border-slate-300 dark:hover:border-gray-700">
      <MediaPreview item={item} onPreviewImage={onPreviewImage} />
      <div className="px-4 py-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <User className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
          </div>
          <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400">@{item.senderNickname}</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-gray-300 line-clamp-2 leading-relaxed mb-2">{item.label}</p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-gray-600">
            <Calendar className="w-3 h-3" />
            {formatDate(item.timestamp)}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={onDownload}
              className="p-1.5 rounded-lg text-slate-400 dark:text-gray-600 hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
              title="Скачать"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDel}
              className={`p-1.5 rounded-lg transition-colors ${
                confirmDel
                  ? 'text-red-500 bg-red-500/10'
                  : 'text-slate-400 dark:text-gray-600 hover:text-red-500 hover:bg-red-500/10'
              }`}
              title={confirmDel ? 'Нажмите ещё раз для удаления' : 'Удалить'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaPreview({ item, onPreviewImage }: { item: LibraryItem | ReceivedItem; onPreviewImage?: (url: string) => void }) {
  if (item.type === 'image') {
    if (!item.url) {
      return (
        <div className="relative w-full aspect-[16/10] overflow-hidden flex items-center justify-center bg-slate-100 dark:bg-gray-800/50">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      );
    }
    return (
      <button
        onClick={() => onPreviewImage?.(item.url)}
        className="relative w-full aspect-[16/10] overflow-hidden cursor-pointer"
      >
        <img src={item.url} alt={item.label} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <Eye className="w-5 h-5 text-slate-700 dark:text-gray-200" />
          </div>
        </div>
      </button>
    );
  }
  if (item.type === 'video') {
    return (
      <div className="relative w-full aspect-video overflow-hidden bg-black">
        <video src={item.url} className="w-full h-full object-contain" controls preload="metadata" />
      </div>
    );
  }
  return (
    <div className="px-4 pt-4">
      <AudioPlayer url={item.url} />
    </div>
  );
}
