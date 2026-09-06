import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, Film, Music, FileVideo, FileAudio, Play, Square } from 'lucide-react';
import SlashCommandMenu, { useSlashCommands } from '@/components/SlashCommandMenu';

export type MediaType = 'image' | 'video' | 'audio';

export interface AttachedImage {
  id: string;
  dataUrl: string;
  label: string;
  role: 'first' | 'last' | 'ref' | 'none';
  mediaType: MediaType;
  fileName?: string;
  duration?: number;
}

interface VideoPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  images: AttachedImage[];
  onImagesChange: (images: AttachedImage[]) => void;
  maxImages: number;
  supportsFirstFrame: boolean;
  supportsLastFrame: boolean;
  supportsReferences: boolean;
  disabled?: boolean;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  canAttachMore?: boolean;
  onAttachClick?: () => void;
  supportsVideoRefs?: boolean;
  supportsAudioRefs?: boolean;
  maxVideoRefs?: number;
  maxAudioRefs?: number;
}

const ROLE_STYLES: Record<string, { border: string; ring: string; bg: string; text: string; label: string }> = {
  first: { border: 'border-emerald-500/40', ring: 'ring-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Начало' },
  last: { border: 'border-amber-500/40', ring: 'ring-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', label: 'Конец' },
  ref: { border: 'border-sky-500/40', ring: 'ring-sky-500/30', bg: 'bg-sky-500/10', text: 'text-sky-400', label: 'Референс' },
  none: { border: 'border-slate-300/40 dark:border-gray-600/40', ring: 'ring-slate-300/20 dark:ring-gray-600/20', bg: 'bg-slate-100/50 dark:bg-gray-800/30', text: 'text-slate-400 dark:text-gray-500', label: '' },
};

const IMAGE_MARKER_RE = /\[@img:([a-zA-Z0-9_-]+)\]/g;

export function stripImageMarkers(text: string): string {
  return text.replace(IMAGE_MARKER_RE, '').replace(/\s{2,}/g, ' ').trim();
}

export function getImageMarkerIds(text: string): string[] {
  const ids: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(IMAGE_MARKER_RE.source, 'g');
  while ((m = re.exec(text)) !== null) ids.push(m[1]);
  return ids;
}

