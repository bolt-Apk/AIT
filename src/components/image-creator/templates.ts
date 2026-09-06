import { Box, PenTool, BarChart3, Grid3x3, Smartphone, Square, Monitor, RectangleHorizontal, Ratio } from 'lucide-react';

/* ── Style Types ── */

export type StyleType = '2d' | '3d' | 'infographic' | 'all';

export interface StyleOption {
  id: StyleType;
  label: string;
  icon: typeof Box;
  description: string;
}

export const STYLE_OPTIONS: StyleOption[] = [
  { id: 'all', label: 'Все', icon: Grid3x3, description: 'Все стили' },
  { id: '2d', label: '2D', icon: PenTool, description: 'Плоский дизайн' },
  { id: '3d', label: '3D', icon: Box, description: 'Объёмный дизайн' },
  { id: 'infographic', label: 'Инфографика', icon: BarChart3, description: 'Данные и графики' },
];

/* ── Template system ── */

export interface TemplateLayer {
  type: 'rect' | 'text' | 'circle' | 'image-placeholder';
  x: number; y: number; w: number; h: number;
  fill?: string;
  text?: string;
  fontSize?: number;
  fontWeight?: string;
  color?: string;
  align?: CanvasTextAlign;
  lineHeight?: number;
  radius?: number;
  editable?: boolean;
  editKey?: string;
  opacity?: number;
  gradient?: { from: string; to: string; angle?: number };
  shadow?: { blur: number; color: string; offsetX?: number; offsetY?: number };
  border?: { color: string; width: number };
}

export interface Template {
  id: string;
  name: string;
  category: string;
  styleType: StyleType;
  width: number;
  height: number;
  bg: string;
  layers: TemplateLayer[];
}

export type FormatId = 'story' | 'post' | 'wide' | 'banner-tall' | 'a4';
export interface Format { id: FormatId; label: string; icon: typeof Smartphone; w: number; h: number; desc: string }

export const FORMATS: Format[] = [
  { id: 'story', label: 'Сторис', icon: Smartphone, w: 1080, h: 1920, desc: '9:16' },
  { id: 'post', label: 'Пост', icon: Square, w: 1080, h: 1080, desc: '1:1' },
  { id: 'wide', label: 'Баннер', icon: Monitor, w: 1920, h: 1080, desc: '16:9' },
  { id: 'banner-tall', label: 'Вертикальный', icon: RectangleHorizontal, w: 1080, h: 1350, desc: '4:5' },
  { id: 'a4', label: 'A4', icon: Ratio, w: 2480, h: 3508, desc: '210x297мм' },
];

export const CATEGORIES = ['Все', 'Акции', 'Соцсети', 'Объявления', 'Минимализм', 'Яркие', 'Бизнес', 'Образование'];

export const CUSTOM_RESOLUTIONS = [
  { label: '1080x1080', w: 1080, h: 1080 },
  { label: '1080x1920', w: 1080, h: 1920 },
  { label: '1920x1080', w: 1920, h: 1080 },
  { label: '1080x1350', w: 1080, h: 1350 },
  { label: '2480x3508', w: 2480, h: 3508 },
];

export const ACCENT_COLORS = [
  '#e11d48', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#0f172a', '#ffffff',
];

export const FONTS = [
  { id: 'Inter', label: 'Inter', css: '"Inter", sans-serif' },
  { id: 'Montserrat', label: 'Montserrat', css: '"Montserrat", sans-serif' },
  { id: 'Roboto', label: 'Roboto', css: '"Roboto", sans-serif' },
  { id: 'Playfair Display', label: 'Playfair Display', css: '"Playfair Display", serif' },
  { id: 'Oswald', label: 'Oswald', css: '"Oswald", sans-serif' },
  { id: 'Raleway', label: 'Raleway', css: '"Raleway", sans-serif' },
  { id: 'Nunito', label: 'Nunito', css: '"Nunito", sans-serif' },
  { id: 'PT Sans', label: 'PT Sans', css: '"PT Sans", sans-serif' },
  { id: 'Rubik', label: 'Rubik', css: '"Rubik", sans-serif' },
  { id: 'Manrope', label: 'Manrope', css: '"Manrope", sans-serif' },
] as const;

