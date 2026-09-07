import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';

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
    const { data, error } = await supabase
      .from('chat_sessions')
      .select('id, title, model, messages, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(50);
    if (error) {
      console.error('Failed to load chat sessions:', error.message);
      return [];
    }
    return (data || []) as DBChatSession[];
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
      const { data, error } = await supabase
        .from('chat_sessions')
        .update({
          title: session.title,
          model: session.model || null,
          messages: messagesJson,
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.id)
        .select('id')
        .maybeSingle();
      if (error) console.error('Failed to update chat session:', error.message);
      return data?.id || session.id;
    }

    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        title: session.title,
        model: session.model || null,
        messages: messagesJson,
      })
      .select('id')
      .maybeSingle();
    if (error) console.error('Failed to save chat session:', error.message);
    return data?.id || null;
  }, []);

  const deleteChatSession = useCallback(async (id: string) => {
    const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
    if (error) console.error('Failed to delete chat session:', error.message);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const fileName = `${session.user.id}/${crypto.randomUUID()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('tts-audio')
      .upload(fileName, entry.audioBlob, {
        contentType: 'audio/mpeg',
        cacheControl: '31536000',
      });

    if (uploadError) {
      console.error('Failed to upload TTS audio:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('tts-audio')
      .getPublicUrl(fileName);

    const { data, error } = await supabase
      .from('tts_history')
      .insert({
        text: entry.text,
        model: entry.model,
        voice: entry.voice,
        audio_url: urlData.publicUrl,
      })
      .select('id, text, model, voice, audio_url, created_at')
      .maybeSingle();

    if (error) {
      console.error('Failed to save TTS entry:', error.message);
      return null;
    }

    return data as DBTTSEntry;
  }, []);

  const deleteTTSEntry = useCallback(async (id: string) => {
    const { data: row } = await supabase
      .from('tts_history')
      .select('audio_url')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase.from('tts_history').delete().eq('id', id);
    if (error) console.error('Failed to delete TTS entry:', error.message);

    if (row?.audio_url) {
      try {
        const url = new URL(row.audio_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/tts-audio\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('tts-audio').remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch {}
    }
  }, []);

  const loadVideoHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('video_history')
      .select('id, prompt, model, duration, video_url, created_at')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) {
      console.error('Failed to load video history:', error.message);
      return [];
    }
    return (data || []) as DBVideoEntry[];
  }, []);

  const saveVideoEntry = useCallback(async (entry: {
    prompt: string;
    model: string;
    duration: number;
    video_url: string;
  }) => {
    const { data: existing } = await supabase
      .from('video_history')
      .select('id')
      .eq('video_url', entry.video_url)
      .maybeSingle();
    if (existing) return { ...entry, id: existing.id, created_at: '' } as DBVideoEntry;

    const { data, error } = await supabase
      .from('video_history')
      .insert({
        prompt: entry.prompt,
        model: entry.model,
        duration: entry.duration,
        video_url: entry.video_url,
      })
      .select('id, prompt, model, duration, video_url, created_at')
      .maybeSingle();
    if (error) {
      console.error('Failed to save video entry:', error.message);
      return null;
    }
    return data as DBVideoEntry;
  }, []);

  const deleteVideoEntry = useCallback(async (id: string) => {
    const { data: row } = await supabase
      .from('video_history')
      .select('video_url')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase.from('video_history').delete().eq('id', id);
    if (error) console.error('Failed to delete video entry:', error.message);

    if (row?.video_url) {
      await supabase
        .from('pending_generations')
        .delete()
        .eq('result_url', row.video_url);
    }
  }, []);

  const loadImageHistory = useCallback(async () => {
    const { data, error } = await supabase
      .from('image_history')
      .select('id, prompt, model, image_url, created_at')
      .order('created_at', { ascending: true })
      .limit(50);
    if (error) {
      console.error('Failed to load image history:', error.message);
      return [];
    }
    return (data || []) as DBImageEntry[];
  }, []);

  const saveImageEntry = useCallback(async (entry: {
    prompt: string;
    model: string;
    image_url: string;
  }) => {
    const { data, error } = await supabase
      .from('image_history')
      .insert({
        prompt: entry.prompt,
        model: entry.model,
        image_url: entry.image_url,
      })
      .select('id, prompt, model, image_url, created_at')
      .maybeSingle();
    if (error) {
      console.error('Failed to save image entry:', error.message);
      return null;
    }
    return data as DBImageEntry;
  }, []);

  const deleteImageEntry = useCallback(async (id: string) => {
    const { data: row } = await supabase
      .from('image_history')
      .select('image_url')
      .eq('id', id)
      .maybeSingle();

    const { error } = await supabase.from('image_history').delete().eq('id', id);
    if (error) console.error('Failed to delete image entry:', error.message);

    if (row?.image_url) {
      try {
        const url = new URL(row.image_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/generated-images\/(.+)/);
        if (pathMatch) {
          await supabase.storage.from('generated-images').remove([decodeURIComponent(pathMatch[1])]);
        }
      } catch {}
    }
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
