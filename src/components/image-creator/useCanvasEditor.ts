import { useRef, useCallback, useEffect, useState } from 'react';
import * as fabric from 'fabric';
import type { Template, TemplateLayer } from './templates';
import { FONTS } from './templates';

export interface EditorLayer {
  id: string;
  name: string;
  type: 'rect' | 'text' | 'circle' | 'image' | 'image-placeholder';
  visible: boolean;
  locked: boolean;
  fabricObj: fabric.FabricObject;
  editKey?: string;
  templateIndex: number;
}

export interface TextProps {
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  fill: string;
  textAlign: string;
  opacity: number;
  underline: boolean;
  linethrough: boolean;
  charSpacing: number;
  lineHeight: number;
  shadow: string;
}

export interface SafeZoneConfig {
  enabled: boolean;
  padding: number;
}

export interface ShapeProps {
  fill: string;
  opacity: number;
  rx: number;
  ry: number;
  isImage: boolean;
}

export interface LayerDimensions {
  width: number;
  height: number;
  x: number;
  y: number;
}

export interface CanvasEditor {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  layers: EditorLayer[];
  selectedLayerIds: string[];
  selectLayer: (id: string, multi?: boolean) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateSelectedText: (text: string) => void;
  updateSelectedFont: (fontFamily: string) => void;
  updateSelectedFontSize: (size: number) => void;
  updateSelectedColor: (color: string) => void;
  updateSelectedFontWeight: (weight: string) => void;
  updateSelectedFontStyle: (style: string) => void;
  updateSelectedAlign: (align: string) => void;
  updateSelectedOpacity: (opacity: number) => void;
  updateSelectedFill: (fill: string) => void;
  updateSelectedUnderline: (v: boolean) => void;
  updateSelectedLinethrough: (v: boolean) => void;
  updateSelectedCharSpacing: (v: number) => void;
  updateSelectedLineHeight: (v: number) => void;
  updateSelectedShadow: (v: string) => void;
  updateSelectedBorderRadius: (v: number) => void;
  addImageFromUrl: (url: string) => Promise<void>;
  addImageFromFile: (file: File) => void;
  addText: (text?: string) => void;
  addRect: () => void;
  addCircle: () => void;
  replaceSelectedImage: (file: File) => void;
  replaceSelectedImageFromUrl: (url: string) => Promise<void>;
  getSelectedImageDataUrl: () => string | null;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  exportCanvas: (format: 'png' | 'jpeg', quality?: number, multiplier?: number) => string;
  resizeCanvas: (w: number, h: number) => void;
  getSelectedObject: () => fabric.FabricObject | null;
  getSelectedTextProps: () => TextProps | null;
  getSelectedShapeProps: () => ShapeProps | null;
  getSelectedDimensions: () => LayerDimensions | null;
  updateSelectedDimensions: (dims: Partial<LayerDimensions>, keepAspect?: boolean) => void;
  zoomToFit: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (level: number) => void;
  zoomLevel: number;
  deselectAll: () => void;
  onSelectionChange: React.MutableRefObject<((ids: string[]) => void) | null>;
  safeZones: SafeZoneConfig;
  toggleSafeZones: () => void;
  setSafeZonePadding: (p: number) => void;
  setCanvasBg: (color: string) => void;
}

const MAX_HISTORY = 40;

function fontWeightToNumber(w: string): number {
  const map: Record<string, number> = { normal: 400, bold: 700, '100': 100, '200': 200, '300': 300, '400': 400, '500': 500, '600': 600, '700': 700, '800': 800, '900': 900 };
  return map[w] ?? 400;
}

function getFontCss(fontId: string): string {
  return FONTS.find(f => f.id === fontId)?.css ?? `"${fontId}", sans-serif`;
}

