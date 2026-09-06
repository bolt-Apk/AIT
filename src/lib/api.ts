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

export async function uploadTTSAudio(audioBlob: Blob) {
  const session = getStoredSession();
  if (!session) throw new Error('Необходима авторизация');
  const form = new FormData();
  form.append('file', audioBlob, 'audio.mp3');
  const response = await fetch(`${apiUrl}/api/storage/tts-audio`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: form,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Не удалось загрузить аудио');
  return body as { url: string };
}