export default function VideoPromptInput({
  value,
  onChange,
  onKeyDown,
  placeholder,
  images,
  onImagesChange,
  maxImages,
  supportsFirstFrame,
  supportsLastFrame,
  supportsReferences,
  disabled,
  textareaRef: externalRef,
  canAttachMore,
  onAttachClick,
  supportsVideoRefs,
  supportsAudioRefs,
  maxVideoRefs = 0,
  maxAudioRefs = 0,
}: VideoPromptInputProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const taRef = externalRef || internalRef;
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });
  const [mentionFilter, setMentionFilter] = useState('');
  const mentionStartRef = useRef<number>(-1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [roleMenuImageId, setRoleMenuImageId] = useState<string | null>(null);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    const currentImages = images.filter(i => i.mediaType === 'image' || !i.mediaType);
    const currentVideos = images.filter(i => i.mediaType === 'video');
    const currentAudios = images.filter(i => i.mediaType === 'audio');

    fileArr.forEach(file => {
      if (file.size > 100 * 1024 * 1024) return;
      let mediaType: MediaType;
      if (file.type.startsWith('image/')) mediaType = 'image';
      else if (file.type.startsWith('video/')) mediaType = 'video';
      else if (file.type.startsWith('audio/')) mediaType = 'audio';
      else return;

      if (mediaType === 'image' && currentImages.length >= maxImages) return;
      if (mediaType === 'video' && currentVideos.length >= maxVideoRefs) return;
      if (mediaType === 'audio' && currentAudios.length >= maxAudioRefs) return;
      if (mediaType === 'video' && !supportsVideoRefs) return;
      if (mediaType === 'audio' && !supportsAudioRefs) return;

      const reader = new FileReader();
      reader.onload = () => {
        const id = Math.random().toString(36).slice(2, 8);
        const labels: Record<MediaType, string> = { image: 'Изображение', video: 'Видео', audio: 'Аудио' };
        const count = images.filter(i => (i.mediaType || 'image') === mediaType).length;
        onImagesChange([...images, {
          id,
          dataUrl: reader.result as string,
          label: `${labels[mediaType]} ${count + 1}`,
          role: mediaType === 'image' ? 'none' : 'ref',
          mediaType,
          fileName: file.name,
        }]);
        if (mediaType === 'image') currentImages.push({} as AttachedImage);
        else if (mediaType === 'video') currentVideos.push({} as AttachedImage);
        else currentAudios.push({} as AttachedImage);
      };
      reader.readAsDataURL(file);
    });
  }, [images, maxImages, maxVideoRefs, maxAudioRefs, supportsVideoRefs, supportsAudioRefs, onImagesChange]);

  const removeImage = useCallback((id: string) => {
    if (playingAudioId === id && audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
      setPlayingAudioId(null);
    }
    onImagesChange(images.filter(i => i.id !== id));
    const marker = `[@img:${id}]`;
    if (value.includes(marker)) {
      onChange(value.replace(marker, '').replace(/\s{2,}/g, ' ').trim());
    }
  }, [images, onImagesChange, value, onChange, playingAudioId]);

  const setRole = useCallback((id: string, role: AttachedImage['role']) => {
    onImagesChange(images.map(img => {
      if (img.id === id) return { ...img, role };
      if (role !== 'none' && (role === 'first' || role === 'last') && img.role === role) {
        return { ...img, role: 'none' as const };
      }
      return img;
    }));
    setRoleMenuImageId(null);
  }, [images, onImagesChange]);

  const videoSlash = useSlashCommands('video', taRef, value, onChange);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    videoSlash.slashHandleChange(e);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';

    const newVal = e.target.value;
    const cursor = el.selectionStart;
    const textBefore = newVal.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');

    if (atIdx !== -1 && images.length > 0) {
      const textAfterAt = textBefore.slice(atIdx + 1);
      if (!/\s/.test(textAfterAt) && textAfterAt.length < 30) {
        mentionStartRef.current = atIdx;
        setMentionFilter(textAfterAt.toLowerCase());
        const rect = el.getBoundingClientRect();
        setMentionPos({
          top: Math.max(rect.top - 220, 48),
          left: Math.min(rect.left + 16, window.innerWidth - 260),
        });
        setMentionOpen(true);
        return;
      }
    }
    setMentionOpen(false);
  }, [onChange, images, videoSlash]);

  const insertMention = useCallback((img: AttachedImage) => {
    const ta = taRef.current;
    if (!ta) return;
    const start = mentionStartRef.current;
    const cursor = ta.selectionStart;
    const before = value.slice(0, start);
    const after = value.slice(cursor);
    const marker = `[@img:${img.id}] `;
    const newVal = before + marker + after;
    onChange(newVal);
    setMentionOpen(false);
    requestAnimationFrame(() => {
      const pos = start + marker.length;
      ta.setSelectionRange(pos, pos);
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    });
  }, [value, onChange, taRef]);

  const filteredImages = useMemo(() => {
    if (!mentionFilter) return images;
    return images.filter(img =>
      img.label.toLowerCase().includes(mentionFilter) || img.id.includes(mentionFilter)
    );
  }, [images, mentionFilter]);

  const handleKeyDownInternal = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen) {
      if (e.key === 'Escape') { e.preventDefault(); setMentionOpen(false); return; }
      if (e.key === 'Enter' && filteredImages.length > 0) { e.preventDefault(); insertMention(filteredImages[0]); return; }
    }
    if (videoSlash.slashHandleKeyDown(e)) return;
    onKeyDown?.(e);
  }, [mentionOpen, filteredImages, insertMention, onKeyDown, videoSlash]);

  const syncScroll = useCallback(() => {
    if (taRef.current && overlayRef.current) overlayRef.current.scrollTop = taRef.current.scrollTop;
  }, [taRef]);

  const renderedOverlay = useMemo(() => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const re = new RegExp(IMAGE_MARKER_RE.source, 'g');
    let match: RegExpExecArray | null;
    while ((match = re.exec(value)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`t${lastIndex}`} className="invisible">{value.slice(lastIndex, match.index)}</span>);
      }
      const img = images.find(i => i.id === match![1]);
      if (img) {
        const rs = ROLE_STYLES[img.role];
        const isVideo = img.mediaType === 'video';
        const isAudio = img.mediaType === 'audio';
        parts.push(
          <span key={`m${match.index}`} className={`inline-flex items-center gap-0.5 ${rs.bg} border ${rs.border} rounded px-1 py-px mx-0.5 align-baseline overflow-hidden`} style={{ maxWidth: `${match[0].length}ch` }}>
            {isVideo ? (
              <Film className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
            ) : isAudio ? (
              <Music className="w-3.5 h-3.5 shrink-0 text-violet-400" />
            ) : (
              <img src={img.dataUrl} alt="" className="w-3.5 h-3.5 rounded-sm object-cover shrink-0" />
            )}
            <span className={`text-[11px] font-medium ${rs.text} truncate`}>{img.label}</span>
          </span>
        );
      } else {
        parts.push(<span key={`m${match.index}`} className="invisible">{match[0]}</span>);
      }
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < value.length) {
      parts.push(<span key={`t${lastIndex}`} className="invisible">{value.slice(lastIndex)}</span>);
    }
    return parts;
  }, [value, images]);

  const hasMarkers = useMemo(() => new RegExp(IMAGE_MARKER_RE.source).test(value), [value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) setRoleMenuImageId(null);
    };
    if (roleMenuImageId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [roleMenuImageId]);

  const getRolesForMedia = useCallback((mediaType?: MediaType) => {
    if (mediaType === 'video' || mediaType === 'audio') {
      return [
        { value: 'ref' as const, label: 'Референс' },
        { value: 'none' as const, label: 'Без роли' },
      ];
    }
    const roles: Array<{ value: AttachedImage['role']; label: string }> = [];
    if (supportsFirstFrame) roles.push({ value: 'first', label: 'Начальный кадр' });
    if (supportsLastFrame) roles.push({ value: 'last', label: 'Конечный кадр' });
    if (supportsReferences) roles.push({ value: 'ref', label: 'Референс' });
    roles.push({ value: 'none', label: 'Без роли' });
    return roles;
  }, [supportsFirstFrame, supportsLastFrame, supportsReferences]);

  return (
    <div className="flex flex-col w-full">
      {/* Attached images — always above the textarea */}
      {images.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap pb-2 mb-2 border-b border-slate-200/30 dark:border-gray-700/30">
          {images.map((img) => {
            const style = ROLE_STYLES[img.role];
            return (
              <div key={img.id} className="relative group/thumb">
                <button
                  type="button"
                  onClick={() => setRoleMenuImageId(roleMenuImageId === img.id ? null : img.id)}
                  className={`flex items-center gap-1.5 ${style.bg} border ${style.border} rounded-lg pl-1 pr-2 py-1 transition-all hover:shadow-md active:scale-[0.97]`}
                >
                  {(!img.mediaType || img.mediaType === 'image') ? (
                    <img src={img.dataUrl} alt={img.label} className={`w-9 h-9 rounded-md object-cover ring-1 ${style.ring}`} />
                  ) : img.mediaType === 'video' ? (
                    <div className={`w-9 h-9 rounded-md bg-indigo-500/10 ring-1 ${style.ring} flex items-center justify-center`}>
                      <Film className="w-4 h-4 text-indigo-400" />
                    </div>
                  ) : (
                    <div className={`w-9 h-9 rounded-md bg-violet-500/10 ring-1 ${style.ring} flex items-center justify-center`}>
                      <Music className="w-4 h-4 text-violet-400" />
                    </div>
                  )}
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-[11px] font-medium text-slate-600 dark:text-gray-300 leading-tight truncate max-w-[80px]">{img.fileName || img.label}</span>
                    {img.role !== 'none' && (
                      <span className={`text-[9px] font-semibold ${style.text} leading-tight`}>{style.label}</span>
                    )}
                  </div>
                </button>
                {(!img.mediaType || img.mediaType === 'image') && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPreviewImage(img.dataUrl); }}
                    className="absolute bottom-0.5 left-0.5 w-4 h-4 rounded bg-black/40 text-white/80 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity backdrop-blur-sm"
                  >
                    <ZoomIn className="w-2.5 h-2.5" />
                  </button>
                )}
                {img.mediaType === 'audio' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playingAudioId === img.id && audioPreviewRef.current) {
                        audioPreviewRef.current.pause();
                        audioPreviewRef.current.currentTime = 0;
                        audioPreviewRef.current = null;
                        setPlayingAudioId(null);
                      } else {
                        if (audioPreviewRef.current) { audioPreviewRef.current.pause(); audioPreviewRef.current = null; }
                        const audio = new Audio(img.dataUrl);
                        audioPreviewRef.current = audio;
                        audio.onended = () => { setPlayingAudioId(null); audioPreviewRef.current = null; };
                        audio.play();
                        setPlayingAudioId(img.id);
                      }
                    }}
                    className={`absolute bottom-0.5 left-0.5 w-4 h-4 rounded bg-violet-500/80 text-white flex items-center justify-center transition-opacity backdrop-blur-sm hover:bg-violet-600 ${playingAudioId === img.id ? 'opacity-100' : 'opacity-0 group-hover/thumb:opacity-100'}`}
                    title={playingAudioId === img.id ? 'Остановить' : 'Прослушать'}
                  >
                    {playingAudioId === img.id ? <Square className="w-2 h-2 fill-white" /> : <Play className="w-2.5 h-2.5 fill-white ml-px" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-200 dark:bg-gray-700 text-slate-500 dark:text-gray-300 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover/thumb:opacity-100 transition-opacity shadow-sm hover:bg-red-500 hover:text-white z-10"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
                {roleMenuImageId === img.id && (
                  <div
                    ref={roleMenuRef}
                    className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-[#161630] border border-slate-200/60 dark:border-gray-700/50 rounded-xl shadow-xl shadow-black/10 py-1 min-w-[150px] animate-in fade-in slide-in-from-top-1 duration-150"
                  >
                    {getRolesForMedia(img.mediaType).map(r => {
                      const isActive = img.role === r.value;
                      const rs = ROLE_STYLES[r.value];
                      return (
                        <button
                          key={r.value}
                          onClick={(e) => { e.stopPropagation(); setRole(img.id, r.value); }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors flex items-center gap-2 ${
                            isActive ? `${rs.bg} ${rs.text} font-semibold` : 'text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isActive ? rs.border.replace('border-', 'bg-').replace('/40', '') : 'bg-slate-300 dark:bg-gray-600'}`} />
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

        </div>
      )}

      {/* Textarea with overlay for inline image chips */}
      <div className="relative w-full min-w-0">
        <textarea
          ref={taRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownInternal}
          onScroll={syncScroll}
          placeholder={images.length > 0 ? 'Опишите видео... Используйте @ для ссылки на файл' : placeholder}
          rows={1}
          disabled={disabled}
          className={`w-full bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 resize-none focus:outline-none py-1 leading-relaxed ${
            hasMarkers ? 'text-transparent caret-slate-800 dark:caret-gray-100 selection:bg-blue-500/20' : ''
          }`}
          style={{ minHeight: '24px', maxHeight: '200px' }}
        />
        {hasMarkers && (
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none text-sm py-1 leading-relaxed whitespace-pre-wrap break-words overflow-hidden"
            aria-hidden="true"
          >
            {renderedOverlay}
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={`image/*${supportsVideoRefs ? ',video/*' : ''}${supportsAudioRefs ? ',audio/*' : ''}`}
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
      />

      {/* @-mention dropdown */}
      {mentionOpen && filteredImages.length > 0 && createPortal(
        <div
          className="fixed z-[300] bg-white dark:bg-[#161630] border border-slate-200/60 dark:border-gray-700/50 rounded-xl shadow-2xl shadow-black/20 py-1.5 min-w-[200px] max-w-[280px] max-h-[200px] overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-150"
          style={{ top: mentionPos.top, left: mentionPos.left }}
        >
          <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Выберите файл</div>
          {filteredImages.map((img, i) => {
            const rs = ROLE_STYLES[img.role];
            return (
              <button
                key={img.id}
                onClick={() => insertMention(img)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-slate-100 dark:hover:bg-gray-800/60 transition-colors text-left ${i === 0 ? 'bg-slate-50 dark:bg-gray-800/30' : ''}`}
              >
                {(!img.mediaType || img.mediaType === 'image') ? (
                  <img src={img.dataUrl} alt="" className={`w-8 h-8 rounded object-cover ring-1 ${rs.ring}`} />
                ) : img.mediaType === 'video' ? (
                  <div className={`w-8 h-8 rounded bg-indigo-500/10 ring-1 ${rs.ring} flex items-center justify-center`}><Film className="w-4 h-4 text-indigo-400" /></div>
                ) : (
                  <div className={`w-8 h-8 rounded bg-violet-500/10 ring-1 ${rs.ring} flex items-center justify-center`}><Music className="w-4 h-4 text-violet-400" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">{img.fileName || img.label}</p>
                  {img.role !== 'none' && <p className={`text-[10px] ${rs.text}`}>{rs.label}</p>}
                </div>
              </button>
            );
          })}
        </div>,
        document.body
      )}

      <SlashCommandMenu
        open={videoSlash.slashState.open}
        query={videoSlash.slashState.query}
        scope="video"
        anchorRect={videoSlash.slashState.anchorRect}
        onSelect={videoSlash.slashSelectCommand}
        onClose={videoSlash.slashClose}
        selectedIndex={videoSlash.slashState.selectedIndex}
        onSelectedIndexChange={videoSlash.setSlashSelectedIndex}
      />

      {/* Fullscreen image preview */}
      {previewImage && createPortal(
        <div className="fixed inset-0 z-[400] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setPreviewImage(null)}>
          <button onClick={() => setPreviewImage(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
          <img src={previewImage} alt="Просмотр" className="max-w-full max-h-full rounded-lg object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}
    </div>
  );
}
