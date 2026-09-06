import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, ChevronRight } from 'lucide-react';
import { filterSlashCommands, slashCategories, type SlashCommand } from '@/lib/slashCommands';

interface SlashCommandMenuProps {
  open: boolean;
  query: string;
  scope: 'image' | 'video' | 'chat';
  anchorRect: { top: number; left: number; bottom: number } | null;
  onSelect: (cmd: SlashCommand) => void;
  onClose: () => void;
  selectedIndex: number;
  onSelectedIndexChange: (i: number) => void;
}

export default function SlashCommandMenu({
  open,
  query,
  scope,
  anchorRect,
  onSelect,
  onClose,
  selectedIndex,
  onSelectedIndexChange,
}: SlashCommandMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const filtered = useMemo(
    () => filterSlashCommands(query, scope),
    [query, scope],
  );

  useEffect(() => {
    if (open) onSelectedIndexChange(0);
  }, [query, open]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open || filtered.length === 0 || !anchorRect) return null;

  const posStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(anchorRect.left, window.innerWidth - 320),
    bottom: window.innerHeight - anchorRect.top + 6,
    maxHeight: 280,
    zIndex: 300,
  };

  return createPortal(
    <div
      ref={menuRef}
      className="bg-white dark:bg-[#161630] border border-slate-200/60 dark:border-gray-700/50 rounded-xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-150"
      style={posStyle}
    >
      <div className="px-3 py-1.5 border-b border-slate-100 dark:border-gray-800/60 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-blue-400" />
        <span className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">
          Стиль-команды
        </span>
        <span className="text-[10px] text-slate-300 dark:text-gray-600 ml-auto">
          {filtered.length}
        </span>
      </div>
      <div className="overflow-y-auto min-w-[260px] max-w-[320px] py-1">
        {filtered.map((cmd, i) => {
          const cat = slashCategories.find((c) => c.id === cmd.category);
          const isActive = i === selectedIndex;
          return (
            <button
              key={cmd.command}
              ref={(el) => { itemRefs.current[i] = el; }}
              onMouseEnter={() => onSelectedIndexChange(i)}
              onClick={() => onSelect(cmd)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-500/10'
                  : 'hover:bg-slate-50 dark:hover:bg-gray-800/40'
              }`}
            >
              <span className="shrink-0 text-[11px] font-mono font-bold text-blue-500 dark:text-blue-400 min-w-[90px]">
                {cmd.command}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 dark:text-gray-200 truncate">
                  {cmd.description}
                </p>
                {cat && (
                  <p className="text-[10px] text-slate-400 dark:text-gray-500 truncate">
                    {cat.label}
                  </p>
                )}
              </div>
              {isActive && (
                <ChevronRight className="w-3 h-3 text-blue-400 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>,
    document.body,
  );
}

export interface SlashState {
  open: boolean;
  query: string;
  startIndex: number;
  anchorRect: { top: number; left: number; bottom: number } | null;
  selectedIndex: number;
}

const INITIAL: SlashState = {
  open: false,
  query: '',
  startIndex: -1,
  anchorRect: null,
  selectedIndex: 0,
};

export function useSlashCommands(
  scope: 'image' | 'video' | 'chat',
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  value: string,
  onChange: (v: string) => void,
) {
  const [state, setState] = useState<SlashState>(INITIAL);

  const detectSlash = useCallback(
    (newValue: string, el: HTMLTextAreaElement) => {
      const cursor = el.selectionStart;
      const textBefore = newValue.slice(0, cursor);

      const slashIdx = textBefore.lastIndexOf('/');
      if (slashIdx === -1) {
        setState(INITIAL);
        return;
      }

      const charBefore = slashIdx > 0 ? textBefore[slashIdx - 1] : ' ';
      if (charBefore !== ' ' && charBefore !== '\n' && slashIdx !== 0) {
        setState(INITIAL);
        return;
      }

      const typed = textBefore.slice(slashIdx);
      if (/\s/.test(typed.slice(1)) || typed.length > 25) {
        setState(INITIAL);
        return;
      }

      const rect = el.getBoundingClientRect();
      setState({
        open: true,
        query: typed,
        startIndex: slashIdx,
        anchorRect: {
          top: rect.top,
          left: rect.left + 16,
          bottom: rect.bottom,
        },
        selectedIndex: 0,
      });
    },
    [],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const v = e.target.value;
      onChange(v);
      detectSlash(v, e.target);
    },
    [onChange, detectSlash],
  );

  const selectCommand = useCallback(
    (cmd: SlashCommand) => {
      const { startIndex } = state;
      if (startIndex < 0) return;

      const ta = textareaRef.current;
      const cursor = ta ? ta.selectionStart : value.length;
      const before = value.slice(0, startIndex);
      const after = value.slice(cursor);

      const needsComma = before.trim().length > 0;
      const snippet = (needsComma ? ', ' : '') + cmd.snippet;
      const newValue = before.trimEnd() + snippet + (after.startsWith(' ') ? after : ' ' + after);

      onChange(newValue.trimEnd() + ' ');
      setState(INITIAL);

      requestAnimationFrame(() => {
        if (!ta) return;
        const pos = (before.trimEnd() + snippet + ' ').length;
        ta.setSelectionRange(pos, pos);
        ta.focus();
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
      });
    },
    [state, value, onChange, textareaRef],
  );

  const filtered = useMemo(
    () => filterSlashCommands(state.query, scope),
    [state.query, scope],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!state.open || filtered.length === 0) return false;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setState((s) => ({
          ...s,
          selectedIndex: (s.selectedIndex + 1) % filtered.length,
        }));
        return true;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setState((s) => ({
          ...s,
          selectedIndex:
            (s.selectedIndex - 1 + filtered.length) % filtered.length,
        }));
        return true;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selectCommand(filtered[state.selectedIndex]);
        return true;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setState(INITIAL);
        return true;
      }
      return false;
    },
    [state, filtered, selectCommand],
  );

  const close = useCallback(() => setState(INITIAL), []);

  return {
    slashState: state,
    slashHandleChange: handleChange,
    slashHandleKeyDown: handleKeyDown,
    slashSelectCommand: selectCommand,
    slashClose: close,
    setSlashSelectedIndex: (i: number) =>
      setState((s) => ({ ...s, selectedIndex: i })),
  };
}
