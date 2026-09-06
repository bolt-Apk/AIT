import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Sparkles, ChevronRight } from 'lucide-react';
import {
  type TemplateTab,
  type PromptTemplate,
  getTemplatesForTab,
  getCategoriesForTab,
} from '@/lib/promptTemplates';

interface PromptTemplatesProps {
  open: boolean;
  onClose: () => void;
  onSelect: (prompt: string) => void;
  tab: TemplateTab;
}

const tabLabels: Record<TemplateTab, string> = {
  images: 'изображений',
  video: 'видео',
  chat: 'чата',
};

const accentConfig: Record<TemplateTab, {
  ring: string; gradient: string; text: string;
  pillActive: string; pillIdle: string;
  cardHover: string; arrowBg: string;
}> = {
  images: {
    ring: 'focus-within:ring-emerald-500/30',
    gradient: 'from-emerald-500 to-teal-600',
    text: 'text-emerald-400',
    pillActive: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    pillIdle: 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:text-emerald-300',
    cardHover: 'hover:border-emerald-500/30',
    arrowBg: 'bg-emerald-500/15 text-emerald-400',
  },
  video: {
    ring: 'focus-within:ring-blue-500/30',
    gradient: 'from-blue-500 to-cyan-600',
    text: 'text-blue-400',
    pillActive: 'border-blue-500/50 bg-blue-500/15 text-blue-300',
    pillIdle: 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-300',
    cardHover: 'hover:border-blue-500/30',
    arrowBg: 'bg-blue-500/15 text-blue-400',
  },
  chat: {
    ring: 'focus-within:ring-blue-500/30',
    gradient: 'from-blue-500 to-indigo-600',
    text: 'text-blue-400',
    pillActive: 'border-blue-500/50 bg-blue-500/15 text-blue-300',
    pillIdle: 'border-white/[0.06] bg-white/[0.03] text-gray-400 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-blue-300',
    cardHover: 'hover:border-blue-500/30',
    arrowBg: 'bg-blue-500/15 text-blue-400',
  },
};

export default function PromptTemplates({ open, onClose, onSelect, tab }: PromptTemplatesProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = getCategoriesForTab(tab);
  const allTemplates = getTemplatesForTab(tab);
  const accent = accentConfig[tab];

  useEffect(() => {
    if (open) {
      setSearch('');
      setActiveCategory(null);
      setTimeout(() => searchRef.current?.focus(), 150);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  const filtered = allTemplates.filter(t => {
    const matchesCategory = !activeCategory || t.category === activeCategory;
    if (!search.trim()) return matchesCategory;
    const q = search.toLowerCase();
    return matchesCategory && (
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.prompt.toLowerCase().includes(q)
    );
  });

  const handleSelect = useCallback((template: PromptTemplate) => {
    onSelect(template.prompt);
    onClose();
  }, [onSelect, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md mx-auto bg-[#0e0e24] rounded-t-[20px] sm:rounded-2xl border border-white/[0.08] shadow-2xl shadow-black/40 max-h-[82dvh] flex flex-col overflow-hidden">
        {/* Drag handle (mobile) */}
        <div className="w-10 h-1 rounded-full bg-white/15 mx-auto mt-2.5 sm:hidden" />

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-3.5 sm:pt-4 pb-3">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shadow-lg`}>
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-white leading-tight">
              Шаблоны промптов
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Готовые промпты для {tabLabels[tab]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-all active:scale-90"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2.5">
          <div className={`flex items-center gap-2.5 bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 transition-all ${accent.ring}`}>
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск шаблонов..."
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all ${
              !activeCategory ? accent.pillActive : accent.pillIdle
            }`}
          >
            Все
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === cat.id ? accent.pillActive : accent.pillIdle
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/[0.06] mx-4" />

        {/* Template list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 overscroll-contain">
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-3">
                <Search className="w-5 h-5 text-gray-600" />
              </div>
              <p className="text-sm font-medium text-gray-400">Ничего не найдено</p>
              <p className="text-xs text-gray-600 mt-1">Попробуйте другой запрос</p>
            </div>
          )}
          {filtered.map(template => {
            const isHovered = hoveredId === template.id;
            return (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                onMouseEnter={() => setHoveredId(template.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] ${accent.cardHover} hover:bg-white/[0.04] p-3 transition-all duration-200 group active:scale-[0.985]`}
              >
                <div className="flex items-start gap-3">
                  {/* Emoji icon */}
                  <div className="w-9 h-9 rounded-lg bg-white/[0.05] flex items-center justify-center text-base shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                    {template.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-semibold text-gray-200 group-hover:text-white transition-colors">
                        {template.title}
                      </p>
                      <span className="text-[10px] text-gray-600 font-medium">
                        {template.description}
                      </span>
                    </div>
                    <p className="text-[12px] text-gray-500 line-clamp-2 leading-[1.6] group-hover:text-gray-400 transition-colors">
                      {template.prompt}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 mt-0.5 ${
                    isHovered ? `${accent.arrowBg} scale-110` : 'bg-white/[0.04] text-gray-600'
                  }`}>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
