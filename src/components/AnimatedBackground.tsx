import { useMemo, useState, useEffect, useRef } from 'react';
import {
  Video, Image, Mic, MessageCircle, Camera, Film, Music, Wand2,
  Palette, Bot, BrainCircuit, AudioLines, Clapperboard, Brush, PenTool,
  type LucideIcon,
} from 'lucide-react';

interface FloatingIconData {
  Icon: LucideIcon;
  label: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

const ICON_POOL: { Icon: LucideIcon; label: string }[] = [
  { Icon: Video, label: 'Видео' },
  { Icon: Image, label: 'Фото' },
  { Icon: Mic, label: 'Речь' },
  { Icon: MessageCircle, label: 'Чат' },
  { Icon: Camera, label: 'Камера' },
  { Icon: Film, label: 'Фильм' },
  { Icon: Music, label: 'Музыка' },
  { Icon: Wand2, label: 'Магия' },
  { Icon: Palette, label: 'Дизайн' },
  { Icon: Bot, label: 'Бот' },
  { Icon: BrainCircuit, label: 'ИИ' },
  { Icon: AudioLines, label: 'Аудио' },
  { Icon: Clapperboard, label: 'Кино' },
  { Icon: Brush, label: 'Арт' },
  { Icon: PenTool, label: 'Рисовать' },
];

function generateIcons(): FloatingIconData[] {
  const icons: FloatingIconData[] = [];
  const iconCount = typeof window !== 'undefined' && window.innerWidth < 640 ? 8 : 20;
  for (let i = 0; i < iconCount; i++) {
    const pool = ICON_POOL[i % ICON_POOL.length];
    icons.push({
      Icon: pool.Icon,
      label: pool.label,
      x: Math.random() * 90 + 5,
      y: Math.random() * 90 + 5,
      size: 20 + Math.random() * 16,
      duration: 22 + Math.random() * 20,
      delay: -(Math.random() * 30),
      opacity: 0.06 + Math.random() * 0.07,
    });
  }
  return icons;
}

export function useMouseGlow(containerRef: React.RefObject<HTMLElement | null>) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      });
    };
    const onLeave = () => setPos(null);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [containerRef]);

  return pos;
}

export function MouseSpotlight({ pos }: { pos: { x: number; y: number } | null }) {
  if (!pos) return null;
  return (
    <div
      className="absolute pointer-events-none z-[1] transition-opacity duration-300"
      style={{
        left: pos.x,
        top: pos.y,
        width: 500,
        height: 500,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(34,211,238,0.12) 0%, rgba(34,211,238,0.04) 30%, transparent 70%)',
      }}
    />
  );
}

