import { useEffect, useState } from 'react';
import { Check, Sparkles, MessageCircle, Image, Video, Mic } from 'lucide-react';

const FEATURES = [
  { icon: MessageCircle, label: '17 чат-моделей', desc: 'GPT 5, Claude Opus 5, Gemini, Grok, DeepSeek' },
  { icon: Image, label: '14 моделей изображений', desc: 'GPT Image 2, Flux.2 Max, Recraft, Seedream' },
  { icon: Video, label: '13 видеомоделей', desc: 'Veo 3.1, Sora 2 Pro, Kling 3.0, Seedance' },
  { icon: Mic, label: '15 моделей озвучки', desc: 'GPT-4o Mini TTS, Gemini TTS, Grok Voice' },
];

export default function EmailVerified({ onContinue }: { onContinue: () => void }) {
  const [visible, setVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => setFeaturesVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 flex items-center justify-center px-5 py-10 overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/[0.06] dark:bg-emerald-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/[0.05] dark:bg-cyan-500/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className={`relative z-10 w-full max-w-md space-y-8 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* 3D Success Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-[2rem] bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 shadow-2xl shadow-emerald-500/30 flex items-center justify-center transform rotate-[-6deg] hover:rotate-0 transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                boxShadow: '0 20px 60px -12px rgba(16, 185, 129, 0.35), 0 8px 20px -6px rgba(16, 185, 129, 0.2), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 0 rgba(0,0,0,0.1)',
              }}
            >
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-t from-transparent via-white/10 to-white/20 pointer-events-none" />
              <Check className="w-14 h-14 sm:w-16 sm:h-16 text-white drop-shadow-lg" strokeWidth={2.5} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-500/30 flex items-center justify-center transform rotate-12"
              style={{
                boxShadow: '0 8px 24px -4px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Аккаунт активирован
          </h1>
          <p className="text-sm sm:text-base text-slate-500 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">
            Ваша почта подтверждена. Вам доступны все <span className="font-semibold text-slate-700 dark:text-gray-200">88 ИИ-моделей</span> для любых творческих задач.
          </p>
        </div>

        {/* Feature cards */}
        <div className={`grid grid-cols-2 gap-3 transition-all duration-700 delay-200 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          {FEATURES.map((f, i) => (
            <div
              key={f.label}
              className="bg-white/70 dark:bg-gray-900/50 backdrop-blur-sm border border-white/30 dark:border-gray-800/50 rounded-2xl p-4 space-y-2"
              style={{ transitionDelay: `${200 + i * 80}ms` }}
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center">
                <f.icon className="w-4.5 h-4.5 text-cyan-500 dark:text-cyan-400" strokeWidth={1.5} />
              </div>
              <p className="text-xs font-semibold text-slate-800 dark:text-white leading-snug">{f.label}</p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={onContinue}
          className="w-full flex items-center justify-center gap-2 py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-sm sm:text-base shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:brightness-110 active:scale-[0.98] transition-all duration-200"
        >
          Начать создавать
        </button>

        <p className="text-center text-[11px] text-slate-400 dark:text-gray-600">
          Добро пожаловать в AviRond
        </p>
      </div>
    </div>
  );
}
