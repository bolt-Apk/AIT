import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, getFreshSession } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Send,
  Paperclip,
  Loader2,
  CheckCheck,
  Headphones,
  User,
  ChevronLeft,
  Clock,
  Coins,
  Check,
  X,
  Search,
  Mic,
  Square,
  Trash2,
  Pencil,
} from 'lucide-react';
import ImageViewer from '@/components/ImageViewer';
import { useSignedSupportUrls } from '@/lib/supportMedia';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  status: string;
  last_message_at: string;
  unread_admin: number;
  created_at: string;
  user_email?: string;
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

export default function AdminSupportChat() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const signedMedia = useSignedSupportUrls(messages.map((m) => m.media_url));
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [deletingTicket, setDeletingTicket] = useState<string | null>(null);
  const [userTyping, setUserTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  const getAuthHeaders = useCallback(async () => {
    const session = await getFreshSession();
    return {
      Authorization: `Bearer ${session?.access_token}`,
      'Content-Type': 'application/json',
    };
  }, []);

  // Load tickets via admin-data edge function
  const loadTickets = useCallback(async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'get_support_tickets' }) }
      );
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
      }
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { loadTickets(); }, [loadTickets]);

  // Load messages for selected ticket
  useEffect(() => {
    if (!selectedTicket) return;
    (async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'get_support_messages', ticket_id: selectedTicket.id }) }
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
      // Mark as read
      if (selectedTicket.unread_admin > 0) {
        const h = await getAuthHeaders();
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
          { method: 'POST', headers: h, body: JSON.stringify({ action: 'mark_ticket_read', ticket_id: selectedTicket.id }) }
        );
        setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, unread_admin: 0 } : t));
      }
    })();
  }, [selectedTicket, getAuthHeaders, scrollToBottom]);

  // Realtime for new messages + typing indicator
  useEffect(() => {
    const channel = supabase
      .channel('admin-support')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      }, (payload) => {
        const newMsg = payload.new as Message;
        if (selectedTicket && newMsg.ticket_id === selectedTicket.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          scrollToBottom();
          if (newMsg.sender === 'user') setUserTyping(false);
        }
        loadTickets();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedTicket, scrollToBottom, loadTickets]);

  // Listen for user typing via broadcast
  useEffect(() => {
    if (!selectedTicket) return;
    const channel = supabase.channel(`typing-${selectedTicket.id}`)
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.sender === 'user') {
          setUserTyping(true);
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setUserTyping(false), 3000);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); setUserTyping(false); };
  }, [selectedTicket]);

  const broadcastTyping = useCallback(() => {
    if (!selectedTicket) return;
    supabase.channel(`typing-${selectedTicket.id}`).send({ type: 'broadcast', event: 'typing', payload: { sender: 'admin' } });
  }, [selectedTicket]);

  const sendAdminMessage = async (content: string | null, mediaUrl: string | null, mediaType: 'text' | 'image' | 'video' | 'audio') => {
    if (!selectedTicket) return;
    setSending(true);
    try {
      const headers = await getAuthHeaders();
      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
        {
          method: 'POST', headers,
          body: JSON.stringify({
            action: 'send_support_message',
            ticket_id: selectedTicket.id,
            content,
            media_url: mediaUrl,
            media_type: mediaType,
          }),
        }
      );
    } finally {
      setSending(false);
    }
  };

  const handleSendText = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    await sendAdminMessage(text, null, 'text');
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `admin/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('support-attachments').upload(path, file);
    if (error) return null;
    const { data } = await supabase.storage.from('support-attachments').createSignedUrl(path, 60 * 60);
    return data?.signedUrl ?? null;
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
      await sendAdminMessage(null, url, type);
    } finally {
      setUploading(false);
    }
  };

  const handleTopUp = async () => {
    if (!selectedTicket || !topUpAmount) return;
    const amount = parseFloat(topUpAmount);
    if (isNaN(amount) || amount <= 0) return;
    setTopUpLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
        {
          method: 'POST', headers,
          body: JSON.stringify({
            action: 'top_up_user_balance',
            user_id: selectedTicket.user_id,
            amount,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTopUpAmount('');
        setShowTopUp(false);
        await sendAdminMessage(`Баланс пополнен на ${amount.toFixed(2)} ₽`, null, 'text');
      } else {
        alert(data?.error || 'Ошибка пополнения баланса');
      }
    } catch {
      alert('Ошибка сети');
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Удалить этот диалог? Все сообщения будут удалены.')) return;
    setDeletingTicket(ticketId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
        { method: 'POST', headers, body: JSON.stringify({ action: 'delete_support_ticket', ticket_id: ticketId }) }
      );
      if (res.ok) {
        setTickets(prev => prev.filter(t => t.id !== ticketId));
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(null);
          setMessages([]);
        }
      }
    } finally {
      setDeletingTicket(null);
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
          const file = new File([blob], `admin_voice_${Date.now()}.${ext}`, { type: mimeType });
          const url = await uploadFile(file);
          if (url) await sendAdminMessage(null, url, 'audio');
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

  const filteredTickets = tickets.filter(t =>
    !search || (t.user_email || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = tickets.reduce((s, t) => s + t.unread_admin, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] rounded-xl border border-gray-800 overflow-hidden bg-gray-950">
      {/* Ticket list sidebar */}
      <div className={`${selectedTicket ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 lg:w-96 border-r border-gray-800 bg-gray-900/50`}>
        <div className="p-3 border-b border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по email..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Headphones className="w-8 h-8 mb-2" />
              <p className="text-sm">Нет обращений</p>
            </div>
          ) : (
            filteredTickets.map(ticket => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`group w-full flex items-center gap-3 px-4 py-3 text-left border-b border-gray-800/50 transition-colors ${
                  selectedTicket?.id === ticket.id
                    ? 'bg-blue-500/10 border-l-2 border-l-blue-500'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">{ticket.user_email || 'Пользователь'}</p>
                  <p className="text-[11px] text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(ticket.last_message_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {ticket.unread_admin > 0 && (
                    <span className="min-w-[20px] h-[20px] flex items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold px-1.5">
                      {ticket.unread_admin}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteTicket(ticket.id); }}
                    disabled={deletingTicket === ticket.id}
                    className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Удалить диалог"
                  >
                    {deletingTicket === ticket.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`${selectedTicket ? 'flex' : 'hidden md:flex'} flex-col flex-1 bg-gray-950`}>
        {selectedTicket ? (
          <>
            {/* Chat header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center">
                  <User className="w-4 h-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{selectedTicket.user_email || 'Пользователь'}</p>
                  <p className="text-[11px] text-gray-500">{selectedTicket.user_id.slice(0, 8)}...</p>
                </div>
              </div>
              <button
                onClick={() => setShowTopUp(!showTopUp)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  showTopUp ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                Пополнить баланс
              </button>
            </div>

            {/* Top-up bar */}
            {showTopUp && (
              <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-emerald-500/5 border-b border-emerald-500/20">
                <Coins className="w-4 h-4 text-emerald-400" />
                <input
                  value={topUpAmount}
                  onChange={(e) => setTopUpAmount(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="Сумма ₽"
                  className="w-32 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTopUp(); }}
                />
                <button
                  onClick={handleTopUp}
                  disabled={topUpLoading || !topUpAmount}
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {topUpLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => { setShowTopUp(false); setTopUpAmount(''); }}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
                {messages.map((msg) => {
                  const isAdmin = msg.sender === 'admin';
                  const mediaUrl = msg.media_url ? signedMedia[msg.media_url] : null;
                  return (
                    <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        isAdmin
                          ? 'bg-blue-500 text-white rounded-br-md'
                          : 'bg-gray-800/80 text-gray-100 rounded-bl-md'
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
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[10px] ${isAdmin ? 'text-blue-200' : 'text-gray-500'}`}>
                            {new Date(msg.created_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isAdmin && <CheckCheck className="w-3 h-3 text-blue-200" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {userTyping && (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-500">печатает...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 border-t border-gray-800 bg-gray-900/50 px-4 py-3">
              <div className="max-w-2xl mx-auto flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || recording}
                  className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </button>

                {recording ? (
                  <>
                    <button
                      onClick={cancelRecording}
                      className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all"
                      title="Отменить"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <div className="flex-1 flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-sm font-medium text-red-400 tabular-nums">{formatTime(recordingTime)}</span>
                      <span className="text-xs text-red-500">Запись...</span>
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
                      broadcastTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); }
                    }}
                    placeholder="Ответ..."
                    rows={1}
                    className="flex-1 resize-none rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                  />
                )}

                {recording ? (
                  <button onClick={stopRecording} className="shrink-0 p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 active:scale-90 transition-all shadow-md shadow-blue-500/20">
                    <Send className="w-5 h-5" />
                  </button>
                ) : input.trim() ? (
                  <button
                    onClick={handleSendText}
                    disabled={sending}
                    className="shrink-0 p-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                ) : (
                  <button
                    onClick={startRecording}
                    disabled={uploading}
                    className="shrink-0 p-2 rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-800 transition-colors disabled:opacity-40"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-500">
            <Headphones className="w-12 h-12" />
            <p className="text-sm">Выберите обращение</p>
          </div>
        )}
      </div>
      {viewerImage && (
        <ImageViewer src={viewerImage} onClose={() => setViewerImage(null)} />
      )}
    </div>
  );
}

export function useSupportUnread() {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('admin-support-unread')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'support_tickets',
      }, () => {
        loadUnread();
      })
      .subscribe();

    async function loadUnread() {
      try {
        const session = await getFreshSession();
        if (!session) return;
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'get_support_unread' }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setUnread(data.unread || 0);
        }
      } catch {}
    }

    loadUnread();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return unread;
}
