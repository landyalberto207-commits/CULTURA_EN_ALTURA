import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock3, Loader2, ShieldCheck, Trash2, UserCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

type ModerationVideo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  duration_secs: number | null;
  size_bytes: number | null;
  is_approved: boolean;
  created_at: string;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

interface AdminVideoModerationProps {
  currentUserId: string | null;
}

const formatDuration = (secs: number | null) => {
  if (!secs) return '0:00';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '0 MB';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRelative = (isoDate: string) => {
  return formatDistanceToNow(new Date(isoDate), {
    addSuffix: true,
    locale: es,
  });
};

const AdminVideoModeration = ({ currentUserId }: AdminVideoModerationProps) => {
  const [videos, setVideos] = useState<ModerationVideo[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingVideoId, setActingVideoId] = useState<string | null>(null);

  const pendingCount = useMemo(() => videos.length, [videos]);

  const fetchPendingVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: videosError } = await supabase
        .from('community_videos')
        .select('id,user_id,title,description,video_url,thumbnail_url,duration_secs,size_bytes,is_approved,created_at')
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(60);

      if (videosError) throw videosError;

      const rows = (data || []) as ModerationVideo[];
      setVideos(rows);

      const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];
      if (userIds.length === 0) {
        setProfileMap({});
        return;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id,full_name')
        .in('id', userIds);

      if (profilesError) {
        setProfileMap({});
        return;
      }

      const nameById = (profilesData as ProfileRow[]).reduce((acc, row) => {
        acc[row.id] = row.full_name || 'Usuario';
        return acc;
      }, {} as Record<string, string>);

      setProfileMap(nameById);
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar la cola de moderacion.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingVideos();
  }, [fetchPendingVideos]);

  const handleApprove = async (videoId: string) => {
    setActingVideoId(videoId);
    setError(null);

    try {
      const { error: approveError } = await supabase
        .from('community_videos')
        .update({ is_approved: true })
        .eq('id', videoId);

      if (approveError) throw approveError;

      setVideos((prev) => prev.filter((video) => video.id !== videoId));
    } catch (err: any) {
      setError(err?.message || 'No se pudo aprobar el video.');
    } finally {
      setActingVideoId(null);
    }
  };

  const handleReject = async (videoId: string) => {
    if (!confirm('Rechazar este video lo quitara de la cola. Deseas continuar?')) return;

    setActingVideoId(videoId);
    setError(null);

    try {
      const { error: rejectError } = await supabase
        .from('community_videos')
        .delete()
        .eq('id', videoId);

      if (rejectError) throw rejectError;

      setVideos((prev) => prev.filter((video) => video.id !== videoId));
    } catch (err: any) {
      setError(err?.message || 'No se pudo rechazar el video.');
    } finally {
      setActingVideoId(null);
    }
  };

  return (
    <section className="relative w-full py-10 lg:py-14 px-6 lg:px-12">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-3xl border border-white/20 bg-white/[0.03] backdrop-blur-2xl p-6 md:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="museo-headline text-white text-3xl md:text-4xl flex items-center gap-3">
                <ShieldCheck className="w-8 h-8" /> Moderacion de Videos
              </h2>
              <p className="museo-body text-white/70 text-sm md:text-base mt-2">
                Revisa, visualiza y valida los videos enviados por la comunidad antes de publicarlos.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 px-4 py-3 bg-black/20">
              <p className="museo-label text-white/70 text-[10px] tracking-[0.18em]">PENDIENTES</p>
              <p className="museo-headline text-white text-2xl mt-1">{pendingCount}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-300/40 bg-red-500/10 p-4 mb-5">
            <p className="museo-body text-red-100 text-sm">{error}</p>
          </div>
        )}

        {loading && (
          <div className="rounded-2xl border border-white/20 bg-white/[0.02] p-6 flex items-center gap-3 text-white/80">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="museo-body text-sm">Cargando cola de moderacion...</span>
          </div>
        )}

        {!loading && videos.length === 0 && (
          <div className="rounded-2xl border border-white/20 bg-white/[0.02] p-8 text-center">
            <p className="museo-body text-white/70 text-sm">No hay videos pendientes por validar.</p>
          </div>
        )}

        {!loading && videos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {videos.map((video) => (
              <article key={video.id} className="rounded-3xl border border-white/20 bg-white/[0.03] overflow-hidden">
                <div className="bg-black/60 aspect-video">
                  <video
                    src={video.video_url}
                    poster={video.thumbnail_url || undefined}
                    controls
                    preload="metadata"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="p-5">
                  <h3 className="museo-headline text-white text-xl mb-2">{video.title}</h3>
                  {video.description && (
                    <p className="museo-body text-white/70 text-sm leading-relaxed mb-4">{video.description}</p>
                  )}

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-white/60">
                    <span className="museo-body text-xs flex items-center gap-1">
                      <Clock3 className="w-3.5 h-3.5" /> {formatDuration(video.duration_secs)}
                    </span>
                    <span className="museo-body text-xs">{formatBytes(video.size_bytes)}</span>
                    <span className="museo-body text-xs">{formatRelative(video.created_at)}</span>
                  </div>

                  <p className="museo-body text-white/60 text-xs flex items-center gap-1.5 mb-5">
                    <UserCircle2 className="w-3.5 h-3.5" />
                    {profileMap[video.user_id] || 'Usuario de la comunidad'}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(video.id)}
                      disabled={actingVideoId === video.id || !currentUserId}
                      className="px-4 py-2 rounded-full border border-emerald-300/40 text-emerald-100 hover:bg-emerald-500/20 transition-colors museo-label text-[10px] tracking-[0.16em] disabled:opacity-60"
                    >
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> APROBAR
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleReject(video.id)}
                      disabled={actingVideoId === video.id || !currentUserId}
                      className="px-4 py-2 rounded-full border border-red-300/40 text-red-100 hover:bg-red-500/20 transition-colors museo-label text-[10px] tracking-[0.16em] disabled:opacity-60"
                    >
                      <span className="flex items-center gap-1.5">
                        <Trash2 className="w-3.5 h-3.5" /> RECHAZAR
                      </span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default AdminVideoModeration;
