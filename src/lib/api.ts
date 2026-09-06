export interface ApiUser {
  id: string;
  email: string;
  user_metadata?: { display_name?: string };
}

export interface ApiSession {
  access_token: string;
  user: ApiUser;
}

const apiUrl = import.meta.env.VITE_API_URL ?? '';
const sessionKey = 'aitaip-session';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Ошибка сервера');
  return body as T;
}

export function getStoredSession(): ApiSession | null {
  try {
    const value = localStorage.getItem(sessionKey);
    return value ? JSON.parse(value) as ApiSession : null;
  } catch {
    return null;
  }
}

export function storeSession(session: ApiSession | null) {
  if (session) localStorage.setItem(sessionKey, JSON.stringify(session));
  else localStorage.removeItem(sessionKey);
}

export function register(email: string, password: string) {
  return request<ApiSession>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function login(email: string, password: string) {
  return request<ApiSession>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getCurrentUser(token: string) {
  return request<{ user: ApiUser }>('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getBalance() {
  return authenticatedRequest<{ tokens: number }>('/api/balance');
}

export function getFullBalance() {
  return authenticatedRequest<{
    tokens: number;
    referral_code: string | null;
    referred_by: string | null;
    total_referral_earnings: number;
    banned_at: string | null;
    ban_reason: string | null;
    nickname: string | null;
  }>('/api/balance/full');
}

export function updateProfile(value: { display_name?: string; nickname?: string }) {
  return authenticatedRequest<{ user: ApiUser & { nickname?: string | null } }>('/api/profile', {
    method: 'PUT',
    body: JSON.stringify(value),
  });
}

export function updatePassword(password: string) {
  return authenticatedRequest<{ ok: true }>('/api/profile/password', {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });
}

export function sendPresence(value: { device_type: string; user_agent: string }) {
  return authenticatedRequest<{ ok: true }>('/api/presence', {
    method: 'PUT',
    body: JSON.stringify(value),
  });
}

async function authenticatedRequest<T>(path: string, options: RequestInit = {}) {
  const session = getStoredSession();
  if (!session) throw new Error('Необходима авторизация');
  return request<T>(path, {
    ...options,
    headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers ?? {}) },
  });
}

// Raw authenticated fetch (for binary responses like TTS)
export async function authenticatedFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const session = getStoredSession();
  if (!session) throw new Error('Необходима авторизация');
  return fetch(`${apiUrl}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${session.access_token}`, ...(options.headers ?? {}) },
  });
}

// ---- History ----
export function getHistory<T>(type: 'chat' | 'tts' | 'video' | 'image') {
  return authenticatedRequest<T[]>(`/api/history/${type}`);
}

export function createHistory<T>(type: 'chat' | 'tts' | 'video' | 'image', value: unknown) {
  return authenticatedRequest<T>(`/api/history/${type}`, {
    method: 'POST',
    body: JSON.stringify(value),
  });
}

