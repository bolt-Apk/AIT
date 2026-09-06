import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { getStoredSession, uploadSupportAttachment, pollSupportMessages } from '@/lib/api';
import {
  ArrowLeft,
  Send,
  Paperclip,
  Mic,
  Square,
  Image as ImageIcon,
  Video,
  Loader2,
  CheckCheck,
  Clock,
  Headphones,
  X,
  Trash2,
} from 'lucide-react';
import ImageViewer from '@/components/ImageViewer';
import { useSignedSupportUrls } from '@/lib/supportMedia';

interface Ticket {
  id: string;
  subject: string;
  status: string;
  last_message_at: string;
  unread_user: number;
  created_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender: 'user' | 'admin';
  content: string | null;
  media_url: string | null;
  media_type: 'text' | 'image' | 'video' | 'audio';
  created_at: string;
}

export default function SupportChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const signedMedia = useSignedSupportUrls(messages.map((m) => m.media_url));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  // Load or create ticket
  useEffect(() => {
    if (!user) return;
    (async () => {
      const session = getStoredSession();
      const response = await fetch('/api/support/ticket', { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (response.ok) setTicket(await response.json());
      setLoading(false);
    })();
  }, [user]);

  // Load messages
  useEffect(() => {
    if (!ticket) return;
    (async () => {
      const session = getStoredSession();
      const response = await fetch(`/api/support/tickets/${ticket.id}/messages`, { headers: { Authorization: `Bearer ${session?.access_token}` } });
      if (response.ok) {
        setMessages(await response.json());
        scrollToBottom();
      }
    })();
  }, [ticket, scrollToBottom]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!ticket) return;
    let lastMessageTime = messages.length > 0
      ? messages[messages.length - 1].created_at
      : new Date(0).toISOString();

    const interval = setInterval(async () => {
      try {
        const data = await pollSupportMessages(ticket.id, lastMessageTime);
        if (data.messages && data.messages.length > 0) {
          const newMsgs = data.messages as Message[];
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const unique = newMsgs.filter(m => !existingIds.has(m.id));
            if (unique.length === 0) return prev;
            return [...prev, ...unique];
          });
          lastMessageTime = newMsgs[newMsgs.length - 1].created_at;
          scrollToBottom();
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [ticket, scrollToBottom]);

  const sendMessage = async (content: string | null, mediaUrl: string | null, mediaType: 'text' | 'image' | 'video' | 'audio') => {
    if (!ticket) return;
    setSending(true);
    try {
      const session = getStoredSession();
      await fetch(`/api/support/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, media_url: mediaUrl, media_type: mediaType }),
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendMessage(text, null, 'text');
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const result = await uploadSupportAttachment(file, file.name);
      return result.url;
    } catch {
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const url = await uploadFile(file);
      if (!url) return;
      let type: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      await sendMessage(null, url, type);
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (cancelledRef.current) { cancelledRef.current = false; return; }
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size < 500) return;
        setUploading(true);
        try {
          const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
          const file = new File([blob], `voice_${Date.now()}.${ext}`, { type: mimeType });
          const url = await uploadFile(file);
          if (url) await sendMessage(null, url, 'audio');
        } finally {
          setUploading(false);
        }
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch { /* mic denied */ }
  };

  const cancelledRef = useRef(false);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
    clearInterval(timerRef.current);
  };

  const cancelRecording = () => {
    cancelledRef.current = true;
    stopRecording();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        <p className="text-sm text-slate-400 dark:text-gray-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-3 sm:px-5 pt-[max(12px,var(--sat))] sm:pt-4 pb-3 sm:pb-4 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100/50 dark:hover:bg-gray-800/50 active:scale-90 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <Headphones className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-gray-100">Техподдержка</h1>
          <p className="text-[11px] text-emerald-500 font-medium">Онлайн</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-3 sm:px-5 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 dark:from-cyan-500/20 dark:to-blue-500/20 flex items-center justify-center">
                <Headphones className="w-8 h-8 text-blue-400" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-gray-300">Чат с поддержкой</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 max-w-xs">
                  Опишите вашу проблему, прикрепите фото или видео. Мы ответим как можно скорее.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            const mediaUrl = msg.media_url ? signedMedia[msg.media_url] : null;
            return (
              <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 ${
                  isUser
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-slate-100 dark:bg-gray-800/80 text-slate-800 dark:text-gray-100 rounded-bl-md'
                }`}>
                  {msg.media_type === 'image' && mediaUrl && (
                    <img src={mediaUrl} alt="" className="rounded-xl max-w-full max-h-60 object-cover mb-1.5 cursor-pointer" onClick={() => setViewerImage(mediaUrl)} />
                  )}
                  {msg.media_type === 'video' && mediaUrl && (
                    <video src={mediaUrl} controls className="rounded-xl max-w-full max-h-60 mb-1.5" />
                  )}
                  {msg.media_type === 'audio' && mediaUrl && (
                    <audio src={mediaUrl} controls className="max-w-full mb-1.5" />
                  )}
                  {msg.content && (
                    <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                  <div className={`flex items-center gap-1 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] ${isUser ? 'text-blue-200' : 'text-slate-400 dark:text-gray-500'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isUser && <CheckCheck className="w-3 h-3 text-blue-200" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-slate-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg px-3 sm:px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || recording}
            className="shrink-0 p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 active:scale-90 transition-all disabled:opacity-40"
            title="Прикрепить файл"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
          </button>

          {recording ? (
            <>
              <button
                onClick={cancelRecording}
                className="shrink-0 p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:text-red-500 hover:bg-red-500/10 active:scale-90 transition-all"
                title="Отменить"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200/50 dark:border-red-500/20">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-sm font-medium text-red-600 dark:text-red-400 tabular-nums">{formatTime(recordingTime)}</span>
                <span className="text-xs text-red-400 dark:text-red-500">Запись...</span>
              </div>
            </>
          ) : (
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
              }}
              placeholder="Сообщение..."
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-slate-200/60 dark:border-gray-700/50 bg-slate-50 dark:bg-gray-800/50 px-4 py-2.5 text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
            />
          )}

          {recording ? (
            <button
              onClick={stopRecording}
              className="shrink-0 p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 active:scale-90 transition-all shadow-md shadow-blue-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : input.trim() ? (
            <button
              onClick={handleSendText}
              disabled={sending}
              className="shrink-0 p-2.5 rounded-xl bg-blue-500 text-white hover:bg-blue-600 active:scale-90 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={uploading}
              className="shrink-0 p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:text-blue-500 hover:bg-blue-500/10 active:scale-90 transition-all disabled:opacity-40"
              title="Голосовое сообщение"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />
      )}
    </div>
  );
}
