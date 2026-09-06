import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ImageIcon,
  Video,
  AudioLines,
  Upload,
  Check,
  Search,
  Lock,
} from 'lucide-react';

export type MediaType = 'image' | 'video' | 'audio';

export interface MediaItem {
  id: string;
  url: string;
  label: string;
  type: MediaType;
  timestamp: Date;
}

interface MediaLibraryProps {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string, type: MediaType) => void;
  selectableTypes: MediaType[];
  multiple?: boolean;
  maxSelect?: number;
  items: MediaItem[];
  title?: string;
}

const ALL_TABS: MediaType[] = ['image', 'video', 'audio'];

const TAB_CONFIG: Record<MediaType, { label: string; icon: typeof ImageIcon }> = {
  image: { label: 'Фото', icon: ImageIcon },
  video: { label: 'Видео', icon: Video },
  audio: { label: 'Аудио', icon: AudioLines },
};

export default function MediaLibrary({
  open,
  onClose,
  onSelect,
  selectableTypes,
  multiple = false,
  maxSelect = 1,
  items,
  title = 'Библиотека',
}: MediaLibraryProps) {
  const [activeType, setActiveType] = useState<MediaType>(selectableTypes[0]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setActiveType(selectableTypes[0]);
      setSelected(new Set());
      setSearch('');
    }
  }, [open, selectableTypes]);

  const canSelect = selectableTypes.includes(activeType);

  const filtered = items.filter(
    (item) =>
      item.type === activeType &&
      (search === '' || item.label.toLowerCase().includes(search.toLowerCase()))
  );

  const tabCounts = {
    image: items.filter((i) => i.type === 'image').length,
    video: items.filter((i) => i.type === 'video').length,
    audio: items.filter((i) => i.type === 'audio').length,
  };

  const handleToggle = useCallback(
    (item: MediaItem) => {
      if (!canSelect) return;
      if (!multiple) {
        onSelect(item.url, item.type);
        onClose();
        return;
      }
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) {
          next.delete(item.id);
        } else if (next.size < maxSelect) {
          next.add(item.id);
        }
        return next;
      });
    },
    [canSelect, multiple, maxSelect, onSelect, onClose]
  );

  const handleConfirm = useCallback(() => {
    for (const id of selected) {
      const item = items.find((i) => i.id === id);
      if (item) onSelect(item.url, item.type);
    }
    onClose();
  }, [selected, items, onSelect, onClose]);

  const handleDeviceFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const remaining = multiple ? maxSelect - selected.size : 1;
      const limit = Math.min(files.length, Math.max(remaining, 1));
      for (let i = 0; i < limit; i++) {
        const file = files[i];
        if (file.size > 100 * 1024 * 1024) continue;
        let detectedType: MediaType = activeType;
        if (file.type.startsWith('image/')) detectedType = 'image';
        else if (file.type.startsWith('video/')) detectedType = 'video';
        else if (file.type.startsWith('audio/')) detectedType = 'audio';
        if (!selectableTypes.includes(detectedType)) continue;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          onSelect(dataUrl, detectedType);
        };
        reader.readAsDataURL(file);
      }
      onClose();
      e.target.value = '';
    },
    [activeType, selectableTypes, multiple, maxSelect, selected, onSelect, onClose]
  );

  const uploadAcceptMime = selectableTypes
    .map((t) => (t === 'image' ? 'image/*' : t === 'video' ? 'video/*' : 'audio/*'))
    .join(',');

  const activeAcceptMime =
    activeType === 'image'
      ? 'image/*'
      : activeType === 'video'
        ? 'video/*'
        : 'audio/*';

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg sm:max-w-xl bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl max-h-[85dvh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-gray-800/60">
          <h2 className="text-base font-semibold text-slate-800 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type tabs -- always show all 3 */}
        <div className="shrink-0 flex gap-1 px-4 pt-3 pb-1">
          {ALL_TABS.map((type) => {
            const cfg = TAB_CONFIG[type];
            const Icon = cfg.icon;
            const isActive = activeType === type;
            const isSelectable = selectableTypes.includes(type);
            const count = tabCounts[type];
            return (
              <button
                key={type}
                onClick={() => { setActiveType(type); setSearch(''); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? isSelectable
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-500 dark:bg-gray-600 text-white'
                    : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cfg.label}
                {count > 0 && (
                  <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-slate-400 dark:text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Info banner when browsing non-selectable type */}
        {!canSelect && (
          <div className="shrink-0 mx-4 mt-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/60 dark:border-amber-500/20 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <p className="text-[11px] text-amber-700 dark:text-amber-400">
              Просмотр. Для прикрепления выберите вкладку{' '}
              {selectableTypes.map((t) => TAB_CONFIG[t].label).join(' или ')}.
            </p>
          </div>
        )}

        {/* Search + Upload from device */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm bg-slate-100 dark:bg-gray-800 text-slate-800 dark:text-gray-100 placeholder:text-slate-400 dark:placeholder:text-gray-600 border-none outline-none focus:ring-2 focus:ring-blue-500/40"
            />
          </div>
          {canSelect && (
            <>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">С устройства</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadAcceptMime}
                multiple={multiple}
                onChange={handleDeviceFile}
                className="hidden"
              />
            </>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                {activeType === 'image' && <ImageIcon className="w-5 h-5 text-slate-400 dark:text-gray-600" />}
                {activeType === 'video' && <Video className="w-5 h-5 text-slate-400 dark:text-gray-600" />}
                {activeType === 'audio' && <AudioLines className="w-5 h-5 text-slate-400 dark:text-gray-600" />}
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-500">
                {search ? 'Ничего не найдено' : 'Пока нет генераций'}
              </p>
              {canSelect && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Загрузить с устройства
                </button>
              )}
            </div>
          ) : (
            <>
              {activeType === 'image' && (
                <div className="grid grid-cols-3 gap-2">
                  {filtered.map((item) => {
                    const isChecked = selected.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleToggle(item)}
                        className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                          !canSelect
                            ? 'border-transparent opacity-70 cursor-default'
                            : isChecked
                              ? 'border-blue-500 ring-2 ring-blue-500/30'
                              : 'border-transparent hover:border-slate-300 dark:hover:border-gray-700'
                        }`}
                      >
                        <img
                          src={item.url}
                          alt={item.label}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <p className="absolute bottom-1 left-1 right-1 text-[10px] text-white/90 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.label}
                        </p>
                        {multiple && isChecked && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeType === 'video' && (
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleToggle(item)}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all bg-slate-100 dark:bg-gray-800 ${
                        !canSelect
                          ? 'border-transparent opacity-70 cursor-default'
                          : 'border-transparent hover:border-blue-500/50'
                      }`}
                    >
                      <video
                        src={item.url}
                        className="w-full aspect-video object-cover"
                        muted
                        preload="metadata"
                        onMouseEnter={(e) => (e.target as HTMLVideoElement).play().catch(() => {})}
                        onMouseLeave={(e) => { const v = e.target as HTMLVideoElement; v.pause(); v.currentTime = 0; }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-white/80">
                        <Video className="w-3 h-3 inline-block mr-0.5" />
                      </div>
                      <p className="absolute bottom-1 left-1 right-1 text-[10px] text-white/90 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.label}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {activeType === 'audio' && (
                <div className="flex flex-col gap-2">
                  {filtered.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleToggle(item)}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                        !canSelect
                          ? 'border-slate-200 dark:border-gray-800 opacity-70 cursor-default bg-slate-50 dark:bg-gray-800/50'
                          : selected.has(item.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                            : 'border-slate-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50 dark:bg-gray-800/50'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                        <AudioLines className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm text-slate-800 dark:text-gray-200 truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-gray-600">
                          {item.timestamp.toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      {multiple && selected.has(item.id) && (
                        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Confirm bar (multi-select) */}
        {multiple && selected.size > 0 && (
          <div className="shrink-0 px-4 py-3 border-t border-slate-200/60 dark:border-gray-800/60">
            <button
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
            >
              Выбрать ({selected.size})
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
