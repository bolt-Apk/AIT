import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Download, Type, Palette, Square,
  Image as ImageIcon, Layers, Upload, Trash2, Sparkles,
  SlidersHorizontal, Wand2, Loader2,
  ChevronDown, Eye, EyeOff, Lock, Unlock, ArrowUp, ArrowDown, Copy,
  Undo2, Redo2, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  FileImage, Maximize, Minimize, ZoomIn, ZoomOut,
  Circle, Plus, Underline, Strikethrough, ShieldCheck,
  LetterText, MoveHorizontal, Rows3,
  Replace, Eraser, RectangleHorizontal, Link2, Unlink2, Move,
} from 'lucide-react';
import { getFreshSession } from '@/lib/supabase';
import { IMAGE_MODELS, getImageModelInfo } from '@/components/ImageModelSelector';
import { useCanvasEditor, type EditorLayer, type TextProps, type ShapeProps, type LayerDimensions } from '@/components/image-creator/useCanvasEditor';
import {
  makeTemplates, FONTS, FORMATS, CATEGORIES, CUSTOM_RESOLUTIONS,
  STYLE_OPTIONS, type Template, type StyleType, type FormatId,
} from '@/components/image-creator/templates';

const AI_MODELS_FOR_CARDS = IMAGE_MODELS.filter(m =>
  ['gpt-image-1', 'gpt-image-1-mini', 'gpt-image-2'].includes(m.id)
);

const fieldLabels: Record<string, string> = {
  discount: 'Скидка', subtitle: 'Подзаголовок', details: 'Детали', cta: 'Кнопка',
  brand: 'Бренд', handle: 'Аккаунт', line1: 'Строка 1', line2: 'Строка 2',
  offer: 'Предложение', quote: 'Цитата', author: 'Автор', label: 'Метка',
  title: 'Заголовок', timer: 'Таймер', tag: 'Тег', desc: 'Описание',
  text: 'Текст', tagline: 'Слоган', url: 'Ссылка', word: 'Слово',
  left: 'Левая часть', right: 'Правая часть', sub_left: 'Подпись лево', sub_right: 'Подпись право',
  sub: 'Подпись', pretitle: 'Надзаголовок', date: 'Дата', place: 'Место',
  speaker: 'Спикер', steps: 'Шаги', features: 'Особенности',
  before_title: 'До: заголовок', before_list: 'До: список', after_title: 'После: заголовок', after_list: 'После: список',
  stat1: 'Число 1', stat2: 'Число 2', stat3: 'Число 3',
  label1: 'Метка 1', label2: 'Метка 2', label3: 'Метка 3',
  num1: 'Число 1', num2: 'Число 2', num3: 'Число 3', num4: 'Число 4',
  lbl1: 'Метка 1', lbl2: 'Метка 2', lbl3: 'Метка 3', lbl4: 'Метка 4',
  step1_title: 'Шаг 1', step1_desc: 'Описание 1', step2_title: 'Шаг 2', step2_desc: 'Описание 2',
  step3_title: 'Шаг 3', step3_desc: 'Описание 3', step4_title: 'Шаг 4', step4_desc: 'Описание 4',
  items: 'Пункты', card1: 'Карта 1', card2: 'Карта 2', card3: 'Карта 3',
  card1_desc: 'Описание 1', card2_desc: 'Описание 2', card3_desc: 'Описание 3',
};

const BLANK_BG_COLORS = ['#0f172a', '#ffffff', '#1e293b', '#fef3c7', '#ecfdf5', '#fce7f3', '#f1f5f9', '#0c0a09'];

/* ── Template thumbnail ── */

