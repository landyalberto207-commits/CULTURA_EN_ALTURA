import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3, CheckCircle2, Clock3, Eye, Film, LayoutDashboard,
  Loader2, LogOut, ShieldCheck, Star, Trash2,
  TrendingUp, UserCircle2, Users, Video, XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

interface AdminPortalPageProps {
  currentUserId: string | null;
  onNavigate?: (to: string) => void;
}

/* ── Types ─── */
type ModerationVideo = {
  id: string; user_id: string; title: string; description: string | null;
  video_url: string; thumbnail_url: string | null;
  duration_secs: number | null; size_bytes: number | null;
  is_approved: boolean; moderation_status: string;
  views_count: number; created_at: string;
};
type ProfileRow = { id: string; full_name: string | null; email: string | null; is_admin: boolean; created_at: string; };
type TourRating = { id: string; user_id: string; tour_name: string; rating: number; created_at: string; };
type Tab = 'dashboard' | 'moderation' | 'users' | 'content' | 'ratings';

/* ── Helpers ─── */
const fmtDur = (s: number | null) => { if (!s) return '0:00'; return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`; };
const fmtBytes = (b: number | null) => b ? `${(b / 1048576).toFixed(1)} MB` : '0 MB';
const fmtRel = (d: string) => formatDistanceToNow(new Date(d), { addSuffix: true, locale: es });

/* ── Glass card ─── */
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-white/[0.08] bg-white/[0.025] ${className}`}>{children}</div>
);

