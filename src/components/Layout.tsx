import { ReactNode, useEffect, useRef } from 'react';
import AnimatedBackground from '@/components/AnimatedBackground';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad|iPod|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

function usePresenceHeartbeat() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = async () => {
      const deviceType = detectDeviceType();
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        last_seen: new Date().toISOString(),
        device_type: deviceType,
        user_agent: navigator.userAgent.slice(0, 255),
      }, { onConflict: 'user_id' });
    };

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, 60_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);
}

export default function Layout({ children }: { children: ReactNode }) {
  usePresenceHeartbeat();

  return (
    <div className="relative h-dvh-safe bg-slate-50 dark:bg-gray-950 text-slate-800 dark:text-gray-100 overflow-hidden">
      <AnimatedBackground />

      <div className="relative z-10 h-full max-w-[988px] mx-auto flex flex-col">
        <main className="relative z-10 h-full overflow-y-auto min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