function TemplateThumbnail({ tpl, onClick }: { tpl: Template; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const size = 200;
    c.width = size; c.height = size;
    const scale = Math.min(size / tpl.width, size / tpl.height);
    const w = tpl.width * scale, h = tpl.height * scale;
    const ox = (size - w) / 2, oy = (size - h) / 2;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = tpl.bg;
    ctx.fillRect(ox, oy, w, h);
    for (const layer of tpl.layers) {
      const lx = layer.x * scale + ox, ly = layer.y * scale + oy;
      const lw = layer.w * scale, lh = layer.h * scale;
      ctx.globalAlpha = layer.opacity ?? 1;
      if (layer.type === 'rect' || layer.type === 'image-placeholder') {
        ctx.fillStyle = layer.fill || '#334';
        ctx.beginPath();
        const r = (layer.radius || 0) * scale;
        ctx.roundRect(lx, ly, lw, lh, r);
        ctx.fill();
      } else if (layer.type === 'circle') {
        ctx.fillStyle = layer.fill || '#334';
        ctx.beginPath();
        ctx.ellipse(lx, ly, lw / 2 * scale, lh / 2 * scale, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (layer.type === 'text') {
        ctx.fillStyle = layer.color || '#fff';
        ctx.textAlign = layer.align || 'center';
        ctx.textBaseline = 'middle';
        const fs = Math.max(6, (layer.fontSize || 32) * scale);
        ctx.font = `${layer.fontWeight || '400'} ${fs}px Inter, sans-serif`;
        const text = (layer.text || '').split('\n')[0];
        ctx.fillText(text, lx, ly, lw);
      }
      ctx.globalAlpha = 1;
    }
  }, [tpl]);

  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-2">
      <div className="relative overflow-hidden rounded-xl border-2 border-transparent group-hover:border-cyan-500/50 transition-all duration-200 shadow-lg group-hover:shadow-cyan-500/10">
        <canvas ref={ref} className="w-full h-auto" style={{ maxHeight: 160 }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
          <span className="text-[10px] text-white font-medium">{tpl.width}x{tpl.height}</span>
        </div>
      </div>
      <span className="text-xs text-slate-600 dark:text-gray-400 font-medium group-hover:text-cyan-500 transition-colors line-clamp-1">{tpl.name}</span>
    </button>
  );
}

/* ── Layer Panel Row ── */

function LayerRow({
  layer, selected, onSelect, onToggleVis, onToggleLock, onMoveUp, onMoveDown, onDuplicate, onDelete,
}: {
  layer: EditorLayer; selected: boolean;
  onSelect: (e?: React.MouseEvent) => void; onToggleVis: () => void; onToggleLock: () => void;
  onMoveUp: () => void; onMoveDown: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const label = layer.editKey ? (fieldLabels[layer.editKey] || layer.name) : layer.name;
  const Icon = layer.type === 'text' ? Type : layer.type === 'circle' ? Sparkles : layer.type === 'image' || layer.type === 'image-placeholder' ? FileImage : Square;
  const typeLabel = layer.type === 'text' ? 'Текст' : layer.type === 'circle' ? 'Круг' : layer.type === 'image' ? 'Фото' : layer.type === 'image-placeholder' ? 'Фото' : 'Фигура';

  return (
    <div
      onClick={(e) => onSelect(e)}
      className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-all text-xs ${
        selected
          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30 shadow-sm'
          : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/60'
      } ${!layer.visible ? 'opacity-30' : ''}`}
    >
      <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
        selected ? 'bg-cyan-500/20' : 'bg-slate-100 dark:bg-gray-800/80 group-hover:bg-slate-200 dark:group-hover:bg-gray-700/80'
      }`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block truncate font-medium leading-tight">{label}</span>
        <span className="block text-[10px] opacity-50 leading-tight">{typeLabel}</span>
      </div>
      <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onToggleVis} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title={layer.visible ? 'Скрыть' : 'Показать'}>
          {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
        </button>
        <button onClick={onToggleLock} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title={layer.locked ? 'Разблокировать' : 'Заблокировать'}>
          {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 opacity-40" />}
        </button>
        {selected && (
          <>
            <button onClick={onMoveUp} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title="Вверх"><ArrowUp className="w-3.5 h-3.5" /></button>
            <button onClick={onMoveDown} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title="Вниз"><ArrowDown className="w-3.5 h-3.5" /></button>
            <button onClick={onDuplicate} className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title="Дублировать"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-colors" title="Удалить"><Trash2 className="w-3.5 h-3.5" /></button>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */

export default function ImageCreator() {
  const navigate = useNavigate();
  const templates = useMemo(() => makeTemplates(), []);

  // Gallery state
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Blank canvas dialog
  const [showBlankDialog, setShowBlankDialog] = useState(false);
  const [blankW, setBlankW] = useState(1080);
  const [blankH, setBlankH] = useState(1080);
  const [blankBg, setBlankBg] = useState('#0f172a');

  // Editor panels
  const [activePanel, setActivePanel] = useState<'layers' | 'style' | 'format'>('layers');

  // Format state
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);
  const [activeFormat, setActiveFormat] = useState<FormatId | 'custom' | null>(null);

  // AI generation
  const [aiModel, setAiModel] = useState(AI_MODELS_FOR_CARDS[0]?.id ?? 'gpt-image-1');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showAiModelPicker, setShowAiModelPicker] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Drag & drop
  const [dragOver, setDragOver] = useState(false);

  // File input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // Canvas editor
  const [isFullscreen, setIsFullscreen] = useState(false);
  const editor = useCanvasEditor(canvasContainerRef, selectedTemplate);

  // Escape exits fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  // Re-fit canvas after fullscreen layout settles
  useEffect(() => {
    const id = requestAnimationFrame(() => editor.zoomToFit());
    return () => cancelAnimationFrame(id);
  }, [isFullscreen, editor.zoomToFit]);

  // Auto-switch to Properties when selecting on canvas
  useEffect(() => {
    editor.onSelectionChange.current = (ids: string[]) => {
      if (ids.length > 0) setActivePanel('style');
    };
    return () => { editor.onSelectionChange.current = null; };
  }, [editor.onSelectionChange]);

  // Filtered templates
  const filtered = templates.filter(t => {
    if (selectedCategory !== 'Все' && t.category !== selectedCategory) return false;
    if (selectedStyle !== 'all' && t.styleType !== selectedStyle) return false;
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.category.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const selectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setOutputWidth(tpl.width);
    setOutputHeight(tpl.height);
    setActiveFormat(null);
    setAiError(null);
    setShowEditor(true);
  };

  const createBlankCanvas = () => {
    const blank: Template = {
      id: `blank-${Date.now()}`,
      name: 'Пустой холст',
      category: 'Другое',
      styleType: 'minimal',
      width: blankW,
      height: blankH,
      bg: blankBg,
      layers: [],
    };
    setShowBlankDialog(false);
    selectTemplate(blank);
  };

  const applyFormat = (fmt: { id: FormatId; w: number; h: number }) => {
    setOutputWidth(fmt.w);
    setOutputHeight(fmt.h);
    setActiveFormat(fmt.id);
    editor.resizeCanvas(fmt.w, fmt.h);
  };

  // Download
  const handleDownload = useCallback((format: 'png' | 'jpeg' = 'png') => {
    const dataUrl = editor.exportCanvas(format);
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `design-${Date.now()}.${format}`;
    a.click();
  }, [editor]);

  // AI image generation
  const [aiUseCanvas, setAiUseCanvas] = useState(false);

  const generateAiImage = async () => {
    setAiGenerating(true);
    setAiError(null);
    try {
      const session = await getFreshSession();
      if (!session) { setAiError('Необходима авторизация'); return; }
      const prompt = aiPrompt.trim() || `Professional product/marketing image, clean, high quality, commercial style. Template: "${selectedTemplate?.name}"`;
      const info = getImageModelInfo(aiModel);
      const payload: Record<string, unknown> = { model: aiModel, prompt };
      if (info?.usesSize) payload.size = '1024x1024';

      if (aiUseCanvas) {
        const dataUrl = editor.exportCanvas('png', 1, 1);
        if (dataUrl) {
          payload.input_references = [{ type: 'image_url', image_url: { url: dataUrl } }];
        }
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(300_000),
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        const errMsg = response.status === 504
          ? 'Генерация заняла слишком много времени. Попробуйте другую модель.'
          : (result.error || `Ошибка (${response.status})`);
        setAiError(errMsg);
        return;
      }

      const firstItem = result.data?.[0];
      let imgSrc: string | null = null;
      if (firstItem?.storage_url) {
        imgSrc = firstItem.storage_url;
      } else if (firstItem?.b64_json) {
        const mime = firstItem.media_type || 'image/png';
        imgSrc = `data:${mime};base64,${firstItem.b64_json}`;
      } else if (firstItem?.url) {
        imgSrc = firstItem.url;
      }
      if (!imgSrc) { setAiError('Не удалось получить изображение'); return; }
      await editor.addImageFromUrl(imgSrc);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Ошибка генерации');
    } finally {
      setAiGenerating(false);
    }
  };

  // Drag & drop handlers
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    files.forEach(f => editor.addImageFromFile(f));
  }, [editor]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  // Replace image file input
  const replaceInputRef = useRef<HTMLInputElement>(null);

  // AI bg removal state
  const [removingBg, setRemovingBg] = useState(false);
  const [removeBgError, setRemoveBgError] = useState<string | null>(null);

  const handleRemoveBg = async () => {
    setRemovingBg(true);
    setRemoveBgError(null);
    try {
      const dataUrl = editor.getSelectedImageDataUrl();
      if (!dataUrl) { setRemoveBgError('Не удалось получить изображение'); return; }
      const session = await getFreshSession();
      if (!session) { setRemoveBgError('Необходима авторизация'); return; }
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: 'Remove the background from this image completely, make it transparent. Keep only the main subject. Output a PNG with transparent background.',
          input_references: [{ type: 'image_url', image_url: { url: dataUrl } }],
        }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        setRemoveBgError(result.error || 'Ошибка удаления фона');
        return;
      }
      const item = result.data?.[0];
      let imgSrc: string | null = null;
      if (item?.storage_url) imgSrc = item.storage_url;
      else if (item?.b64_json) imgSrc = `data:${item.media_type || 'image/png'};base64,${item.b64_json}`;
      else if (item?.url) imgSrc = item.url;
      if (!imgSrc) { setRemoveBgError('Не удалось получить результат'); return; }
      await editor.replaceSelectedImageFromUrl(imgSrc);
    } catch (err: unknown) {
      setRemoveBgError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setRemovingBg(false);
    }
  };

  // Get selected text properties for the properties panel
  const textProps = editor.getSelectedTextProps();
  const selectedObj = editor.getSelectedObject();
  const shapeProps = editor.getSelectedShapeProps();
  const layerDims = editor.getSelectedDimensions();
  const hasSelection = editor.selectedLayerIds.length > 0;
  const [aspectLocked, setAspectLocked] = useState(true);

  // ── Gallery View ──
  if (!showEditor || !selectedTemplate) {
    return (
      <div className="h-dvh-safe flex flex-col bg-slate-50 dark:bg-gray-950">
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-[#0d0d20]/80 backdrop-blur-xl">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-gray-400" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-800 dark:text-gray-100">Конструктор изображений</h1>
            <p className="text-xs text-slate-500 dark:text-gray-500">Выберите шаблон или создайте с нуля</p>
          </div>
          <button
            onClick={() => setShowBlankDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-cyan-500 hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" /> Пустой холст
          </button>
        </div>

        {/* Filters */}
        <div className="shrink-0 px-4 sm:px-6 py-3 space-y-3 border-b border-slate-200/40 dark:border-gray-800/40">
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск шаблонов..."
            className="w-full max-w-md px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
          />
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelectedStyle(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedStyle === s.id
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30'
                    : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60'
                }`}
              >
                <s.icon className="w-3.5 h-3.5" /> {s.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === c
                    ? 'bg-slate-800 dark:bg-gray-100 text-white dark:text-gray-900'
                    : 'bg-white dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700/60'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-gray-600">
              <ImageIcon className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm">Шаблоны не найдены</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filtered.map(tpl => (
                <TemplateThumbnail key={tpl.id} tpl={tpl} onClick={() => selectTemplate(tpl)} />
              ))}
            </div>
          )}
        </div>

        {/* Blank canvas dialog */}
        {showBlankDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowBlankDialog(false)}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-gray-100">Новый макет</h2>
                <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">Задайте размер и цвет фона</p>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-1 font-medium">Ширина</label>
                  <input type="number" value={blankW} min={100} max={8000} onChange={e => setBlankW(Number(e.target.value) || 1080)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-1 font-medium">Высота</label>
                  <input type="number" value={blankH} min={100} max={8000} onChange={e => setBlankH(Number(e.target.value) || 1080)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/60 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40" />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {FORMATS.slice(0, 6).map(fmt => (
                  <button key={fmt.id} onClick={() => { setBlankW(fmt.w); setBlankH(fmt.h); }}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all ${blankW === fmt.w && blankH === fmt.h ? 'bg-cyan-500/15 text-cyan-600 ring-1 ring-cyan-500/30' : 'bg-slate-100 dark:bg-gray-800/60 text-slate-500'}`}>
                    {fmt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-1.5 font-medium">Цвет фона</label>
                <div className="flex items-center gap-2">
                  {BLANK_BG_COLORS.map(c => (
                    <button key={c} onClick={() => setBlankBg(c)}
                      className={`w-7 h-7 rounded-lg border-2 transition-all ${blankBg === c ? 'border-cyan-500 scale-110' : 'border-slate-200 dark:border-gray-700'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                  <input type="color" value={blankBg} onChange={e => setBlankBg(e.target.value)}
                    className="w-7 h-7 rounded-lg border border-slate-200 dark:border-gray-700 cursor-pointer bg-transparent p-0.5" />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowBlankDialog(false)} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors">
                  Отмена
                </button>
                <button onClick={createBlankCanvas} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-white bg-cyan-500 hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/20">
                  Создать
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Editor View ──
  const currentW = outputWidth || selectedTemplate.width;
  const currentH = outputHeight || selectedTemplate.height;
  const reversedLayers = [...editor.layers].reverse();

  return (
    <div className={`flex flex-col bg-slate-50 dark:bg-gray-950 ${isFullscreen ? 'fixed inset-0 z-50' : 'h-dvh-safe'}`}>
      {/* Editor header */}
      <div className="shrink-0 flex items-center gap-2 px-3 sm:px-4 py-2 border-b border-slate-200/60 dark:border-gray-800/60 bg-white/80 dark:bg-[#0d0d20]/80 backdrop-blur-xl">
        <button onClick={() => { setShowEditor(false); setSelectedTemplate(null); }} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="w-4 h-4 text-slate-500 dark:text-gray-400" />
        </button>
        <span className="text-sm font-semibold text-slate-700 dark:text-gray-200 truncate">{selectedTemplate.name}</span>
        <span className="text-[10px] text-slate-400 dark:text-gray-500 ml-1">{currentW}x{currentH}</span>
        <div className="flex-1" />

        {/* Undo / Redo */}
        <button onClick={editor.undo} disabled={!editor.canUndo} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors" title="Отменить (Ctrl+Z)">
          <Undo2 className="w-4 h-4 text-slate-500 dark:text-gray-400" />
        </button>
        <button onClick={editor.redo} disabled={!editor.canRedo} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors" title="Повторить (Ctrl+Y)">
          <Redo2 className="w-4 h-4 text-slate-500 dark:text-gray-400" />
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-gray-800 mx-1" />

        {/* Zoom controls */}
        <div className="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-gray-800/80 rounded-lg px-1 py-0.5">
          <button onClick={editor.zoomOut} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title="Уменьшить">
            <ZoomOut className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
          </button>
          <button onClick={() => editor.zoomTo(100)} className="px-1.5 min-w-[40px] text-center text-[10px] font-medium text-slate-600 dark:text-gray-300 hover:text-cyan-500 transition-colors" title="Сбросить зум">
            {editor.zoomLevel}%
          </button>
          <button onClick={editor.zoomIn} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors" title="Увеличить">
            <ZoomIn className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Safe zones toggle */}
        <button
          onClick={editor.toggleSafeZones}
          className={`p-1.5 rounded-lg transition-colors ${editor.safeZones.enabled ? 'bg-red-500/15 text-red-500' : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400'}`}
          title="Безопасные зоны"
        >
          <ShieldCheck className="w-4 h-4" />
        </button>

        {/* Fullscreen */}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4 text-slate-500 dark:text-gray-400" /> : <Maximize className="w-4 h-4 text-slate-500 dark:text-gray-400" />}
        </button>

        <div className="w-px h-5 bg-slate-200 dark:bg-gray-800 mx-1" />

        {/* Export */}
        <button
          onClick={() => handleDownload('png')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-cyan-500 hover:bg-cyan-600 transition-colors shadow-md shadow-cyan-500/20"
        >
          <Download className="w-3.5 h-3.5" /> PNG
        </button>
        <button
          onClick={() => handleDownload('jpeg')}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors"
        >
          JPG
        </button>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Canvas area */}
        <div
          ref={canvasContainerRef}
          className={`flex-1 flex items-center justify-center bg-slate-100 dark:bg-gray-900/50 overflow-auto relative ${dragOver ? 'ring-4 ring-cyan-500/50 ring-inset' : ''}`}
          onClick={(e) => { if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvasWrap === '1') editor.deselectAll(); }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={() => setDragOver(false)}
        >
          <div className="p-4" data-canvas-wrap="1">
            <canvas ref={editor.canvasRef} className="rounded-lg shadow-2xl" />
          </div>
          {/* Mobile zoom controls */}
          <div className="sm:hidden absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60 dark:border-gray-700/60 px-1.5 py-1">
            <button onClick={editor.zoomOut} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <ZoomOut className="w-4 h-4 text-slate-600 dark:text-gray-300" />
            </button>
            <button onClick={() => editor.zoomTo(100)} className="px-2 text-[11px] font-medium text-slate-600 dark:text-gray-300 min-w-[36px] text-center">
              {editor.zoomLevel}%
            </button>
            <button onClick={editor.zoomIn} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <ZoomIn className="w-4 h-4 text-slate-600 dark:text-gray-300" />
            </button>
          </div>
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-cyan-500/10 backdrop-blur-sm pointer-events-none">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-cyan-500" />
                <span className="text-sm font-medium text-slate-700 dark:text-gray-200">Перетащите изображение сюда</span>
              </div>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className={`shrink-0 lg:w-[360px] border-t lg:border-t-0 lg:border-l border-slate-200/60 dark:border-gray-800/60 bg-white dark:bg-[#0d0d20] flex flex-col ${isFullscreen ? 'max-h-none' : 'max-h-[45vh] lg:max-h-none'} overflow-hidden`}>
          {/* Panel tabs */}
          <div className="shrink-0 flex border-b border-slate-200/60 dark:border-gray-800/60">
            {([
              { id: 'layers' as const, label: 'Слои', icon: Layers },
              { id: 'style' as const, label: 'Свойства', icon: Palette },
              { id: 'format' as const, label: 'Формат', icon: SlidersHorizontal },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs sm:text-sm font-medium transition-colors ${
                  activePanel === tab.id
                    ? 'text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-500'
                    : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">

            {/* ── Layers Panel ── */}
            {activePanel === 'layers' && (
              <div className="space-y-3">
                {/* Add elements toolbar */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-50 dark:bg-gray-900/40 border border-slate-200/60 dark:border-gray-800/40">
                  <button onClick={() => editor.addText()} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors group" title="Добавить текст">
                    <Type className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-cyan-500 transition-colors" />
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 group-hover:text-cyan-500">Текст</span>
                  </button>
                  <button onClick={() => editor.addRect()} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors group" title="Добавить прямоугольник">
                    <Square className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-cyan-500 transition-colors" />
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 group-hover:text-cyan-500">Фигура</span>
                  </button>
                  <button onClick={() => editor.addCircle()} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors group" title="Добавить круг">
                    <Circle className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-cyan-500 transition-colors" />
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 group-hover:text-cyan-500">Круг</span>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 transition-colors group" title="Добавить изображение">
                    <ImageIcon className="w-4 h-4 text-slate-500 dark:text-gray-400 group-hover:text-cyan-500 transition-colors" />
                    <span className="text-[9px] text-slate-400 dark:text-gray-500 group-hover:text-cyan-500">Фото</span>
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Слои ({editor.layers.length})</span>
                </div>

                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) editor.addImageFromFile(f);
                  e.target.value = '';
                }} />

                <div className="space-y-0.5">
                  {reversedLayers.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-6">Нет слоёв. Добавьте элемент выше.</p>
                  )}
                  {reversedLayers.map(layer => (
                    <LayerRow
                      key={layer.id}
                      layer={layer}
                      selected={editor.selectedLayerIds.includes(layer.id)}
                      onSelect={(e) => editor.selectLayer(layer.id, e?.ctrlKey || e?.metaKey || e?.shiftKey)}
                      onToggleVis={() => editor.toggleVisibility(layer.id)}
                      onToggleLock={() => editor.toggleLock(layer.id)}
                      onMoveUp={() => editor.moveLayer(layer.id, 'up')}
                      onMoveDown={() => editor.moveLayer(layer.id, 'down')}
                      onDuplicate={() => editor.duplicateLayer(layer.id)}
                      onDelete={() => editor.deleteLayer(layer.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Style / Properties Panel ── */}
            {activePanel === 'style' && (
              <div className="space-y-4">
                {textProps ? (
                  <>
                    {/* Dimensions for text */}
                    {layerDims && (
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          <Move className="w-3.5 h-3.5" /> Размер и позиция
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">W</label>
                            <input
                              type="number" min={1}
                              value={layerDims.width}
                              onChange={e => editor.updateSelectedDimensions({ width: Number(e.target.value) }, aspectLocked)}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">H</label>
                            <input
                              type="number" min={1}
                              value={layerDims.height}
                              onChange={e => editor.updateSelectedDimensions({ height: Number(e.target.value) }, aspectLocked)}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => setAspectLocked(v => !v)}
                            className={`p-1.5 rounded-lg transition-all ${
                              aspectLocked ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                            title={aspectLocked ? 'Пропорции сохраняются' : 'Свободное изменение'}
                          >
                            {aspectLocked ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-[10px] text-slate-400 dark:text-gray-500">
                            {aspectLocked ? 'Пропорции сохраняются' : 'Свободное изменение размера'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">X</label>
                            <input
                              type="number"
                              value={layerDims.x}
                              onChange={e => editor.updateSelectedDimensions({ x: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">Y</label>
                            <input
                              type="number"
                              value={layerDims.y}
                              onChange={e => editor.updateSelectedDimensions({ y: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Text content */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Текст</label>
                      <textarea
                        value={textProps.text}
                        onChange={e => editor.updateSelectedText(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
                      />
                    </div>

                    {/* Font picker */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Шрифт</label>
                      <div className="grid grid-cols-2 gap-1 max-h-[120px] overflow-y-auto pr-1">
                        {FONTS.map(f => (
                          <button
                            key={f.id}
                            onClick={() => editor.updateSelectedFont(f.id)}
                            className={`px-2 py-1.5 rounded-lg text-[11px] font-medium text-left transition-all ${
                              textProps.fontFamily.includes(f.id)
                                ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30'
                                : 'bg-slate-100 dark:bg-gray-800/60 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700/60'
                            }`}
                            style={{ fontFamily: f.css }}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Size + color */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">Размер</label>
                        <input
                          type="number"
                          value={Math.round(textProps.fontSize)}
                          min={8} max={500}
                          onChange={e => editor.updateSelectedFontSize(Number(e.target.value) || 32)}
                          className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-xs text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">Цвет</label>
                        <input
                          type="color"
                          value={textProps.fill}
                          onChange={e => editor.updateSelectedColor(e.target.value)}
                          className="w-8 h-8 rounded-lg border border-slate-200 dark:border-gray-700 cursor-pointer bg-transparent p-0.5"
                        />
                      </div>
                    </div>

                    {/* Formatting toolbar */}
                    <div className="flex items-center gap-1 flex-wrap">
                      <button
                        onClick={() => editor.updateSelectedFontWeight(textProps.fontWeight === '700' ? '400' : '700')}
                        className={`p-2 rounded-lg transition-all ${textProps.fontWeight === '700' ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
                        title="Жирный"
                      >
                        <Bold className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => editor.updateSelectedFontStyle(textProps.fontStyle === 'italic' ? 'normal' : 'italic')}
                        className={`p-2 rounded-lg transition-all ${textProps.fontStyle === 'italic' ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
                        title="Курсив"
                      >
                        <Italic className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => editor.updateSelectedUnderline(!textProps.underline)}
                        className={`p-2 rounded-lg transition-all ${textProps.underline ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
                        title="Подчёркнутый"
                      >
                        <Underline className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => editor.updateSelectedLinethrough(!textProps.linethrough)}
                        className={`p-2 rounded-lg transition-all ${textProps.linethrough ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
                        title="Зачёркнутый"
                      >
                        <Strikethrough className="w-4 h-4" />
                      </button>
                      <div className="w-px h-5 bg-slate-200 dark:bg-gray-800 mx-0.5" />
                      {(['left', 'center', 'right'] as const).map(a => {
                        const I = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
                        return (
                          <button
                            key={a}
                            onClick={() => editor.updateSelectedAlign(a)}
                            className={`p-2 rounded-lg transition-all ${textProps.textAlign === a ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'}`}
                          >
                            <I className="w-4 h-4" />
                          </button>
                        );
                      })}
                    </div>

                    {/* Letter spacing */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">
                        <MoveHorizontal className="w-3.5 h-3.5" /> Межбуквенный: {textProps.charSpacing}
                      </label>
                      <input
                        type="range" min={-200} max={800} step={10}
                        value={textProps.charSpacing}
                        onChange={e => editor.updateSelectedCharSpacing(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    {/* Line height */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">
                        <Rows3 className="w-3.5 h-3.5" /> Межстрочный: {textProps.lineHeight.toFixed(2)}
                      </label>
                      <input
                        type="range" min={60} max={300} step={5}
                        value={Math.round(textProps.lineHeight * 100)}
                        onChange={e => editor.updateSelectedLineHeight(Number(e.target.value) / 100)}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    {/* Text shadow */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 mb-1.5">
                        <LetterText className="w-3.5 h-3.5" /> Тень текста
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: 'Нет', val: '' },
                          { label: 'Лёгкая', val: '1px 1px 3px rgba(0,0,0,0.3)' },
                          { label: 'Средняя', val: '2px 2px 6px rgba(0,0,0,0.5)' },
                          { label: 'Сильная', val: '3px 3px 10px rgba(0,0,0,0.7)' },
                          { label: 'Свечение', val: '0 0 10px rgba(6,182,212,0.8)' },
                        ].map(s => (
                          <button
                            key={s.label}
                            onClick={() => editor.updateSelectedShadow(s.val)}
                            className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                              textProps.shadow === s.val ? 'bg-cyan-500/15 text-cyan-600 ring-1 ring-cyan-500/30' : 'bg-slate-100 dark:bg-gray-800/60 text-slate-500 hover:bg-slate-200 dark:hover:bg-gray-700'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Opacity */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Непрозрачность: {Math.round(textProps.opacity * 100)}%</label>
                      <input
                        type="range" min={0} max={100}
                        value={Math.round(textProps.opacity * 100)}
                        onChange={e => editor.updateSelectedOpacity(Number(e.target.value) / 100)}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                  </>
                ) : hasSelection && shapeProps ? (
                  <>
                    {/* Dimensions */}
                    {layerDims && (
                      <div>
                        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                          <Move className="w-3.5 h-3.5" /> Размер и позиция
                        </label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">W</label>
                            <input
                              type="number" min={1}
                              value={layerDims.width}
                              onChange={e => editor.updateSelectedDimensions({ width: Number(e.target.value) }, aspectLocked)}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">H</label>
                            <input
                              type="number" min={1}
                              value={layerDims.height}
                              onChange={e => editor.updateSelectedDimensions({ height: Number(e.target.value) }, aspectLocked)}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => setAspectLocked(v => !v)}
                            className={`p-1.5 rounded-lg transition-all ${
                              aspectLocked ? 'bg-cyan-500/15 text-cyan-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                            title={aspectLocked ? 'Пропорции сохраняются' : 'Свободное изменение'}
                          >
                            {aspectLocked ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
                          </button>
                          <span className="text-[10px] text-slate-400 dark:text-gray-500">
                            {aspectLocked ? 'Пропорции сохраняются' : 'Свободное изменение размера'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">X</label>
                            <input
                              type="number"
                              value={layerDims.x}
                              onChange={e => editor.updateSelectedDimensions({ x: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">Y</label>
                            <input
                              type="number"
                              value={layerDims.y}
                              onChange={e => editor.updateSelectedDimensions({ y: Number(e.target.value) })}
                              className="w-full px-2 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Image-specific controls */}
                    {shapeProps.isImage && (
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Изображение</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => replaceInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                          >
                            <Replace className="w-3.5 h-3.5" /> Заменить
                          </button>
                          <button
                            onClick={handleRemoveBg}
                            disabled={removingBg}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 transition-all shadow-md shadow-cyan-500/20"
                          >
                            {removingBg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eraser className="w-3.5 h-3.5" />}
                            {removingBg ? 'Удаление...' : 'Убрать фон'}
                          </button>
                        </div>
                        {removeBgError && <p className="text-[11px] text-red-400 px-1">{removeBgError}</p>}
                        <input ref={replaceInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) editor.replaceSelectedImage(f);
                          e.target.value = '';
                        }} />
                      </div>
                    )}

                    {/* Fill color (not for images) */}
                    {!shapeProps.isImage && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Заливка</label>
                        <input
                          type="color"
                          value={shapeProps.fill}
                          onChange={e => editor.updateSelectedFill(e.target.value)}
                          className="w-10 h-10 rounded-lg border border-slate-200 dark:border-gray-700 cursor-pointer bg-transparent p-1"
                        />
                      </div>
                    )}

                    {/* Border radius */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">
                        <RectangleHorizontal className="w-3.5 h-3.5" /> Скругление: {Math.round(shapeProps.rx)}px
                      </label>
                      <input
                        type="range" min={0} max={200} step={1}
                        value={shapeProps.rx}
                        onChange={e => editor.updateSelectedBorderRadius(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    {/* Opacity */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-1">Непрозрачность: {Math.round(shapeProps.opacity * 100)}%</label>
                      <input
                        type="range" min={0} max={100}
                        value={Math.round(shapeProps.opacity * 100)}
                        onChange={e => editor.updateSelectedOpacity(Number(e.target.value) / 100)}
                        className="w-full accent-cyan-500"
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-gray-500 text-center py-8">Выберите элемент для редактирования</p>
                )}

                {/* AI generation */}
                <div className="border-t border-slate-200/60 dark:border-gray-800/60 pt-3">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">ИИ-генерация изображения</label>
                  <div className="space-y-2">
                    <textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder={aiUseCanvas ? 'Опишите, как улучшить текущий макет...' : 'Опишите изображение, которое хотите создать...'}
                      rows={2}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-xs text-slate-800 dark:text-gray-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none"
                    />
                    <button
                      onClick={() => setAiUseCanvas(!aiUseCanvas)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                        aiUseCanvas
                          ? 'border-cyan-400 dark:border-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300'
                          : 'border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-slate-500 dark:text-gray-400'
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 text-left">{aiUseCanvas ? 'Макет будет отправлен как референс' : 'Использовать макет как референс'}</span>
                      <div className={`w-8 h-4 rounded-full transition-colors relative ${aiUseCanvas ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-gray-600'}`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${aiUseCanvas ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </div>
                    </button>
                    <div className="relative">
                      <button
                        onClick={() => setShowAiModelPicker(!showAiModelPicker)}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-xs text-slate-700 dark:text-gray-300"
                      >
                        <span>{AI_MODELS_FOR_CARDS.find(m => m.id === aiModel)?.name || aiModel}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                      {showAiModelPicker && (
                        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                          {AI_MODELS_FOR_CARDS.map(m => (
                            <button
                              key={m.id}
                              onClick={() => { setAiModel(m.id); setShowAiModelPicker(false); }}
                              className={`w-full flex flex-col px-3 py-2 text-left text-xs hover:bg-slate-50 dark:hover:bg-gray-700/60 transition-colors ${aiModel === m.id ? 'bg-cyan-50 dark:bg-cyan-900/20' : ''}`}
                            >
                              <span className="font-medium text-slate-700 dark:text-gray-200">{m.name}</span>
                              <span className="text-[10px] text-slate-400 dark:text-gray-500">от {m.priceFrom} токенов</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={generateAiImage}
                      disabled={aiGenerating}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-cyan-500/20 active:scale-[0.97]"
                    >
                      {aiGenerating ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Генерация...</>
                      ) : (
                        <><Wand2 className="w-4 h-4" /> {aiUseCanvas ? 'Улучшить макет' : 'Сгенерировать фото'}</>
                      )}
                    </button>
                    {aiError && (
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] text-red-400 px-1 flex-1">{aiError}</p>
                        <button onClick={generateAiImage} disabled={aiGenerating} className="text-[10px] text-cyan-500 hover:text-cyan-400 font-medium shrink-0">Повторить</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Format Panel ── */}
            {activePanel === 'format' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Быстрый формат</label>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMATS.map(fmt => (
                      <button
                        key={fmt.id}
                        onClick={() => applyFormat(fmt)}
                        className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border transition-all ${
                          activeFormat === fmt.id
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
                            : 'border-slate-200 dark:border-gray-800 text-slate-500 dark:text-gray-400 hover:border-cyan-500/50'
                        }`}
                      >
                        <fmt.icon className="w-4 h-4" />
                        <span className="text-[11px] font-medium">{fmt.label}</span>
                        <span className="text-[9px] opacity-60">{fmt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Быстрые размеры</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CUSTOM_RESOLUTIONS.map(res => (
                      <button
                        key={res.label}
                        onClick={() => { setOutputWidth(res.w); setOutputHeight(res.h); setActiveFormat('custom'); editor.resizeCanvas(res.w, res.h); }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                          currentW === res.w && currentH === res.h
                            ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 ring-1 ring-cyan-500/30'
                            : 'bg-slate-100 dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700/60'
                        }`}
                      >
                        {res.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Своё разрешение</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">Ширина</label>
                      <input
                        type="number" value={currentW} min={100} max={8000}
                        onChange={e => { const v = Math.max(100, Math.min(8000, Number(e.target.value) || 100)); setOutputWidth(v); setActiveFormat('custom'); }}
                        onBlur={() => editor.resizeCanvas(currentW, currentH)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      />
                    </div>
                    <span className="text-slate-400 dark:text-gray-500 mt-4">x</span>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-0.5">Высота</label>
                      <input
                        type="number" value={currentH} min={100} max={8000}
                        onChange={e => { const v = Math.max(100, Math.min(8000, Number(e.target.value) || 100)); setOutputHeight(v); setActiveFormat('custom'); }}
                        onBlur={() => editor.resizeCanvas(currentW, currentH)}
                        className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-gray-800 bg-slate-50 dark:bg-gray-900/60 text-sm text-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
                      />
                    </div>
                  </div>
                </div>

                {/* Safe zones config */}
                <div className="border-t border-slate-200/60 dark:border-gray-800/60 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                      <ShieldCheck className="w-3.5 h-3.5" /> Безопасные зоны
                    </label>
                    <button
                      onClick={editor.toggleSafeZones}
                      className={`w-9 h-5 rounded-full transition-colors relative ${editor.safeZones.enabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-gray-600'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${editor.safeZones.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  {editor.safeZones.enabled && (
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-gray-500 mb-1">Отступ: {editor.safeZones.padding}px</label>
                      <input
                        type="range" min={10} max={200} step={5}
                        value={editor.safeZones.padding}
                        onChange={e => editor.setSafeZonePadding(Number(e.target.value))}
                        className="w-full accent-red-500"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-gray-600 mt-1">Красная зона показывает области, которые могут быть обрезаны</p>
                    </div>
                  )}
                </div>

                {/* Background color */}
                <div className="border-t border-slate-200/60 dark:border-gray-800/60 pt-3">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mb-2">Цвет фона</label>
                  <div className="flex items-center gap-2">
                    {BLANK_BG_COLORS.slice(0, 6).map(c => (
                      <button key={c} onClick={() => editor.setCanvasBg(c)}
                        className="w-7 h-7 rounded-lg border-2 border-slate-200 dark:border-gray-700 hover:border-cyan-500 transition-all"
                        style={{ backgroundColor: c }} />
                    ))}
                    <input type="color" defaultValue="#0f172a" onChange={e => editor.setCanvasBg(e.target.value)}
                      className="w-7 h-7 rounded-lg border border-slate-200 dark:border-gray-700 cursor-pointer bg-transparent p-0.5" />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-gray-900/40 border border-slate-200/60 dark:border-gray-800/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-gray-400">Итоговый размер</span>
                    <span className="font-semibold text-slate-700 dark:text-gray-200">{currentW} x {currentH} px</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