export function FloatingIcons({ mousePos }: { mousePos: { x: number; y: number } | null }) {
  const icons = useMemo(() => generateIcons(), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map((item, i) => {
        let glowScale = 1;
        let glowOpacity = item.opacity;
        if (mousePos) {
          const iconCenterX = (item.x / 100) * (typeof window !== 'undefined' ? window.innerWidth : 1000);
          const iconCenterY = (item.y / 100) * (typeof window !== 'undefined' ? window.innerHeight : 800);
          const dist = Math.hypot(mousePos.x - iconCenterX, mousePos.y - iconCenterY);
          const radius = 280;
          if (dist < radius) {
            const proximity = 1 - dist / radius;
            glowScale = 1 + proximity * 0.5;
            glowOpacity = item.opacity + proximity * 0.35;
          }
        }
        return (
          <div
            key={i}
            className="absolute animate-float-icon"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              animationDuration: `${item.duration}s`,
              animationDelay: `${item.delay}s`,
              opacity: glowOpacity,
              transform: `scale(${glowScale})`,
              transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
              filter: glowScale > 1 ? `drop-shadow(0 0 ${(glowScale - 1) * 30}px rgba(34,211,238,0.5))` : 'none',
            }}
          >
            <div className="flex flex-col items-center gap-1">
              <item.Icon
                style={{ width: item.size, height: item.size }}
                className="text-cyan-400"
                strokeWidth={1.2}
              />
              <span
                className="text-cyan-400 font-medium select-none"
                style={{ fontSize: Math.max(8, item.size * 0.36) }}
              >
                {item.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface Card3D {
  icon: LucideIcon;
  label: string;
  x: number;
  y: number;
  z: number;
  rotateX: number;
  rotateY: number;
  size: number;
  delay: number;
  duration: number;
  color: string;
  glow: string;
}

function generate3DCards(): Card3D[] {
  const features: { icon: LucideIcon; label: string; color: string; glow: string }[] = [
    { icon: MessageCircle, label: 'Чат', color: 'from-cyan-500/20 to-cyan-600/10', glow: 'rgba(6,182,212,0.3)' },
    { icon: Image, label: 'Фото', color: 'from-blue-500/20 to-blue-600/10', glow: 'rgba(59,130,246,0.3)' },
    { icon: Video, label: 'Видео', color: 'from-teal-500/20 to-teal-600/10', glow: 'rgba(20,184,166,0.3)' },
    { icon: Mic, label: 'Голос', color: 'from-emerald-500/20 to-emerald-600/10', glow: 'rgba(16,185,129,0.3)' },
    { icon: BrainCircuit, label: 'ИИ', color: 'from-sky-500/20 to-sky-600/10', glow: 'rgba(14,165,233,0.3)' },
    { icon: Wand2, label: 'Магия', color: 'from-cyan-400/20 to-blue-500/10', glow: 'rgba(34,211,238,0.3)' },
    { icon: Palette, label: 'Дизайн', color: 'from-blue-400/20 to-cyan-500/10', glow: 'rgba(96,165,250,0.3)' },
    { icon: Film, label: 'Кино', color: 'from-teal-400/20 to-emerald-500/10', glow: 'rgba(45,212,191,0.3)' },
    { icon: AudioLines, label: 'Аудио', color: 'from-emerald-400/20 to-teal-500/10', glow: 'rgba(52,211,153,0.3)' },
    { icon: Bot, label: 'Бот', color: 'from-sky-400/20 to-blue-500/10', glow: 'rgba(56,189,248,0.3)' },
    { icon: Camera, label: 'Камера', color: 'from-cyan-500/15 to-teal-500/10', glow: 'rgba(6,182,212,0.25)' },
    { icon: Clapperboard, label: 'Сцена', color: 'from-blue-500/15 to-sky-500/10', glow: 'rgba(59,130,246,0.25)' },
  ];

  return features.map((f, i) => ({
    icon: f.icon,
    label: f.label,
    x: (i % 4) * 25 + 5 + Math.random() * 15,
    y: Math.floor(i / 4) * 30 + 8 + Math.random() * 15,
    z: -100 - Math.random() * 300,
    rotateX: -15 + Math.random() * 30,
    rotateY: -20 + Math.random() * 40,
    size: 56 + Math.random() * 24,
    delay: i * 0.4 + Math.random() * 2,
    duration: 16 + Math.random() * 12,
    color: f.color,
    glow: f.glow,
  }));
}

function Scene3D({ mousePos }: { mousePos: { x: number; y: number } | null }) {
  const cards = useMemo(() => generate3DCards(), []);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!mousePos) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        setTiltX(0);
        setTiltY(0);
      });
      return;
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTiltY(((mousePos.x / w) - 0.5) * 8);
      setTiltX((0.5 - (mousePos.y / h)) * 6);
    });
  }, [mousePos]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Ambient gradient orbs */}
      <div className="absolute w-[600px] h-[600px] -top-[200px] -left-[200px] rounded-full bg-cyan-500/[0.04] dark:bg-cyan-400/[0.03] blur-[120px] animate-orbit-1" />
      <div className="absolute w-[500px] h-[500px] -bottom-[150px] -right-[150px] rounded-full bg-blue-500/[0.04] dark:bg-blue-400/[0.03] blur-[100px] animate-orbit-2" />
      <div className="absolute w-[400px] h-[400px] top-1/3 left-1/2 -translate-x-1/2 rounded-full bg-teal-500/[0.03] dark:bg-teal-400/[0.02] blur-[80px] animate-orbit-3" />

      {/* Grid floor */}
      <div
        className="absolute left-1/2 bottom-0 -translate-x-1/2 w-[200%] h-[50%] opacity-[0.04] dark:opacity-[0.06]"
        style={{
          perspective: '800px',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="w-full h-full"
          style={{
            transform: `rotateX(65deg) translateZ(-50px) rotateY(${tiltY * 0.3}deg)`,
            backgroundImage: `
              linear-gradient(rgba(6,182,212,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6,182,212,0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transition: 'transform 0.3s ease-out',
          }}
        />
      </div>

      {/* 3D Cards */}
      <div
        className="absolute inset-0"
        style={{
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`,
            transition: 'transform 0.4s cubic-bezier(0.33,1,0.68,1)',
          }}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              className="absolute animate-float-3d"
              style={{
                left: `${card.x}%`,
                top: `${card.y}%`,
                width: card.size,
                height: card.size,
                animationDuration: `${card.duration}s`,
                animationDelay: `${card.delay}s`,
                transform: `translateZ(${card.z}px) rotateX(${card.rotateX}deg) rotateY(${card.rotateY}deg)`,
                transformStyle: 'preserve-3d',
              }}
            >
              <div
                className={`w-full h-full rounded-2xl bg-gradient-to-br ${card.color} backdrop-blur-sm border border-white/[0.06] dark:border-white/[0.04] flex flex-col items-center justify-center gap-1.5 transition-shadow duration-500`}
                style={{
                  boxShadow: `0 8px 32px -8px ${card.glow}, inset 0 1px 0 rgba(255,255,255,0.05)`,
                  backfaceVisibility: 'hidden',
                }}
              >
                <card.icon
                  className="text-slate-500/60 dark:text-gray-400/50"
                  style={{ width: card.size * 0.35, height: card.size * 0.35 }}
                  strokeWidth={1.3}
                />
                <span
                  className="text-slate-500/50 dark:text-gray-500/40 font-medium select-none"
                  style={{ fontSize: Math.max(9, card.size * 0.16) }}
                >
                  {card.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating particles */}
      {Array.from({ length: typeof window !== 'undefined' && window.innerWidth < 640 ? 10 : 30 }).map((_, i) => (
        <div
          key={`p-${i}`}
          className="absolute rounded-full animate-particle"
          style={{
            width: 2 + Math.random() * 3,
            height: 2 + Math.random() * 3,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            background: `rgba(6,182,212,${0.15 + Math.random() * 0.2})`,
            animationDuration: `${8 + Math.random() * 16}s`,
            animationDelay: `${-Math.random() * 20}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function AnimatedBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mousePos = useMouseGlow(containerRef);
  const [reducedMotion, setReducedMotion] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  if (reducedMotion) {
    return (
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-blue-500/[0.03]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-0" style={{ pointerEvents: 'none' }}>
      <div className="absolute inset-0" style={{ pointerEvents: 'auto' }} />
      {!isMobile && <MouseSpotlight pos={mousePos} />}
      <Scene3D mousePos={isMobile ? null : mousePos} />
    </div>
  );
}