const StatCard = ({ icon: Icon, label, value, accent = 'white' }: { icon: any; label: string; value: string | number; accent?: string }) => {
  const colorMap: Record<string, string> = {
    amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/15 text-amber-300',
    emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/15 text-emerald-300',
    red: 'from-red-500/20 to-red-600/5 border-red-500/15 text-red-300',
    blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/15 text-blue-300',
    purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/15 text-purple-300',
    white: 'from-white/[0.06] to-white/[0.02] border-white/[0.08] text-white/70',
  };
  const c = colorMap[accent] || colorMap.white;
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br p-4 md:p-5 ${c}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-4 h-4 opacity-60" />
        <span className="museo-label text-[8px] md:text-[9px] tracking-[0.18em] opacity-50 uppercase">{label}</span>
      </div>
      <p className="museo-headline text-white text-2xl md:text-3xl">{value}</p>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════ */
const AdminPortalPage = ({ currentUserId, onNavigate }: AdminPortalPageProps) => {
  const [tab, setTab] = useState<Tab>('dashboard');

  /* ── Data ── */
  const [videos, setVideos] = useState<ModerationVideo[]>([]);
  const [allVideos, setAllVideos] = useState<ModerationVideo[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [ratings, setRatings] = useState<TourRating[]>([]);

  /* ── Fetch all data ── */
  const fetchAll = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [vidsRes, allVidsRes, profsRes, ratingsRes] = await Promise.all([
        supabase.from('community_videos').select('*').eq('is_approved', false).order('created_at', { ascending: false }).limit(60),
        supabase.from('community_videos').select('*').order('created_at', { ascending: false }).limit(200),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('tour_ratings').select('*').order('created_at', { ascending: false }),
      ]);
      if (vidsRes.error) throw vidsRes.error;
      if (allVidsRes.error) throw allVidsRes.error;
      if (profsRes.error) throw profsRes.error;

      setVideos((vidsRes.data || []) as ModerationVideo[]);
      setAllVideos((allVidsRes.data || []) as ModerationVideo[]);
      const profs = (profsRes.data || []) as ProfileRow[];
      setProfiles(profs);
      setProfileMap(profs.reduce((a, p) => { a[p.id] = p.full_name || 'Usuario'; return a; }, {} as Record<string, string>));
      setRatings((ratingsRes.data || []) as TourRating[]);
    } catch (e: any) { setError(e?.message || 'Error cargando datos.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Actions ── */
  const approve = async (id: string) => {
    setActingId(id);
    try {
      const { error } = await supabase.from('community_videos')
        .update({ is_approved: true, moderation_status: 'approved', reviewed_by: currentUserId, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setVideos(v => v.filter(x => x.id !== id));
      setAllVideos(v => v.map(x => x.id === id ? { ...x, is_approved: true, moderation_status: 'approved' } : x));
    } catch (e: any) { setError(e?.message); }
    finally { setActingId(null); }
  };

  const reject = async (id: string) => {
    if (!confirm('¿Rechazar este video?')) return;
    setActingId(id);
    try {
      const { error } = await supabase.from('community_videos')
        .update({ moderation_status: 'rejected', reviewed_by: currentUserId, reviewed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setVideos(v => v.filter(x => x.id !== id));
      setAllVideos(v => v.map(x => x.id === id ? { ...x, moderation_status: 'rejected' } : x));
    } catch (e: any) { setError(e?.message); }
    finally { setActingId(null); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onNavigate?.('/');
  };

  /* ── Stats ── */
  const totalVideos = allVideos.length;
  const approvedVideos = allVideos.filter(v => v.is_approved || v.moderation_status === 'approved').length;
  const rejectedVideos = allVideos.filter(v => !v.is_approved && v.moderation_status === 'rejected').length;
  const pendingCount = allVideos.filter(v => !v.is_approved && v.moderation_status !== 'rejected').length;
  const totalUsers = profiles.length;
  const totalViews = allVideos.reduce((a, v) => a + (v.views_count || 0), 0);

  /* ── Top contributors (users with most approved videos) ── */
  const topContributors = useMemo(() => {
    const countMap: Record<string, number> = {};
    allVideos.filter(v => v.is_approved).forEach(v => { countMap[v.user_id] = (countMap[v.user_id] || 0) + 1; });
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([uid, count]) => ({ uid, name: profileMap[uid] || 'Usuario', count }));
  }, [allVideos, profileMap]);

  /* ── Recent activity ── */
  const recentVideos = useMemo(() => allVideos.slice(0, 8), [allVideos]);

  /* ── Rating stats ── */
  const TOUR_LABELS: Record<string, string> = { catedral: 'Catedral', ferrocarril: 'Ferrocarril', piramides: 'Pirámides' };
  const tourRatingStats = useMemo(() => {
    const tours = ['catedral', 'ferrocarril', 'piramides'] as const;
    return tours.map(t => {
      const tr = ratings.filter(r => r.tour_name === t);
      const avg = tr.length ? tr.reduce((a, r) => a + r.rating, 0) / tr.length : 0;
      const dist = [0, 0, 0, 0, 0];
      tr.forEach(r => { dist[r.rating - 1]++; });
      return { name: t, label: TOUR_LABELS[t], count: tr.length, avg, dist };
    });
  }, [ratings]);
  const totalRatings = ratings.length;
  const globalAvg = totalRatings ? ratings.reduce((a, r) => a + r.rating, 0) / totalRatings : 0;

  const TABS: { key: Tab; icon: any; label: string }[] = [
    { key: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { key: 'moderation', icon: ShieldCheck, label: 'Moderación' },
    { key: 'ratings', icon: Star, label: 'Reseñas' },
    { key: 'users', icon: Users, label: 'Usuarios' },
    { key: 'content', icon: Film, label: 'Contenido' },
  ];

  return (
    <main className="relative min-h-screen bg-[#0e0c09]">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#1a1510] via-[#0e0c09] to-[#0a0908] pointer-events-none" />

      {/* ── Sidebar ── */}
      <aside className="fixed top-0 left-0 bottom-0 w-16 md:w-56 z-50 bg-[#141210]/80 backdrop-blur-2xl border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="px-3 md:px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/20 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-4 h-4 text-amber-300" />
            </div>
            <div className="hidden md:block">
              <p className="museo-headline text-white text-sm leading-none">Admin</p>
              <p className="museo-body text-white/30 text-[10px] mt-0.5">Panel de control</p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 px-2 md:px-3 space-y-1">
          {TABS.map(t => {
            const isActive = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-white/[0.08] text-white'
                    : 'text-white/35 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400/80" />}
                <t.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-amber-300/80' : ''}`} />
                <span className="hidden md:block museo-body text-[12px]">{t.label}</span>
                {t.key === 'moderation' && pendingCount > 0 && (
                  <span className="hidden md:flex ml-auto px-1.5 py-0.5 rounded-full bg-amber-500/25 text-amber-300 text-[9px] font-bold museo-label items-center justify-center min-w-[20px]">
                    {pendingCount}
                  </span>
                )}
                {t.key === 'moderation' && pendingCount > 0 && (
                  <span className="md:hidden absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-2 md:px-3 py-4 border-t border-white/[0.06] space-y-1">
          <button
            onClick={() => onNavigate?.('/comunidad')}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/30 hover:text-white/60 hover:bg-white/[0.03] transition-all"
          >
            <Eye className="w-4 h-4 flex-shrink-0" />
            <span className="hidden md:block museo-body text-[12px]">Ver sitio</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/30 hover:text-red-300/60 hover:bg-red-500/[0.04] transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="hidden md:block museo-body text-[12px]">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="relative z-10 ml-16 md:ml-56 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-[#0e0c09]/80 backdrop-blur-xl border-b border-white/[0.04] px-6 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="museo-headline text-white text-lg md:text-xl">
                {TABS.find(t => t.key === tab)?.label}
              </h1>
              <p className="museo-body text-white/30 text-[11px] mt-0.5">
                {tab === 'dashboard' && 'Resumen general de la plataforma'}
                {tab === 'moderation' && `${pendingCount} video${pendingCount !== 1 ? 's' : ''} en cola de revisión`}
                {tab === 'ratings' && `${totalRatings} calificación${totalRatings !== 1 ? 'es' : ''} de recorridos`}
                {tab === 'users' && `${totalUsers} usuarios registrados`}
                {tab === 'content' && `${totalVideos} videos en la plataforma`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {pendingCount > 0 && tab !== 'moderation' && (
                <button
                  onClick={() => setTab('moderation')}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 museo-label text-[9px] tracking-[0.1em] hover:bg-amber-500/20 transition-all"
                >
                  <Clock3 className="w-3 h-3" /> {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="px-6 md:px-8 py-6">
          {error && (
            <div className="rounded-xl border border-red-300/30 bg-red-500/10 p-4 mb-5">
              <p className="museo-body text-red-200 text-sm">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-32 gap-3">
              <Loader2 className="w-5 h-5 animate-spin text-white/30" />
              <span className="museo-body text-white/30 text-sm">Cargando datos…</span>
            </div>
          ) : (
            <>
              {/* ═══ DASHBOARD ═══ */}
              {tab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    <StatCard icon={Clock3} label="Pendientes" value={pendingCount} accent="amber" />
                    <StatCard icon={Video} label="Total Videos" value={totalVideos} accent="blue" />
                    <StatCard icon={CheckCircle2} label="Aprobados" value={approvedVideos} accent="emerald" />
                    <StatCard icon={XCircle} label="Rechazados" value={rejectedVideos} accent="red" />
                    <StatCard icon={Users} label="Usuarios" value={totalUsers} accent="purple" />
                    <StatCard icon={Eye} label="Vistas" value={totalViews} accent="white" />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Top contributors */}
                    <Card className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="museo-headline text-white text-sm flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400/50" /> Más Activos
                        </h3>
                        <span className="museo-body text-white/25 text-[10px]">{topContributors.length} contribuidor{topContributors.length !== 1 ? 'es' : ''}</span>
                      </div>
                      {topContributors.length === 0 ? (
                        <p className="museo-body text-white/25 text-sm py-6 text-center">Sin datos aún</p>
                      ) : (
                        <div className="space-y-0.5">
                          {topContributors.map((c, i) => (
                            <div key={c.uid} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold ${i < 3 ? 'bg-amber-500/15 text-amber-300' : 'bg-white/[0.04] text-white/30'}`}>{i + 1}</span>
                              <span className="flex-1 museo-body text-white/80 text-sm truncate">{c.name}</span>
                              <span className="museo-label text-white/30 text-[10px]">{c.count} video{c.count !== 1 ? 's' : ''}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>

                    {/* Recent activity */}
                    <Card className="p-5">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="museo-headline text-white text-sm flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-400/50" /> Actividad Reciente
                        </h3>
                      </div>
                      <div className="space-y-0.5">
                        {recentVideos.map(v => (
                          <div key={v.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${v.moderation_status === 'approved' ? 'bg-emerald-400' : v.moderation_status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="museo-body text-white/80 text-sm truncate">{v.title}</p>
                              <p className="museo-body text-white/25 text-[10px]">{profileMap[v.user_id] || 'Usuario'} · {fmtRel(v.created_at)}</p>
                            </div>
                            <span className={`museo-label text-[8px] tracking-wider px-2 py-0.5 rounded-md ${v.moderation_status === 'approved' ? 'bg-emerald-500/10 text-emerald-300/70' : v.moderation_status === 'rejected' ? 'bg-red-500/10 text-red-300/70' : 'bg-amber-500/10 text-amber-300/70'}`}>
                              {v.moderation_status === 'approved' ? 'OK' : v.moderation_status === 'rejected' ? 'NO' : 'PEND'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  </div>

                  {/* Reseñas summary */}
                  <Card className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="museo-headline text-white text-sm flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400/50" /> Reseñas de Recorridos
                      </h3>
                      <button
                        onClick={() => setTab('ratings')}
                        className="museo-label text-[9px] tracking-[0.12em] text-amber-300/60 hover:text-amber-300 transition-colors"
                      >
                        VER TODO →
                      </button>
                    </div>

                    {/* Global stats row */}
                    <div className="flex items-center gap-6 mb-5 pb-4 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <span className="museo-headline text-2xl text-white">{globalAvg.toFixed(1)}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(globalAvg) ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`} />
                          ))}
                        </div>
                      </div>
                      <span className="museo-body text-white/30 text-xs">{totalRatings} reseña{totalRatings !== 1 ? 's' : ''} en total</span>
                    </div>

                    {/* Per-tour mini cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {tourRatingStats.map(t => (
                        <div key={t.name} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="museo-headline text-white text-sm">{t.label}</span>
                            <span className="museo-label text-white/25 text-[9px]">{t.count}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="museo-headline text-xl text-white">{t.avg.toFixed(1)}</span>
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-3 h-3 ${s <= Math.round(t.avg) ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`} />
                              ))}
                            </div>
                          </div>
                          {/* Mini distribution */}
                          <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map(star => {
                              const count = t.dist[star - 1];
                              const pct = t.count > 0 ? (count / t.count) * 100 : 0;
                              return (
                                <div key={star} className="flex items-center gap-1.5">
                                  <span className="museo-label text-white/30 text-[9px] w-2.5">{star}</span>
                                  <div className="flex-1 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                                    <div className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/40" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="museo-body text-white/20 text-[9px] w-4 text-right">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recent ratings */}
                    {ratings.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/[0.06]">
                        <p className="museo-label text-white/25 text-[9px] tracking-[0.15em] mb-3">CALIFICACIONES RECIENTES</p>
                        <div className="space-y-0.5">
                          {ratings.slice(0, 5).map(r => (
                            <div key={r.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                              <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                                <span className="museo-label text-white/40 text-[10px]">{(profileMap[r.user_id] || 'U').charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="museo-body text-white/80 text-sm truncate">{profileMap[r.user_id] || 'Usuario'}</p>
                                <p className="museo-body text-white/25 text-[10px]">{TOUR_LABELS[r.tour_name] || r.tour_name} · {fmtRel(r.created_at)}</p>
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} className={`w-3 h-3 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              )}

              {/* ═══ MODERATION ═══ */}
              {tab === 'moderation' && (
                <div className="space-y-4">
                  {videos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400/50" />
                      </div>
                      <p className="museo-body text-white/35 text-sm">Todo revisado. No hay videos pendientes.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                      {videos.map(v => (
                        <Card key={v.id} className="overflow-hidden group">
                          <div className="relative bg-black/60 aspect-video">
                            <video src={v.video_url} poster={v.thumbnail_url || undefined} controls preload="metadata" className="w-full h-full object-cover" />
                          </div>
                          <div className="p-4 md:p-5">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <h3 className="museo-headline text-white text-base mb-1 line-clamp-1">{v.title}</h3>
                                {v.description && <p className="museo-body text-white/40 text-xs line-clamp-2">{v.description}</p>}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mb-4 text-white/30">
                              <span className="museo-body text-[11px] flex items-center gap-1"><UserCircle2 className="w-3 h-3" /> {profileMap[v.user_id] || 'Usuario'}</span>
                              <span className="museo-body text-[11px] flex items-center gap-1"><Clock3 className="w-3 h-3" /> {fmtDur(v.duration_secs)}</span>
                              <span className="museo-body text-[11px]">{fmtBytes(v.size_bytes)}</span>
                              <span className="museo-body text-[11px]">{fmtRel(v.created_at)}</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => approve(v.id)} disabled={actingId === v.id}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20 transition-all museo-label text-[10px] tracking-[0.12em] disabled:opacity-40">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Aprobar
                              </button>
                              <button onClick={() => reject(v.id)} disabled={actingId === v.id}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-all museo-label text-[10px] tracking-[0.12em] disabled:opacity-40">
                                <Trash2 className="w-3.5 h-3.5" /> Rechazar
                              </button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ RATINGS ═══ */}
              {tab === 'ratings' && (
                <div className="space-y-6">
                  {/* Global stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <StatCard icon={Star} label="Total Reseñas" value={totalRatings} accent="amber" />
                    <StatCard icon={Star} label="Promedio Global" value={globalAvg.toFixed(1)} accent="white" />
                    <StatCard icon={Star} label="5 Estrellas" value={ratings.filter(r => r.rating === 5).length} accent="emerald" />
                    <StatCard icon={Star} label="1-2 Estrellas" value={ratings.filter(r => r.rating <= 2).length} accent="red" />
                  </div>

                  {/* Per-tour breakdown */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {tourRatingStats.map(t => (
                      <Card key={t.name} className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="museo-headline text-white text-sm">{t.label}</h3>
                          <span className="museo-label text-white/25 text-[10px]">{t.count} reseña{t.count !== 1 ? 's' : ''}</span>
                        </div>
                        {/* Average score */}
                        <div className="flex items-center gap-3 mb-4">
                          <span className="museo-headline text-3xl text-white">{t.avg.toFixed(1)}</span>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= Math.round(t.avg) ? 'fill-amber-400 text-amber-400' : 'text-white/15'}`} />
                            ))}
                          </div>
                        </div>
                        {/* Distribution bars */}
                        <div className="space-y-1.5">
                          {[5, 4, 3, 2, 1].map(star => {
                            const count = t.dist[star - 1];
                            const pct = t.count > 0 ? (count / t.count) * 100 : 0;
                            return (
                              <div key={star} className="flex items-center gap-2">
                                <span className="museo-label text-white/40 text-[10px] w-3">{star}</span>
                                <Star className="w-3 h-3 text-amber-400/40" />
                                <div className="flex-1 h-2 rounded-full bg-white/[0.04] overflow-hidden">
                                  <div className="h-full rounded-full bg-gradient-to-r from-amber-500/60 to-amber-400/40 transition-all duration-500" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="museo-body text-white/25 text-[10px] w-6 text-right">{count}</span>
                              </div>
                            );
                          })}
                        </div>
                      </Card>
                    ))}
                  </div>

                  {/* Recent ratings table */}
                  <Card className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/[0.06]">
                      <h3 className="museo-headline text-white text-sm flex items-center gap-2">
                        <Clock3 className="w-4 h-4 text-white/30" /> Calificaciones Recientes
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">USUARIO</th>
                            <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">RECORRIDO</th>
                            <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">CALIFICACIÓN</th>
                            <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">FECHA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ratings.length === 0 ? (
                            <tr><td colSpan={4} className="px-5 py-12 text-center museo-body text-white/25 text-sm">No hay calificaciones aún</td></tr>
                          ) : ratings.map(r => (
                            <tr key={r.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                    <span className="museo-label text-white/40 text-[10px]">{(profileMap[r.user_id] || 'U').charAt(0).toUpperCase()}</span>
                                  </div>
                                  <span className="museo-body text-white/80 text-sm">{profileMap[r.user_id] || 'Usuario'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="museo-label text-[9px] tracking-wider px-2.5 py-1 rounded-md bg-amber-500/8 text-amber-300/70">{TOUR_LABELS[r.tour_name] || r.tour_name}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex items-center justify-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-white/10'}`} />
                                  ))}
                                </div>
                              </td>
                              <td className="px-5 py-3.5 museo-body text-white/25 text-xs">{fmtRel(r.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}

              {/* ═══ USERS ═══ */}
              {tab === 'users' && (
                <Card className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">USUARIO</th>
                          <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">EMAIL</th>
                          <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">VIDEOS</th>
                          <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">VISTAS</th>
                          <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">REGISTRO</th>
                          <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">ROL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profiles.map(p => {
                          const userVids = allVideos.filter(v => v.user_id === p.id && v.is_approved);
                          const userViews = userVids.reduce((a, v) => a + (v.views_count || 0), 0);
                          return (
                            <tr key={p.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center">
                                    <span className="museo-label text-white/40 text-[10px]">{(p.full_name || 'U').charAt(0).toUpperCase()}</span>
                                  </div>
                                  <span className="museo-body text-white/80 text-sm">{p.full_name || 'Sin nombre'}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3.5 museo-body text-white/35 text-sm">{p.email || '—'}</td>
                              <td className="px-5 py-3.5 text-center museo-body text-white/60 text-sm">{userVids.length}</td>
                              <td className="px-5 py-3.5 text-center museo-body text-white/35 text-sm">{userViews}</td>
                              <td className="px-5 py-3.5 museo-body text-white/25 text-xs">{fmtRel(p.created_at)}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`museo-label text-[8px] tracking-wider px-2 py-1 rounded-md ${p.is_admin ? 'bg-amber-500/10 text-amber-300/70' : 'bg-white/[0.03] text-white/25'}`}>
                                  {p.is_admin ? 'ADMIN' : 'USER'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* ═══ CONTENT ═══ */}
              {tab === 'content' && (
                <div className="space-y-4">
                  {/* Filter pills */}
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: `${totalVideos} total`, color: 'bg-white/[0.04] text-white/40' },
                      { label: `${approvedVideos} aprobados`, color: 'bg-emerald-500/8 text-emerald-300/60' },
                      { label: `${pendingCount} pendientes`, color: 'bg-amber-500/8 text-amber-300/60' },
                      { label: `${rejectedVideos} rechazados`, color: 'bg-red-500/8 text-red-300/60' },
                    ].map(f => (
                      <span key={f.label} className={`museo-label text-[9px] tracking-wider px-3 py-1.5 rounded-lg ${f.color}`}>
                        {f.label}
                      </span>
                    ))}
                  </div>

                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">TÍTULO</th>
                            <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">AUTOR</th>
                            <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">ESTADO</th>
                            <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">VISTAS</th>
                            <th className="text-center px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">DURACIÓN</th>
                            <th className="text-left px-5 py-3.5 museo-label text-white/30 text-[9px] tracking-[0.18em]">FECHA</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allVideos.map(v => (
                            <tr key={v.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                              <td className="px-5 py-3.5">
                                <p className="museo-body text-white/80 text-sm truncate max-w-[200px]">{v.title}</p>
                              </td>
                              <td className="px-5 py-3.5 museo-body text-white/35 text-sm">{profileMap[v.user_id] || 'Usuario'}</td>
                              <td className="px-5 py-3.5 text-center">
                                <span className={`museo-label text-[8px] tracking-wider px-2 py-1 rounded-md ${(v.is_approved || v.moderation_status === 'approved') ? 'bg-emerald-500/10 text-emerald-300/70' : v.moderation_status === 'rejected' ? 'bg-red-500/10 text-red-300/70' : 'bg-amber-500/10 text-amber-300/70'}`}>
                                  {(v.is_approved || v.moderation_status === 'approved') ? 'APROBADO' : v.moderation_status === 'rejected' ? 'RECHAZADO' : 'PENDIENTE'}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-center museo-body text-white/35 text-sm">{v.views_count || 0}</td>
                              <td className="px-5 py-3.5 text-center museo-body text-white/35 text-sm">{fmtDur(v.duration_secs)}</td>
                              <td className="px-5 py-3.5 museo-body text-white/25 text-xs">{fmtRel(v.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
};

export default AdminPortalPage;