function layerNameFromTemplate(layer: TemplateLayer, index: number, allLayers: TemplateLayer[]): string {
  if (layer.editKey) return layer.editKey;
  if (layer.type === 'text' && layer.text) {
    const clean = layer.text.replace(/\n/g, ' ').trim();
    return clean.length > 24 ? clean.slice(0, 22) + '...' : clean;
  }
  if (layer.type === 'image-placeholder') return 'Фото-область';
  if (layer.type === 'circle') {
    if (layer.opacity != null && layer.opacity < 0.3) return 'Свечение';
    return 'Круг';
  }
  if (layer.type === 'rect') {
    const isFullBg = index === 0 || (layer.x === 0 && layer.y === 0 && layer.w === allLayers[0]?.w && layer.h === allLayers[0]?.h);
    if (isFullBg && index <= 1) return 'Фон';
    if (layer.radius && layer.radius >= (Math.min(layer.w, layer.h) / 2 - 2)) return 'Кнопка';
    if (layer.h <= 8) return 'Линия';
    if (layer.opacity != null && layer.opacity < 0.4) return 'Тень';
    if (layer.radius && layer.radius > 16) return 'Карточка';
    return 'Блок';
  }
  return `Слой ${index}`;
}

const SAFE_ZONE_ID = '__safeZoneOverlay';

