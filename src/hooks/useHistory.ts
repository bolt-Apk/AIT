import { useCallback } from 'react';
import { createHistory, deleteHistory, getHistory, updateHistory, uploadTTSAudio } from '@/lib/api';

export interface DBChatSession {
  id: string;
  title: string;
  model: string | null;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'error' | 'system';
    content: string;
    imageUrl?: string;
    attachedImage?: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface DBTTSEntry {
  id: string;
  text: string;
  model: string;
  voice: string;
  audio_url: string;
  created_at: string;
}

export interface DBVideoEntry {
  id: string;
  prompt: string;
  model: string;
  duration: number;
  video_url: string;
  created_at: string;
}

export interface DBImageEntry {
  id: string;
  prompt: string;
  model: string;
  image_url: string;
  created_at: string;
}

export function useHistory() {
  const loadChatSessions = useCallback(async () => {
    try {
      return await getHistory<DBChatSession>('chat');
    } catch (error) {
      console.error('Failed to load chat sessions:', error);
      return [];
    }
  }, []);

  const saveChatSession = useCallback(async (session: {
    id?: string;
    title: string;
    model?: string;
    messages: Array<{
      id: string;
      role: string;
      content: string;
      imageUrl?: string;
      attachedImage?: string;
      timestamp: Date;
    }>;
  }) => {
    const messagesJson = session.messages.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    }));

    if (session.id) {
      try {
        const data = await updateHistory<DBChatSession>('chat', session.id, {
          title: session.title,
          model: session.model || null,
          messages: messagesJson,
        });
        return data.id;
      } catch (error) {
        console.error('Failed to update chat session:', error);
        return session.id;
      }
    }

    try {
      const data = await createHistory<DBChatSession>('chat', {
        title: session.title,
        model: session.model || null,
        messages: messagesJson,
      });
      return data.id;
    } catch (error) {
      console.error('Failed to save chat session:', error);
      return null;
    }
  }, []);

  const deleteChatSession = useCallback(async (id: string) => {
    try { await deleteHistory('chat', id); }
    catch (error) { console.error('Failed to delete chat session:', error); }
  }, []);

  const loadTTSHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('tts_history')
      .select('id, text, model, voice, audio_url, created_at')
      .order('created_at', { ascending: true })
      .limit(100);
    if (error) {
      console.error('Failed to load TTS history:', error.message);
      return [];
    }
    return (data || []) as DBTTSEntry[];
  }, []);

  const saveTTSEntry = useCallback(async (entry: {
    text: string;
    model: string;
    voice: string;
    audioBlob: Blob;
  }) => {
    try {
      const { url } = await uploadTTSAudio(entry.audioBlob);
      return await createHistory<DBTTSEntry>('tts', {
        text: entry.text,
        model: entry.model,
        voice: entry.voice,
        audio_url: url,
      });
    } catch (error) {
      console.error('Failed to save TTS entry:', error);
      return null;
    }
  }, []);

  const deleteTTSEntry = useCallback(async (id: string) => {
    try { await deleteHistory('tts', id); }
    catch (error) { console.error('Failed to delete TTS entry:', error); }
  }, []);

  const loadVideoHistory = useCallback(async () => {
    try { return await getHistory<DBVideoEntry>('video'); }
    catch (error) { console.error('Failed to load video history:', error); return []; }
  }, []);

  const saveVideoEntry = useCallback(async (entry: {
    prompt: string;
    model: string;
    duration: number;
    video_url: string;
  }) => {
    try { return await createHistory<DBVideoEntry>('video', entry); }
    catch (error) { console.error('Failed to save video entry:', error); return null; }
  }, []);

  const deleteVideoEntry = useCallback(async (id: string) => {
    try { await deleteHistory('video', id); }
    catch (error) { console.error('Failed to delete video entry:', error); }
  }, []);

  const loadImageHistory = useCallback(async () => {
    try { return await getHistory<DBImageEntry>('image'); }
    catch (error) { console.error('Failed to load image history:', error); return []; }
  }, []);

  const saveImageEntry = useCallback(async (entry: {
    prompt: string;
    model: string;
    image_url: string;
  }) => {
    try { return await createHistory<DBImageEntry>('image', entry); }
    catch (error) { console.error('Failed to save image entry:', error); return null; }
  }, []);

  const deleteImageEntry = useCallback(async (id: string) => {
    try { await deleteHistory('image', id); }
    catch (error) { console.error('Failed to delete image entry:', error); }
  }, []);

  return {
    loadChatSessions,
    saveChatSession,
    deleteChatSession,
    loadTTSHistory,
    saveTTSEntry,
    deleteTTSEntry,
    loadVideoHistory,
    saveVideoEntry,
    deleteVideoEntry,
    loadImageHistory,
    saveImageEntry,
    deleteImageEntry,
  };
}
