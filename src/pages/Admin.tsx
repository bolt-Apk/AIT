import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import {
  Shield,
  Users,
  Image,
  MessageSquare,
  Volume2,
  Video,
  CreditCard,
  TrendingUp,
  UserPlus,
  Clock,
  Coins,
  Search,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Check,
  X,
  Trash2,
  ArrowUpDown,
  BarChart3,
  Activity,
  Loader2,
  RefreshCw,
  LogOut,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Bell,
  BellOff,
  Filter,
  Ban,
  ShieldCheck,
  Monitor,
  Smartphone,
  Eye,
  ChevronDown,
  ChevronUp,
  FileText,
  AudioLines,
  Headphones,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import AdminSupportChat, { useSupportUnread } from '@/components/AdminSupportChat';

interface DayDelta {
  users: number;
  generations: number;
  images: number;
  chats: number;
  tts: number;
  videos: number;
  payments: number;
  referrals: number;
}

interface Stats {
  totalUsers: number;
  totalGenerations: number;
  totalPayments: number;
  totalReferrals: number;
  totalChats: number;
  totalTTS: number;
  totalVideos: number;
  totalImages: number;
  totalPending: number;
  totalRevenue: number;
  totalTokensInSystem: number;
  newUsersToday: number;
  today?: DayDelta;
  yesterday?: DayDelta;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  tokens: number;
  referral_code: string;
  total_referral_earnings: number;
  imageCount: number;
  chatCount: number;
  ttsCount: number;
  videoCount: number;
  banned_at: string | null;
  ban_reason: string | null;
  is_online: boolean;
  device_type: string | null;
  last_seen: string | null;
}

interface UserGenerations {
  images: any[];
  videos: any[];
  chats: any[];
  tts: any[];
}

type SortField = 'email' | 'tokens' | 'created_at' | 'last_sign_in_at' | 'imageCount' | 'chatCount';
type SortDir = 'asc' | 'desc';

interface ModelCheck {
  id: string;
  name: string;
  category: 'chat' | 'image' | 'tts' | 'video';
  status: 'ok' | 'error' | 'timeout';
  latencyMs: number;
  error?: string;
}

interface HealthCheckResult {
  timestamp: string;
  total: number;
  ok: number;
  failed: number;
  results: ModelCheck[];
}

const USERS_PER_PAGE = 10;
const ALERT_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2Onp+dlZB9aV5dbn+RoaijmY19aF5gb4KUpaurpJmLe2lgX26ClaijmouAa2FebnqNo6yyrJ+TgG1jYHCAkqStsrKon5F/bWNhcICSpK6ysaqfkYBtY2FwgJKkrbKyqp+RgG1jYXCAkqStsrKqn5GAbWNhcH+SpK2ysqqfkYBtY2FwgJKkrbKyqp+Rf21jYXCAkqStsrKqn5GAbWNhcICSpK2ysqqfkX9tY2FwgJKkrQ==';

export default function AdminPanel() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'monitoring' | 'support'>('dashboard');
  const supportUnread = useSupportUnread();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthCategory, setHealthCategory] = useState<'all' | 'chat' | 'image' | 'tts' | 'video'>('all');
  const [healthFilter, setHealthFilter] = useState<'all' | 'failed'>('all');
  const [pushEnabled, setPushEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevFailedRef = useRef<Set<string>>(new Set());

  const [banModal, setBanModal] = useState<{ userId: string; email: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [genViewer, setGenViewer] = useState<{ userId: string; email: string } | null>(null);
  const [genData, setGenData] = useState<UserGenerations | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genTab, setGenTab] = useState<'images' | 'videos' | 'chats' | 'tts'>('images');
  const [userFilter, setUserFilter] = useState<'all' | 'online' | 'banned'>('all');
  const [freeMode, setFreeMode] = useState(false);
  const [freeModeLoading, setFreeModeLoading] = useState(false);

  const apiBase = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-data`;

  const getHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token || ''}`,
      'Content-Type': 'application/json',
    };
  }, []);

  useEffect(() => { checkAdmin(); }, [user]);

  useEffect(() => {
    supabase.from('app_settings').select('free_mode').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setFreeMode(data.free_mode === true);
    });
  }, []);

  const toggleFreeMode = async () => {
    setFreeModeLoading(true);
    const newVal = !freeMode;
    const { error } = await supabase.from('app_settings').update({ free_mode: newVal }).eq('id', 1);
    if (!error) setFreeMode(newVal);
    setFreeModeLoading(false);
  };

  const runHealthCheck = useCallback(async (cat?: string) => {
    setHealthLoading(true);
    try {
      const headers = await getHeaders();
      const checkCat = cat || healthCategory;
      const res = await fetch(`${apiBase.replace('admin-data', 'model-health-check')}?category=${checkCat}`, { headers });
      if (res.ok) {
        const data: HealthCheckResult = await res.json();
        setHealthResult(data);
        const newFailed = data.results.filter(r => r.status !== 'ok');
        const newFailedIds = new Set(newFailed.map(r => r.id));
        const brandNew = newFailed.filter(r => !prevFailedRef.current.has(r.id));
        if (brandNew.length > 0) {
          if (soundEnabled) {
            try { const audio = new Audio(ALERT_SOUND_URL); audio.volume = 0.6; audio.play().catch(() => {}); } catch {}
          }
          if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('Avirond: модели недоступны', {
              body: `${brandNew.length} модел${brandNew.length === 1 ? 'ь' : brandNew.length < 5 ? 'и' : 'ей'}: ${brandNew.slice(0, 3).map(m => m.id).join(', ')}${brandNew.length > 3 ? '...' : ''}`,
              icon: '/favicon.webp', tag: 'model-alert', requireInteraction: true,
            });
          }
        }
        prevFailedRef.current = newFailedIds;
      }
    } catch {}
    setHealthLoading(false);
  }, [healthCategory, soundEnabled, pushEnabled]);

  const requestPushPermission = useCallback(async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setPushEnabled(perm === 'granted');
  }, []);

  const checkAdmin = async () => {
    if (!user) return;
    const { data } = await supabase.from('admin_users').select('id').eq('id', user.id).maybeSingle();
    setIsAdmin(!!data);
    if (data) { loadStats(); } else { setLoading(false); }
  };

  const loadStats = async () => {
    setLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=stats`, { headers });
      if (res.ok) setStats(await res.json());
    } catch {}
    setLoading(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=users`, { headers });
      if (res.ok) setUsers(await res.json());
    } catch {}
    setUsersLoading(false);
  };

  useEffect(() => {
    if (isAdmin && activeTab === 'users' && users.length === 0) loadUsers();
  }, [isAdmin, activeTab]);

  const handleUpdateBalance = async (userId: string) => {
    const amount = parseFloat(editBalance);
    if (isNaN(amount) || amount < 0) return;
    setActionLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=update_balance`, { method: 'POST', headers, body: JSON.stringify({ userId, amount }) });
      if (res.ok) { setUsers(prev => prev.map(u => u.id === userId ? { ...u, tokens: amount } : u)); setEditingUser(null); }
    } catch {}
    setActionLoading(false);
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Удалить пользователя ${email}? Это действие необратимо.`)) return;
    setActionLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=delete_user`, { method: 'POST', headers, body: JSON.stringify({ userId }) });
      if (res.ok) { setUsers(prev => prev.filter(u => u.id !== userId)); loadStats(); }
    } catch {}
    setActionLoading(false);
  };

  const handleBanUser = async () => {
    if (!banModal) return;
    setActionLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=ban_user`, {
        method: 'POST', headers,
        body: JSON.stringify({ userId: banModal.userId, reason: banReason || 'Нарушение правил' }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === banModal.userId
          ? { ...u, banned_at: new Date().toISOString(), ban_reason: banReason || 'Нарушение правил' }
          : u
        ));
        setBanModal(null);
        setBanReason('');
      }
    } catch {}
    setActionLoading(false);
  };

  const handleUnbanUser = async (userId: string) => {
    setActionLoading(true);
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=unban_user`, { method: 'POST', headers, body: JSON.stringify({ userId }) });
      if (res.ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, banned_at: null, ban_reason: null } : u));
    } catch {}
    setActionLoading(false);
  };

  const loadGenerations = async (userId: string, email: string) => {
    setGenViewer({ userId, email });
    setGenLoading(true);
    setGenData(null);
    setGenTab('images');
    try {
      const headers = await getHeaders();
      const res = await fetch(`${apiBase}?action=user_generations&userId=${userId}`, { headers });
      if (res.ok) setGenData(await res.json());
    } catch {}
    setGenLoading(false);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
    setPage(0);
  };

  const onlineCount = users.filter(u => u.is_online).length;
  const bannedCount = users.filter(u => u.banned_at).length;

  const filteredUsers = users
    .filter(u => {
      if (userFilter === 'online' && !u.is_online) return false;
      if (userFilter === 'banned' && !u.banned_at) return false;
      return u.email?.toLowerCase().includes(search.toLowerCase());
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const pagedUsers = filteredUsers.slice(page * USERS_PER_PAGE, (page + 1) * USERS_PER_PAGE);

  if (isAdmin === null || loading) {
    return (
      <div className="h-[100dvh] bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-[100dvh] bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Доступ запрещён</h1>
          <p className="text-gray-400 mb-6">У вас нет прав администратора.</p>
          <a href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">Вернуться на главную</a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-gray-950 flex flex-col overflow-hidden">
      <header className="shrink-0 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 pt-[var(--sat)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">Админ-панель</h1>
              <p className="text-xs text-gray-500">AVIROND.COM</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onlineCount > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {onlineCount} онлайн
              </div>
            )}
            <button
              onClick={() => { loadStats(); if (activeTab === 'users') loadUsers(); }}
              className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
              title="Обновить"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href="/" className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800" title="На сайт">
              <LogOut className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-4 w-full">
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 w-fit overflow-x-auto">
          {[
            { id: 'dashboard' as const, icon: BarChart3, label: 'Статистика' },
            { id: 'users' as const, icon: Users, label: 'Пользователи' },
            { id: 'support' as const, icon: Headphones, label: 'Поддержка' },
            { id: 'monitoring' as const, icon: Wifi, label: 'Мониторинг' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'monitoring' && healthResult && healthResult.failed > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">{healthResult.failed}</span>
              )}
              {tab.id === 'support' && supportUnread > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full">{supportUnread}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {activeTab === 'dashboard' && stats && (
            <>
              <div className="mb-6 bg-gray-900 border border-gray-800/60 rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">Бесплатный режим</h3>
                    <p className="text-gray-500 text-xs mt-0.5">Все модели бесплатны для всех пользователей. Баланс не списывается.</p>
                  </div>
                  <button
                    onClick={toggleFreeMode}
                    disabled={freeModeLoading}
                    className={`transition-colors ${freeMode ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-gray-400'}`}
                  >
                    {freeMode ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                  </button>
                </div>
                {freeMode && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-xs text-emerald-400">Бесплатный режим активен. Генерации не списывают баланс.</span>
                  </div>
                )}
              </div>
              <DashboardView stats={stats} onNavigate={setActiveTab} />
            </>
          )}
          {activeTab === 'users' && (
            <UsersView
              users={pagedUsers}
              allCount={filteredUsers.length}
              loading={usersLoading}
              search={search}
              onSearchChange={setSearch}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              sortField={sortField}
              sortDir={sortDir}
              onToggleSort={toggleSort}
              editingUser={editingUser}
              editBalance={editBalance}
              onStartEdit={(id, tokens) => { setEditingUser(id); setEditBalance(String(tokens)); }}
              onCancelEdit={() => setEditingUser(null)}
              onEditBalanceChange={setEditBalance}
              onSaveBalance={handleUpdateBalance}
              onDeleteUser={handleDeleteUser}
              actionLoading={actionLoading}
              onBanUser={(id, email) => { setBanModal({ userId: id, email }); setBanReason(''); }}
              onUnbanUser={handleUnbanUser}
              onViewGenerations={loadGenerations}
              userFilter={userFilter}
              onUserFilterChange={(f) => { setUserFilter(f); setPage(0); }}
              onlineCount={onlineCount}
              bannedCount={bannedCount}
            />
          )}
          {activeTab === 'support' && <AdminSupportChat />}
          {activeTab === 'monitoring' && (
            <MonitoringView
              result={healthResult} loading={healthLoading} category={healthCategory}
              filter={healthFilter} onCategoryChange={(c) => { setHealthCategory(c); runHealthCheck(c); }}
              onFilterChange={setHealthFilter} onRunCheck={() => runHealthCheck()}
              pushEnabled={pushEnabled} soundEnabled={soundEnabled}
              onTogglePush={() => { if (!pushEnabled) requestPushPermission(); else setPushEnabled(false); }}
              onToggleSound={() => setSoundEnabled(p => !p)}
            />
          )}
        </main>
      </div>

      {/* Ban modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                <Ban className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Заблокировать</h3>
                <p className="text-sm text-gray-400">{banModal.email}</p>
              </div>
            </div>
            <label className="block text-sm text-gray-300 mb-1.5">Причина блокировки</label>
            <textarea
              value={banReason}
              onChange={e => setBanReason(e.target.value)}
              rows={3}
              placeholder="Нарушение правил, спам, злоупотребление..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-red-500/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setBanModal(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleBanUser}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                Заблокировать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generations viewer */}
      {genViewer && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/60">
              <div>
                <h3 className="text-lg font-bold text-white">Генерации пользователя</h3>
                <p className="text-sm text-gray-400">{genViewer.email}</p>
              </div>
              <button onClick={() => setGenViewer(null)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 px-5 pt-3 overflow-x-auto">
              {([
                { id: 'images' as const, icon: Image, label: 'Изображения', count: genData?.images.length },
                { id: 'videos' as const, icon: Video, label: 'Видео', count: genData?.videos.length },
                { id: 'chats' as const, icon: MessageSquare, label: 'Чаты', count: genData?.chats.length },
                { id: 'tts' as const, icon: AudioLines, label: 'Озвучка', count: genData?.tts.length },
              ]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setGenTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    genTab === t.id ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                  {t.count != null && <span className="text-[10px] text-gray-500">({t.count})</span>}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {genLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
                </div>
              ) : !genData ? (
                <p className="text-center text-gray-500 py-12">Нет данных</p>
              ) : (
                <GenerationsContent data={genData} tab={genTab} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GenerationsContent({ data, tab }: { data: UserGenerations; tab: string }) {
  const formatDate = (d: string) => new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  if (tab === 'images') {
    if (data.images.length === 0) return <EmptyState text="Нет изображений" />;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {data.images.map((img: any, i: number) => (
          <div key={i} className="rounded-xl bg-gray-800 border border-gray-700/60 overflow-hidden group">
            {img.image_url && (
              <div className="aspect-square bg-gray-800">
                <img src={img.image_url} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-2.5">
              <p className="text-[11px] text-gray-400 line-clamp-2 mb-1">{img.prompt || img.model || '---'}</p>
              <p className="text-[10px] text-gray-600">{img.model} -- {formatDate(img.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'videos') {
    if (data.videos.length === 0) return <EmptyState text="Нет видео" />;
    return (
      <div className="space-y-3">
        {data.videos.map((v: any, i: number) => (
          <div key={i} className="rounded-xl bg-gray-800 border border-gray-700/60 p-3 flex items-start gap-3">
            <div className="shrink-0 w-16 h-16 rounded-lg bg-gray-700 flex items-center justify-center">
              {v.result_url ? (
                <video src={v.result_url} className="w-full h-full object-cover rounded-lg" muted />
              ) : (
                <Video className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-300 line-clamp-2 mb-1">{v.prompt || '---'}</p>
              <p className="text-[10px] text-gray-500">{v.model} -- {v.status} -- {formatDate(v.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'chats') {
    if (data.chats.length === 0) return <EmptyState text="Нет чатов" />;
    return (
      <div className="space-y-2">
        {data.chats.map((c: any, i: number) => (
          <div key={i} className="rounded-xl bg-gray-800 border border-gray-700/60 p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-300">{c.title || 'Чат'}</span>
              <span className="text-[10px] text-gray-600">{formatDate(c.created_at)}</span>
            </div>
            <p className="text-[11px] text-gray-500">{c.model || '---'} -- {c.message_count || 0} сообщений</p>
          </div>
        ))}
      </div>
    );
  }

  if (tab === 'tts') {
    if (data.tts.length === 0) return <EmptyState text="Нет озвучек" />;
    return (
      <div className="space-y-2">
        {data.tts.map((t: any, i: number) => (
          <div key={i} className="rounded-xl bg-gray-800 border border-gray-700/60 p-3">
            <p className="text-xs text-gray-300 line-clamp-2 mb-1">{t.text || '---'}</p>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">{t.model} -- {t.voice} -- {formatDate(t.created_at)}</p>
              {t.audio_url && (
                <audio src={t.audio_url} controls className="h-7 max-w-[160px]" />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-center text-gray-600 py-12 text-sm">{text}</p>;
}

function DashboardView({ stats, onNavigate }: { stats: Stats; onNavigate: (tab: 'users' | 'monitoring' | 'support') => void }) {
  const t = stats.today;
  const y = stats.yesterday;

  const cards: { label: string; value: number | string; icon: typeof Users; color: string; todayVal?: number; yesterdayVal?: number; onClick?: () => void; alert?: boolean }[] = [
    { label: 'Пользователи', value: stats.totalUsers, icon: Users, color: 'from-cyan-500 to-blue-500', todayVal: t?.users, yesterdayVal: y?.users, onClick: () => onNavigate('users') },
    { label: 'Новые сегодня', value: stats.newUsersToday, icon: UserPlus, color: 'from-green-500 to-emerald-500', todayVal: t?.users, yesterdayVal: y?.users, onClick: () => onNavigate('users') },
    { label: 'Генерации', value: stats.totalGenerations, icon: Activity, color: 'from-violet-500 to-purple-500', todayVal: t?.generations, yesterdayVal: y?.generations },
    { label: 'Изображения', value: stats.totalImages, icon: Image, color: 'from-rose-500 to-pink-500', todayVal: t?.images, yesterdayVal: y?.images },
    { label: 'Чат-сессии', value: stats.totalChats, icon: MessageSquare, color: 'from-amber-500 to-orange-500', todayVal: t?.chats, yesterdayVal: y?.chats },
    { label: 'Озвучки (TTS)', value: stats.totalTTS, icon: Volume2, color: 'from-teal-500 to-cyan-500', todayVal: t?.tts, yesterdayVal: y?.tts },
    { label: 'Видео', value: stats.totalVideos, icon: Video, color: 'from-indigo-500 to-blue-500', todayVal: t?.videos, yesterdayVal: y?.videos },
    { label: 'В очереди', value: stats.totalPending, icon: Clock, color: 'from-gray-500 to-gray-600', alert: stats.totalPending > 10, onClick: () => onNavigate('monitoring') },
    { label: 'Оплаты', value: stats.totalPayments, icon: CreditCard, color: 'from-green-500 to-teal-500', todayVal: t?.payments, yesterdayVal: y?.payments },
    { label: 'Доход (руб.)', value: `${stats.totalRevenue.toLocaleString('ru-RU')} \u20BD`, icon: TrendingUp, color: 'from-yellow-500 to-amber-500' },
    { label: 'Токенов в системе', value: `${stats.totalTokensInSystem.toLocaleString('ru-RU')} \u20BD`, icon: Coins, color: 'from-blue-500 to-cyan-500' },
    { label: 'Рефералы', value: stats.totalReferrals, icon: UserPlus, color: 'from-pink-500 to-rose-500', todayVal: t?.referrals, yesterdayVal: y?.referrals },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {cards.map((card) => {
        const todayN = card.todayVal ?? 0;
        const yesterdayN = card.yesterdayVal ?? 0;
        const diff = todayN - yesterdayN;
        const showDelta = card.todayVal !== undefined;

        return (
          <div
            key={card.label}
            onClick={card.onClick}
            className={`bg-gray-900 border rounded-2xl p-5 transition-all group ${
              card.alert ? 'border-amber-500/50 hover:border-amber-400/70' : 'border-gray-800/60 hover:border-gray-700/60'
            } ${card.onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg opacity-90 group-hover:opacity-100 transition-opacity`}>
                <card.icon className="w-5 h-5 text-white" />
              </div>
              {showDelta && (
                <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  diff > 0 ? 'text-emerald-400 bg-emerald-500/10' : diff < 0 ? 'text-red-400 bg-red-500/10' : 'text-gray-500 bg-gray-800'
                }`}>
                  {diff > 0 ? (
                    <><ChevronUp className="w-3 h-3" />+{todayN}</>
                  ) : diff < 0 ? (
                    <><ChevronDown className="w-3 h-3" />{todayN}</>
                  ) : (
                    <span>{todayN}</span>
                  )}
                  <span className="ml-0.5 text-[10px] opacity-60">сег.</span>
                </div>
              )}
              {card.alert && (
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                </div>
              )}
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {typeof card.value === 'number' ? card.value.toLocaleString('ru-RU') : card.value}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">{card.label}</span>
              {showDelta && yesterdayN > 0 && (
                <span className="text-[10px] text-gray-600">вчера: {yesterdayN}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface UsersViewProps {
  users: AdminUser[];
  allCount: number;
  loading: boolean;
  search: string;
  onSearchChange: (s: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  sortField: SortField;
  sortDir: SortDir;
  onToggleSort: (f: SortField) => void;
  editingUser: string | null;
  editBalance: string;
  onStartEdit: (id: string, tokens: number) => void;
  onCancelEdit: () => void;
  onEditBalanceChange: (s: string) => void;
  onSaveBalance: (userId: string) => void;
  onDeleteUser: (userId: string, email: string) => void;
  actionLoading: boolean;
  onBanUser: (id: string, email: string) => void;
  onUnbanUser: (id: string) => void;
  onViewGenerations: (id: string, email: string) => void;
  userFilter: 'all' | 'online' | 'banned';
  onUserFilterChange: (f: 'all' | 'online' | 'banned') => void;
  onlineCount: number;
  bannedCount: number;
}

function UsersView({
  users, allCount, loading, search, onSearchChange,
  page, totalPages, onPageChange,
  sortField, sortDir, onToggleSort,
  editingUser, editBalance, onStartEdit, onCancelEdit, onEditBalanceChange,
  onSaveBalance, onDeleteUser, actionLoading,
  onBanUser, onUnbanUser, onViewGenerations,
  userFilter, onUserFilterChange, onlineCount, bannedCount,
}: UsersViewProps) {
  const formatDate = (d: string | null) => {
    if (!d) return '---';
    return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const SortBtn = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button onClick={() => onToggleSort(field)} className="flex items-center gap-1 hover:text-gray-200 transition-colors">
      {children}
      <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-cyan-400' : 'text-gray-600'}`} />
    </button>
  );

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Поиск по email..."
            value={search}
            onChange={(e) => { onSearchChange(e.target.value); onPageChange(0); }}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          {[
            { id: 'all' as const, label: 'Все', count: null },
            { id: 'online' as const, label: 'Онлайн', count: onlineCount },
            { id: 'banned' as const, label: 'Заблокированы', count: bannedCount },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => onUserFilterChange(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                userFilter === f.id
                  ? f.id === 'banned'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : f.id === 'online'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-gray-800 border-gray-700 text-white'
                  : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.label}
              {f.count != null && f.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  f.id === 'online' ? 'bg-emerald-500/20 text-emerald-400' :
                  f.id === 'banned' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-300'
                }`}>{f.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-500">{allCount} пользовател{allCount === 1 ? 'ь' : allCount < 5 ? 'я' : 'ей'}</p>

      <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="text-left text-gray-400 font-medium px-4 py-3 w-8"></th>
                <th className="text-left text-gray-400 font-medium px-4 py-3"><SortBtn field="email">Email</SortBtn></th>
                <th className="text-left text-gray-400 font-medium px-4 py-3"><SortBtn field="tokens">Баланс</SortBtn></th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell"><SortBtn field="imageCount">Изобр.</SortBtn></th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell"><SortBtn field="chatCount">Чаты</SortBtn></th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">TTS</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Видео</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3 hidden sm:table-cell"><SortBtn field="created_at">Рег.</SortBtn></th>
                <th className="text-right text-gray-400 font-medium px-4 py-3">Действия</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b border-gray-800/30 transition-colors ${u.banned_at ? 'bg-red-500/5' : 'hover:bg-gray-800/30'}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {u.is_online ? (
                        <div className="relative" title={`Онлайн (${u.device_type === 'mobile' ? 'телефон' : 'компьютер'})`}>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
                          <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-40" />
                        </div>
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-gray-700 block" title="Оффлайн" />
                      )}
                      {u.is_online && u.device_type && (
                        u.device_type === 'mobile'
                          ? <Smartphone className="w-3 h-3 text-gray-500" />
                          : <Monitor className="w-3 h-3 text-gray-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium truncate max-w-[180px] ${u.banned_at ? 'text-red-400 line-through' : 'text-white'}`}>
                        {u.email}
                      </span>
                      {u.banned_at && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400 uppercase">
                          бан
                        </span>
                      )}
                    </div>
                    {u.ban_reason && (
                      <p className="text-[10px] text-red-400/70 truncate max-w-[180px] mt-0.5">{u.ban_reason}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingUser === u.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editBalance}
                          onChange={(e) => onEditBalanceChange(e.target.value)}
                          className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                        <button onClick={() => onSaveBalance(u.id)} disabled={actionLoading} className="p-1 text-green-400 hover:text-green-300 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={onCancelEdit} className="p-1 text-gray-400 hover:text-gray-200 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-cyan-400 font-medium">{u.tokens.toLocaleString('ru-RU')} ₽</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{u.imageCount}</td>
                  <td className="px-4 py-3 text-gray-300 hidden md:table-cell">{u.chatCount}</td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{u.ttsCount}</td>
                  <td className="px-4 py-3 text-gray-300 hidden lg:table-cell">{u.videoCount}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell text-xs">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        onClick={() => onViewGenerations(u.id, u.email || '')}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-all"
                        title="Смотреть генерации"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onStartEdit(u.id, u.tokens)}
                        className="p-1.5 text-gray-400 hover:text-cyan-400 hover:bg-gray-800 rounded-lg transition-all"
                        title="Изменить баланс"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      {u.banned_at ? (
                        <button
                          onClick={() => onUnbanUser(u.id)}
                          disabled={actionLoading}
                          className="p-1.5 text-emerald-500 hover:text-emerald-400 hover:bg-gray-800 rounded-lg transition-all"
                          title="Разблокировать"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onBanUser(u.id, u.email || '')}
                          disabled={actionLoading}
                          className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-gray-800 rounded-lg transition-all"
                          title="Заблокировать"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onDeleteUser(u.id, u.email || '')}
                        disabled={actionLoading}
                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all"
                        title="Удалить пользователя"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Пользователи не найдены</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800/60">
            <span className="text-sm text-gray-500">Страница {page + 1} из {totalPages}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => onPageChange(page - 1)} disabled={page === 0} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_LABELS: Record<string, string> = { all: 'Все', chat: 'Чат', image: 'Изображения', tts: 'Озвучка', video: 'Видео' };

interface MonitoringViewProps {
  result: HealthCheckResult | null;
  loading: boolean;
  category: string;
  filter: 'all' | 'failed';
  onCategoryChange: (c: 'all' | 'chat' | 'image' | 'tts' | 'video') => void;
  onFilterChange: (f: 'all' | 'failed') => void;
  onRunCheck: () => void;
  pushEnabled: boolean;
  soundEnabled: boolean;
  onTogglePush: () => void;
  onToggleSound: () => void;
}

function MonitoringView({
  result, loading, category, filter,
  onCategoryChange, onFilterChange, onRunCheck,
  pushEnabled, soundEnabled, onTogglePush, onToggleSound,
}: MonitoringViewProps) {
  const displayed = result?.results.filter(r => filter === 'failed' ? r.status !== 'ok' : true) || [];
  const statusCounts = result ? {
    ok: result.results.filter(r => r.status === 'ok').length,
    error: result.results.filter(r => r.status === 'error').length,
    timeout: result.results.filter(r => r.status === 'timeout').length,
  } : null;

  return (
    <div className="space-y-6">
      {result && result.failed > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex items-start gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-red-400 mb-1">
              {result.failed} модел{result.failed === 1 ? 'ь' : result.failed < 5 ? 'и' : 'ей'} недоступн{result.failed === 1 ? 'а' : 'ы'}
            </h3>
            <p className="text-sm text-red-300/70">
              {result.results.filter(r => r.status !== 'ok').slice(0, 5).map(r => r.id).join(', ')}
              {result.failed > 5 && ` и ещё ${result.failed - 5}`}
            </p>
            <p className="text-xs text-gray-500 mt-2">Проверено: {new Date(result.timestamp).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</p>
          </div>
        </div>
      )}

      {result && result.failed === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emerald-400">Все модели работают</h3>
            <p className="text-xs text-gray-500 mt-1">
              Проверено {result.total} модел{result.total === 1 ? 'ь' : result.total < 5 ? 'и' : 'ей'} -- {new Date(result.timestamp).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onRunCheck}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-cyan-600/20"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {loading ? 'Проверка...' : 'Запустить проверку'}
        </button>

        <div className="flex items-center bg-gray-900 rounded-xl p-1 gap-0.5">
          {(Object.keys(CATEGORY_LABELS) as Array<'all' | 'chat' | 'image' | 'tts' | 'video'>).map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${category === cat ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        <button
          onClick={() => onFilterChange(filter === 'all' ? 'failed' : 'all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            filter === 'failed' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          Только ошибки
        </button>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={onToggleSound}
            className={`p-2 rounded-xl border transition-all ${soundEnabled ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
            title={soundEnabled ? 'Звук включён' : 'Звук выключен'}
          >
            <Volume2 className="w-4 h-4" />
          </button>
          <button
            onClick={onTogglePush}
            className={`p-2 rounded-xl border transition-all ${pushEnabled ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'bg-gray-900 border-gray-800 text-gray-600'}`}
            title={pushEnabled ? 'Push-уведомления включены' : 'Push-уведомления выключены'}
          >
            {pushEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {statusCounts && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-900 border border-gray-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{statusCounts.ok}</div>
            <div className="text-xs text-gray-500 mt-1">Работают</div>
          </div>
          <div className="bg-gray-900 border border-gray-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-400">{statusCounts.error}</div>
            <div className="text-xs text-gray-500 mt-1">Ошибки</div>
          </div>
          <div className="bg-gray-900 border border-gray-800/60 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{statusCounts.timeout}</div>
            <div className="text-xs text-gray-500 mt-1">Таймаут</div>
          </div>
        </div>
      )}

      {!result && !loading && (
        <div className="text-center py-20">
          <Wifi className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Нажмите "Запустить проверку" для мониторинга моделей</p>
        </div>
      )}

      {loading && !result && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <p className="text-gray-500 text-sm">Проверка моделей... Это может занять некоторое время</p>
        </div>
      )}

      {displayed.length > 0 && (
        <div className="bg-gray-900 border border-gray-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800/60">
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Статус</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3">Модель</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden sm:table-cell">Категория</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden md:table-cell">Задержка</th>
                  <th className="text-left text-gray-400 font-medium px-4 py-3 hidden lg:table-cell">Ошибка</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((m) => (
                  <tr key={m.id} className={`border-b border-gray-800/30 transition-colors ${m.status !== 'ok' ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-gray-800/30'}`}>
                    <td className="px-4 py-3">
                      {m.status === 'ok' ? (
                        <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="w-4 h-4" /> OK</span>
                      ) : m.status === 'timeout' ? (
                        <span className="flex items-center gap-1.5 text-amber-400"><Timer className="w-4 h-4" /> Таймаут</span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-red-400"><WifiOff className="w-4 h-4" /> Ошибка</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-white">{m.id}</td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${
                        m.category === 'chat' ? 'bg-blue-500/10 text-blue-400' :
                        m.category === 'image' ? 'bg-pink-500/10 text-pink-400' :
                        m.category === 'tts' ? 'bg-teal-500/10 text-teal-400' : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {CATEGORY_LABELS[m.category]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      <span className={`${m.latencyMs > 10000 ? 'text-amber-400' : m.latencyMs > 5000 ? 'text-yellow-500' : 'text-gray-400'}`}>
                        {(m.latencyMs / 1000).toFixed(1)}с
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs hidden lg:table-cell max-w-xs truncate">{m.error || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