export function useCanvasEditor(
  containerRef: React.RefObject<HTMLDivElement | null>,
  template: Template | null,
): CanvasEditor {
  const onSelectionChangeRef = useRef<((ids: string[]) => void) | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  const [layers, setLayers] = useState<EditorLayer[]>([]);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const baseZoomRef = useRef(1);
  const isZoomingRef = useRef(false);
  const [safeZones, setSafeZones] = useState<SafeZoneConfig>({ enabled: false, padding: 40 });

  const saveHistory = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || skipHistoryRef.current) return;
    const json = JSON.stringify(fc.toJSON());
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(json);
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const syncLayers = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc.getObjects().filter((o: any) => o.__layerId !== SAFE_ZONE_ID);
    setLayers(objs.map((obj, i) => ({
      id: (obj as any).__layerId || `layer-${i}`,
      name: (obj as any).__layerName || `Layer ${i}`,
      type: (obj as any).__layerType || 'rect',
      visible: obj.visible !== false,
      locked: !obj.selectable,
      fabricObj: obj,
      editKey: (obj as any).__editKey,
      templateIndex: i,
    })));
  }, []);

  // Safe zone overlay management
  const drawSafeZones = useCallback((fc: fabric.Canvas, config: SafeZoneConfig) => {
    const existing = fc.getObjects().find((o: any) => o.__layerId === SAFE_ZONE_ID);
    if (existing) fc.remove(existing);
    if (!config.enabled) { fc.renderAll(); return; }

    const sz = canvasSizeRef.current;
    const p = config.padding;
    const group = new fabric.Group([
      new fabric.Rect({ left: 0, top: 0, width: sz.w, height: p, fill: 'rgba(255,0,0,0.08)' }),
      new fabric.Rect({ left: 0, top: sz.h - p, width: sz.w, height: p, fill: 'rgba(255,0,0,0.08)' }),
      new fabric.Rect({ left: 0, top: p, width: p, height: sz.h - p * 2, fill: 'rgba(255,0,0,0.08)' }),
      new fabric.Rect({ left: sz.w - p, top: p, width: p, height: sz.h - p * 2, fill: 'rgba(255,0,0,0.08)' }),
      new fabric.Rect({
        left: p, top: p, width: sz.w - p * 2, height: sz.h - p * 2,
        fill: 'transparent', stroke: '#ef4444', strokeWidth: 1, strokeDashArray: [8, 4],
      }),
    ], {
      left: 0, top: 0,
      selectable: false, evented: false, excludeFromExport: true,
    });
    (group as any).__layerId = SAFE_ZONE_ID;
    fc.add(group);
    fc.moveObjectTo(group, fc.getObjects().length - 1);
    fc.renderAll();
  }, []);

  useEffect(() => {
    const fc = fabricRef.current;
    if (fc) drawSafeZones(fc, safeZones);
  }, [safeZones, drawSafeZones]);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current || !template) return;

    const fc = new fabric.Canvas(canvasRef.current, {
      width: template.width,
      height: template.height,
      backgroundColor: template.bg,
      preserveObjectStacking: true,
      selection: true,
    });
    fc.uniformScaling = false;

    fabricRef.current = fc;
    canvasSizeRef.current = { w: template.width, h: template.height };

    const buildLayers = async () => {
      for (let i = 0; i < template.layers.length; i++) {
        const tl = template.layers[i];
        const id = `${template.id}-${i}`;
        let obj: fabric.FabricObject;

        if (tl.type === 'rect') {
          obj = new fabric.Rect({
            left: tl.x, top: tl.y, width: tl.w, height: tl.h,
            fill: tl.fill || '#000', rx: tl.radius || 0, ry: tl.radius || 0,
            opacity: tl.opacity ?? 1,
          });
        } else if (tl.type === 'circle') {
          obj = new fabric.Ellipse({
            left: tl.x - tl.w / 2, top: tl.y - tl.h / 2,
            rx: tl.w / 2, ry: tl.h / 2,
            fill: tl.fill || '#000', opacity: tl.opacity ?? 1,
          });
        } else if (tl.type === 'text') {
          const fontCss = getFontCss('Inter');
          obj = new fabric.Textbox(tl.text || '', {
            left: tl.x - tl.w / 2, top: tl.y - (tl.h || 40) / 2,
            width: tl.w,
            fontSize: tl.fontSize || 32,
            fontWeight: fontWeightToNumber(tl.fontWeight || '400') as any,
            fontFamily: fontCss,
            fill: tl.color || '#000',
            textAlign: tl.align || 'center',
            lineHeight: tl.lineHeight || 1.2,
            opacity: tl.opacity ?? 1,
            splitByGrapheme: false,
          });
        } else if (tl.type === 'image-placeholder') {
          obj = new fabric.Rect({
            left: tl.x, top: tl.y, width: tl.w, height: tl.h,
            fill: tl.fill || '#334155', rx: tl.radius || 0, ry: tl.radius || 0,
            opacity: tl.opacity ?? 1,
            stroke: '#64748b', strokeWidth: 2, strokeDashArray: [10, 5],
          });
        } else {
          continue;
        }

        (obj as any).__layerId = id;
        (obj as any).__layerName = layerNameFromTemplate(tl, i, template.layers);
        (obj as any).__layerType = tl.type;
        (obj as any).__editKey = tl.editKey;
        fc.add(obj);
      }

      fc.renderAll();
      syncLayers();
      saveHistory();
    };

    buildLayers();

    fc.on('object:modified', () => { syncLayers(); saveHistory(); });
    const handleSel = (ids: string[]) => {
      setSelectedLayerIds(ids);
      onSelectionChangeRef.current?.(ids);
    };
    fc.on('selection:created', (e) => {
      handleSel((e.selected || []).map((o: any) => o.__layerId).filter((id: string) => id !== SAFE_ZONE_ID));
    });
    fc.on('selection:updated', (e) => {
      handleSel((e.selected || []).map((o: any) => o.__layerId).filter((id: string) => id !== SAFE_ZONE_ID));
    });
    fc.on('selection:cleared', () => handleSel([]));
    fc.on('text:changed', () => { syncLayers(); saveHistory(); });

    const handleKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undoFn(); }
      if (ctrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redoFn(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = fc.getActiveObject();
        if (active && !(active instanceof fabric.Textbox && (active as any).isEditing)) {
          fc.remove(active);
          fc.discardActiveObject();
          syncLayers();
          saveHistory();
        }
      }
    };
    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      fc.dispose();
      fabricRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id]);

  // Zoom helpers
  const clampZoom = useCallback((zoom: number) => {
    const minZ = baseZoomRef.current * 0.1;
    const maxZ = baseZoomRef.current * 5;
    return Math.max(minZ, Math.min(maxZ, zoom));
  }, []);

  const syncZoomLevel = useCallback((zoom: number) => {
    setZoomLevel(Math.round((zoom / baseZoomRef.current) * 100));
  }, []);

  const applyZoom = useCallback((fc: fabric.Canvas, zoom: number) => {
    const sz = canvasSizeRef.current;
    const z = clampZoom(zoom);
    isZoomingRef.current = true;
    fc.setZoom(z);
    fc.setDimensions({ width: sz.w * z, height: sz.h * z });
    fc.renderAll();
    syncZoomLevel(z);
    requestAnimationFrame(() => { isZoomingRef.current = false; });
  }, [clampZoom, syncZoomLevel]);

  const zoomToFit = useCallback(() => {
    const fc = fabricRef.current;
    const container = containerRef.current;
    const sz = canvasSizeRef.current;
    if (!fc || !container || sz.w === 0) return;
    const cw = container.clientWidth - 32;
    const ch = container.clientHeight - 32;
    const scale = Math.min(cw / sz.w, ch / sz.h, 1);
    baseZoomRef.current = scale;
    fc.viewportTransform = [scale, 0, 0, scale, 0, 0];
    fc.setZoom(scale);
    fc.setDimensions({ width: sz.w * scale, height: sz.h * scale });
    fc.renderAll();
    setZoomLevel(100);
  }, [containerRef]);

  const zoomTo = useCallback((pct: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const clamped = Math.max(10, Math.min(500, pct));
    applyZoom(fc, baseZoomRef.current * (clamped / 100));
  }, [applyZoom]);

  const zoomIn = useCallback(() => {
    zoomTo(Math.min(500, zoomLevel + 25));
  }, [zoomTo, zoomLevel]);

  const zoomOut = useCallback(() => {
    zoomTo(Math.max(10, zoomLevel - 25));
  }, [zoomTo, zoomLevel]);

  useEffect(() => {
    zoomToFit();
    const ro = new ResizeObserver(() => {
      if (!isZoomingRef.current) zoomToFit();
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [zoomToFit, containerRef]);

  useEffect(() => {
    const fc = fabricRef.current;
    const container = containerRef.current;
    if (!fc || !container) return;

    const handler = (opt: fabric.IEvent<WheelEvent>) => {
      const e = opt.e;
      e.preventDefault();
      e.stopPropagation();

      const sz = canvasSizeRef.current;
      const oldZoom = fc.getZoom();
      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newZoom = clampZoom(oldZoom * factor);
      if (newZoom === oldZoom) return;

      const canvasEl = fc.getElement();
      const rect = canvasEl.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const pointOnCanvas = { x: mouseX / oldZoom, y: mouseY / oldZoom };

      fc.setZoom(newZoom);
      fc.setDimensions({ width: sz.w * newZoom, height: sz.h * newZoom });

      const newMouseX = pointOnCanvas.x * newZoom;
      const newMouseY = pointOnCanvas.y * newZoom;

      container.scrollLeft += (newMouseX - mouseX);
      container.scrollTop += (newMouseY - mouseY);

      fc.renderAll();
      syncZoomLevel(newZoom);
    };

    fc.on('mouse:wheel', handler);
    return () => { fc.off('mouse:wheel', handler); };
  }, [containerRef, clampZoom, syncZoomLevel]);

  // Layer operations
  const selectLayer = useCallback((id: string, multi?: boolean) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getObjects().find((o: any) => o.__layerId === id);
    if (!obj || !obj.selectable) return;
    if (multi) {
      const active = fc.getActiveObjects();
      if (active.includes(obj)) {
        fc.discardActiveObject();
        const remaining = active.filter(o => o !== obj);
        if (remaining.length === 1) fc.setActiveObject(remaining[0]);
        else if (remaining.length > 1) fc.setActiveObject(new fabric.ActiveSelection(remaining, { canvas: fc }));
      } else {
        const sel = new fabric.ActiveSelection([...active, obj], { canvas: fc });
        fc.setActiveObject(sel);
      }
    } else {
      fc.setActiveObject(obj);
    }
    fc.renderAll();
  }, []);

  const moveLayer = useCallback((id: string, direction: 'up' | 'down') => {
    const fc = fabricRef.current;
    if (!fc) return;
    const objs = fc.getObjects().filter((o: any) => o.__layerId !== SAFE_ZONE_ID);
    const idx = objs.findIndex((o: any) => o.__layerId === id);
    if (idx < 0) return;
    const obj = objs[idx];
    if (direction === 'up' && idx < objs.length - 1) { fc.moveObjectTo(obj, idx + 1); }
    else if (direction === 'down' && idx > 0) { fc.moveObjectTo(obj, idx - 1); }
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const toggleVisibility = useCallback((id: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getObjects().find((o: any) => o.__layerId === id);
    if (!obj) return;
    obj.visible = !obj.visible;
    fc.renderAll();
    syncLayers();
  }, [syncLayers]);

  const toggleLock = useCallback((id: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getObjects().find((o: any) => o.__layerId === id);
    if (!obj) return;
    const lock = obj.selectable;
    obj.selectable = !lock;
    obj.evented = !lock;
    if (lock) fc.discardActiveObject();
    fc.renderAll();
    syncLayers();
  }, [syncLayers]);

  const renameLayer = useCallback((id: string, name: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getObjects().find((o: any) => o.__layerId === id);
    if (!obj) return;
    (obj as any).__layerName = name;
    syncLayers();
  }, [syncLayers]);

  const deleteLayer = useCallback((id: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getObjects().find((o: any) => o.__layerId === id);
    if (!obj) return;
    fc.remove(obj);
    fc.discardActiveObject();
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const duplicateLayer = useCallback((id: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getObjects().find((o: any) => o.__layerId === id);
    if (!obj) return;
    obj.clone().then((cloned: fabric.FabricObject) => {
      cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
      const newId = `${id}-copy-${Date.now()}`;
      (cloned as any).__layerId = newId;
      (cloned as any).__layerName = `${(obj as any).__layerName} копия`;
      (cloned as any).__layerType = (obj as any).__layerType;
      (cloned as any).__editKey = undefined;
      fc.add(cloned);
      fc.setActiveObject(cloned);
      fc.renderAll();
      syncLayers();
      saveHistory();
    });
  }, [syncLayers, saveHistory]);

  // Add new elements
  const addText = useCallback((text?: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const sz = canvasSizeRef.current;
    const obj = new fabric.Textbox(text || 'Текст', {
      left: sz.w / 2 - 100, top: sz.h / 2 - 20,
      width: 200,
      fontSize: 32,
      fontFamily: '"Inter", sans-serif',
      fill: '#ffffff',
      textAlign: 'center',
      lineHeight: 1.2,
    });
    const id = `text-${Date.now()}`;
    (obj as any).__layerId = id;
    (obj as any).__layerName = text ? (text.length > 20 ? text.slice(0, 18) + '...' : text) : 'Текст';
    (obj as any).__layerType = 'text';
    fc.add(obj);
    fc.setActiveObject(obj);
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const addRect = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const sz = canvasSizeRef.current;
    const obj = new fabric.Rect({
      left: sz.w / 2 - 75, top: sz.h / 2 - 50,
      width: 150, height: 100,
      fill: '#3b82f6', rx: 8, ry: 8,
    });
    const id = `rect-${Date.now()}`;
    (obj as any).__layerId = id;
    (obj as any).__layerName = 'Прямоугольник';
    (obj as any).__layerType = 'rect';
    fc.add(obj);
    fc.setActiveObject(obj);
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const addCircle = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc) return;
    const sz = canvasSizeRef.current;
    const obj = new fabric.Ellipse({
      left: sz.w / 2 - 50, top: sz.h / 2 - 50,
      rx: 50, ry: 50,
      fill: '#06b6d4',
    });
    const id = `circle-${Date.now()}`;
    (obj as any).__layerId = id;
    (obj as any).__layerName = 'Круг';
    (obj as any).__layerType = 'circle';
    fc.add(obj);
    fc.setActiveObject(obj);
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  // Property updates
  const getSelectedObject = useCallback((): fabric.FabricObject | null => {
    return fabricRef.current?.getActiveObject() ?? null;
  }, []);

  const getSelectedTextProps = useCallback((): TextProps | null => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj || !(obj instanceof fabric.Textbox)) return null;
    return {
      text: obj.text || '',
      fontFamily: obj.fontFamily || 'Inter',
      fontSize: obj.fontSize || 32,
      fontWeight: String(obj.fontWeight || '400'),
      fontStyle: obj.fontStyle || 'normal',
      fill: typeof obj.fill === 'string' ? obj.fill : '#000',
      textAlign: obj.textAlign || 'center',
      opacity: obj.opacity ?? 1,
      underline: obj.underline || false,
      linethrough: obj.linethrough || false,
      charSpacing: obj.charSpacing || 0,
      lineHeight: obj.lineHeight || 1.2,
      shadow: obj.shadow ? String(obj.shadow) : '',
    };
  }, []);

  const updateProp = useCallback((setter: (obj: fabric.FabricObject) => void) => {
    const fc = fabricRef.current;
    const obj = fc?.getActiveObject();
    if (!obj || !fc) return;
    setter(obj);
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const updateSelectedText = useCallback((text: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('text', text); });
  }, [updateProp]);

  const updateSelectedFont = useCallback((fontFamily: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('fontFamily', getFontCss(fontFamily)); });
  }, [updateProp]);

  const updateSelectedFontSize = useCallback((size: number) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('fontSize', size); });
  }, [updateProp]);

  const updateSelectedColor = useCallback((color: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('fill', color); });
  }, [updateProp]);

  const updateSelectedFontWeight = useCallback((weight: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('fontWeight', fontWeightToNumber(weight) as any); });
  }, [updateProp]);

  const updateSelectedFontStyle = useCallback((style: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('fontStyle', style as any); });
  }, [updateProp]);

  const updateSelectedAlign = useCallback((align: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('textAlign', align); });
  }, [updateProp]);

  const updateSelectedOpacity = useCallback((opacity: number) => {
    updateProp(obj => obj.set('opacity', opacity));
  }, [updateProp]);

  const updateSelectedFill = useCallback((fill: string) => {
    updateProp(obj => obj.set('fill', fill));
  }, [updateProp]);

  const updateSelectedUnderline = useCallback((v: boolean) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('underline', v); });
  }, [updateProp]);

  const updateSelectedLinethrough = useCallback((v: boolean) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('linethrough', v); });
  }, [updateProp]);

  const updateSelectedCharSpacing = useCallback((v: number) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('charSpacing', v); });
  }, [updateProp]);

  const updateSelectedLineHeight = useCallback((v: number) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('lineHeight', v); });
  }, [updateProp]);

  const updateSelectedShadow = useCallback((v: string) => {
    updateProp(obj => { if (obj instanceof fabric.Textbox) obj.set('shadow', v || null); });
  }, [updateProp]);

  const updateSelectedBorderRadius = useCallback((v: number) => {
    updateProp(obj => {
      if (obj instanceof fabric.Rect) {
        obj.set({ rx: v, ry: v });
      } else if (obj instanceof fabric.FabricImage) {
        const clipPath = new fabric.Rect({
          width: obj.width, height: obj.height,
          rx: v, ry: v,
          originX: 'center', originY: 'center',
        });
        obj.set('clipPath', v > 0 ? clipPath : undefined);
      }
    });
  }, [updateProp]);

  const getSelectedShapeProps = useCallback((): ShapeProps | null => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return null;
    const isImg = obj instanceof fabric.FabricImage;
    let rx = 0, ry = 0;
    if (obj instanceof fabric.Rect) { rx = (obj as any).rx || 0; ry = (obj as any).ry || 0; }
    else if (isImg && obj.clipPath instanceof fabric.Rect) { rx = (obj.clipPath as any).rx || 0; ry = (obj.clipPath as any).ry || 0; }
    return {
      fill: typeof obj.fill === 'string' ? obj.fill : '#000000',
      opacity: obj.opacity ?? 1,
      rx, ry,
      isImage: isImg,
    };
  }, []);

  const getSelectedDimensions = useCallback((): LayerDimensions | null => {
    const obj = fabricRef.current?.getActiveObject();
    if (!obj) return null;
    return {
      width: Math.round(obj.getScaledWidth()),
      height: Math.round(obj.getScaledHeight()),
      x: Math.round(obj.left ?? 0),
      y: Math.round(obj.top ?? 0),
    };
  }, []);

  const updateSelectedDimensions = useCallback((dims: Partial<LayerDimensions>, keepAspect?: boolean) => {
    const fc = fabricRef.current;
    const obj = fc?.getActiveObject();
    if (!obj || !fc) return;
    const curW = obj.getScaledWidth();
    const curH = obj.getScaledHeight();
    const aspect = curW > 0 && curH > 0 ? curW / curH : 1;
    if (dims.width !== undefined && dims.width > 0) {
      obj.scaleX = dims.width / (obj.width || 1);
      if (keepAspect) {
        const newH = dims.width / aspect;
        obj.scaleY = newH / (obj.height || 1);
      }
    }
    if (dims.height !== undefined && dims.height > 0) {
      if (!keepAspect || dims.width === undefined) {
        obj.scaleY = dims.height / (obj.height || 1);
      }
      if (keepAspect && dims.width === undefined) {
        const newW = dims.height * aspect;
        obj.scaleX = newW / (obj.width || 1);
      }
    }
    if (dims.x !== undefined) obj.left = dims.x;
    if (dims.y !== undefined) obj.top = dims.y;
    obj.setCoords();
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  // Image operations
  const addImageFromUrl = useCallback(async (url: string) => {
    const fc = fabricRef.current;
    const sz = canvasSizeRef.current;
    if (!fc || sz.w === 0) return;
    const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
    const scale = Math.min(sz.w * 0.5 / (img.width || 1), sz.h * 0.5 / (img.height || 1));
    img.scale(scale);
    img.set({ left: sz.w / 2 - (img.width || 0) * scale / 2, top: sz.h / 2 - (img.height || 0) * scale / 2 });
    const id = `img-${Date.now()}`;
    (img as any).__layerId = id;
    (img as any).__layerName = 'Изображение';
    (img as any).__layerType = 'image';
    fc.add(img);
    fc.setActiveObject(img);
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const addImageFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') addImageFromUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }, [addImageFromUrl]);

  const replaceSelectedImageFromUrl = useCallback(async (url: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const obj = fc.getActiveObject();
    if (!obj || !(obj instanceof fabric.FabricImage)) return;
    const newImg = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
    const prevScaleX = obj.scaleX || 1;
    const prevScaleY = obj.scaleY || 1;
    const prevLeft = obj.left || 0;
    const prevTop = obj.top || 0;
    const prevClip = obj.clipPath;
    const targetW = (obj.width || 1) * prevScaleX;
    const targetH = (obj.height || 1) * prevScaleY;
    const newScaleX = targetW / (newImg.width || 1);
    const newScaleY = targetH / (newImg.height || 1);
    newImg.set({ left: prevLeft, top: prevTop, scaleX: newScaleX, scaleY: newScaleY });
    if (prevClip) newImg.set('clipPath', prevClip);
    (newImg as any).__layerId = (obj as any).__layerId;
    (newImg as any).__layerName = (obj as any).__layerName;
    (newImg as any).__layerType = 'image';
    const idx = fc.getObjects().indexOf(obj);
    fc.remove(obj);
    fc.insertAt(idx, newImg);
    fc.setActiveObject(newImg);
    fc.renderAll();
    syncLayers();
    saveHistory();
  }, [syncLayers, saveHistory]);

  const replaceSelectedImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') replaceSelectedImageFromUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }, [replaceSelectedImageFromUrl]);

  const getSelectedImageDataUrl = useCallback((): string | null => {
    const fc = fabricRef.current;
    if (!fc) return null;
    const obj = fc.getActiveObject();
    if (!obj || !(obj instanceof fabric.FabricImage)) return null;
    const el = obj.getElement();
    if (!el || !(el instanceof HTMLImageElement || el instanceof HTMLCanvasElement)) return null;
    try {
      const c = document.createElement('canvas');
      c.width = obj.width || 100;
      c.height = obj.height || 100;
      const ctx = c.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(el, 0, 0);
      return c.toDataURL('image/png');
    } catch { return null; }
  }, []);

  // Undo / Redo
  const undoFn = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    skipHistoryRef.current = true;
    fc.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      fc.renderAll();
      syncLayers();
      skipHistoryRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [syncLayers]);

  const redoFn = useCallback(() => {
    const fc = fabricRef.current;
    if (!fc || historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    skipHistoryRef.current = true;
    fc.loadFromJSON(JSON.parse(historyRef.current[historyIndexRef.current])).then(() => {
      fc.renderAll();
      syncLayers();
      skipHistoryRef.current = false;
      setCanUndo(historyIndexRef.current > 0);
      setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    });
  }, [syncLayers]);

  // Export (excludes safe zone overlay)
  const exportCanvas = useCallback((format: 'png' | 'jpeg', quality = 1, multiplier = 1): string => {
    const fc = fabricRef.current;
    const sz = canvasSizeRef.current;
    if (!fc || sz.w === 0) return '';
    fc.discardActiveObject();
    const szOverlay = fc.getObjects().find((o: any) => o.__layerId === SAFE_ZONE_ID);
    if (szOverlay) szOverlay.visible = false;
    const prevZoom = fc.getZoom();
    fc.setZoom(1);
    fc.setDimensions({ width: sz.w, height: sz.h });
    const dataUrl = fc.toDataURL({ format, quality, multiplier });
    fc.setZoom(prevZoom);
    fc.setDimensions({ width: sz.w * prevZoom, height: sz.h * prevZoom });
    if (szOverlay) szOverlay.visible = true;
    fc.renderAll();
    return dataUrl;
  }, []);

  // Resize canvas
  const resizeCanvas = useCallback((w: number, h: number) => {
    const fc = fabricRef.current;
    if (!fc) return;
    const prev = canvasSizeRef.current;
    if (prev.w === w && prev.h === h) return;

    const sx = w / prev.w;
    const sy = h / prev.h;
    const sizeScale = Math.sqrt(sx * sy);
    canvasSizeRef.current = { w, h };

    fc.getObjects().filter((o: any) => o.__layerId !== SAFE_ZONE_ID).forEach(obj => {
      const objW = (obj.width || 0) * (obj.scaleX || 1);
      const objH = (obj.height || 0) * (obj.scaleY || 1);
      const cx = (obj.left || 0) + objW / 2;
      const cy = (obj.top || 0) + objH / 2;

      const newScaleX = (obj.scaleX || 1) * sizeScale;
      const newScaleY = (obj.scaleY || 1) * sizeScale;
      const newObjW = (obj.width || 0) * newScaleX;
      const newObjH = (obj.height || 0) * newScaleY;

      const newCx = (cx / prev.w) * w;
      const newCy = (cy / prev.h) * h;

      const margin = 4;
      const newLeft = Math.max(margin, Math.min(w - newObjW - margin, newCx - newObjW / 2));
      const newTop = Math.max(margin, Math.min(h - newObjH - margin, newCy - newObjH / 2));

      obj.set({ left: newLeft, top: newTop, scaleX: newScaleX, scaleY: newScaleY });

      if ((obj as any).fontSize) {
        (obj as any).set('fontSize', Math.round((obj as any).fontSize * sizeScale));
        obj.set({ scaleX: 1, scaleY: 1 });
        const textW = (obj.width || 0);
        const textH = (obj.height || 0);
        const clampedLeft = Math.max(margin, Math.min(w - textW - margin, newCx - textW / 2));
        const clampedTop = Math.max(margin, Math.min(h - textH - margin, newCy - textH / 2));
        obj.set({ left: clampedLeft, top: clampedTop });
      }

      obj.setCoords();
    });

    const container = containerRef.current;
    if (container) {
      const cw = container.clientWidth - 32;
      const ch = container.clientHeight - 32;
      const scale = Math.min(cw / w, ch / h, 1);
      fc.setZoom(scale);
      fc.setDimensions({ width: w * scale, height: h * scale });
    } else {
      fc.setZoom(1);
      fc.setDimensions({ width: w, height: h });
    }
    fc.renderAll();
    // Redraw safe zones for new size
    setSafeZones(prev => {
      if (prev.enabled) drawSafeZones(fc, prev);
      return prev;
    });
  }, [containerRef, drawSafeZones]);

  const setCanvasBg = useCallback((color: string) => {
    const fc = fabricRef.current;
    if (!fc) return;
    fc.backgroundColor = color;
    fc.renderAll();
    saveHistory();
  }, [saveHistory]);

  const toggleSafeZones = useCallback(() => {
    setSafeZones(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const setSafeZonePaddingFn = useCallback((p: number) => {
    setSafeZones(prev => ({ ...prev, padding: p }));
  }, []);

  return {
    canvasRef,
    layers,
    selectedLayerIds,
    selectLayer,
    moveLayer,
    toggleVisibility,
    toggleLock,
    renameLayer,
    deleteLayer,
    duplicateLayer,
    updateSelectedText,
    updateSelectedFont,
    updateSelectedFontSize,
    updateSelectedColor,
    updateSelectedFontWeight,
    updateSelectedFontStyle,
    updateSelectedAlign,
    updateSelectedOpacity,
    updateSelectedFill,
    updateSelectedUnderline,
    updateSelectedLinethrough,
    updateSelectedCharSpacing,
    updateSelectedLineHeight,
    updateSelectedShadow,
    updateSelectedBorderRadius,
    addImageFromUrl,
    addImageFromFile,
    addText,
    addRect,
    addCircle,
    replaceSelectedImage,
    replaceSelectedImageFromUrl,
    getSelectedImageDataUrl,
    undo: undoFn,
    redo: redoFn,
    canUndo,
    canRedo,
    exportCanvas,
    resizeCanvas,
    getSelectedObject,
    getSelectedTextProps,
    getSelectedShapeProps,
    getSelectedDimensions,
    updateSelectedDimensions,
    zoomToFit,
    zoomIn,
    zoomOut,
    zoomTo,
    zoomLevel,
    deselectAll: useCallback(() => {
      const fc = fabricRef.current;
      if (!fc) return;
      fc.discardActiveObject();
      fc.renderAll();
    }, []),
    onSelectionChange: onSelectionChangeRef,
    safeZones,
    toggleSafeZones,
    setSafeZonePadding: setSafeZonePaddingFn,
    setCanvasBg,
  };
}
