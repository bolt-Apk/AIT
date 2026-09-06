import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export default function ImageViewer({ src, alt, onClose }: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [lastTouchDist, setLastTouchDist] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const resetView = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s * 1.4, 8));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev / 1.4, 1);
      const ratio = next <= 1 ? 0 : (next - 1) / (prev - 1);
      setTranslate((t) => ({ x: t.x * ratio, y: t.y * ratio }));
      return next;
    });
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomIn();
      if (e.key === '-') zoomOut();
      if (e.key === '0') resetView();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, zoomIn, zoomOut, resetView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.85 : 1.18;
    setScale((prev) => {
      const next = Math.max(1, Math.min(prev * delta, 8));
      if (next < prev) {
        const ratio = next <= 1 ? 0 : (next - 1) / (prev - 1);
        setTranslate((t) => ({ x: t.x * ratio, y: t.y * ratio }));
      }
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (scale <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - translate.x, y: e.clientY - translate.y });
  }, [scale, translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslate({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const getTouchDist = (touches: React.TouchList) => {
    if (touches.length < 2) return null;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setLastTouchDist(getTouchDist(e.touches));
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - translate.x,
        y: e.touches[0].clientY - translate.y,
      });
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = getTouchDist(e.touches);
      if (dist && lastTouchDist) {
        const pinchRatio = dist / lastTouchDist;
        setScale((prev) => {
          const next = Math.max(1, Math.min(prev * pinchRatio, 8));
          if (next < prev) {
            const r = next <= 1 ? 0 : (next - 1) / (prev - 1);
            setTranslate((t) => ({ x: t.x * r, y: t.y * r }));
          }
          return next;
        });
        setLastTouchDist(dist);
      }
    } else if (e.touches.length === 1 && isDragging) {
      setTranslate({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [lastTouchDist, isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setLastTouchDist(null);
    if (scale <= 1) {
      setTranslate({ x: 0, y: 0 });
    }
  }, [scale]);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      resetView();
    } else {
      setScale(2.5);
    }
  }, [scale, resetView]);

  return createPortal(
    <div
      className="fixed inset-0 z-[200] bg-black flex flex-col"
      style={{
        paddingTop: 'var(--sat)',
        paddingBottom: 'var(--sab)',
        paddingLeft: 'var(--sal)',
        paddingRight: 'var(--sar)',
      }}
    >
      {/* Controls */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <button
            onClick={zoomOut}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs text-gray-400 w-14 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button
            onClick={zoomIn}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={resetView}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden flex items-center justify-center select-none"
        style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in', touchAction: 'none' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={src}
          alt={alt || ''}
          draggable={false}
          className="max-w-full max-h-full object-contain transition-transform duration-100"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transitionDuration: isDragging ? '0ms' : '100ms',
          }}
        />
      </div>

      {/* Hint */}
      <div className="shrink-0 py-2 text-center hidden sm:block">
        <p className="text-[11px] text-gray-600">Колесо мыши или жест щипком для масштабирования &middot; Двойной клик для увеличения</p>
      </div>
    </div>,
    document.body
  );
}