export function updateHistory<T>(type: 'chat' | 'tts' | 'video' | 'image', id: string, value: unknown) {
  return authenticatedRequest<T>(`/api/history/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(value),
  });
}

export function deleteHistory(type: 'chat' | 'tts' | 'video' | 'image', id: string) {
  return authenticatedRequest<void>(`/api/history/${type}/${id}`, { method: 'DELETE' });
}

// ---- File uploads ----
export async function uploadFile(bucket: string, file: Blob, filename?: string) {
  const session = getStoredSession();
  if (!session) throw new Error('Необходима авторизация');
  const form = new FormData();
  form.append('file', file, filename || 'file');
  const response = await fetch(`${apiUrl}/api/storage/${bucket}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Не удалось загрузить файл');
  return body as { url: string };
}

export function uploadTTSAudio(audioBlob: Blob) {
  return uploadFile('tts-audio', audioBlob, 'audio.mp3');
}

export function uploadVideoInput(file: Blob, filename?: string) {
  return uploadFile('video-inputs', file, filename);
}

export function uploadSupportAttachment(file: Blob, filename?: string) {
  return uploadFile('support-attachments', file, filename);
}

// ---- AI endpoints ----
export function chatCompletion(body: Record<string, unknown>) {
  return authenticatedRequest<Record<string, unknown>>('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function generateImage(body: Record<string, unknown>) {
  return authenticatedRequest<Record<string, unknown>>('/api/ai/image', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitVideo(body: Record<string, unknown>) {
  return authenticatedRequest<{ status: string; generation_id: string; url?: string; estimated_cost?: number; cost?: number; charged?: boolean }>('/api/ai/video', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function pollVideo(generationId: string) {
  return authenticatedRequest<{ status: string; url?: string; error?: string; detail?: string }>(`/api/ai/video?id=${encodeURIComponent(generationId)}`);
}

export async function textToSpeech(body: Record<string, unknown>) {
  const resp = await authenticatedFetch('/api/ai/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({})) as any;
    throw new Error(err.error || 'Не удалось озвучить текст');
  }
  const costRubles = parseFloat(resp.headers.get('X-Cost-Rubles') || '0');
  const balanceRemaining = parseFloat(resp.headers.get('X-Balance-Remaining') || '0');
  const audioBlob = await resp.blob();
  return { audioBlob, costRubles, balanceRemaining, contentType: resp.headers.get('Content-Type') || 'audio/mpeg' };
}

export function speechToText(body: Record<string, unknown>) {
  return authenticatedRequest<{ text: string; duration: number }>('/api/ai/stt', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---- Payments ----
export function createPayment(tokens: number) {
  return authenticatedRequest<{ payment_url: string; payment_id: string }>('/api/payments/create', {
    method: 'POST',
    body: JSON.stringify({ tokens }),
  });
}

export function registerReferral(referral_code: string) {
  return authenticatedRequest<{ ok: boolean; message: string }>('/api/referrals/register', {
    method: 'POST',
    body: JSON.stringify({ referral_code }),
  });
}

// ---- Shared media ----
export function searchNicknames(q: string) {
  return authenticatedRequest<Array<{ user_id: string; nickname: string }>>(`/api/nicknames/search?q=${encodeURIComponent(q)}`);
}

export function sendSharedMedia(body: { receiver_nickname: string; media_type: string; media_url: string; label?: string; prompt?: string; model?: string }) {
  return authenticatedRequest<{ success: boolean }>('/api/shared-media/send', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function getReceivedMedia() {
  return authenticatedRequest<Array<Record<string, unknown>>>('/api/shared-media/received');
}

export function getSentMedia() {
  return authenticatedRequest<Array<Record<string, unknown>>>('/api/shared-media/sent');
}

export function markMediaSeen(id: string) {
  return authenticatedRequest<{ ok: boolean }>(`/api/shared-media/${id}/seen`, { method: 'PUT' });
}

export function deleteSharedMedia(id: string) {
  return authenticatedRequest<void>(`/api/shared-media/${id}`, { method: 'DELETE' });
}

export function getUnseenMediaCount() {
  return authenticatedRequest<{ count: number }>('/api/shared-media/unseen-count');
}

// ---- Admin ----
export function adminAction(action: string, body?: Record<string, unknown>) {
  return authenticatedRequest<Record<string, unknown>>('/api/admin', {
    method: 'POST',
    body: JSON.stringify({ action, ...body }),
  });
}

export function adminGet(action: string) {
  return authenticatedRequest<Record<string, unknown>>(`/api/admin?action=${action}`);
}

// ---- Pending generations ----
export function getPendingGenerations() {
  return authenticatedRequest<Array<Record<string, unknown>>>('/api/pending-generations');
}

// ---- App settings ----
export function getAppSettings() {
  return request<{ free_mode: boolean }>('/api/app-settings');
}

// ---- Support polling ----
export function pollSupportMessages(ticketId: string, after: string) {
  return authenticatedRequest<{ messages: Array<Record<string, unknown>> }>(`/api/support/poll?ticket_id=${encodeURIComponent(ticketId)}&after=${encodeURIComponent(after)}`);
}