export function makeTemplates(): Template[] {
  return [
    // ── Акции / 2D ──
    {
      id: 'sale-bold', name: 'Большая скидка', category: 'Акции', styleType: '2d',
      width: 1080, height: 1920, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0f172a' },
        { type: 'rect', x: 60, y: 400, w: 960, h: 500, fill: '#e11d48', radius: 32 },
        { type: 'text', x: 540, y: 560, w: 860, h: 80, text: '-50%', fontSize: 180, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'discount' },
        { type: 'text', x: 540, y: 740, w: 860, h: 60, text: 'НА ВСЁ', fontSize: 64, fontWeight: '700', color: '#fecdd3', align: 'center', editable: true, editKey: 'subtitle' },
        { type: 'text', x: 540, y: 1050, w: 900, h: 50, text: 'Только до конца недели', fontSize: 42, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'details' },
        { type: 'rect', x: 290, y: 1200, w: 500, h: 80, fill: '#e11d48', radius: 40 },
        { type: 'text', x: 540, y: 1252, w: 460, h: 40, text: 'КУПИТЬ СЕЙЧАС', fontSize: 32, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1600, w: 900, h: 40, text: 'yourstore.com', fontSize: 36, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'brand' },
      ],
    },
    {
      id: 'sale-gradient', name: 'Летняя распродажа', category: 'Акции', styleType: '2d',
      width: 1080, height: 1080, bg: '#f97316',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#f97316' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#ec4899', opacity: 0.5 },
        { type: 'text', x: 540, y: 300, w: 900, h: 80, text: 'ЛЕТНЯЯ', fontSize: 96, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'line1' },
        { type: 'text', x: 540, y: 420, w: 900, h: 80, text: 'РАСПРОДАЖА', fontSize: 96, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'line2' },
        { type: 'text', x: 540, y: 580, w: 800, h: 60, text: 'до -70% на всю коллекцию', fontSize: 48, fontWeight: '500', color: '#fff7ed', align: 'center', editable: true, editKey: 'offer' },
        { type: 'rect', x: 340, y: 720, w: 400, h: 72, fill: '#ffffff', radius: 36 },
        { type: 'text', x: 540, y: 768, w: 360, h: 36, text: 'ПОДРОБНЕЕ', fontSize: 30, fontWeight: '700', color: '#ea580c', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 950, w: 800, h: 30, text: '@yourbrand', fontSize: 32, fontWeight: '500', color: 'rgba(255,255,255,0.7)', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    {
      id: 'sale-flash', name: 'Молниеносная акция', category: 'Акции', styleType: '2d',
      width: 1080, height: 1080, bg: '#020617',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#020617' },
        { type: 'rect', x: 60, y: 60, w: 960, h: 960, fill: '#0f172a', radius: 40 },
        { type: 'text', x: 540, y: 260, w: 800, h: 40, text: 'FLASH SALE', fontSize: 48, fontWeight: '800', color: '#fbbf24', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 290, y: 360, w: 500, h: 200, fill: '#fbbf24', radius: 24 },
        { type: 'text', x: 540, y: 460, w: 460, h: 80, text: '-70%', fontSize: 140, fontWeight: '900', color: '#020617', align: 'center', editable: true, editKey: 'discount' },
        { type: 'text', x: 540, y: 650, w: 800, h: 40, text: 'Только 24 часа', fontSize: 40, fontWeight: '600', color: '#94a3b8', align: 'center', editable: true, editKey: 'timer' },
        { type: 'rect', x: 290, y: 780, w: 500, h: 72, fill: '#fbbf24', radius: 36 },
        { type: 'text', x: 540, y: 828, w: 460, h: 30, text: 'УСПЕТЬ КУПИТЬ', fontSize: 28, fontWeight: '700', color: '#020617', align: 'center', editable: true, editKey: 'cta' },
      ],
    },
    // ── Акции / 3D ──
    {
      id: 'sale-3d-cube', name: '3D Скидка', category: 'Акции', styleType: '3d',
      width: 1080, height: 1080, bg: '#0c0a1d',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0c0a1d' },
        { type: 'rect', x: 240, y: 180, w: 600, h: 600, fill: '#1a1640', radius: 40 },
        { type: 'rect', x: 260, y: 160, w: 600, h: 600, fill: '#251e5e', radius: 40, opacity: 0.7 },
        { type: 'rect', x: 280, y: 200, w: 560, h: 560, fill: '#312985', radius: 36, opacity: 0.5 },
        { type: 'text', x: 540, y: 420, w: 500, h: 80, text: '-40%', fontSize: 160, fontWeight: '900', color: '#a78bfa', align: 'center', editable: true, editKey: 'discount' },
        { type: 'text', x: 540, y: 570, w: 500, h: 40, text: 'ВЫХОДНЫЕ', fontSize: 48, fontWeight: '700', color: '#c4b5fd', align: 'center', editable: true, editKey: 'subtitle' },
        { type: 'rect', x: 310, y: 860, w: 460, h: 68, fill: '#7c3aed', radius: 34 },
        { type: 'text', x: 540, y: 906, w: 420, h: 30, text: 'ЗАБРАТЬ СКИДКУ', fontSize: 26, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1010, w: 800, h: 30, text: '@yourbrand', fontSize: 28, fontWeight: '500', color: '#4c1d95', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    // ── Соцсети / 2D ──
    {
      id: 'social-quote', name: 'Цитата', category: 'Соцсети', styleType: '2d',
      width: 1080, height: 1080, bg: '#f8fafc',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#f8fafc' },
        { type: 'text', x: 540, y: 200, w: 100, h: 200, text: '\u201C', fontSize: 240, fontWeight: '900', color: '#06b6d4', align: 'center' },
        { type: 'text', x: 540, y: 440, w: 840, h: 200, text: 'Дизайн — это не то, как\nвещь выглядит, а то,\nкак она работает', fontSize: 52, fontWeight: '600', color: '#0f172a', align: 'center', lineHeight: 1.5, editable: true, editKey: 'quote' },
        { type: 'rect', x: 440, y: 720, w: 200, h: 4, fill: '#06b6d4' },
        { type: 'text', x: 540, y: 790, w: 800, h: 36, text: 'Стив Джобс', fontSize: 36, fontWeight: '600', color: '#64748b', align: 'center', editable: true, editKey: 'author' },
        { type: 'text', x: 540, y: 960, w: 800, h: 30, text: '@yourbrand', fontSize: 28, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    {
      id: 'social-tips', name: 'Совет дня', category: 'Соцсети', styleType: '2d',
      width: 1080, height: 1920, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0f172a' },
        { type: 'rect', x: 60, y: 300, w: 960, h: 1300, fill: '#1e293b', radius: 40 },
        { type: 'text', x: 540, y: 420, w: 800, h: 40, text: 'СОВЕТ ДНЯ', fontSize: 36, fontWeight: '700', color: '#06b6d4', align: 'center', editable: true, editKey: 'label' },
        { type: 'rect', x: 440, y: 480, w: 200, h: 3, fill: '#06b6d4' },
        { type: 'text', x: 540, y: 600, w: 800, h: 60, text: 'Как увеличить\nпродажи в 2 раза', fontSize: 56, fontWeight: '800', color: '#f1f5f9', align: 'center', lineHeight: 1.4, editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 880, w: 800, h: 200, text: '1. Определите целевую аудиторию\n2. Создайте воронку продаж\n3. Тестируйте и оптимизируйте\n4. Масштабируйте результат', fontSize: 36, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.8, editable: true, editKey: 'steps' },
        { type: 'text', x: 540, y: 1450, w: 800, h: 30, text: 'Сохрани, чтобы не потерять!', fontSize: 32, fontWeight: '600', color: '#06b6d4', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1720, w: 800, h: 30, text: '@yourbrand', fontSize: 30, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    {
      id: 'social-carousel-cover', name: 'Обложка карусели', category: 'Соцсети', styleType: '2d',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0f172a' },
        { type: 'rect', x: 60, y: 60, w: 960, h: 960, fill: '#1e293b', radius: 48 },
        { type: 'text', x: 540, y: 340, w: 800, h: 40, text: 'ТОП-5 ОШИБОК', fontSize: 56, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 460, w: 800, h: 40, text: 'В МАРКЕТИНГЕ', fontSize: 56, fontWeight: '800', color: '#06b6d4', align: 'center', editable: true, editKey: 'subtitle' },
        { type: 'rect', x: 340, y: 560, w: 400, h: 4, fill: '#06b6d4' },
        { type: 'text', x: 540, y: 660, w: 700, h: 100, text: 'Листай вправо\nчтобы узнать', fontSize: 36, fontWeight: '400', color: '#64748b', align: 'center', lineHeight: 1.6, editable: true, editKey: 'desc' },
        { type: 'text', x: 540, y: 900, w: 800, h: 30, text: '@yourbrand', fontSize: 28, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    // ── Соцсети / 3D ──
    {
      id: 'social-3d-quote', name: '3D Цитата', category: 'Соцсети', styleType: '3d',
      width: 1080, height: 1080, bg: '#0a0f1a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0a0f1a' },
        { type: 'rect', x: 100, y: 120, w: 880, h: 840, fill: '#111827', radius: 48 },
        { type: 'rect', x: 80, y: 100, w: 880, h: 840, fill: '#1f2937', radius: 48, opacity: 0.6 },
        { type: 'rect', x: 60, y: 80, w: 880, h: 840, fill: '#374151', radius: 48, opacity: 0.3 },
        { type: 'text', x: 540, y: 280, w: 100, h: 120, text: '\u201C', fontSize: 200, fontWeight: '900', color: '#22d3ee', align: 'center' },
        { type: 'text', x: 540, y: 480, w: 720, h: 160, text: 'Будущее принадлежит\nтем, кто верит\nв свои мечты', fontSize: 48, fontWeight: '600', color: '#e5e7eb', align: 'center', lineHeight: 1.5, editable: true, editKey: 'quote' },
        { type: 'rect', x: 440, y: 720, w: 200, h: 3, fill: '#22d3ee' },
        { type: 'text', x: 540, y: 790, w: 600, h: 30, text: 'Элеонора Рузвельт', fontSize: 32, fontWeight: '500', color: '#6b7280', align: 'center', editable: true, editKey: 'author' },
      ],
    },
    // ── Объявления / 2D ──
    {
      id: 'announce-event', name: 'Событие', category: 'Объявления', styleType: '2d',
      width: 1080, height: 1920, bg: '#020617',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#020617' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 800, fill: '#0e7490', opacity: 0.3 },
        { type: 'text', x: 540, y: 350, w: 900, h: 40, text: 'ПРИГЛАШАЕМ', fontSize: 36, fontWeight: '700', color: '#06b6d4', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 480, w: 900, h: 80, text: 'Мастер-класс\nпо дизайну', fontSize: 72, fontWeight: '800', color: '#ffffff', align: 'center', lineHeight: 1.3, editable: true, editKey: 'title' },
        { type: 'rect', x: 160, y: 750, w: 760, h: 200, fill: '#0e7490', radius: 24 },
        { type: 'text', x: 540, y: 810, w: 680, h: 40, text: '15 сентября, 18:00', fontSize: 42, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'date' },
        { type: 'text', x: 540, y: 880, w: 680, h: 30, text: 'Онлайн, бесплатно', fontSize: 32, fontWeight: '500', color: '#a5f3fc', align: 'center', editable: true, editKey: 'place' },
        { type: 'text', x: 540, y: 1100, w: 800, h: 200, text: 'Научитесь создавать\nпрофессиональные макеты\nза 2 часа', fontSize: 40, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.6, editable: true, editKey: 'desc' },
        { type: 'rect', x: 290, y: 1420, w: 500, h: 80, fill: '#06b6d4', radius: 40 },
        { type: 'text', x: 540, y: 1472, w: 460, h: 40, text: 'ЗАПИСАТЬСЯ', fontSize: 32, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1700, w: 800, h: 30, text: '@yourbrand', fontSize: 30, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    {
      id: 'announce-launch', name: 'Запуск продукта', category: 'Объявления', styleType: '2d',
      width: 1920, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#0f172a' },
        { type: 'rect', x: 80, y: 80, w: 800, h: 920, fill: '#1e293b', radius: 32 },
        { type: 'text', x: 480, y: 260, w: 680, h: 40, text: 'СКОРО', fontSize: 32, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 480, y: 400, w: 680, h: 80, text: 'Новый\nпродукт', fontSize: 80, fontWeight: '800', color: '#f1f5f9', align: 'center', lineHeight: 1.2, editable: true, editKey: 'title' },
        { type: 'text', x: 480, y: 620, w: 680, h: 60, text: 'Революция в вашей\nповседневной жизни', fontSize: 36, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'desc' },
        { type: 'rect', x: 330, y: 780, w: 300, h: 64, fill: '#06b6d4', radius: 32 },
        { type: 'text', x: 480, y: 822, w: 260, h: 30, text: 'УЗНАТЬ БОЛЬШЕ', fontSize: 24, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'image-placeholder', x: 960, y: 80, w: 880, h: 920, fill: '#334155', radius: 32 },
      ],
    },
    // ── Минимализм / 2D ──
    {
      id: 'minimal-clean', name: 'Чистый стиль', category: 'Минимализм', styleType: '2d',
      width: 1080, height: 1080, bg: '#ffffff',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#ffffff' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 6, fill: '#0f172a' },
        { type: 'text', x: 540, y: 380, w: 880, h: 80, text: 'Простота — это\nвысшая утончённость', fontSize: 64, fontWeight: '300', color: '#0f172a', align: 'center', lineHeight: 1.4, editable: true, editKey: 'text' },
        { type: 'rect', x: 490, y: 600, w: 100, h: 3, fill: '#0f172a' },
        { type: 'text', x: 540, y: 680, w: 800, h: 30, text: 'YOURBRAND', fontSize: 24, fontWeight: '600', color: '#64748b', align: 'center', editable: true, editKey: 'brand' },
        { type: 'rect', x: 0, y: 1074, w: 1080, h: 6, fill: '#0f172a' },
      ],
    },
    {
      id: 'minimal-split', name: 'Разделённый', category: 'Минимализм', styleType: '2d',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 540, h: 1080, fill: '#f1f5f9' },
        { type: 'rect', x: 540, y: 0, w: 540, h: 1080, fill: '#0f172a' },
        { type: 'text', x: 270, y: 480, w: 420, h: 80, text: 'СВЕТ', fontSize: 80, fontWeight: '900', color: '#0f172a', align: 'center', editable: true, editKey: 'left' },
        { type: 'text', x: 810, y: 480, w: 420, h: 80, text: 'ТЕНЬ', fontSize: 80, fontWeight: '900', color: '#f1f5f9', align: 'center', editable: true, editKey: 'right' },
        { type: 'text', x: 270, y: 600, w: 400, h: 30, text: 'баланс', fontSize: 28, fontWeight: '300', color: '#64748b', align: 'center', editable: true, editKey: 'sub_left' },
        { type: 'text', x: 810, y: 600, w: 400, h: 30, text: 'гармония', fontSize: 28, fontWeight: '300', color: '#94a3b8', align: 'center', editable: true, editKey: 'sub_right' },
      ],
    },
    // ── Яркие / 2D ──
    {
      id: 'bright-neon', name: 'Неон', category: 'Яркие', styleType: '2d',
      width: 1080, height: 1080, bg: '#0a0a0a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0a0a0a' },
        { type: 'text', x: 540, y: 360, w: 860, h: 80, text: 'НОВЫЙ', fontSize: 100, fontWeight: '900', color: '#22d3ee', align: 'center', editable: true, editKey: 'line1' },
        { type: 'text', x: 540, y: 500, w: 860, h: 80, text: 'СЕЗОН', fontSize: 100, fontWeight: '900', color: '#f43f5e', align: 'center', editable: true, editKey: 'line2' },
        { type: 'text', x: 540, y: 660, w: 800, h: 40, text: 'Коллекция уже в продаже', fontSize: 36, fontWeight: '400', color: '#6b7280', align: 'center', editable: true, editKey: 'sub' },
        { type: 'rect', x: 340, y: 780, w: 400, h: 64, fill: '#22d3ee', radius: 32 },
        { type: 'text', x: 540, y: 822, w: 360, h: 30, text: 'СМОТРЕТЬ', fontSize: 28, fontWeight: '700', color: '#0a0a0a', align: 'center', editable: true, editKey: 'cta' },
      ],
    },
    {
      id: 'bright-duotone', name: 'Дуотон', category: 'Яркие', styleType: '2d',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 540, fill: '#0891b2' },
        { type: 'rect', x: 0, y: 540, w: 1080, h: 540, fill: '#0f172a' },
        { type: 'text', x: 540, y: 300, w: 900, h: 80, text: 'ГОРЯЧЕЕ\nПРЕДЛОЖЕНИЕ', fontSize: 80, fontWeight: '900', color: '#ffffff', align: 'center', lineHeight: 1.2, editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 640, w: 800, h: 40, text: 'Подпишись и получи бонус', fontSize: 40, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'desc' },
        { type: 'rect', x: 290, y: 780, w: 500, h: 72, fill: '#0891b2', radius: 36 },
        { type: 'text', x: 540, y: 828, w: 460, h: 30, text: 'ПОДПИСАТЬСЯ', fontSize: 28, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
      ],
    },
    // ── Яркие / 3D ──
    {
      id: 'bright-3d-glow', name: '3D Свечение', category: 'Яркие', styleType: '3d',
      width: 1080, height: 1080, bg: '#030712',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#030712' },
        { type: 'circle', x: 540, y: 440, w: 400, h: 400, fill: '#06b6d4', opacity: 0.15 },
        { type: 'circle', x: 540, y: 440, w: 300, h: 300, fill: '#06b6d4', opacity: 0.25 },
        { type: 'circle', x: 540, y: 440, w: 200, h: 200, fill: '#06b6d4', opacity: 0.4 },
        { type: 'text', x: 540, y: 440, w: 800, h: 80, text: 'PREMIUM', fontSize: 80, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 580, w: 600, h: 40, text: 'Элитная коллекция', fontSize: 36, fontWeight: '400', color: '#67e8f9', align: 'center', editable: true, editKey: 'desc' },
        { type: 'rect', x: 340, y: 740, w: 400, h: 64, fill: '#06b6d4', radius: 32 },
        { type: 'text', x: 540, y: 784, w: 360, h: 30, text: 'ОТКРЫТЬ', fontSize: 28, fontWeight: '700', color: '#030712', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 960, w: 600, h: 30, text: '@premium_brand', fontSize: 24, fontWeight: '500', color: '#374151', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    // ── Бизнес / 2D ──
    {
      id: 'biz-presentation', name: 'Презентация', category: 'Бизнес', styleType: '2d',
      width: 1920, height: 1080, bg: '#ffffff',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#ffffff' },
        { type: 'rect', x: 0, y: 0, w: 80, h: 1080, fill: '#0891b2' },
        { type: 'text', x: 540, y: 300, w: 800, h: 80, text: 'Стратегия\nроста 2025', fontSize: 72, fontWeight: '800', color: '#0f172a', align: 'left', lineHeight: 1.3, editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 520, w: 800, h: 60, text: 'Ежеквартальный отчёт\nдля инвесторов', fontSize: 36, fontWeight: '400', color: '#64748b', align: 'left', lineHeight: 1.5, editable: true, editKey: 'subtitle' },
        { type: 'rect', x: 160, y: 680, w: 300, h: 64, fill: '#0891b2', radius: 32 },
        { type: 'text', x: 310, y: 724, w: 260, h: 30, text: 'Подробнее', fontSize: 26, fontWeight: '600', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'image-placeholder', x: 1060, y: 80, w: 780, h: 920, fill: '#f1f5f9', radius: 32 },
      ],
    },
    {
      id: 'biz-stats', name: 'Статистика', category: 'Бизнес', styleType: '2d',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0f172a' },
        { type: 'text', x: 540, y: 180, w: 900, h: 40, text: 'РЕЗУЛЬТАТЫ ГОДА', fontSize: 40, fontWeight: '700', color: '#06b6d4', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 80, y: 300, w: 280, h: 280, fill: '#1e293b', radius: 24 },
        { type: 'text', x: 220, y: 400, w: 220, h: 60, text: '+150%', fontSize: 56, fontWeight: '900', color: '#22d3ee', align: 'center', editable: true, editKey: 'stat1' },
        { type: 'text', x: 220, y: 480, w: 220, h: 30, text: 'Рост продаж', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'label1' },
        { type: 'rect', x: 400, y: 300, w: 280, h: 280, fill: '#1e293b', radius: 24 },
        { type: 'text', x: 540, y: 400, w: 220, h: 60, text: '50K+', fontSize: 56, fontWeight: '900', color: '#22d3ee', align: 'center', editable: true, editKey: 'stat2' },
        { type: 'text', x: 540, y: 480, w: 220, h: 30, text: 'Клиентов', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'label2' },
        { type: 'rect', x: 720, y: 300, w: 280, h: 280, fill: '#1e293b', radius: 24 },
        { type: 'text', x: 860, y: 400, w: 220, h: 60, text: '4.9', fontSize: 56, fontWeight: '900', color: '#22d3ee', align: 'center', editable: true, editKey: 'stat3' },
        { type: 'text', x: 860, y: 480, w: 220, h: 30, text: 'Рейтинг', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'label3' },
        { type: 'text', x: 540, y: 740, w: 800, h: 60, text: 'Мы растём вместе с вами', fontSize: 40, fontWeight: '600', color: '#f1f5f9', align: 'center', editable: true, editKey: 'tagline' },
        { type: 'text', x: 540, y: 920, w: 800, h: 30, text: 'yourbrand.com', fontSize: 28, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'url' },
      ],
    },
    // ── Бизнес / Инфографика ──
    {
      id: 'info-steps', name: 'Шаги процесса', category: 'Бизнес', styleType: 'infographic',
      width: 1080, height: 1920, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0f172a' },
        { type: 'text', x: 540, y: 200, w: 900, h: 40, text: 'КАК ЭТО РАБОТАЕТ', fontSize: 44, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 440, y: 260, w: 200, h: 3, fill: '#06b6d4' },
        { type: 'rect', x: 80, y: 380, w: 920, h: 200, fill: '#1e293b', radius: 24 },
        { type: 'rect', x: 120, y: 420, w: 80, h: 80, fill: '#06b6d4', radius: 40 },
        { type: 'text', x: 160, y: 472, w: 60, h: 40, text: '1', fontSize: 40, fontWeight: '900', color: '#ffffff', align: 'center' },
        { type: 'text', x: 560, y: 440, w: 600, h: 40, text: 'Регистрация', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'step1_title' },
        { type: 'text', x: 560, y: 510, w: 600, h: 30, text: 'Создайте аккаунт за минуту', fontSize: 28, fontWeight: '400', color: '#94a3b8', align: 'center', editable: true, editKey: 'step1_desc' },
        { type: 'rect', x: 80, y: 620, w: 920, h: 200, fill: '#1e293b', radius: 24 },
        { type: 'rect', x: 120, y: 660, w: 80, h: 80, fill: '#0891b2', radius: 40 },
        { type: 'text', x: 160, y: 712, w: 60, h: 40, text: '2', fontSize: 40, fontWeight: '900', color: '#ffffff', align: 'center' },
        { type: 'text', x: 560, y: 680, w: 600, h: 40, text: 'Настройка', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'step2_title' },
        { type: 'text', x: 560, y: 750, w: 600, h: 30, text: 'Выберите подходящий план', fontSize: 28, fontWeight: '400', color: '#94a3b8', align: 'center', editable: true, editKey: 'step2_desc' },
        { type: 'rect', x: 80, y: 860, w: 920, h: 200, fill: '#1e293b', radius: 24 },
        { type: 'rect', x: 120, y: 900, w: 80, h: 80, fill: '#0e7490', radius: 40 },
        { type: 'text', x: 160, y: 952, w: 60, h: 40, text: '3', fontSize: 40, fontWeight: '900', color: '#ffffff', align: 'center' },
        { type: 'text', x: 560, y: 920, w: 600, h: 40, text: 'Запуск', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'step3_title' },
        { type: 'text', x: 560, y: 990, w: 600, h: 30, text: 'Начните получать результат', fontSize: 28, fontWeight: '400', color: '#94a3b8', align: 'center', editable: true, editKey: 'step3_desc' },
        { type: 'text', x: 540, y: 1520, w: 800, h: 30, text: 'yourbrand.com', fontSize: 30, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'url' },
      ],
    },
    {
      id: 'info-comparison', name: 'Сравнение', category: 'Бизнес', styleType: 'infographic',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0f172a' },
        { type: 'text', x: 540, y: 120, w: 900, h: 40, text: 'ДО И ПОСЛЕ', fontSize: 48, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 60, y: 220, w: 460, h: 740, fill: '#1e293b', radius: 24 },
        { type: 'text', x: 290, y: 300, w: 380, h: 40, text: 'БЕЗ НАС', fontSize: 36, fontWeight: '700', color: '#ef4444', align: 'center', editable: true, editKey: 'before_title' },
        { type: 'text', x: 290, y: 450, w: 380, h: 200, text: 'Ручная работа\nОшибки\nМедленно\nДорого', fontSize: 32, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 2.0, editable: true, editKey: 'before_list' },
        { type: 'rect', x: 560, y: 220, w: 460, h: 740, fill: '#0c4a6e', radius: 24 },
        { type: 'text', x: 790, y: 300, w: 380, h: 40, text: 'С НАМИ', fontSize: 36, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'after_title' },
        { type: 'text', x: 790, y: 450, w: 380, h: 200, text: 'Автоматизация\nТочность\nБыстро\nВыгодно', fontSize: 32, fontWeight: '400', color: '#e0f2fe', align: 'center', lineHeight: 2.0, editable: true, editKey: 'after_list' },
      ],
    },
    // ── Образование / 2D ──
    {
      id: 'edu-course', name: 'Онлайн-курс', category: 'Образование', styleType: '2d',
      width: 1080, height: 1920, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0f172a' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 600, fill: '#0891b2', opacity: 0.15 },
        { type: 'text', x: 540, y: 300, w: 900, h: 40, text: 'НОВЫЙ КУРС', fontSize: 36, fontWeight: '700', color: '#06b6d4', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 500, w: 900, h: 80, text: 'Дизайн с нуля\nдо профи', fontSize: 72, fontWeight: '800', color: '#f1f5f9', align: 'center', lineHeight: 1.3, editable: true, editKey: 'title' },
        { type: 'rect', x: 80, y: 740, w: 920, h: 400, fill: '#1e293b', radius: 32 },
        { type: 'text', x: 540, y: 830, w: 800, h: 30, text: '12 модулей  ·  48 уроков  ·  Сертификат', fontSize: 30, fontWeight: '600', color: '#06b6d4', align: 'center', editable: true, editKey: 'features' },
        { type: 'text', x: 540, y: 940, w: 800, h: 100, text: 'Научитесь создавать\nпрофессиональные проекты\nс нуля', fontSize: 32, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.6, editable: true, editKey: 'desc' },
        { type: 'rect', x: 240, y: 1300, w: 600, h: 80, fill: '#06b6d4', radius: 40 },
        { type: 'text', x: 540, y: 1352, w: 540, h: 36, text: 'НАЧАТЬ ОБУЧЕНИЕ', fontSize: 32, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1500, w: 800, h: 40, text: 'Старт: 1 октября', fontSize: 36, fontWeight: '600', color: '#22d3ee', align: 'center', editable: true, editKey: 'date' },
        { type: 'text', x: 540, y: 1700, w: 800, h: 30, text: '@yourbrand', fontSize: 30, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    {
      id: 'edu-checklist', name: 'Чек-лист', category: 'Образование', styleType: 'infographic',
      width: 1080, height: 1920, bg: '#ffffff',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#ffffff' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 300, fill: '#0891b2' },
        { type: 'text', x: 540, y: 160, w: 900, h: 40, text: 'ЧЕК-ЛИСТ', fontSize: 56, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 240, w: 900, h: 30, text: 'Идеальный запуск продукта', fontSize: 32, fontWeight: '500', color: '#cffafe', align: 'center', editable: true, editKey: 'subtitle' },
        { type: 'text', x: 540, y: 500, w: 800, h: 500, text: '[ ] Определить целевую аудиторию\n[ ] Создать MVP\n[ ] Провести тестирование\n[ ] Запустить маркетинг\n[ ] Собрать обратную связь\n[ ] Оптимизировать продукт\n[ ] Масштабировать продажи', fontSize: 34, fontWeight: '500', color: '#0f172a', align: 'left', lineHeight: 2.2, editable: true, editKey: 'items' },
        { type: 'text', x: 540, y: 1500, w: 800, h: 40, text: 'Сохрани себе!', fontSize: 40, fontWeight: '700', color: '#0891b2', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1700, w: 800, h: 30, text: '@yourbrand', fontSize: 28, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
    // ── Образование / 3D ──
    {
      id: 'edu-3d-cards', name: '3D Карточки', category: 'Образование', styleType: '3d',
      width: 1080, height: 1080, bg: '#0a0f1a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0a0f1a' },
        { type: 'text', x: 540, y: 140, w: 900, h: 40, text: '3 ПРИНЦИПА УСПЕХА', fontSize: 40, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 60, y: 260, w: 300, h: 520, fill: '#1e293b', radius: 24 },
        { type: 'rect', x: 70, y: 250, w: 300, h: 520, fill: '#334155', radius: 24, opacity: 0.5 },
        { type: 'text', x: 210, y: 400, w: 220, h: 80, text: '01', fontSize: 80, fontWeight: '900', color: '#06b6d4', align: 'center' },
        { type: 'text', x: 210, y: 520, w: 220, h: 40, text: 'Фокус', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'card1' },
        { type: 'text', x: 210, y: 600, w: 220, h: 60, text: 'Сосредоточься\nна главном', fontSize: 24, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'card1_desc' },
        { type: 'rect', x: 390, y: 260, w: 300, h: 520, fill: '#1e293b', radius: 24 },
        { type: 'rect', x: 400, y: 250, w: 300, h: 520, fill: '#334155', radius: 24, opacity: 0.5 },
        { type: 'text', x: 540, y: 400, w: 220, h: 80, text: '02', fontSize: 80, fontWeight: '900', color: '#0891b2', align: 'center' },
        { type: 'text', x: 540, y: 520, w: 220, h: 40, text: 'Действие', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'card2' },
        { type: 'text', x: 540, y: 600, w: 220, h: 60, text: 'Делай каждый\nдень', fontSize: 24, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'card2_desc' },
        { type: 'rect', x: 720, y: 260, w: 300, h: 520, fill: '#1e293b', radius: 24 },
        { type: 'rect', x: 730, y: 250, w: 300, h: 520, fill: '#334155', radius: 24, opacity: 0.5 },
        { type: 'text', x: 870, y: 400, w: 220, h: 80, text: '03', fontSize: 80, fontWeight: '900', color: '#0e7490', align: 'center' },
        { type: 'text', x: 870, y: 520, w: 220, h: 40, text: 'Рост', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'card3' },
        { type: 'text', x: 870, y: 600, w: 220, h: 60, text: 'Учись на\nошибках', fontSize: 24, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'card3_desc' },
        { type: 'text', x: 540, y: 920, w: 800, h: 30, text: '@yourbrand', fontSize: 28, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ════════════════════════════════════════════════════
    // ══  20 NEW PREMIUM TEMPLATES  ════════════════════
    // ════════════════════════════════════════════════════

    // ── 1. Минимализм / 3D ──
    {
      id: 'minimal-3d-float', name: '3D Парящий текст', category: 'Минимализм', styleType: '3d',
      width: 1080, height: 1080, bg: '#f0f0f0',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#f0f0f0' },
        { type: 'rect', x: 140, y: 200, w: 800, h: 680, fill: '#ffffff', radius: 48, shadow: { blur: 60, color: 'rgba(0,0,0,0.08)' } },
        { type: 'rect', x: 160, y: 220, w: 800, h: 680, fill: '#fafafa', radius: 48, opacity: 0.5 },
        { type: 'rect', x: 180, y: 240, w: 800, h: 680, fill: '#f5f5f5', radius: 48, opacity: 0.3 },
        { type: 'text', x: 540, y: 440, w: 680, h: 80, text: 'ТИШИНА\nГОВОРИТ', fontSize: 72, fontWeight: '800', color: '#171717', align: 'center', lineHeight: 1.2, editable: true, editKey: 'title' },
        { type: 'rect', x: 470, y: 600, w: 140, h: 3, fill: '#a3a3a3' },
        { type: 'text', x: 540, y: 680, w: 600, h: 30, text: 'минимализм в деталях', fontSize: 26, fontWeight: '300', color: '#a3a3a3', align: 'center', editable: true, editKey: 'tagline' },
        { type: 'text', x: 540, y: 800, w: 600, h: 25, text: 'yourbrand.studio', fontSize: 22, fontWeight: '400', color: '#d4d4d4', align: 'center', editable: true, editKey: 'url' },
      ],
    },

    // ── 2. Минимализм / 3D (Story) ──
    {
      id: 'minimal-3d-layers', name: '3D Слои', category: 'Минимализм', styleType: '3d',
      width: 1080, height: 1920, bg: '#0a0a0a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0a0a0a' },
        { type: 'rect', x: 60, y: 400, w: 960, h: 1000, fill: '#171717', radius: 40 },
        { type: 'rect', x: 80, y: 380, w: 960, h: 1000, fill: '#262626', radius: 40, opacity: 0.6 },
        { type: 'rect', x: 100, y: 360, w: 960, h: 1000, fill: '#404040', radius: 40, opacity: 0.25 },
        { type: 'text', x: 540, y: 700, w: 800, h: 60, text: 'DEPTH', fontSize: 120, fontWeight: '900', color: '#fafafa', align: 'center', editable: true, editKey: 'word' },
        { type: 'rect', x: 440, y: 800, w: 200, h: 2, fill: '#525252' },
        { type: 'text', x: 540, y: 900, w: 700, h: 40, text: 'Глубина создаётся\nпространством', fontSize: 36, fontWeight: '300', color: '#737373', align: 'center', lineHeight: 1.6, editable: true, editKey: 'desc' },
        { type: 'text', x: 540, y: 1200, w: 600, h: 25, text: 'yourbrand.com', fontSize: 24, fontWeight: '400', color: '#404040', align: 'center', editable: true, editKey: 'url' },
      ],
    },

    // ── 3. Минимализм / Инфографика ──
    {
      id: 'minimal-infographic', name: 'Минималистичные метрики', category: 'Минимализм', styleType: 'infographic',
      width: 1080, height: 1080, bg: '#fafaf9',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#fafaf9' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 4, fill: '#0c0a09' },
        { type: 'text', x: 540, y: 140, w: 900, h: 40, text: 'КЛЮЧЕВЫЕ ПОКАЗАТЕЛИ', fontSize: 28, fontWeight: '600', color: '#44403c', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 100, y: 240, w: 400, h: 340, fill: '#ffffff', radius: 20, border: { color: '#e7e5e4', width: 1 } },
        { type: 'text', x: 300, y: 360, w: 320, h: 60, text: '97%', fontSize: 80, fontWeight: '800', color: '#0c0a09', align: 'center', editable: true, editKey: 'stat1' },
        { type: 'text', x: 300, y: 460, w: 320, h: 25, text: 'Удовлетворённость', fontSize: 22, fontWeight: '400', color: '#78716c', align: 'center', editable: true, editKey: 'lbl1' },
        { type: 'rect', x: 580, y: 240, w: 400, h: 340, fill: '#ffffff', radius: 20, border: { color: '#e7e5e4', width: 1 } },
        { type: 'text', x: 780, y: 360, w: 320, h: 60, text: '2.4M', fontSize: 80, fontWeight: '800', color: '#0c0a09', align: 'center', editable: true, editKey: 'stat2' },
        { type: 'text', x: 780, y: 460, w: 320, h: 25, text: 'Пользователей', fontSize: 22, fontWeight: '400', color: '#78716c', align: 'center', editable: true, editKey: 'lbl2' },
        { type: 'rect', x: 100, y: 640, w: 880, h: 200, fill: '#ffffff', radius: 20, border: { color: '#e7e5e4', width: 1 } },
        { type: 'text', x: 540, y: 720, w: 780, h: 60, text: '+340%', fontSize: 72, fontWeight: '800', color: '#0c0a09', align: 'center', editable: true, editKey: 'stat3' },
        { type: 'text', x: 540, y: 790, w: 780, h: 25, text: 'Рост за последний квартал', fontSize: 22, fontWeight: '400', color: '#78716c', align: 'center', editable: true, editKey: 'lbl3' },
        { type: 'text', x: 540, y: 960, w: 800, h: 25, text: 'yourbrand.com', fontSize: 20, fontWeight: '400', color: '#d6d3d1', align: 'center', editable: true, editKey: 'url' },
        { type: 'rect', x: 0, y: 1076, w: 1080, h: 4, fill: '#0c0a09' },
      ],
    },

    // ── 4. Объявления / 3D ──
    {
      id: 'announce-3d-launch', name: '3D Премьера', category: 'Объявления', styleType: '3d',
      width: 1080, height: 1920, bg: '#020617',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#020617' },
        { type: 'circle', x: 540, y: 650, w: 600, h: 600, fill: '#0369a1', opacity: 0.08 },
        { type: 'circle', x: 540, y: 650, w: 400, h: 400, fill: '#0284c7', opacity: 0.12 },
        { type: 'circle', x: 540, y: 650, w: 220, h: 220, fill: '#0ea5e9', opacity: 0.2 },
        { type: 'rect', x: 120, y: 380, w: 840, h: 900, fill: '#0f172a', radius: 48 },
        { type: 'rect', x: 100, y: 360, w: 840, h: 900, fill: '#1e293b', radius: 48, opacity: 0.5 },
        { type: 'text', x: 540, y: 540, w: 700, h: 30, text: 'МИРОВАЯ ПРЕМЬЕРА', fontSize: 28, fontWeight: '700', color: '#38bdf8', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 720, w: 700, h: 80, text: 'Новая эра\nтехнологий', fontSize: 80, fontWeight: '900', color: '#f8fafc', align: 'center', lineHeight: 1.2, editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 960, w: 650, h: 60, text: 'Будьте первыми, кто увидит\nнашу новую разработку', fontSize: 32, fontWeight: '400', color: '#64748b', align: 'center', lineHeight: 1.5, editable: true, editKey: 'desc' },
        { type: 'rect', x: 290, y: 1100, w: 500, h: 76, fill: '#0ea5e9', radius: 38 },
        { type: 'text', x: 540, y: 1150, w: 460, h: 30, text: 'ЗАРЕГИСТРИРОВАТЬСЯ', fontSize: 26, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1500, w: 700, h: 30, text: '15 октября  ·  20:00 МСК', fontSize: 32, fontWeight: '600', color: '#38bdf8', align: 'center', editable: true, editKey: 'date' },
        { type: 'text', x: 540, y: 1700, w: 700, h: 25, text: '@yourbrand', fontSize: 26, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 5. Объявления / Инфографика ──
    {
      id: 'announce-infographic-agenda', name: 'Программа события', category: 'Объявления', styleType: 'infographic',
      width: 1080, height: 1920, bg: '#ffffff',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#ffffff' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 350, fill: '#0f172a' },
        { type: 'text', x: 540, y: 140, w: 900, h: 50, text: 'КОНФЕРЕНЦИЯ', fontSize: 52, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 230, w: 800, h: 30, text: '20 октября  ·  Москва  ·  Онлайн', fontSize: 28, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'subtitle' },
        { type: 'rect', x: 440, y: 290, w: 200, h: 3, fill: '#0ea5e9' },
        // Block 1
        { type: 'rect', x: 80, y: 420, w: 920, h: 180, fill: '#f8fafc', radius: 20 },
        { type: 'rect', x: 80, y: 420, w: 8, h: 180, fill: '#0ea5e9', radius: 4 },
        { type: 'text', x: 180, y: 480, w: 200, h: 25, text: '10:00', fontSize: 32, fontWeight: '800', color: '#0ea5e9', align: 'left', editable: true, editKey: 'time1' },
        { type: 'text', x: 580, y: 480, w: 400, h: 30, text: 'Открытие и ключевой доклад', fontSize: 26, fontWeight: '600', color: '#0f172a', align: 'left', editable: true, editKey: 'topic1' },
        { type: 'text', x: 580, y: 540, w: 400, h: 25, text: 'Иван Петров, CEO', fontSize: 22, fontWeight: '400', color: '#64748b', align: 'left', editable: true, editKey: 'speaker1' },
        // Block 2
        { type: 'rect', x: 80, y: 640, w: 920, h: 180, fill: '#f8fafc', radius: 20 },
        { type: 'rect', x: 80, y: 640, w: 8, h: 180, fill: '#06b6d4', radius: 4 },
        { type: 'text', x: 180, y: 700, w: 200, h: 25, text: '12:00', fontSize: 32, fontWeight: '800', color: '#06b6d4', align: 'left', editable: true, editKey: 'time2' },
        { type: 'text', x: 580, y: 700, w: 400, h: 30, text: 'Мастер-класс по AI', fontSize: 26, fontWeight: '600', color: '#0f172a', align: 'left', editable: true, editKey: 'topic2' },
        { type: 'text', x: 580, y: 760, w: 400, h: 25, text: 'Мария Сидорова, CTO', fontSize: 22, fontWeight: '400', color: '#64748b', align: 'left', editable: true, editKey: 'speaker2' },
        // Block 3
        { type: 'rect', x: 80, y: 860, w: 920, h: 180, fill: '#f8fafc', radius: 20 },
        { type: 'rect', x: 80, y: 860, w: 8, h: 180, fill: '#0891b2', radius: 4 },
        { type: 'text', x: 180, y: 920, w: 200, h: 25, text: '15:00', fontSize: 32, fontWeight: '800', color: '#0891b2', align: 'left', editable: true, editKey: 'time3' },
        { type: 'text', x: 580, y: 920, w: 400, h: 30, text: 'Панельная дискуссия', fontSize: 26, fontWeight: '600', color: '#0f172a', align: 'left', editable: true, editKey: 'topic3' },
        { type: 'text', x: 580, y: 980, w: 400, h: 25, text: 'Эксперты отрасли', fontSize: 22, fontWeight: '400', color: '#64748b', align: 'left', editable: true, editKey: 'speaker3' },
        // Block 4
        { type: 'rect', x: 80, y: 1080, w: 920, h: 180, fill: '#f8fafc', radius: 20 },
        { type: 'rect', x: 80, y: 1080, w: 8, h: 180, fill: '#0e7490', radius: 4 },
        { type: 'text', x: 180, y: 1140, w: 200, h: 25, text: '18:00', fontSize: 32, fontWeight: '800', color: '#0e7490', align: 'left', editable: true, editKey: 'time4' },
        { type: 'text', x: 580, y: 1140, w: 400, h: 30, text: 'Нетворкинг и фуршет', fontSize: 26, fontWeight: '600', color: '#0f172a', align: 'left', editable: true, editKey: 'topic4' },
        { type: 'text', x: 580, y: 1200, w: 400, h: 25, text: 'Для всех участников', fontSize: 22, fontWeight: '400', color: '#64748b', align: 'left', editable: true, editKey: 'speaker4' },
        { type: 'rect', x: 240, y: 1400, w: 600, h: 76, fill: '#0f172a', radius: 38 },
        { type: 'text', x: 540, y: 1450, w: 540, h: 30, text: 'ПОЛУЧИТЬ БИЛЕТ', fontSize: 28, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1700, w: 800, h: 25, text: 'yourbrand.com/conference', fontSize: 26, fontWeight: '500', color: '#94a3b8', align: 'center', editable: true, editKey: 'url' },
      ],
    },

    // ── 6. Акции / Инфографика ──
    {
      id: 'sale-infographic-tiers', name: 'Тарифы и цены', category: 'Акции', styleType: 'infographic',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0f172a' },
        { type: 'text', x: 540, y: 100, w: 900, h: 40, text: 'ВЫБЕРИТЕ ПЛАН', fontSize: 40, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 170, w: 800, h: 30, text: 'Скидка 30% при годовой оплате', fontSize: 26, fontWeight: '500', color: '#22d3ee', align: 'center', editable: true, editKey: 'subtitle' },
        // Column 1
        { type: 'rect', x: 50, y: 260, w: 310, h: 680, fill: '#1e293b', radius: 28 },
        { type: 'text', x: 205, y: 340, w: 250, h: 25, text: 'СТАРТ', fontSize: 22, fontWeight: '700', color: '#94a3b8', align: 'center', editable: true, editKey: 'plan1' },
        { type: 'text', x: 205, y: 420, w: 250, h: 50, text: '990₽', fontSize: 56, fontWeight: '900', color: '#f1f5f9', align: 'center', editable: true, editKey: 'price1' },
        { type: 'text', x: 205, y: 490, w: 250, h: 20, text: '/месяц', fontSize: 20, fontWeight: '400', color: '#64748b', align: 'center' },
        { type: 'text', x: 205, y: 600, w: 230, h: 120, text: '5 проектов\n10 ГБ хранения\nEmail поддержка', fontSize: 22, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 2.0, editable: true, editKey: 'feat1' },
        { type: 'rect', x: 100, y: 820, w: 210, h: 56, fill: '#334155', radius: 28 },
        { type: 'text', x: 205, y: 858, w: 180, h: 20, text: 'Начать', fontSize: 20, fontWeight: '600', color: '#f1f5f9', align: 'center' },
        // Column 2 (highlighted)
        { type: 'rect', x: 385, y: 240, w: 310, h: 720, fill: '#0ea5e9', radius: 28 },
        { type: 'text', x: 540, y: 310, w: 250, h: 25, text: 'ПРО', fontSize: 22, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'plan2' },
        { type: 'text', x: 540, y: 400, w: 250, h: 50, text: '2 490₽', fontSize: 56, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'price2' },
        { type: 'text', x: 540, y: 470, w: 250, h: 20, text: '/месяц', fontSize: 20, fontWeight: '400', color: '#bae6fd' },
        { type: 'text', x: 540, y: 580, w: 250, h: 120, text: '50 проектов\n100 ГБ хранения\nПриоритет 24/7', fontSize: 22, fontWeight: '400', color: '#e0f2fe', align: 'center', lineHeight: 2.0, editable: true, editKey: 'feat2' },
        { type: 'rect', x: 435, y: 820, w: 210, h: 56, fill: '#ffffff', radius: 28 },
        { type: 'text', x: 540, y: 858, w: 180, h: 20, text: 'Выбрать', fontSize: 20, fontWeight: '700', color: '#0ea5e9', align: 'center' },
        // Column 3
        { type: 'rect', x: 720, y: 260, w: 310, h: 680, fill: '#1e293b', radius: 28 },
        { type: 'text', x: 875, y: 340, w: 250, h: 25, text: 'БИЗНЕС', fontSize: 22, fontWeight: '700', color: '#94a3b8', align: 'center', editable: true, editKey: 'plan3' },
        { type: 'text', x: 875, y: 420, w: 250, h: 50, text: '7 990₽', fontSize: 56, fontWeight: '900', color: '#f1f5f9', align: 'center', editable: true, editKey: 'price3' },
        { type: 'text', x: 875, y: 490, w: 250, h: 20, text: '/месяц', fontSize: 20, fontWeight: '400', color: '#64748b', align: 'center' },
        { type: 'text', x: 875, y: 600, w: 250, h: 120, text: 'Безлимит\n1 ТБ хранения\nМенеджер', fontSize: 22, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 2.0, editable: true, editKey: 'feat3' },
        { type: 'rect', x: 770, y: 820, w: 210, h: 56, fill: '#334155', radius: 28 },
        { type: 'text', x: 875, y: 858, w: 180, h: 20, text: 'Связаться', fontSize: 20, fontWeight: '600', color: '#f1f5f9', align: 'center' },
      ],
    },

    // ── 7. Соцсети / Инфографика ──
    {
      id: 'social-infographic-poll', name: 'Опрос / Голосование', category: 'Соцсети', styleType: 'infographic',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0f172a' },
        { type: 'text', x: 540, y: 120, w: 900, h: 40, text: 'А ЧТО ДУМАЕТЕ ВЫ?', fontSize: 44, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 200, w: 800, h: 30, text: 'Отвечайте в комментариях!', fontSize: 28, fontWeight: '400', color: '#64748b', align: 'center', editable: true, editKey: 'subtitle' },
        // Option A
        { type: 'rect', x: 80, y: 300, w: 920, h: 140, fill: '#1e293b', radius: 20 },
        { type: 'rect', x: 80, y: 300, w: 644, h: 140, fill: '#0ea5e9', radius: 20, opacity: 0.2 },
        { type: 'text', x: 160, y: 382, w: 60, h: 40, text: 'A', fontSize: 40, fontWeight: '900', color: '#0ea5e9', align: 'center' },
        { type: 'text', x: 540, y: 370, w: 600, h: 30, text: 'Качество важнее скорости', fontSize: 30, fontWeight: '600', color: '#f1f5f9', align: 'center', editable: true, editKey: 'optA' },
        { type: 'text', x: 940, y: 382, w: 100, h: 25, text: '70%', fontSize: 28, fontWeight: '800', color: '#0ea5e9', align: 'center', editable: true, editKey: 'pctA' },
        // Option B
        { type: 'rect', x: 80, y: 480, w: 920, h: 140, fill: '#1e293b', radius: 20 },
        { type: 'rect', x: 80, y: 480, w: 276, h: 140, fill: '#f43f5e', radius: 20, opacity: 0.2 },
        { type: 'text', x: 160, y: 562, w: 60, h: 40, text: 'B', fontSize: 40, fontWeight: '900', color: '#f43f5e', align: 'center' },
        { type: 'text', x: 540, y: 550, w: 600, h: 30, text: 'Скорость важнее качества', fontSize: 30, fontWeight: '600', color: '#f1f5f9', align: 'center', editable: true, editKey: 'optB' },
        { type: 'text', x: 940, y: 562, w: 100, h: 25, text: '30%', fontSize: 28, fontWeight: '800', color: '#f43f5e', align: 'center', editable: true, editKey: 'pctB' },
        { type: 'text', x: 540, y: 740, w: 700, h: 30, text: '2 487 голосов', fontSize: 28, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'count' },
        { type: 'text', x: 540, y: 900, w: 700, h: 25, text: '@yourbrand', fontSize: 26, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 8. Яркие / Инфографика ──
    {
      id: 'bright-infographic-countdown', name: 'Обратный отсчёт', category: 'Яркие', styleType: 'infographic',
      width: 1080, height: 1080, bg: '#020617',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#020617' },
        { type: 'text', x: 540, y: 160, w: 900, h: 40, text: 'ЗАПУСК ЧЕРЕЗ', fontSize: 36, fontWeight: '700', color: '#e2e8f0', align: 'center', editable: true, editKey: 'title' },
        // Countdown cells
        { type: 'rect', x: 60, y: 300, w: 220, h: 260, fill: '#0ea5e9', radius: 28 },
        { type: 'text', x: 170, y: 390, w: 180, h: 60, text: '03', fontSize: 96, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'days' },
        { type: 'text', x: 170, y: 490, w: 180, h: 25, text: 'ДНЕЙ', fontSize: 20, fontWeight: '600', color: '#bae6fd', align: 'center' },
        { type: 'rect', x: 310, y: 300, w: 220, h: 260, fill: '#0891b2', radius: 28 },
        { type: 'text', x: 420, y: 390, w: 180, h: 60, text: '12', fontSize: 96, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'hours' },
        { type: 'text', x: 420, y: 490, w: 180, h: 25, text: 'ЧАСОВ', fontSize: 20, fontWeight: '600', color: '#a5f3fc', align: 'center' },
        { type: 'rect', x: 560, y: 300, w: 220, h: 260, fill: '#0e7490', radius: 28 },
        { type: 'text', x: 670, y: 390, w: 180, h: 60, text: '45', fontSize: 96, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'mins' },
        { type: 'text', x: 670, y: 490, w: 180, h: 25, text: 'МИНУТ', fontSize: 20, fontWeight: '600', color: '#cffafe', align: 'center' },
        { type: 'rect', x: 810, y: 300, w: 220, h: 260, fill: '#155e75', radius: 28 },
        { type: 'text', x: 920, y: 390, w: 180, h: 60, text: '08', fontSize: 96, fontWeight: '900', color: '#ffffff', align: 'center', editable: true, editKey: 'secs' },
        { type: 'text', x: 920, y: 490, w: 180, h: 25, text: 'СЕКУНД', fontSize: 20, fontWeight: '600', color: '#67e8f9', align: 'center' },
        { type: 'text', x: 540, y: 700, w: 800, h: 50, text: 'Не пропустите\nсамое грандиозное событие', fontSize: 40, fontWeight: '700', color: '#f1f5f9', align: 'center', lineHeight: 1.4, editable: true, editKey: 'desc' },
        { type: 'rect', x: 290, y: 860, w: 500, h: 72, fill: '#0ea5e9', radius: 36 },
        { type: 'text', x: 540, y: 908, w: 460, h: 30, text: 'НАПОМНИТЬ МНЕ', fontSize: 26, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
      ],
    },

    // ── 9. Бизнес / 3D ──
    {
      id: 'biz-3d-team', name: '3D Команда', category: 'Бизнес', styleType: '3d',
      width: 1080, height: 1080, bg: '#030712',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#030712' },
        { type: 'circle', x: 540, y: 540, w: 900, h: 900, fill: '#111827', opacity: 1 },
        { type: 'circle', x: 540, y: 540, w: 700, h: 700, fill: '#1f2937', opacity: 0.8 },
        { type: 'circle', x: 540, y: 540, w: 500, h: 500, fill: '#374151', opacity: 0.5 },
        { type: 'text', x: 540, y: 340, w: 800, h: 30, text: 'МЫ — КОМАНДА', fontSize: 32, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 490, w: 700, h: 60, text: 'Создаём\nбудущее', fontSize: 80, fontWeight: '900', color: '#ffffff', align: 'center', lineHeight: 1.15, editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 660, w: 500, h: 25, text: '50+ экспертов  ·  12 стран', fontSize: 24, fontWeight: '500', color: '#6b7280', align: 'center', editable: true, editKey: 'stats' },
        { type: 'text', x: 540, y: 780, w: 600, h: 50, text: 'Присоединяйтесь к нашей\nкоманде лидеров', fontSize: 32, fontWeight: '400', color: '#9ca3af', align: 'center', lineHeight: 1.5, editable: true, editKey: 'desc' },
        { type: 'text', x: 540, y: 930, w: 600, h: 25, text: 'yourbrand.com/careers', fontSize: 24, fontWeight: '500', color: '#374151', align: 'center', editable: true, editKey: 'url' },
      ],
    },

    // ── 10. Образование / Инфографика ──
    {
      id: 'edu-infographic-roadmap', name: 'Дорожная карта обучения', category: 'Образование', styleType: 'infographic',
      width: 1080, height: 1920, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0f172a' },
        { type: 'text', x: 540, y: 140, w: 900, h: 50, text: 'ПУТЬ К МАСТЕРСТВУ', fontSize: 48, fontWeight: '900', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 230, w: 800, h: 30, text: 'Ваша дорожная карта на 6 месяцев', fontSize: 28, fontWeight: '400', color: '#64748b', align: 'center', editable: true, editKey: 'subtitle' },
        // Timeline line
        { type: 'rect', x: 536, y: 340, w: 4, h: 1300, fill: '#1e293b' },
        // Month 1
        { type: 'circle', x: 538, y: 420, w: 32, h: 32, fill: '#0ea5e9' },
        { type: 'rect', x: 600, y: 370, w: 400, h: 120, fill: '#1e293b', radius: 16 },
        { type: 'text', x: 800, y: 410, w: 360, h: 25, text: 'Месяц 1: Основы', fontSize: 24, fontWeight: '700', color: '#f1f5f9', align: 'left', editable: true, editKey: 'm1_title' },
        { type: 'text', x: 800, y: 455, w: 360, h: 20, text: 'Изучение базовых концепций', fontSize: 20, fontWeight: '400', color: '#94a3b8', align: 'left', editable: true, editKey: 'm1_desc' },
        // Month 2
        { type: 'circle', x: 538, y: 600, w: 32, h: 32, fill: '#06b6d4' },
        { type: 'rect', x: 80, y: 550, w: 400, h: 120, fill: '#1e293b', radius: 16 },
        { type: 'text', x: 280, y: 590, w: 360, h: 25, text: 'Месяц 2: Практика', fontSize: 24, fontWeight: '700', color: '#f1f5f9', align: 'right', editable: true, editKey: 'm2_title' },
        { type: 'text', x: 280, y: 635, w: 360, h: 20, text: 'Первые реальные проекты', fontSize: 20, fontWeight: '400', color: '#94a3b8', align: 'right', editable: true, editKey: 'm2_desc' },
        // Month 3
        { type: 'circle', x: 538, y: 780, w: 32, h: 32, fill: '#0891b2' },
        { type: 'rect', x: 600, y: 730, w: 400, h: 120, fill: '#1e293b', radius: 16 },
        { type: 'text', x: 800, y: 770, w: 360, h: 25, text: 'Месяц 3: Углубление', fontSize: 24, fontWeight: '700', color: '#f1f5f9', align: 'left', editable: true, editKey: 'm3_title' },
        { type: 'text', x: 800, y: 815, w: 360, h: 20, text: 'Продвинутые техники', fontSize: 20, fontWeight: '400', color: '#94a3b8', align: 'left', editable: true, editKey: 'm3_desc' },
        // Month 4
        { type: 'circle', x: 538, y: 960, w: 32, h: 32, fill: '#0e7490' },
        { type: 'rect', x: 80, y: 910, w: 400, h: 120, fill: '#1e293b', radius: 16 },
        { type: 'text', x: 280, y: 950, w: 360, h: 25, text: 'Месяц 4: Портфолио', fontSize: 24, fontWeight: '700', color: '#f1f5f9', align: 'right', editable: true, editKey: 'm4_title' },
        { type: 'text', x: 280, y: 995, w: 360, h: 20, text: 'Создание 5 работ', fontSize: 20, fontWeight: '400', color: '#94a3b8', align: 'right', editable: true, editKey: 'm4_desc' },
        // Month 5
        { type: 'circle', x: 538, y: 1140, w: 32, h: 32, fill: '#155e75' },
        { type: 'rect', x: 600, y: 1090, w: 400, h: 120, fill: '#1e293b', radius: 16 },
        { type: 'text', x: 800, y: 1130, w: 360, h: 25, text: 'Месяц 5: Стажировка', fontSize: 24, fontWeight: '700', color: '#f1f5f9', align: 'left', editable: true, editKey: 'm5_title' },
        { type: 'text', x: 800, y: 1175, w: 360, h: 20, text: 'Работа с реальными клиентами', fontSize: 20, fontWeight: '400', color: '#94a3b8', align: 'left', editable: true, editKey: 'm5_desc' },
        // Month 6
        { type: 'circle', x: 538, y: 1320, w: 32, h: 32, fill: '#22d3ee' },
        { type: 'rect', x: 80, y: 1270, w: 400, h: 120, fill: '#164e63', radius: 16 },
        { type: 'text', x: 280, y: 1310, w: 360, h: 25, text: 'Месяц 6: Сертификат', fontSize: 24, fontWeight: '700', color: '#ffffff', align: 'right', editable: true, editKey: 'm6_title' },
        { type: 'text', x: 280, y: 1355, w: 360, h: 20, text: 'Выпускной проект + диплом', fontSize: 20, fontWeight: '400', color: '#a5f3fc', align: 'right', editable: true, editKey: 'm6_desc' },
        { type: 'rect', x: 240, y: 1560, w: 600, h: 76, fill: '#0ea5e9', radius: 38 },
        { type: 'text', x: 540, y: 1610, w: 540, h: 30, text: 'ЗАПИСАТЬСЯ НА КУРС', fontSize: 28, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1750, w: 600, h: 25, text: '@yourbrand', fontSize: 24, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 11. Акции / 3D (Story) ──
    {
      id: 'sale-3d-gift', name: '3D Подарок', category: 'Акции', styleType: '3d',
      width: 1080, height: 1920, bg: '#0c0a1d',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0c0a1d' },
        { type: 'circle', x: 540, y: 700, w: 700, h: 700, fill: '#1e1b4b', opacity: 0.5 },
        { type: 'circle', x: 540, y: 700, w: 500, h: 500, fill: '#312e81', opacity: 0.3 },
        { type: 'circle', x: 540, y: 700, w: 300, h: 300, fill: '#4338ca', opacity: 0.2 },
        { type: 'rect', x: 140, y: 450, w: 800, h: 500, fill: '#1e1b4b', radius: 48 },
        { type: 'rect', x: 120, y: 430, w: 800, h: 500, fill: '#312e81', radius: 48, opacity: 0.4 },
        { type: 'text', x: 540, y: 560, w: 700, h: 30, text: 'ЭКСКЛЮЗИВНЫЙ ПОДАРОК', fontSize: 28, fontWeight: '700', color: '#a78bfa', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 700, w: 700, h: 80, text: 'Бесплатный\nмесяц PRO', fontSize: 72, fontWeight: '900', color: '#f5f3ff', align: 'center', lineHeight: 1.2, editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 880, w: 650, h: 30, text: 'при регистрации до 30 сентября', fontSize: 30, fontWeight: '400', color: '#7c3aed', align: 'center', editable: true, editKey: 'condition' },
        { type: 'rect', x: 290, y: 1150, w: 500, h: 76, fill: '#7c3aed', radius: 38 },
        { type: 'text', x: 540, y: 1200, w: 460, h: 30, text: 'ЗАБРАТЬ ПОДАРОК', fontSize: 28, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1600, w: 700, h: 25, text: '@yourbrand', fontSize: 26, fontWeight: '500', color: '#4c1d95', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 12. Соцсети / 3D (Story) ──
    {
      id: 'social-3d-announcement', name: '3D Анонс', category: 'Соцсети', styleType: '3d',
      width: 1080, height: 1920, bg: '#0a0f1a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0a0f1a' },
        { type: 'rect', x: 60, y: 300, w: 960, h: 1200, fill: '#111827', radius: 48 },
        { type: 'rect', x: 40, y: 280, w: 960, h: 1200, fill: '#1f2937', radius: 48, opacity: 0.4 },
        { type: 'rect', x: 20, y: 260, w: 960, h: 1200, fill: '#374151', radius: 48, opacity: 0.15 },
        { type: 'text', x: 540, y: 480, w: 800, h: 30, text: 'ВАЖНЫЙ АНОНС', fontSize: 28, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 660, w: 800, h: 80, text: 'Мы запускаем\nновый формат', fontSize: 72, fontWeight: '800', color: '#f9fafb', align: 'center', lineHeight: 1.2, editable: true, editKey: 'title' },
        { type: 'rect', x: 440, y: 820, w: 200, h: 3, fill: '#22d3ee' },
        { type: 'text', x: 540, y: 920, w: 750, h: 80, text: 'Прямые эфиры каждую пятницу\nс экспертами индустрии', fontSize: 32, fontWeight: '400', color: '#9ca3af', align: 'center', lineHeight: 1.5, editable: true, editKey: 'desc' },
        { type: 'text', x: 540, y: 1120, w: 600, h: 30, text: 'Старт: 1 октября', fontSize: 36, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'date' },
        { type: 'text', x: 540, y: 1320, w: 600, h: 25, text: 'Ставьте напоминание!', fontSize: 30, fontWeight: '600', color: '#6b7280', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1700, w: 700, h: 25, text: '@yourbrand', fontSize: 26, fontWeight: '500', color: '#374151', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 13. Яркие / 3D (Story) ──
    {
      id: 'bright-3d-concert', name: '3D Концерт', category: 'Яркие', styleType: '3d',
      width: 1080, height: 1920, bg: '#0a0a0a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0a0a0a' },
        { type: 'circle', x: 540, y: 600, w: 800, h: 800, fill: '#dc2626', opacity: 0.06 },
        { type: 'circle', x: 540, y: 600, w: 600, h: 600, fill: '#ef4444', opacity: 0.1 },
        { type: 'circle', x: 540, y: 600, w: 350, h: 350, fill: '#f87171', opacity: 0.15 },
        { type: 'rect', x: 80, y: 350, w: 920, h: 1000, fill: '#171717', radius: 48 },
        { type: 'rect', x: 60, y: 330, w: 920, h: 1000, fill: '#262626', radius: 48, opacity: 0.4 },
        { type: 'text', x: 540, y: 500, w: 800, h: 30, text: 'LIVE CONCERT', fontSize: 28, fontWeight: '700', color: '#f87171', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 680, w: 800, h: 100, text: 'АРТИСТ\nГОДА', fontSize: 100, fontWeight: '900', color: '#ffffff', align: 'center', lineHeight: 1.15, editable: true, editKey: 'artist' },
        { type: 'rect', x: 390, y: 850, w: 300, h: 3, fill: '#f87171' },
        { type: 'text', x: 540, y: 940, w: 700, h: 30, text: '25 декабря  ·  Стадион  ·  20:00', fontSize: 32, fontWeight: '600', color: '#a3a3a3', align: 'center', editable: true, editKey: 'details' },
        { type: 'text', x: 540, y: 1060, w: 600, h: 30, text: 'Билеты от 2 990₽', fontSize: 36, fontWeight: '700', color: '#f87171', align: 'center', editable: true, editKey: 'price' },
        { type: 'rect', x: 290, y: 1180, w: 500, h: 76, fill: '#ef4444', radius: 38 },
        { type: 'text', x: 540, y: 1230, w: 460, h: 30, text: 'КУПИТЬ БИЛЕТ', fontSize: 28, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1600, w: 700, h: 25, text: '@concert_hall', fontSize: 26, fontWeight: '500', color: '#404040', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 14. Образование / 3D (Story) ──
    {
      id: 'edu-3d-diploma', name: '3D Диплом', category: 'Образование', styleType: '3d',
      width: 1080, height: 1920, bg: '#0a0f1a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0a0f1a' },
        { type: 'rect', x: 100, y: 350, w: 880, h: 1100, fill: '#111827', radius: 48 },
        { type: 'rect', x: 80, y: 330, w: 880, h: 1100, fill: '#1f2937', radius: 48, opacity: 0.5 },
        { type: 'rect', x: 60, y: 310, w: 880, h: 1100, fill: '#374151', radius: 48, opacity: 0.2 },
        { type: 'circle', x: 540, y: 580, w: 120, h: 120, fill: '#0ea5e9', opacity: 0.3 },
        { type: 'text', x: 540, y: 580, w: 100, h: 40, text: '🎓', fontSize: 60, fontWeight: '400', color: '#ffffff', align: 'center' },
        { type: 'text', x: 540, y: 720, w: 750, h: 30, text: 'СЕРТИФИКАТ', fontSize: 28, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 870, w: 750, h: 70, text: 'Профессиональный\nUX/UI дизайнер', fontSize: 60, fontWeight: '800', color: '#f8fafc', align: 'center', lineHeight: 1.25, editable: true, editKey: 'title' },
        { type: 'rect', x: 390, y: 1020, w: 300, h: 3, fill: '#22d3ee' },
        { type: 'text', x: 540, y: 1100, w: 700, h: 80, text: '320 часов обучения\n12 проектов в портфолио\nМеждународный стандарт', fontSize: 28, fontWeight: '400', color: '#9ca3af', align: 'center', lineHeight: 1.8, editable: true, editKey: 'details' },
        { type: 'rect', x: 240, y: 1300, w: 600, h: 76, fill: '#0ea5e9', radius: 38 },
        { type: 'text', x: 540, y: 1350, w: 540, h: 30, text: 'НАЧАТЬ ОБУЧЕНИЕ', fontSize: 28, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1600, w: 600, h: 25, text: '@yourbrand', fontSize: 24, fontWeight: '500', color: '#374151', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 15. Объявления / 3D (Post) ──
    {
      id: 'announce-3d-hiring', name: '3D Вакансия', category: 'Объявления', styleType: '3d',
      width: 1080, height: 1080, bg: '#020617',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#020617' },
        { type: 'rect', x: 140, y: 100, w: 800, h: 880, fill: '#0f172a', radius: 40 },
        { type: 'rect', x: 120, y: 80, w: 800, h: 880, fill: '#1e293b', radius: 40, opacity: 0.5 },
        { type: 'rect', x: 100, y: 60, w: 800, h: 880, fill: '#334155', radius: 40, opacity: 0.2 },
        { type: 'text', x: 540, y: 250, w: 660, h: 30, text: 'МЫ НАНИМАЕМ', fontSize: 28, fontWeight: '700', color: '#34d399', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 420, w: 660, h: 70, text: 'Senior\nDeveloper', fontSize: 72, fontWeight: '900', color: '#f8fafc', align: 'center', lineHeight: 1.15, editable: true, editKey: 'position' },
        { type: 'rect', x: 420, y: 560, w: 240, h: 3, fill: '#34d399' },
        { type: 'text', x: 540, y: 640, w: 600, h: 60, text: 'Удалёнка  ·  $5K-8K\nReact + Node.js', fontSize: 28, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 1.6, editable: true, editKey: 'details' },
        { type: 'rect', x: 315, y: 780, w: 450, h: 64, fill: '#059669', radius: 32 },
        { type: 'text', x: 540, y: 824, w: 400, h: 25, text: 'ОТКЛИКНУТЬСЯ', fontSize: 24, fontWeight: '700', color: '#ffffff', align: 'center', editable: true, editKey: 'cta' },
      ],
    },

    // ── 16. Бизнес / Инфографика (Wide) ──
    {
      id: 'biz-infographic-timeline', name: 'Таймлайн компании', category: 'Бизнес', styleType: 'infographic',
      width: 1920, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1920, h: 1080, fill: '#0f172a' },
        { type: 'text', x: 960, y: 120, w: 1600, h: 50, text: 'ИСТОРИЯ НАШЕГО УСПЕХА', fontSize: 44, fontWeight: '800', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'rect', x: 160, y: 480, w: 1600, h: 4, fill: '#1e293b' },
        // Year 1
        { type: 'circle', x: 320, y: 482, w: 24, h: 24, fill: '#0ea5e9' },
        { type: 'text', x: 320, y: 380, w: 200, h: 40, text: '2020', fontSize: 40, fontWeight: '800', color: '#0ea5e9', align: 'center', editable: true, editKey: 'y1' },
        { type: 'text', x: 320, y: 560, w: 250, h: 60, text: 'Основание\nкомпании', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'y1_desc' },
        // Year 2
        { type: 'circle', x: 640, y: 482, w: 24, h: 24, fill: '#06b6d4' },
        { type: 'text', x: 640, y: 380, w: 200, h: 40, text: '2021', fontSize: 40, fontWeight: '800', color: '#06b6d4', align: 'center', editable: true, editKey: 'y2' },
        { type: 'text', x: 640, y: 560, w: 250, h: 60, text: 'Первый\nпродукт', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'y2_desc' },
        // Year 3
        { type: 'circle', x: 960, y: 482, w: 24, h: 24, fill: '#0891b2' },
        { type: 'text', x: 960, y: 380, w: 200, h: 40, text: '2022', fontSize: 40, fontWeight: '800', color: '#0891b2', align: 'center', editable: true, editKey: 'y3' },
        { type: 'text', x: 960, y: 560, w: 250, h: 60, text: '10K\nпользователей', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'y3_desc' },
        // Year 4
        { type: 'circle', x: 1280, y: 482, w: 24, h: 24, fill: '#0e7490' },
        { type: 'text', x: 1280, y: 380, w: 200, h: 40, text: '2023', fontSize: 40, fontWeight: '800', color: '#0e7490', align: 'center', editable: true, editKey: 'y4' },
        { type: 'text', x: 1280, y: 560, w: 250, h: 60, text: 'Раунд A\n$5M', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'y4_desc' },
        // Year 5
        { type: 'circle', x: 1600, y: 482, w: 24, h: 24, fill: '#22d3ee' },
        { type: 'text', x: 1600, y: 380, w: 200, h: 40, text: '2024', fontSize: 40, fontWeight: '800', color: '#22d3ee', align: 'center', editable: true, editKey: 'y5' },
        { type: 'text', x: 1600, y: 560, w: 250, h: 60, text: '1M+\nклиентов', fontSize: 24, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'y5_desc' },
        { type: 'text', x: 960, y: 800, w: 1200, h: 40, text: 'Путь от идеи до глобального продукта', fontSize: 36, fontWeight: '600', color: '#475569', align: 'center', editable: true, editKey: 'tagline' },
        { type: 'text', x: 960, y: 950, w: 800, h: 25, text: 'yourbrand.com', fontSize: 26, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'url' },
      ],
    },

    // ── 17. Акции / 2D (Banner tall) ──
    {
      id: 'sale-loyalty', name: 'Программа лояльности', category: 'Акции', styleType: '2d',
      width: 1080, height: 1350, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1350, fill: '#0f172a' },
        { type: 'rect', x: 60, y: 60, w: 960, h: 1230, fill: '#1e293b', radius: 40 },
        { type: 'text', x: 540, y: 200, w: 800, h: 30, text: 'КАРТА ЛОЯЛЬНОСТИ', fontSize: 28, fontWeight: '700', color: '#fbbf24', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 350, w: 800, h: 70, text: 'Кэшбэк\nдо 15%', fontSize: 80, fontWeight: '900', color: '#f1f5f9', align: 'center', lineHeight: 1.15, editable: true, editKey: 'title' },
        { type: 'rect', x: 390, y: 500, w: 300, h: 3, fill: '#fbbf24' },
        { type: 'text', x: 540, y: 600, w: 800, h: 80, text: 'За каждую покупку\nначисляются бонусы', fontSize: 36, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'desc' },
        // Tiers
        { type: 'rect', x: 120, y: 780, w: 260, h: 100, fill: '#334155', radius: 16 },
        { type: 'text', x: 250, y: 820, w: 220, h: 20, text: 'Бронза 5%', fontSize: 22, fontWeight: '600', color: '#d97706', align: 'center', editable: true, editKey: 'tier1' },
        { type: 'rect', x: 410, y: 780, w: 260, h: 100, fill: '#334155', radius: 16 },
        { type: 'text', x: 540, y: 820, w: 220, h: 20, text: 'Серебро 10%', fontSize: 22, fontWeight: '600', color: '#94a3b8', align: 'center', editable: true, editKey: 'tier2' },
        { type: 'rect', x: 700, y: 780, w: 260, h: 100, fill: '#334155', radius: 16 },
        { type: 'text', x: 830, y: 820, w: 220, h: 20, text: 'Золото 15%', fontSize: 22, fontWeight: '600', color: '#fbbf24', align: 'center', editable: true, editKey: 'tier3' },
        { type: 'rect', x: 290, y: 1000, w: 500, h: 72, fill: '#fbbf24', radius: 36 },
        { type: 'text', x: 540, y: 1048, w: 460, h: 30, text: 'ОФОРМИТЬ КАРТУ', fontSize: 26, fontWeight: '700', color: '#0f172a', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1180, w: 700, h: 25, text: 'yourbrand.com', fontSize: 24, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'url' },
      ],
    },

    // ── 18. Соцсети / 2D (Story) ──
    {
      id: 'social-before-after', name: 'До / После', category: 'Соцсети', styleType: '2d',
      width: 1080, height: 1920, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0f172a' },
        { type: 'text', x: 540, y: 180, w: 900, h: 50, text: 'ДО / ПОСЛЕ', fontSize: 52, fontWeight: '900', color: '#f1f5f9', align: 'center', editable: true, editKey: 'title' },
        { type: 'text', x: 540, y: 270, w: 800, h: 30, text: 'Результат за 30 дней', fontSize: 30, fontWeight: '400', color: '#64748b', align: 'center', editable: true, editKey: 'subtitle' },
        // Before box
        { type: 'rect', x: 60, y: 380, w: 960, h: 560, fill: '#1e293b', radius: 28 },
        { type: 'rect', x: 60, y: 380, w: 960, h: 60, fill: '#ef4444', radius: 0, opacity: 0.15 },
        { type: 'text', x: 540, y: 420, w: 900, h: 25, text: 'ДО', fontSize: 24, fontWeight: '800', color: '#ef4444', align: 'center' },
        { type: 'image-placeholder', x: 100, y: 480, w: 880, h: 420, fill: '#334155', radius: 16 },
        // After box
        { type: 'rect', x: 60, y: 1000, w: 960, h: 560, fill: '#1e293b', radius: 28 },
        { type: 'rect', x: 60, y: 1000, w: 960, h: 60, fill: '#22c55e', radius: 0, opacity: 0.15 },
        { type: 'text', x: 540, y: 1040, w: 900, h: 25, text: 'ПОСЛЕ', fontSize: 24, fontWeight: '800', color: '#22c55e', align: 'center' },
        { type: 'image-placeholder', x: 100, y: 1100, w: 880, h: 420, fill: '#334155', radius: 16 },
        { type: 'text', x: 540, y: 1680, w: 800, h: 30, text: 'Убедитесь сами!', fontSize: 36, fontWeight: '700', color: '#22d3ee', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1780, w: 700, h: 25, text: '@yourbrand', fontSize: 26, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 19. Яркие / 2D (Story) ──
    {
      id: 'bright-giveaway', name: 'Розыгрыш', category: 'Яркие', styleType: '2d',
      width: 1080, height: 1920, bg: '#020617',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#020617' },
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1920, fill: '#0ea5e9', opacity: 0.05 },
        { type: 'text', x: 540, y: 350, w: 900, h: 30, text: 'MEGA GIVEAWAY', fontSize: 36, fontWeight: '700', color: '#fbbf24', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 540, w: 900, h: 100, text: 'ВЫИГРАЙ\niPhone 16 Pro', fontSize: 88, fontWeight: '900', color: '#f1f5f9', align: 'center', lineHeight: 1.2, editable: true, editKey: 'prize' },
        { type: 'rect', x: 340, y: 720, w: 400, h: 3, fill: '#fbbf24' },
        { type: 'text', x: 540, y: 830, w: 800, h: 25, text: 'УСЛОВИЯ УЧАСТИЯ:', fontSize: 24, fontWeight: '700', color: '#fbbf24', align: 'center' },
        { type: 'text', x: 540, y: 960, w: 750, h: 200, text: '1. Подпишись на @yourbrand\n2. Поставь лайк этому посту\n3. Отметь 2 друзей в комментариях\n4. Репостни в сторис', fontSize: 32, fontWeight: '500', color: '#94a3b8', align: 'center', lineHeight: 2.0, editable: true, editKey: 'rules' },
        { type: 'text', x: 540, y: 1350, w: 700, h: 30, text: 'Итоги: 1 октября', fontSize: 36, fontWeight: '700', color: '#f1f5f9', align: 'center', editable: true, editKey: 'date' },
        { type: 'rect', x: 240, y: 1480, w: 600, h: 76, fill: '#fbbf24', radius: 38 },
        { type: 'text', x: 540, y: 1530, w: 540, h: 30, text: 'УЧАСТВОВАТЬ', fontSize: 30, fontWeight: '700', color: '#0f172a', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 1700, w: 700, h: 25, text: '@yourbrand', fontSize: 26, fontWeight: '500', color: '#475569', align: 'center', editable: true, editKey: 'handle' },
      ],
    },

    // ── 20. Образование / 2D (Post) ──
    {
      id: 'edu-fact-card', name: 'Факт дня', category: 'Образование', styleType: '2d',
      width: 1080, height: 1080, bg: '#0f172a',
      layers: [
        { type: 'rect', x: 0, y: 0, w: 1080, h: 1080, fill: '#0f172a' },
        { type: 'rect', x: 60, y: 60, w: 960, h: 960, fill: '#1e293b', radius: 40 },
        { type: 'rect', x: 80, y: 80, w: 200, h: 200, fill: '#0ea5e9', radius: 28, opacity: 0.15 },
        { type: 'text', x: 180, y: 180, w: 160, h: 60, text: '?!', fontSize: 72, fontWeight: '900', color: '#0ea5e9', align: 'center' },
        { type: 'text', x: 540, y: 180, w: 640, h: 30, text: 'ЗНАЛИ ЛИ ВЫ?', fontSize: 28, fontWeight: '700', color: '#0ea5e9', align: 'center', editable: true, editKey: 'pretitle' },
        { type: 'text', x: 540, y: 420, w: 800, h: 80, text: '90% стартапов\nтерпят неудачу\nв первый год', fontSize: 56, fontWeight: '800', color: '#f1f5f9', align: 'center', lineHeight: 1.3, editable: true, editKey: 'fact' },
        { type: 'rect', x: 390, y: 650, w: 300, h: 3, fill: '#0ea5e9' },
        { type: 'text', x: 540, y: 730, w: 750, h: 60, text: 'Но те, кто учатся на ошибках\nдостигают невероятных результатов', fontSize: 28, fontWeight: '400', color: '#94a3b8', align: 'center', lineHeight: 1.5, editable: true, editKey: 'comment' },
        { type: 'text', x: 540, y: 900, w: 700, h: 30, text: 'Сохрани, чтобы не забыть!', fontSize: 28, fontWeight: '600', color: '#0ea5e9', align: 'center', editable: true, editKey: 'cta' },
        { type: 'text', x: 540, y: 970, w: 700, h: 25, text: '@yourbrand', fontSize: 24, fontWeight: '500', color: '#334155', align: 'center', editable: true, editKey: 'handle' },
      ],
    },
  ];
}
