import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Loader2, LogOut, MessageCircle, UserPlus, Users, Share2, X, Heart, Play, Calendar } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { uploadImageToCloudinary, validateImageFile, type UploadProgress } from '@/lib/cloudinary';

type ProfileRecord = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type ProfileVideo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  created_at: string;
  is_approved: boolean;
  duration_secs: number | null;
};

interface ProfilePageProps {
  currentUserId: string;
  profileUserId: string;
  onNavigate: (to: string, replace?: boolean) => void;
  onLogout: () => void;
}

const formatDuration = (seconds: number | null) => {
  if (!seconds || seconds <= 0) return '--:--';
  const min = Math.floor(seconds / 60);
  const sec = seconds % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
};

const buildProfileHandle = (profile: ProfileRecord | null) => {
  if (!profile) return 'usuario';

  const fallback = (profile.full_name || 'usuario')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '');

  return fallback || 'usuario';
};

const ProfilePage = ({ currentUserId, profileUserId, onNavigate, onLogout }: ProfilePageProps) => {
  const isOwnProfile = currentUserId === profileUserId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [draftName, setDraftName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarProgress, setAvatarProgress] = useState<UploadProgress | null>(null);

  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  const [followersList, setFollowersList] = useState<ProfileLite[]>([]);
  const [followingList, setFollowingList] = useState<ProfileLite[]>([]);
  const [listPanel, setListPanel] = useState<'followers' | 'following' | null>(null);

  const [videos, setVideos] = useState<ProfileVideo[]>([]);
  const [openVideo, setOpenVideo] = useState<ProfileVideo | null>(null);
  const [likesCount, setLikesCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProfilesByIds = useCallback(async (ids: string[]): Promise<ProfileLite[]> => {
    if (ids.length === 0) return [];

    const { data, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', ids);

    if (profilesError || !data) return [];

    const byId = (data as ProfileLite[]).reduce((acc, row) => {
      acc[row.id] = row;
      return acc;
    }, {} as Record<string, ProfileLite>);

    return ids
      .map((id) => byId[id])
      .filter((row): row is ProfileLite => Boolean(row));
  }, []);

  const refreshFollowData = useCallback(async () => {
    const [followersCountRes, followingCountRes, followersRowsRes, followingRowsRes] = await Promise.all([
      supabase.from('profile_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profileUserId),
      supabase.from('profile_follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profileUserId),
      supabase.from('profile_follows').select('follower_id').eq('following_id', profileUserId).order('created_at', { ascending: false }).limit(25),
      supabase.from('profile_follows').select('following_id').eq('follower_id', profileUserId).order('created_at', { ascending: false }).limit(25),
    ]);

    setFollowersCount(followersCountRes.count || 0);
    setFollowingCount(followingCountRes.count || 0);

    const followerIds = ((followersRowsRes.data || []) as Array<{ follower_id: string }>).map((r) => r.follower_id);
    const followingIds = ((followingRowsRes.data || []) as Array<{ following_id: string }>).map((r) => r.following_id);

    const [followerProfiles, followingProfiles] = await Promise.all([
      fetchProfilesByIds(followerIds),
      fetchProfilesByIds(followingIds),
    ]);

    setFollowersList(followerProfiles);
    setFollowingList(followingProfiles);

    if (!isOwnProfile) {
      const { data } = await supabase
        .from('profile_follows')
        .select('follower_id')
        .eq('follower_id', currentUserId)
        .eq('following_id', profileUserId)
        .maybeSingle();

      setIsFollowing(Boolean(data));
    } else {
      setIsFollowing(false);
    }
  }, [currentUserId, fetchProfilesByIds, isOwnProfile, profileUserId]);

  const fetchProfilePage = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url, created_at')
        .eq('id', profileUserId)
        .maybeSingle();

      if (profileError || !profileData) {
        throw new Error('No se pudo cargar el perfil.');
      }

      setProfile(profileData as ProfileRecord);
      setDraftName((profileData as ProfileRecord).full_name || '');

      let videosQuery = supabase
        .from('community_videos')
        .select('id, user_id, title, description, video_url, thumbnail_url, created_at, is_approved, duration_secs')
        .eq('user_id', profileUserId)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!isOwnProfile) {
        videosQuery = videosQuery.eq('is_approved', true);
      }

      const { data: videosData, error: videosError } = await videosQuery;
      if (videosError) throw videosError;

      setVideos((videosData || []) as ProfileVideo[]);

      // Fetch total likes received on this user's videos
      const approvedVideoIds = ((videosData || []) as ProfileVideo[])
        .filter((v) => v.is_approved)
        .map((v) => v.id);
      if (approvedVideoIds.length > 0) {
        const { count: totalLikes } = await supabase
          .from('video_reactions')
          .select('id', { count: 'exact', head: true })
          .in('video_id', approvedVideoIds);
        setLikesCount(totalLikes || 0);
      } else {
        setLikesCount(0);
      }

      await refreshFollowData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo cargar el perfil.');
    } finally {
      setLoading(false);
    }
  }, [isOwnProfile, profileUserId, refreshFollowData]);

  useEffect(() => {
    void fetchProfilePage();
  }, [fetchProfilePage]);

  const handleSaveName = async () => {
    if (!isOwnProfile || !profile) return;

    const nextName = draftName.trim();
    if (nextName.length < 3) {
      setError('Tu nombre debe tener al menos 3 caracteres.');
      return false;
    }

    setSavingName(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: nextName })
      .eq('id', profile.id);

    setSavingName(false);

    if (updateError) {
      setError('No se pudo actualizar el nombre.');
      return false;
    }

    setProfile((prev) => (prev ? { ...prev, full_name: nextName } : prev));
    setNotice('Perfil actualizado correctamente.');
    return true;
  };

  const handleAvatarSelect = async (file: File) => {
    if (!isOwnProfile || !profile) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setAvatarUploading(true);
    setAvatarProgress(null);
    setError(null);

    try {
      const uploaded = await uploadImageToCloudinary(file, (progress) => {
        setAvatarProgress(progress);
      });

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: uploaded.secure_url })
        .eq('id', profile.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setProfile((prev) => (prev ? { ...prev, avatar_url: uploaded.secure_url } : prev));
      setNotice('Foto de perfil actualizada.');
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar la foto de perfil.');
    } finally {
      setAvatarUploading(false);
      setAvatarProgress(null);
    }
  };

  const handleFollowToggle = async () => {
    if (isOwnProfile || followBusy) return;

    setFollowBusy(true);
    setError(null);

    try {
      if (isFollowing) {
        const { error: deleteError } = await supabase
          .from('profile_follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', profileUserId);

        if (deleteError) throw deleteError;
      } else {
        const { error: insertError } = await supabase
          .from('profile_follows')
          .insert({
            follower_id: currentUserId,
            following_id: profileUserId,
          });

        if (insertError) throw insertError;
      }

      await refreshFollowData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo actualizar el seguimiento.');
    } finally {
      setFollowBusy(false);
    }
  };

  const openProfileFromList = (userId: string) => {
    setListPanel(null);
    onNavigate(`/perfil/${userId}`);
  };

  const copyToClipboard = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const helper = document.createElement('textarea');
    helper.value = text;
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.focus();
    helper.select();
    document.execCommand('copy');
    document.body.removeChild(helper);
  };

  const handleShareProfile = async () => {
    const profileUrl = `${window.location.origin}/perfil/${profileUserId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Perfil de ${profile?.full_name || 'usuario'}`,
          text: 'Mira este perfil en Cultura en Altura',
          url: profileUrl,
        });
        return;
      } catch {
        // Canceled by user
      }
    }

    await copyToClipboard(profileUrl);
    setNotice('Enlace del perfil copiado.');
  };

  const openEditProfileModal = () => {
    setDraftName(profile?.full_name || '');
    setError(null);
    setEditProfileOpen(true);
  };

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [notice]);

  const profileInitial = (profile?.full_name || 'U').charAt(0).toUpperCase();
  const profileHandle = buildProfileHandle(profile);
  const activeList = listPanel === 'followers' ? followersList : followingList;

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
    : null;

  return (
    <main className="relative min-h-screen bg-[#0e0c09] text-white overflow-x-hidden">
      {/* Ambient gradient */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-amber-500/[0.04] blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] rounded-full bg-amber-700/[0.03] blur-[100px]" />
      </div>

      {/* Fixed nav buttons */}
      <button
        onClick={() => onNavigate('/comunidad')}
        className="fixed top-5 left-5 z-40 px-4 py-2 rounded-full border border-white/[0.08] bg-black/50 backdrop-blur-xl text-white/70 hover:text-white hover:bg-white/[0.06] museo-label text-[10px] tracking-[0.15em] flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> COMUNIDAD
      </button>

      <div className="fixed top-5 right-5 z-40 flex items-center gap-2">
        {!isOwnProfile && (
          <button
            onClick={handleFollowToggle}
            disabled={followBusy}
            className={`px-4 py-2 rounded-full border backdrop-blur-xl museo-label text-[10px] tracking-[0.15em] flex items-center gap-2 transition-all ${isFollowing
                ? 'bg-white/[0.06] border-white/[0.12] text-white hover:bg-white/[0.1]'
                : 'bg-amber-500/20 border-amber-400/35 text-amber-100 hover:bg-amber-500/30'
              }`}
          >
            {isFollowing ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
            {followBusy ? '...' : isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
          </button>
        )}
        {isOwnProfile && (
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-full border border-white/[0.08] bg-black/50 backdrop-blur-xl text-white/70 hover:text-white hover:bg-white/[0.06] museo-label text-[10px] tracking-[0.15em] flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" /> CERRAR SESIÓN
          </button>
        )}
      </div>

      {/* Toasts */}
      <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 space-y-2">
        {error && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/15 backdrop-blur-xl px-4 py-3 museo-body text-sm text-red-100 shadow-lg">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 backdrop-blur-xl px-4 py-3 museo-body text-sm text-emerald-100 shadow-lg">
            {notice}
          </div>
        )}
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-8 pt-20 pb-16">
        {/* PROFILE HERO */}
        <section className="relative rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          {/* Banner gradient */}
          <div className="h-32 md:h-40 bg-gradient-to-br from-amber-900/30 via-amber-800/10 to-transparent relative">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxjaXJjbGUgY3g9IjMwIiBjeT0iMzAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-50" />
          </div>

          <div className="px-5 md:px-8 pb-6 md:pb-8 -mt-14 md:-mt-16">
            {loading || !profile ? (
              <div className="h-48 flex items-center justify-center text-white/50 museo-body">
                <Loader2 className="w-5 h-5 animate-spin mr-3" /> Cargando perfil...
              </div>
            ) : (
              <>
                {/* Avatar + Actions row */}
                <div className="flex items-end justify-between gap-4">
                  <div className="relative group">
                    <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-[3px] border-[#0e0c09] ring-2 ring-white/[0.08] bg-[#1a1510] overflow-hidden flex items-center justify-center text-4xl md:text-5xl font-black text-white/40 shadow-2xl">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.full_name || 'Perfil'} className="w-full h-full object-cover" />
                      ) : (
                        <span>{profileInitial}</span>
                      )}
                    </div>
                    {isOwnProfile && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-amber-500/90 border-2 border-[#0e0c09] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Camera className="w-3.5 h-3.5 text-black" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pb-2">
                    {isOwnProfile ? (
                      <button
                        type="button"
                        onClick={openEditProfileModal}
                        className="px-5 py-2 rounded-full border border-white/[0.12] bg-white/[0.04] hover:bg-white/[0.08] museo-label text-[10px] tracking-[0.15em] transition-colors"
                      >
                        EDITAR PERFIL
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleFollowToggle}
                        disabled={followBusy}
                        className={`px-5 py-2 rounded-full museo-label text-[10px] tracking-[0.17em] border transition-all ${isFollowing
                            ? 'bg-white/[0.06] border-white/[0.15] text-white hover:bg-white/[0.1]'
                            : 'bg-amber-500/20 border-amber-400/40 text-amber-100 hover:bg-amber-500/30'
                          }`}
                      >
                        <span className="flex items-center gap-2">
                          {isFollowing ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                          {followBusy ? '...' : isFollowing ? 'SIGUIENDO' : 'SEGUIR'}
                        </span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => void handleShareProfile()}
                      className="w-9 h-9 rounded-full border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                    >
                      <Share2 className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                </div>

                {/* Name + Handle */}
                <div className="mt-4">
                  <h1 className="museo-headline text-2xl md:text-3xl leading-tight">
                    {profile.full_name || 'Usuario de la comunidad'}
                  </h1>
                  <p className="museo-body text-sm text-white/40 mt-0.5">@{profileHandle}</p>
                </div>

                {/* Bio line */}
                <p className="museo-body text-sm text-white/50 mt-2 flex items-center gap-2">
                  {memberSince && (
                    <>
                      <Calendar className="w-3.5 h-3.5 text-white/30 shrink-0" />
                      <span>Miembro desde {memberSince}</span>
                    </>
                  )}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-1.5 mt-5 flex-wrap">
                  {[
                    { label: 'Videos', value: videos.length, icon: Play, onClick: undefined as (() => void) | undefined },
                    { label: 'Siguiendo', value: followingCount, icon: Users, onClick: () => setListPanel('following') as void },
                    { label: 'Seguidores', value: followersCount, icon: Users, onClick: () => setListPanel('followers') as void },
                    { label: 'Me gusta', value: likesCount, icon: Heart, onClick: undefined as (() => void) | undefined },
                  ].map((stat) => (
                    <button
                      key={stat.label}
                      type="button"
                      onClick={stat.onClick}
                      disabled={!stat.onClick}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] transition-colors disabled:hover:bg-white/[0.02] group"
                    >
                      <stat.icon className="w-3.5 h-3.5 text-amber-400/60 group-hover:text-amber-400/80 transition-colors" />
                      <span className="museo-headline text-sm">{stat.value}</span>
                      <span className="museo-body text-xs text-white/40">{stat.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* VIDEOS SECTION */}
        <section className="mt-6">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-1 h-5 rounded-full bg-amber-500/60" />
              <h2 className="museo-label text-[11px] tracking-[0.2em] text-white/60">CONTENIDO</h2>
            </div>
            {!isOwnProfile && (
              <button
                type="button"
                onClick={() => onNavigate('/perfil')}
                className="px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] museo-label text-[10px] tracking-[0.15em] text-white/50 hover:text-white/70 transition-colors"
              >
                MI PERFIL
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-white/40 museo-body text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Cargando videos...
            </div>
          ) : videos.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
                <Play className="w-5 h-5 text-white/20" />
              </div>
              <p className="museo-body text-sm text-white/40">
                {isOwnProfile
                  ? 'A\u00fan no has subido videos.'
                  : 'Este perfil a\u00fan no tiene videos.'}
              </p>
              {isOwnProfile && (
                <button
                  type="button"
                  onClick={() => onNavigate('/comunidad')}
                  className="mt-4 px-5 py-2 rounded-full border border-amber-400/30 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20 museo-label text-[10px] tracking-[0.15em] transition-colors"
                >
                  SUBIR VIDEO
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {videos.map((video) => (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => setOpenVideo(video)}
                  className="relative rounded-2xl overflow-hidden border border-white/[0.06] bg-black/30 group cursor-pointer"
                >
                  {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt={video.title} loading="lazy" className="w-full aspect-[9/16] object-cover group-hover:scale-[1.03] transition-transform duration-500" />
                  ) : (
                    <div className="w-full aspect-[9/16] bg-[#1a1510] flex items-center justify-center">
                      <Play className="w-8 h-8 text-white/20" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300">
                      <Play className="w-4 h-4 text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Bottom info */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-left">
                    <p className="museo-body text-xs text-white/90 line-clamp-2 leading-snug">{video.title}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      {video.duration_secs && (
                        <span className="px-1.5 py-0.5 rounded-md bg-black/50 museo-label text-[9px] tracking-[0.1em] text-white/70">
                          {formatDuration(video.duration_secs)}
                        </span>
                      )}
                      {isOwnProfile && !video.is_approved && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 museo-label text-[9px] tracking-[0.1em] text-amber-300">
                          PENDIENTE
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Hidden file input for avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleAvatarSelect(file);
          e.currentTarget.value = '';
        }}
      />

      {/* EDIT PROFILE MODAL */}
      {editProfileOpen && isOwnProfile && profile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditProfileOpen(false)}>
          <div className="w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#121210]/95 backdrop-blur-2xl shadow-2xl p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="museo-headline text-xl">Editar perfil</h3>
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative group">
                <div className="w-24 h-24 rounded-full border-2 border-white/[0.1] bg-[#1a1510] overflow-hidden flex items-center justify-center text-3xl font-black text-white/40 shadow-xl">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || 'Perfil'} className="w-full h-full object-cover" />
                  ) : (
                    <span>{profileInitial}</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="px-4 py-2 rounded-full border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.08] museo-label text-[10px] tracking-[0.15em] flex items-center gap-2 text-white/60 hover:text-white/80 transition-colors"
              >
                {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />} CAMBIAR FOTO
              </button>

              {avatarUploading && avatarProgress && (
                <div className="w-full max-w-[200px]">
                  <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-amber-500/60 transition-all" style={{ width: `${avatarProgress.percent}%` }} />
                  </div>
                  <p className="museo-body text-[10px] text-white/40 text-center mt-1">{avatarProgress.percent}%</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="museo-label text-[10px] tracking-[0.14em] text-white/40">NOMBRE</label>
              <input
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Tu nombre p\u00fablico"
                className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 text-white text-sm museo-body focus:outline-none focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/10 transition-colors placeholder:text-white/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-7">
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="px-5 py-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] museo-label text-[10px] tracking-[0.15em] text-white/50 transition-colors"
              >
                CANCELAR
              </button>
              <button
                type="button"
                disabled={savingName}
                onClick={async () => {
                  const saved = await handleSaveName();
                  if (saved) setEditProfileOpen(false);
                }}
                className="px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-amber-100 hover:bg-amber-500/30 museo-label text-[10px] tracking-[0.15em] flex items-center gap-2 transition-colors"
              >
                {savingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                GUARDAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOLLOWERS / FOLLOWING PANEL */}
      {listPanel && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setListPanel(null)}>
          <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-[#121210]/95 backdrop-blur-2xl max-h-[75vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between shrink-0">
              <h3 className="museo-headline text-lg">
                {listPanel === 'followers' ? 'Seguidores' : 'Seguidos'}
              </h3>
              <button
                type="button"
                onClick={() => setListPanel(null)}
                className="w-8 h-8 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {activeList.length === 0 && (
                <div className="text-center py-10">
                  <Users className="w-8 h-8 text-white/15 mx-auto mb-2" />
                  <p className="museo-body text-sm text-white/35">
                    No hay perfiles para mostrar.
                  </p>
                </div>
              )}
              {activeList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openProfileFromList(item.id)}
                  className="w-full rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-3 hover:bg-white/[0.06] flex items-center gap-3 text-left transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full border border-white/[0.1] bg-[#1a1510] overflow-hidden flex items-center justify-center text-sm font-bold text-white/40 shrink-0">
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt={item.full_name || 'Usuario'} className="w-full h-full object-cover" />
                    ) : (
                      (item.full_name || 'U').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="museo-body text-sm text-white/80 group-hover:text-white truncate transition-colors">{item.full_name || 'Usuario de la comunidad'}</p>
                  </div>
                  <ArrowLeft className="w-3.5 h-3.5 text-white/20 group-hover:text-white/40 rotate-180 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIDEO PLAYER MODAL */}
      {openVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpenVideo(null)}>
          <div className="w-full max-w-sm rounded-3xl overflow-hidden border border-white/[0.1] bg-[#0e0c09] shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h3 className="museo-body text-sm text-white/80 line-clamp-1 flex-1 mr-3">{openVideo.title}</h3>
              <button
                type="button"
                onClick={() => setOpenVideo(null)}
                className="w-7 h-7 rounded-full border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] flex items-center justify-center shrink-0 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>
            </div>
            <video src={openVideo.video_url} controls autoPlay playsInline preload="auto" className="w-full aspect-[9/16] bg-black" />
            <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-3 museo-body text-xs text-white/40">
              <span className={`px-2 py-0.5 rounded-full text-[10px] museo-label tracking-[0.1em] ${openVideo.is_approved ? 'bg-emerald-500/15 text-emerald-300/80' : 'bg-amber-500/15 text-amber-300/80'}`}>
                {openVideo.is_approved ? 'PUBLICADO' : 'PENDIENTE'}
              </span>
              <span className="ml-auto flex items-center gap-1.5 text-white/30">
                {formatDuration(openVideo.duration_secs)}
              </span>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default ProfilePage;
