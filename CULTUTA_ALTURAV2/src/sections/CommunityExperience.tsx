import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, BookOpen, MessageSquarePlus, MessageCircle, ChevronRight, ChevronDown, Trash2, Edit2, Smile, Upload, X, Video, Clock, CheckCircle, AlertCircle, Film, UploadCloud, Heart, Send, Share2, Link2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { validateVideoFile, uploadVideoToCloudinary, MAX_FILE_SIZE_MB, MAX_DURATION_SECS, type UploadProgress } from '@/lib/cloudinary';

gsap.registerPlugin(ScrollTrigger);

interface CommunityExperienceProps {
  currentUserId: string | null;
  initialVideoId?: string | null;
  onViewProfile?: (userId: string) => void;
}

type StoryItem = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string | null;
  } | null;
};

type StoryRow = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles: { full_name: string | null }[] | { full_name: string | null } | null;
};

type Reaction = {
  emoji: string;
  count: number;
  hasReacted: boolean;
  users: string[];
};

type StoryComment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: {
    full_name: string | null;
  } | null;
  replies?: StoryComment[];
};

type CommunityVideo = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  video_url: string;
  thumbnail_url: string | null;
  cloudinary_id: string | null;
  duration_secs: number | null;
  size_bytes: number | null;
  is_approved: boolean;
  views_count: number;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
};

type CommunityVideoRow = Omit<CommunityVideo, 'profiles'>;

type VideoComment = {
  id: string;
  video_id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: { full_name: string | null } | null;
  replies?: VideoComment[];
};

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '✨'];
const VIDEO_REACTION_EMOJI = '❤️';
const VIDEO_COMMENTS_PANEL_ANIMATION_MS = 280;


const CommunityExperience = ({ currentUserId, initialVideoId, onViewProfile }: CommunityExperienceProps) => {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'media' | 'stories'>('media');
  const [storiesSubTab, setStoriesSubTab] = useState<'recent' | 'featured' | 'mine'>('recent');
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [submittingStory, setSubmittingStory] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [storyReactions, setStoryReactions] = useState<Record<string, Reaction[]>>({});
  const [reactionLoading, setReactionLoading] = useState<string | null>(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState<string | null>(null);
  const [storyComments, setStoryComments] = useState<Record<string, StoryComment[]>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [commentReactions, setCommentReactions] = useState<Record<string, Reaction[]>>({});
  const [reactionViewOpen, setReactionViewOpen] = useState<string | null>(null);
  const [expandedCommentsStory, setExpandedCommentsStory] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<{ storyId: string; commentId: string; userName: string | null } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [expandedReactionPanel, setExpandedReactionPanel] = useState<{ id: string; emoji: string } | null>(null);

  // ── Video state ───────────────────────────────────────────────
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoSubTab, setVideoSubTab] = useState<'recent' | 'featured' | 'mine' | 'pending'>('recent');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDescription, setVideoDescription] = useState('');
  const [culturalConsent, setCulturalConsent] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [activeAutoVideoId, setActiveAutoVideoId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [videoReactions, setVideoReactions] = useState<Record<string, Reaction[]>>({});
  const [videoComments, setVideoComments] = useState<Record<string, VideoComment[]>>({});
  const [videoCommentText, setVideoCommentText] = useState<Record<string, string>>({});
  const [openVideoCommentsFor, setOpenVideoCommentsFor] = useState<string | null>(null);
  const [openVideoShareFor, setOpenVideoShareFor] = useState<string | null>(null);
  const [videoCommentsPanelVideoId, setVideoCommentsPanelVideoId] = useState<string | null>(null);
  const [videoCommentsPanelMounted, setVideoCommentsPanelMounted] = useState(false);
  const [videoCommentsPanelVisible, setVideoCommentsPanelVisible] = useState(false);
  const [videoReplyingTo, setVideoReplyingTo] = useState<{ videoId: string; commentId: string; userName: string | null } | null>(null);
  const [expandedVideoReplies, setExpandedVideoReplies] = useState<Record<string, boolean>>({});
  const [videoInteractionLoading, setVideoInteractionLoading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoVideoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const deepLinkHandledRef = useRef<string | null>(null);

  // ── Video functions ───────────────────────────────────────────
  const fetchAdminStatus = useCallback(async () => {
    if (!currentUserId) {
      setIsAdmin(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', currentUserId)
        .maybeSingle();

      if (error) {
        setIsAdmin(false);
        return;
      }

      const profile = data as { is_admin?: boolean } | null;
      setIsAdmin(Boolean(profile?.is_admin));
    } catch {
      setIsAdmin(false);
    }
  }, [currentUserId]);

  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    setVideoError(null);

    try {
      let query = supabase
        .from('community_videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);

      if (videoSubTab === 'mine' && currentUserId) {
        query = supabase
          .from('community_videos')
          .select('*')
          .eq('user_id', currentUserId)
          .order('created_at', { ascending: false })
          .limit(30);
      } else if (videoSubTab === 'featured') {
        query = supabase
          .from('community_videos')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(120);
      } else if (videoSubTab === 'pending') {
        if (!isAdmin) {
          setVideos([]);
          setVideosLoading(false);
          return;
        }

        query = supabase
          .from('community_videos')
          .select('*')
          .eq('is_approved', false)
          .order('created_at', { ascending: false })
          .limit(50);
      } else {
        query = supabase
          .from('community_videos')
          .select('*')
          .eq('is_approved', true)
          .order('created_at', { ascending: false })
          .limit(200);
      }

      const { data, error } = await query;
      if (error) throw error;

      let rows = (data || []) as CommunityVideoRow[];

      if (videoSubTab === 'featured' && rows.length > 0) {
        const videoIds = rows.map((row) => row.id);
        const { data: reactionsData, error: reactionsError } = await supabase
          .from('video_reactions')
          .select('video_id')
          .in('video_id', videoIds);

        if (reactionsError) {
          throw reactionsError;
        }

        const reactionCountByVideoId = (reactionsData || []).reduce((acc, row: any) => {
          const key = row.video_id as string;
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        rows = rows
          .filter((row) => (reactionCountByVideoId[row.id] || 0) > 10)
          .sort((a, b) => {
            const reactionDelta = (reactionCountByVideoId[b.id] || 0) - (reactionCountByVideoId[a.id] || 0);
            if (reactionDelta !== 0) return reactionDelta;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          })
          .slice(0, 30);
      }

      const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))];

      let profileMap: Record<string, { full_name: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profileMap = (profilesData as Array<{ id: string; full_name: string | null; avatar_url: string | null }>).reduce(
            (acc, profile) => {
              acc[profile.id] = { full_name: profile.full_name, avatar_url: profile.avatar_url };
              return acc;
            },
            {} as Record<string, { full_name: string | null; avatar_url: string | null }>
          );
        }
      }

      const normalized: CommunityVideo[] = rows.map((row) => ({
        ...row,
        profiles: profileMap[row.user_id] || null,
      }));

      setVideos(normalized);
    } catch (err: any) {
      const reason = err?.message ? ` Motivo: ${err.message}` : '';
      setVideoError(`No se pudieron cargar los videos.${reason}`);
    } finally {
      setVideosLoading(false);
    }
  }, [videoSubTab, currentUserId, isAdmin]);

  const closeUploadModal = () => {
    if (isUploading) return;

    setUploadModalOpen(false);
    setUploadSuccess(false);
    setUploadProgress(null);
    setSelectedFile(null);
    setVideoTitle('');
    setVideoDescription('');
    setCulturalConsent(false);
    setIsDragging(false);
    setVideoError(null);
  };

  const handleFileSelect = (file: File) => {
    const validationError = validateVideoFile(file);
    if (validationError) {
      setVideoError(validationError);
      return;
    }

    // Check duration via HTML5 video element
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > MAX_DURATION_SECS) {
        setVideoError(`El video no puede durar más de ${MAX_DURATION_SECS / 60} minutos.`);
        return;
      }
      setSelectedFile(file);
      setVideoError(null);
    };
    video.onerror = () => {
      setVideoError('No se pudo leer el archivo de video.');
    };
    video.src = URL.createObjectURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleUploadVideo = async () => {
    if (!currentUserId) {
      setVideoError('Necesitas iniciar sesión para subir un video.');
      return;
    }
    if (!selectedFile) {
      setVideoError('Selecciona un archivo de video.');
      return;
    }
    if (!videoTitle.trim()) {
      setVideoError('Agrega un título para tu video.');
      return;
    }
    if (!culturalConsent) {
      setVideoError('Confirma que el video está relacionado con cultura de Tulancingo.');
      return;
    }

    setIsUploading(true);
    setVideoError(null);
    setUploadProgress(null);
    let failedStage: 'upload' | 'insert' = 'upload';

    try {
      // 1. Upload to Cloudinary
      const result = await uploadVideoToCloudinary(selectedFile, (progress) => {
        setUploadProgress(progress);
      });

      // 2. Save metadata to Supabase
      failedStage = 'insert';
      const { error } = await supabase.from('community_videos').insert({
        user_id: currentUserId,
        title: videoTitle.trim(),
        description: videoDescription.trim() || null,
        video_url: result.secure_url,
        thumbnail_url: result.thumbnail_url || null,
        cloudinary_id: result.public_id,
        duration_secs: result.duration,
        size_bytes: result.bytes,
        is_approved: false,
      });

      if (error) throw error;

      setUploadSuccess(true);
      setVideoTitle('');
      setVideoDescription('');
      setCulturalConsent(false);
      setSelectedFile(null);
      setUploadProgress(null);

      // Refresh videos list
      await fetchVideos();

      // Auto-close modal after 3s
      setTimeout(() => {
        setUploadModalOpen(false);
        setUploadSuccess(false);
      }, 2500);
    } catch (err: any) {
      const baseMessage = err?.message || 'Error no identificado.';
      const prefix =
        failedStage === 'upload'
          ? 'Falló la subida a Cloudinary:'
          : 'Falló el guardado en Supabase (enviar a revisión):';
      setVideoError(`${prefix} ${baseMessage}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este video?')) return;

    const { error } = await supabase
      .from('community_videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      setVideoError('No se pudo eliminar el video.');
      return;
    }

    setVideos((prev) => prev.filter((v) => v.id !== videoId));
  };

  const handleApproveVideo = async (videoId: string) => {
    if (!isAdmin) return;

    const { error } = await supabase
      .from('community_videos')
      .update({ is_approved: true })
      .eq('id', videoId);

    if (error) {
      setVideoError('No se pudo aprobar el video.');
      return;
    }

    await fetchVideos();
  };

  const handleRejectVideo = async (videoId: string) => {
    if (!isAdmin) return;
    if (!confirm('¿Rechazar este video? Se eliminará del feed.')) return;

    const { error } = await supabase
      .from('community_videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      setVideoError('No se pudo rechazar el video.');
      return;
    }

    await fetchVideos();
  };

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

  const fetchProfileNames = useCallback(async (userIds: string[]) => {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) return {} as Record<string, string>;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', uniqueUserIds);

    if (error || !data) return {} as Record<string, string>;

    return (data as Array<{ id: string; full_name: string | null }>).reduce((acc, row) => {
      acc[row.id] = row.full_name || 'Usuario';
      return acc;
    }, {} as Record<string, string>);
  }, []);

  const fetchVideoReactions = useCallback(async (videoId: string) => {
    const { data, error } = await supabase
      .from('video_reactions')
      .select('emoji, user_id')
      .eq('video_id', videoId);

    if (error) {
      setVideoReactions((prev) => ({ ...prev, [videoId]: [] }));
      return;
    }

    const rows = (data || []) as Array<{ emoji: string; user_id: string }>;
    const userNamesById = await fetchProfileNames(rows.map((r) => r.user_id));

    const grouped: Record<string, { users: string[]; userIds: string[]; count: number }> = {};
    rows.forEach((row) => {
      if (!grouped[row.emoji]) {
        grouped[row.emoji] = { users: [], userIds: [], count: 0 };
      }
      grouped[row.emoji].users.push(userNamesById[row.user_id] || 'Usuario');
      grouped[row.emoji].userIds.push(row.user_id);
      grouped[row.emoji].count += 1;
    });

    const normalized: Reaction[] = Object.entries(grouped).map(([emoji, group]) => ({
      emoji,
      count: group.count,
      hasReacted: group.userIds.includes(currentUserId || ''),
      users: group.users,
    }));

    setVideoReactions((prev) => ({ ...prev, [videoId]: normalized }));
  }, [currentUserId, fetchProfileNames]);

  const normalizeVideoComment = (
    row: {
      id: string;
      video_id: string;
      user_id: string;
      content: string;
      created_at: string;
      parent_comment_id: string | null;
    },
    userNamesById: Record<string, string>
  ): VideoComment => {
    return {
      id: row.id,
      video_id: row.video_id,
      user_id: row.user_id,
      content: row.content,
      created_at: row.created_at,
      parent_comment_id: row.parent_comment_id,
      profiles: { full_name: userNamesById[row.user_id] || 'Usuario' },
      replies: [],
    };
  };

  const buildVideoCommentsTree = (rows: VideoComment[]) => {
    const byId: Record<string, VideoComment> = {};

    rows.forEach((row) => {
      byId[row.id] = { ...row, replies: [] };
    });

    const roots: VideoComment[] = [];

    Object.values(byId).forEach((comment) => {
      if (comment.parent_comment_id) {
        const parent = byId[comment.parent_comment_id];
        if (parent) {
          parent.replies?.push(comment);
        } else {
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });

    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    Object.values(byId).forEach((comment) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    });

    return roots;
  };

  const fetchVideoComments = useCallback(async (videoId: string) => {
    const { data, error } = await supabase
      .from('video_comments')
      .select('id, video_id, user_id, content, created_at, parent_comment_id')
      .eq('video_id', videoId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      setVideoComments((prev) => ({ ...prev, [videoId]: [] }));
      return;
    }

    const rows = (data || []) as Array<{
      id: string;
      video_id: string;
      user_id: string;
      content: string;
      created_at: string;
      parent_comment_id: string | null;
    }>;

    const userNamesById = await fetchProfileNames(rows.map((r) => r.user_id));

    const normalized = rows.map((row) => normalizeVideoComment(row, userNamesById));
    const tree = buildVideoCommentsTree(normalized);

    setVideoComments((prev) => ({ ...prev, [videoId]: tree }));
  }, [fetchProfileNames]);

  const handleVideoReaction = async (videoId: string, emoji: string) => {
    if (!currentUserId) {
      setVideoError('Necesitas iniciar sesión para reaccionar.');
      return;
    }

    setVideoInteractionLoading(videoId);

    const reactions = videoReactions[videoId] || [];
    const hasReaction = reactions.some((r) => r.emoji === emoji && r.hasReacted);

    if (hasReaction) {
      const { error } = await supabase
        .from('video_reactions')
        .delete()
        .eq('video_id', videoId)
        .eq('emoji', emoji)
        .eq('user_id', currentUserId);

      if (error) {
        setVideoError('No se pudo eliminar tu reacción en el video.');
        setVideoInteractionLoading(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from('video_reactions')
        .insert({
          video_id: videoId,
          user_id: currentUserId,
          emoji,
        });

      if (error) {
        setVideoError('No se pudo agregar tu reacción en el video.');
        setVideoInteractionLoading(null);
        return;
      }
    }

    await fetchVideoReactions(videoId);
    setVideoInteractionLoading(null);
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

  const buildVideoSharePayload = (video: CommunityVideo) => {
    const title = video.title?.trim() || 'Video cultural';
    const url = `${window.location.origin}/comunidad?video=${encodeURIComponent(video.id)}`;
    const text = `Mira este video cultural en Cultura en Altura: ${title}`;
    return { title, url, text };
  };

  const handleShareNative = async (video: CommunityVideo) => {
    const payload = buildVideoSharePayload(video);

    if (navigator.share) {
      try {
        await navigator.share({
          title: payload.title,
          text: payload.text,
          url: payload.url,
        });
      } catch {
        // User cancelled native share dialog.
      }
    } else {
      const waText = `${payload.text} ${payload.url}`;
      window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
    }

    setOpenVideoShareFor(null);
  };

  const handleShareWhatsApp = (video: CommunityVideo) => {
    const payload = buildVideoSharePayload(video);
    const waText = `${payload.text} ${payload.url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener,noreferrer');
    setOpenVideoShareFor(null);
  };

  const handleShareInstagram = async (video: CommunityVideo) => {
    const payload = buildVideoSharePayload(video);
    await copyToClipboard(payload.url);
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    setOpenVideoShareFor(null);
    setVideoError('Enlace copiado. Pégalo en Instagram al crear tu publicación o historia.');
  };

  const handleShareCopy = async (video: CommunityVideo) => {
    const payload = buildVideoSharePayload(video);
    await copyToClipboard(payload.url);
    setOpenVideoShareFor(null);
    setVideoError('Enlace del video copiado al portapapeles.');
  };

  const handleAddVideoComment = async (videoId: string) => {
    const text = videoCommentText[videoId]?.trim();

    if (!currentUserId) {
      setVideoError('Necesitas iniciar sesión para comentar.');
      return;
    }

    if (!text) {
      setVideoError('Escribe un comentario antes de publicar.');
      return;
    }

    const parentCommentId = videoReplyingTo?.videoId === videoId ? videoReplyingTo.commentId : null;
    let finalContent = text;
    if (parentCommentId && videoReplyingTo?.userName) {
      finalContent = `@${videoReplyingTo.userName} ${text}`;
    }

    const { error } = await supabase
      .from('video_comments')
      .insert({
        video_id: videoId,
        user_id: currentUserId,
        content: finalContent,
        parent_comment_id: parentCommentId,
      });

    if (error) {
      setVideoError(error.message || 'No se pudo publicar el comentario del video.');
      return;
    }

    setVideoCommentText((prev) => ({ ...prev, [videoId]: '' }));
    setVideoReplyingTo(null);
    if (parentCommentId) {
      setExpandedVideoReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    }
    await fetchVideoComments(videoId);
  };

  const handleDeleteVideoComment = async (videoId: string, commentId: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;

    await supabase
      .from('video_comments')
      .delete()
      .eq('parent_comment_id', commentId);

    const { error } = await supabase
      .from('video_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      setVideoError('No se pudo eliminar el comentario del video.');
      return;
    }

    await fetchVideoComments(videoId);
  };

  const countVideoComments = (comments: VideoComment[]): number => {
    return comments.reduce((sum, comment) => {
      const repliesCount = comment.replies ? countVideoComments(comment.replies) : 0;
      return sum + 1 + repliesCount;
    }, 0);
  };

  const getVideoHeartReaction = (videoId: string): Reaction | null => {
    const reactions = videoReactions[videoId] || [];
    return reactions.find((reaction) => reaction.emoji === VIDEO_REACTION_EMOJI) || null;
  };

  const closeVideoCommentsPanel = () => {
    setOpenVideoCommentsFor(null);
    setVideoReplyingTo(null);
  };

  const renderVideoCommentsPanel = () => {
    if (!videoCommentsPanelMounted || !videoCommentsPanelVideoId) return null;

    const comments = videoComments[videoCommentsPanelVideoId] || [];
    const totalComments = countVideoComments(comments);
    const panelVideo = videos.find(v => v.id === videoCommentsPanelVideoId);

    return (
      <div className="fixed inset-0 z-[60] flex items-end md:items-stretch md:justify-end pointer-events-none">
        {/* Backdrop (mobile) */}
        <div
          className={`absolute inset-0 bg-black/40 md:bg-transparent pointer-events-auto transition-opacity duration-300 ${videoCommentsPanelVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={closeVideoCommentsPanel}
        />

        {/* Panel */}
        <div
          className={`pointer-events-auto relative w-full md:w-[400px] lg:w-[420px] h-[90dvh] md:h-full bg-[#0f0d0a]/95 backdrop-blur-2xl md:border-l border-white/[0.06] rounded-t-[20px] md:rounded-none flex flex-col transform-gpu transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${videoCommentsPanelVisible ? 'translate-y-0 md:translate-x-0' : 'translate-y-full md:translate-x-full'}`}
        >
          {/* Drag handle (mobile) */}
          <div className="pt-3 pb-1 md:hidden flex items-center justify-center">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>

          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <h4 className="museo-headline text-white text-base leading-none">Comentarios</h4>
                <p className="museo-body text-white/30 text-[11px] mt-0.5">{totalComments} {totalComments === 1 ? 'comentario' : 'comentarios'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeVideoCommentsPanel}
              className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>
          </div>

          {/* Video context */}
          {panelVideo && (
            <div className="mx-5 mb-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
              <p className="museo-body text-white/60 text-xs line-clamp-1">{panelVideo.title}</p>
              <p className="museo-body text-white/25 text-[10px] mt-0.5">por {panelVideo.profiles?.full_name || 'Usuario'}</p>
            </div>
          )}

          <div className="mx-5 border-t border-white/[0.05]" />

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white/15" />
                </div>
                <p className="museo-body text-white/25 text-xs text-center">
                  Sé el primero en comentar
                </p>
              </div>
            ) : (
              comments.map((comment) => renderVideoCommentNode(comment, videoCommentsPanelVideoId, 0))
            )}
          </div>

          {/* Input area */}
          <div className="border-t border-white/[0.06] p-4 space-y-2 bg-[#0f0d0a]/80 backdrop-blur-xl">
            {videoReplyingTo?.videoId === videoCommentsPanelVideoId && (
              <div className="flex items-center justify-between rounded-xl bg-blue-500/[0.06] border border-blue-400/15 px-3 py-2">
                <p className="museo-body text-[11px] text-blue-300/70">
                  Respondiendo a <span className="text-blue-200">@{videoReplyingTo.userName || 'usuario'}</span>
                </p>
                <button
                  type="button"
                  onClick={() => setVideoReplyingTo(null)}
                  className="text-blue-200/50 hover:text-blue-200 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {currentUserId ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={videoCommentText[videoCommentsPanelVideoId] || ''}
                  onChange={(e) =>
                    setVideoCommentText((prev) => ({
                      ...prev,
                      [videoCommentsPanelVideoId]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddVideoComment(videoCommentsPanelVideoId);
                    }
                  }}
                  placeholder="Escribe un comentario..."
                  className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white px-4 py-2.5 text-sm focus:outline-none focus:border-white/20 focus:bg-white/[0.06] transition-all museo-body placeholder:text-white/20"
                />
                <button
                  type="button"
                  onClick={() => handleAddVideoComment(videoCommentsPanelVideoId)}
                  className="w-10 h-10 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3 text-center">
                <p className="museo-body text-xs text-white/30">Inicia sesión para comentar</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderVideoCommentNode = (comment: VideoComment, videoId: string, depth: number = 0) => {
    const isReply = depth > 0;
    const hasReplies = (comment.replies || []).length > 0;
    const isExpanded = expandedVideoReplies[comment.id] ?? false;
    const initial = (comment.profiles?.full_name || 'U').charAt(0).toUpperCase();

    return (
      <div key={comment.id} style={{ marginLeft: depth * 16 }}>
        <div className={`${isReply ? 'py-2' : 'py-2.5'} group`}>
          <div className="flex gap-2.5">
            {/* Avatar */}
            <div className={`${isReply ? 'w-6 h-6' : 'w-7 h-7'} rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0`}>
              <span className={`museo-label ${isReply ? 'text-[8px]' : 'text-[9px]'} text-white/40`}>{initial}</span>
            </div>

            <div className="flex-1 min-w-0">
              {/* Name + time */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onViewProfile?.(comment.user_id)}
                  className="museo-label text-[10px] tracking-[0.08em] text-white/70 hover:text-white transition-colors"
                >
                  {comment.profiles?.full_name || 'Usuario'}
                </button>
                <span className="museo-body text-[9px] text-white/20">{formatRelative(comment.created_at)}</span>

                {(currentUserId === comment.user_id || isAdmin) && (
                  <button
                    type="button"
                    onClick={() => handleDeleteVideoComment(videoId, comment.id)}
                    className="ml-auto opacity-0 group-hover:opacity-100 text-white/25 hover:text-red-300/70 p-0.5 transition-all"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                )}
              </div>

              {/* Content */}
              <p className={`museo-body ${isReply ? 'text-[11px]' : 'text-xs'} text-white/60 mt-1 break-words leading-relaxed`}>{comment.content}</p>

              {/* Actions */}
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={() =>
                    setVideoReplyingTo({
                      videoId,
                      commentId: comment.id,
                      userName: comment.profiles?.full_name || null,
                    })
                  }
                  className="museo-body text-[10px] text-white/25 hover:text-white/60 transition-colors"
                >
                  Responder
                </button>
                {hasReplies && (
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedVideoReplies((prev) => ({
                        ...prev,
                        [comment.id]: !isExpanded,
                      }))
                    }
                    className="museo-body text-[10px] text-white/25 hover:text-white/60 transition-colors flex items-center gap-0.5"
                  >
                    {isExpanded ? 'Ocultar' : `${comment.replies?.length || 0} respuesta${(comment.replies?.length || 0) !== 1 ? 's' : ''}`}
                    {isExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {hasReplies && isExpanded && (
          <div className="space-y-1 border-l border-white/[0.05] ml-3.5">
            {(comment.replies || []).map((reply) => renderVideoCommentNode(reply, videoId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const normalizeStory = (row: StoryRow): StoryItem => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] || null : row.profiles;

    return {
      id: row.id,
      title: row.title,
      content: row.content,
      created_at: row.created_at,
      author_id: row.author_id,
      profiles: profile,
    };
  };

  const normalizeComment = (comment: any): StoryComment => {
    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
    return {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      user_id: comment.user_id,
      parent_comment_id: comment.parent_comment_id || null,
      profiles: profile,
      replies: [],
    };
  };

  const buildCommentsTree = (rows: any[]): StoryComment[] => {
    const byId: Record<string, StoryComment> = {};

    rows.forEach((row: any) => {
      const normalized = normalizeComment(row);
      byId[normalized.id] = { ...normalized, replies: [] };
    });

    const roots: StoryComment[] = [];

    Object.values(byId).forEach((comment) => {
      if (comment.parent_comment_id) {
        const parent = byId[comment.parent_comment_id];
        if (parent) {
          parent.replies?.push(comment);
        } else {
          roots.push(comment);
        }
      } else {
        roots.push(comment);
      }
    });

    const sortBranch = (list: StoryComment[]) => {
      list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      list.forEach((child) => {
        if (child.replies && child.replies.length > 0) {
          sortBranch(child.replies);
        }
      });
    };

    sortBranch(roots);
    roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return roots;
  };

  const fetchStories = async () => {
    setStoriesLoading(true);
    setStoriesError(null);

    const { data, error } = await supabase
      .from('stories')
      .select('id,title,content,created_at,author_id,profiles(full_name)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      setStoriesError('No se pudieron cargar los relatos.');
      setStoriesLoading(false);
      return;
    }

    const rows = (data ?? []) as StoryRow[];
    const normalizedStories = rows.map(normalizeStory);
    setStories(normalizedStories);

    // Cargar reacciones y comentarios para cada relato
    for (const story of normalizedStories) {
      await fetchStoryReactions(story.id);
      await fetchStoryComments(story.id);
    }

    setStoriesLoading(false);
  };

  const handleCreateStory = async () => {
    if (!currentUserId) {
      setStoriesError('Necesitas iniciar sesión para compartir una historia.');
      return;
    }

    if (!storyTitle.trim() || !storyContent.trim()) {
      setStoriesError('Agrega titulo y relato antes de publicar.');
      return;
    }

    setSubmittingStory(true);
    setStoriesError(null);

    const { data, error } = await supabase
      .from('stories')
      .insert({
        author_id: currentUserId,
        title: storyTitle.trim(),
        content: storyContent.trim(),
      })
      .select('id,title,content,created_at,author_id,profiles(full_name)')
      .single();

    if (error) {
      setStoriesError('No se pudo publicar tu historia. Intenta de nuevo.');
      setSubmittingStory(false);
      return;
    }

    const normalizedStory = normalizeStory(data as StoryRow);
    setStories((prev) => [normalizedStory, ...prev]);
    await fetchStoryReactions(normalizedStory.id);
    await fetchStoryComments(normalizedStory.id);

    setStoryTitle('');
    setStoryContent('');
    setComposerOpen(false);
    setSubmittingStory(false);
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm('¿Estás seguro de que deseas borrar este relato?')) return;

    const { error } = await supabase
      .from('stories')
      .delete()
      .eq('id', storyId);

    if (error) {
      setStoriesError('No se pudo borrar el relato. Intenta de nuevo.');
      return;
    }

    setStories((prev) => prev.filter((s) => s.id !== storyId));
  };

  const handleEditStory = (story: StoryItem) => {
    setEditingStoryId(story.id);
    setEditTitle(story.title);
    setEditContent(story.content);
  };

  const handleSaveEdit = async () => {
    if (!editingStoryId) return;

    if (!editTitle.trim() || !editContent.trim()) {
      setStoriesError('Agrega titulo y relato antes de guardar.');
      return;
    }

    const { error } = await supabase
      .from('stories')
      .update({ title: editTitle.trim(), content: editContent.trim() })
      .eq('id', editingStoryId);

    if (error) {
      setStoriesError('No se pudo actualizar el relato. Intenta de nuevo.');
      return;
    }

    setStories((prev) =>
      prev.map((s) =>
        s.id === editingStoryId
          ? { ...s, title: editTitle.trim(), content: editContent.trim() }
          : s
      )
    );

    setEditingStoryId(null);
    setEditTitle('');
    setEditContent('');
  };

  const fetchStoryReactions = async (storyId: string) => {
    const { data, error } = await supabase
      .from('story_reactions')
      .select('emoji, user_id, profiles(full_name)')
      .eq('story_id', storyId);

    if (error) return;

    const reactionMap: Record<string, { userNames: string[]; userIds: string[]; count: number }> = {};
    (data || []).forEach((reaction: any) => {
      if (!reactionMap[reaction.emoji]) {
        reactionMap[reaction.emoji] = { userNames: [], userIds: [], count: 0 };
      }
      const profile = Array.isArray(reaction.profiles) ? reaction.profiles[0] : reaction.profiles;
      reactionMap[reaction.emoji].userNames.push(profile?.full_name || 'Usuario');
      reactionMap[reaction.emoji].userIds.push(reaction.user_id);
      reactionMap[reaction.emoji].count += 1;
    });

    const reactions: Reaction[] = Object.entries(reactionMap).map(([emoji, info]) => ({
      emoji,
      count: info.count,
      hasReacted: info.userIds.includes(currentUserId || ''),
      users: info.userNames,
    }));

    setStoryReactions((prev) => ({ ...prev, [storyId]: reactions }));
  };

  const getTotalReactions = (storyId: string): number => {
    return (storyReactions[storyId] || []).reduce((sum, r) => sum + r.count, 0);
  };

  const renderCommentWithMentions = (content: string, isReply: boolean = false) => {
    // Detectar @menciones y renderizarlas con color especial
    const parts = content.split(/(@\w+)/g);
    return (
      <p className={`museo-body text-white/80 ${isReply ? 'text-xs mb-1' : 'text-xs md:text-sm mb-2 md:mb-3'} break-words`}>
        {parts.map((part, i) =>
          part.startsWith('@') ? (
            <span key={i} className="font-semibold text-blue-300">
              {part}
            </span>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
    );
  };

  const getFilteredStories = (): StoryItem[] => {
    if (storiesSubTab === 'mine') {
      // MIS HISTORIAS: Todas mis historias
      return stories.filter((s) => s.author_id === currentUserId);
    } else if (storiesSubTab === 'featured') {
      // DESTACADOS: Top 10 historias con más reacciones totales (DEBE tener AL MENOS 1 reacción)
      return [...stories]
        .filter((s) => getTotalReactions(s.id) > 0) // Filtrar: solo con reacciones
        .sort((a, b) => getTotalReactions(b.id) - getTotalReactions(a.id)) // Ordenar por total reacciones
        .slice(0, 10); // Tomar solo top 10
    } else {
      // RECIENTES: Todas las historias ordenadas por más nuevas primero
      return [...stories].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  const handleReaction = async (storyId: string, emoji: string) => {
    if (!currentUserId) {
      setStoriesError('Necesitas iniciar sesión para reaccionar.');
      return;
    }

    setReactionLoading(storyId);

    const reactions = storyReactions[storyId] || [];
    const existingReaction = reactions.find((r) => r.emoji === emoji && r.hasReacted);

    if (existingReaction) {
      // Eliminar reacción
      const { error } = await supabase
        .from('story_reactions')
        .delete()
        .eq('story_id', storyId)
        .eq('emoji', emoji)
        .eq('user_id', currentUserId);

      if (error) {
        setStoriesError('No se pudo eliminar la reacción.');
        setReactionLoading(null);
        return;
      }
    } else {
      // Agregar reacción
      const { error } = await supabase
        .from('story_reactions')
        .insert({ story_id: storyId, user_id: currentUserId, emoji });

      if (error) {
        setStoriesError('No se pudo agregar la reacción.');
        setReactionLoading(null);
        return;
      }
    }

    await fetchStoryReactions(storyId);
    setReactionLoading(null);
  };

  const fetchStoryComments = async (storyId: string) => {
    const { data, error } = await supabase
      .from('story_comments')
      .select('id,content,created_at,user_id,parent_comment_id,profiles(full_name)')
      .eq('story_id', storyId)
      .order('created_at', { ascending: true });

    if (error) {
      return;
    }

    const tree = buildCommentsTree(data || []);
    setStoryComments((prev) => ({ ...prev, [storyId]: tree }));

    const allCommentIds = (data || []).map((row: any) => row.id);
    await Promise.all(allCommentIds.map((id: string) => fetchCommentReactions(id)));
  };

  const fetchCommentReactions = async (commentId: string) => {
    const { data, error } = await supabase
      .from('comment_reactions')
      .select('emoji, user_id, profiles(full_name)')
      .eq('comment_id', commentId);

    if (error) return;

    const reactionMap: Record<string, { userNames: string[]; userIds: string[]; count: number }> = {};
    (data || []).forEach((reaction: any) => {
      if (!reactionMap[reaction.emoji]) {
        reactionMap[reaction.emoji] = { userNames: [], userIds: [], count: 0 };
      }
      const profile = Array.isArray(reaction.profiles) ? reaction.profiles[0] : reaction.profiles;
      reactionMap[reaction.emoji].userNames.push(profile?.full_name || 'Usuario');
      reactionMap[reaction.emoji].userIds.push(reaction.user_id);
      reactionMap[reaction.emoji].count += 1;
    });

    const reactions: Reaction[] = Object.entries(reactionMap).map(([emoji, info]) => ({
      emoji,
      count: info.count,
      hasReacted: info.userIds.includes(currentUserId || ''),
      users: info.userNames,
    }));

    setCommentReactions((prev) => ({ ...prev, [commentId]: reactions }));
  };

  const handleAddComment = async (storyId: string) => {
    const text = commentText[storyId]?.trim();

    if (!currentUserId) {
      setStoriesError('Necesitas iniciar sesión para comentar.');
      return;
    }

    if (!text) {
      setStoriesError('Escribe un comentario antes de publicar.');
      return;
    }

    const parentCommentId = replyingTo?.storyId === storyId ? replyingTo.commentId : null;

    // Agregar @nombre automáticamente si está respondiendo
    let finalContent = text;
    if (parentCommentId && replyingTo?.userName) {
      finalContent = `@${replyingTo.userName} ${text}`;
    }

    const { error } = await supabase
      .from('story_comments')
      .insert({
        story_id: storyId,
        user_id: currentUserId,
        content: finalContent,
        parent_comment_id: parentCommentId
      })
      .select('id,content,created_at,user_id,parent_comment_id,profiles(full_name)')
      .single();

    if (error) {
      setStoriesError('No se pudo publicar el comentario. Intenta de nuevo.');
      return;
    }

    setCommentText((prev) => ({ ...prev, [storyId]: '' }));
    setReplyingTo(null);
    if (parentCommentId) {
      setExpandedReplies((prev) => ({ ...prev, [parentCommentId]: true }));
    }
    await fetchStoryComments(storyId);
  };

  const handleDeleteComment = async (commentId: string, storyId: string) => {
    if (!confirm('¿Estás seguro de que deseas borrar este comentario?')) return;

    // Delete all replies first
    await supabase
      .from('story_comments')
      .delete()
      .eq('parent_comment_id', commentId);

    // Then delete the comment itself
    const { error } = await supabase
      .from('story_comments')
      .delete()
      .eq('id', commentId);

    if (error) {
      setStoriesError('No se pudo borrar el comentario.');
      return;
    }

    await fetchStoryComments(storyId);
  };

  const handleCommentReaction = async (commentId: string, emoji: string) => {
    if (!currentUserId) {
      setStoriesError('Necesitas iniciar sesión para reaccionar.');
      return;
    }

    const reactions = commentReactions[commentId] || [];
    const existingReaction = reactions.find((r) => r.emoji === emoji && r.hasReacted);

    if (existingReaction) {
      const { error } = await supabase
        .from('comment_reactions')
        .delete()
        .eq('comment_id', commentId)
        .eq('emoji', emoji)
        .eq('user_id', currentUserId);

      if (error) {
        setStoriesError('No se pudo eliminar la reacción.');
        return;
      }
    } else {
      const { error } = await supabase
        .from('comment_reactions')
        .insert({ comment_id: commentId, user_id: currentUserId, emoji });

      if (error) {
        setStoriesError('No se pudo agregar la reacción.');
        return;
      }
    }

    await fetchCommentReactions(commentId);
  };

  const renderReactionPanel = (reaction: Reaction) => {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4 md:p-0 backdrop-blur-sm">
        <div className="bg-black/80 border border-white/20 rounded-3xl md:rounded-2xl w-full md:w-96 max-h-96 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{reaction.emoji}</span>
              <div>
                <p className="museo-label text-white text-[11px] tracking-[0.2em]">REACCIONARON</p>
                <p className="museo-body text-white/70 text-sm">{reaction.count} {reaction.count === 1 ? 'usuario' : 'usuarios'}</p>
              </div>
            </div>
            <button
              onClick={() => setExpandedReactionPanel(null)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>

          {/* Users List */}
          <div className="overflow-y-auto max-h-80">
            {reaction.users?.map((userName, idx) => (
              <div key={idx} className="px-4 md:px-6 py-3 border-b border-white/5 last:border-b-0 flex items-center gap-3 hover:bg-white/5 transition-colors">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 border border-white/20">
                  <span className="museo-headline text-white text-xs">
                    {userName[0]?.toUpperCase()}
                  </span>
                </div>
                <span className="museo-body text-white text-sm truncate">{userName}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderCommentNode = (comment: StoryComment, storyId: string, depth: number = 0) => {
    const isReply = depth > 0;
    const hasReplies = (comment.replies || []).length > 0;
    const isExpanded = expandedReplies[comment.id] ?? false;
    const containerClasses = isReply
      ? 'bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-2 md:p-3'
      : 'bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-4';

    return (
      <div key={comment.id} style={{ marginLeft: depth * 14 }}>
        <div className={containerClasses}>
          <div className="flex items-start justify-between mb-2 gap-2 min-w-0">
            <div className="min-w-0">
              <p className={`museo-label text-white ${isReply ? 'text-[8px] md:text-[9px]' : 'text-[9px] md:text-[10px]'} tracking-[0.2em] font-medium truncate`}>
                {comment.profiles?.full_name || 'Usuario'}
              </p>
              <p className={`museo-body text-white/50 ${isReply ? 'text-[7px] md:text-[8px]' : 'text-[8px] md:text-[9px]'} mt-0.5`}>
                {formatRelative(comment.created_at)}
              </p>
            </div>
            {currentUserId === comment.user_id && (
              <button
                onClick={() => handleDeleteComment(comment.id, storyId)}
                className="p-1 text-white/60 hover:text-red-300 hover:bg-red-500/10 rounded transition-all flex-shrink-0"
              >
                <Trash2 className={isReply ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
              </button>
            )}
          </div>

          {renderCommentWithMentions(comment.content, isReply)}

          {/* Comment/Replie reactions */}
          <div className={`flex flex-wrap gap-0.5 ${isReply ? '' : 'md:gap-1'} items-center text-xs relative mb-2`}>
            {(commentReactions[comment.id] || []).map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => setExpandedReactionPanel({ id: comment.id, emoji: reaction.emoji })}
                className={`flex items-center gap-0.5 px-1 ${isReply ? 'py-0.5' : 'md:px-2 py-0.5'} rounded-full text-xs cursor-pointer transition-all ${reaction.hasReacted
                    ? 'bg-white/15 border border-white/30 hover:bg-white/25'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
              >
                <span className={isReply ? 'text-xs' : 'text-xs md:text-sm'}>{reaction.emoji}</span> {reaction.count > 1 && <span className={isReply ? 'text-[6px]' : 'text-[7px] md:text-[9px]'}>{reaction.count}</span>}
              </button>
            ))}
            <button
              onClick={() => setReactionViewOpen(reactionViewOpen === comment.id ? null : comment.id)}
              className="p-1 text-white/50 hover:text-white hover:bg-white/10 rounded transition-all"
            >
              <Smile className={isReply ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
            </button>

            {reactionViewOpen === comment.id && (
              <>
                {/* Backdrop móvil */}
                <div className="fixed md:hidden inset-0 bg-black/40 z-40" onClick={() => setReactionViewOpen(null)}></div>
                {/* Panel */}
                <div className="fixed md:absolute bottom-0 md:bottom-auto left-0 right-0 md:left-0 md:mt-1 md:w-56 bg-black/90 backdrop-blur-xl border-t md:border border-white/30 rounded-t-3xl md:rounded-lg z-50 md:flex md:flex-wrap md:gap-1 md:p-2 md:justify-start">
                  {/* Mobile Header */}
                  <div className="md:hidden flex items-center justify-between px-6 py-4 border-b border-white/20">
                    <span className="museo-label text-white text-[11px] tracking-[0.2em]">REACCIONAR</span>
                    <button
                      onClick={() => setReactionViewOpen(null)}
                      className="text-white/60 hover:text-white text-xl font-light"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Emojis Grid */}
                  <div className="grid grid-cols-4 md:flex md:flex-wrap md:gap-1 md:p-0 gap-2 p-4">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => {
                          handleCommentReaction(comment.id, emoji);
                          setReactionViewOpen(null);
                        }}
                        className="text-3xl md:text-base hover:bg-white/20 p-1.5 md:p-1 rounded transition-all hover:scale-110 active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setReplyingTo({
                storyId,
                commentId: comment.id,
                userName: comment.profiles?.full_name || null
              })}
              className={`${isReply ? 'text-[7px] md:text-[8px]' : 'text-[8px] md:text-[9px]'} text-white/60 hover:text-white transition-colors`}
            >
              Responder
            </button>
            {hasReplies && (
              <button
                onClick={() => setExpandedReplies((prev) => ({ ...prev, [comment.id]: !isExpanded }))}
                className={`${isReply ? 'text-[7px] md:text-[8px]' : 'text-[8px] md:text-[9px]'} text-white/60 hover:text-white transition-colors flex items-center gap-1`}
              >
                {isExpanded ? 'Ocultar respuestas' : `Ver respuestas (${comment.replies?.length || 0})`}
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>

        {hasReplies && isExpanded && (
          <div className="mt-2 space-y-2">
            {(comment.replies || []).map((reply) => renderCommentNode(reply, storyId, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Trigger animations
  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;

    if (!section || !header) return;

    gsap.set(header.children, { opacity: 0, y: 30 });

    ScrollTrigger.create({
      trigger: section,
      start: 'top 80%',
      onEnter: () => {
        gsap.to(header.children, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
      onLeave: () => {
        gsap.to(header.children, { opacity: 0, y: -30, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
      onEnterBack: () => {
        gsap.to(header.children, { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
      onLeaveBack: () => {
        gsap.to(header.children, { opacity: 0, y: 30, duration: 0.8, stagger: 0.1, ease: 'power3.out', overwrite: true });
      },
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  // Animate tab switch
  useEffect(() => {
    if (!contentRef.current) return;
    gsap.fromTo(
      contentRef.current.children,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power2.out' }
    );
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'stories') return;

    const loadStoriesAndReactions = async () => {
      await fetchStories();
    };

    loadStoriesAndReactions();
  }, [activeTab]);

  useEffect(() => {
    fetchAdminStatus();
  }, [fetchAdminStatus]);

  useEffect(() => {
    if (videoSubTab === 'pending' && !isAdmin) {
      setVideoSubTab('recent');
    }
  }, [videoSubTab, isAdmin]);

  useEffect(() => {
    if (activeTab !== 'media') return;
    fetchVideos();
  }, [activeTab, fetchVideos]);

  useEffect(() => {
    if (activeTab === 'media') return;
    setOpenVideoCommentsFor(null);
    setOpenVideoShareFor(null);
    setVideoReplyingTo(null);
  }, [activeTab]);

  useEffect(() => {
    if (videoSubTab === 'recent') return;
    setOpenVideoShareFor(null);
  }, [videoSubTab]);

  useEffect(() => {
    if (!initialVideoId) {
      deepLinkHandledRef.current = null;
      return;
    }

    if (deepLinkHandledRef.current === initialVideoId) {
      return;
    }

    if (activeTab !== 'media') {
      setActiveTab('media');
      return;
    }

    if (videoSubTab !== 'recent') {
      setVideoSubTab('recent');
      return;
    }

    if (!videos.some((video) => video.id === initialVideoId)) {
      return;
    }

    setActiveAutoVideoId(initialVideoId);
    const frame = window.requestAnimationFrame(() => {
      const targetVideo = autoVideoRefs.current[initialVideoId];
      targetVideo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      deepLinkHandledRef.current = initialVideoId;
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [initialVideoId, activeTab, videoSubTab, videos]);

  useEffect(() => {
    if (activeTab !== 'media' || videoSubTab !== 'recent') return;
    if (!openVideoCommentsFor || !activeAutoVideoId) return;
    if (openVideoCommentsFor === activeAutoVideoId) return;

    setOpenVideoCommentsFor(activeAutoVideoId);
    setVideoReplyingTo(null);
    void fetchVideoComments(activeAutoVideoId);
  }, [
    activeTab,
    videoSubTab,
    openVideoCommentsFor,
    activeAutoVideoId,
    fetchVideoComments,
  ]);

  useEffect(() => {
    if (openVideoCommentsFor) {
      setVideoCommentsPanelVideoId(openVideoCommentsFor);
      setVideoCommentsPanelMounted(true);

      const frame = window.requestAnimationFrame(() => {
        setVideoCommentsPanelVisible(true);
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }

    setVideoCommentsPanelVisible(false);

    const timeout = window.setTimeout(() => {
      setVideoCommentsPanelMounted(false);
      setVideoCommentsPanelVideoId(null);
    }, VIDEO_COMMENTS_PANEL_ANIMATION_MS);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [openVideoCommentsFor]);

  useEffect(() => {
    if (activeTab !== 'media') return;

    if (videos.length === 0) {
      setVideoReactions({});
      setVideoComments({});
      return;
    }

    const loadVideoInteractions = async () => {
      await Promise.all(
        videos.map(async (video) => {
          await fetchVideoReactions(video.id);
          await fetchVideoComments(video.id);
        })
      );
    };

    void loadVideoInteractions();
  }, [activeTab, videos, fetchVideoReactions, fetchVideoComments]);

  useEffect(() => {
    if (activeTab !== 'media') {
      autoVideoRefs.current = {};
      return;
    }

    if (videoSubTab !== 'recent') {
      Object.values(autoVideoRefs.current).forEach((videoEl) => {
        if (videoEl) {
          videoEl.pause();
        }
      });
      autoVideoRefs.current = {};
      setPlayingVideoId(null);
      return;
    }

    setPlayingVideoId(null);
  }, [activeTab, videoSubTab]);

  useEffect(() => {
    if (activeTab !== 'media' || videoSubTab !== 'recent') {
      setActiveAutoVideoId(null);
      return;
    }

    if (videos.length > 0) {
      setActiveAutoVideoId((current) => {
        if (current && videos.some((video) => video.id === current)) {
          return current;
        }
        return videos[0].id;
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]) {
          const nextId = (visible[0].target as HTMLVideoElement).dataset.videoId || null;
          if (nextId) {
            setActiveAutoVideoId(nextId);
          }
        }
      },
      {
        threshold: [0.4, 0.6, 0.8],
      }
    );

    Object.values(autoVideoRefs.current).forEach((videoEl) => {
      if (videoEl) observer.observe(videoEl);
    });

    return () => {
      observer.disconnect();
    };
  }, [activeTab, videoSubTab, videos]);

  useEffect(() => {
    if (activeTab !== 'media' || videoSubTab !== 'recent') return;

    Object.entries(autoVideoRefs.current).forEach(([videoId, videoEl]) => {
      if (!videoEl) return;

      if (videoId === activeAutoVideoId) {
        // Set src if not already set (lazy loading)
        const matchingVideo = videos.find((v) => v.id === videoId);
        if (matchingVideo && !videoEl.src) {
          videoEl.src = matchingVideo.video_url;
        }
        videoEl.muted = true;
        videoEl.playsInline = true;
        if (videoEl.readyState < 2) {
          videoEl.load();
        }
        void videoEl.play().catch(() => {});
      } else {
        videoEl.pause();
        // Free memory for off-screen videos (keep 1 before/after for smooth scroll)
        const activeIdx = videos.findIndex((v) => v.id === activeAutoVideoId);
        const thisIdx = videos.findIndex((v) => v.id === videoId);
        if (activeIdx >= 0 && Math.abs(thisIdx - activeIdx) > 2) {
          videoEl.removeAttribute('src');
          videoEl.load();
        }
      }
    });
  }, [activeAutoVideoId, activeTab, videoSubTab, videos]);




  return (
    <section
      id="experience-demo"
      ref={sectionRef}
      className="relative w-full"
    >
      {/* ── Compact Hero ── */}
      <div ref={headerRef} className="relative px-5 lg:px-10 pt-6 pb-4">
        <div className="max-w-6xl mx-auto">
          {/* Title row with tabs */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
            <div>
              <p className="museo-label text-[9px] md:text-[10px] tracking-[0.25em] text-white/40 mb-2">COMUNIDAD</p>
              <h2 className="museo-headline text-white text-2xl md:text-4xl leading-tight">
                Cultura Viva de Tulancingo
              </h2>
            </div>
            <div className="flex items-center gap-1 md:gap-0 bg-white/[0.06] backdrop-blur-xl rounded-full p-1 border border-white/10">
              <button
                onClick={() => setActiveTab('media')}
                className={`flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-full museo-label text-[10px] tracking-[0.12em] transition-all duration-300 ${activeTab === 'media' ? 'bg-white/15 text-white shadow-[0_2px_12px_rgba(255,255,255,0.08)]' : 'text-white/45 hover:text-white/80'}`}
              >
                <Play className="w-3.5 h-3.5" /> VIDEOS
              </button>
              <button
                onClick={() => setActiveTab('stories')}
                className={`flex items-center gap-2 px-5 md:px-6 py-2.5 rounded-full museo-label text-[10px] tracking-[0.12em] transition-all duration-300 ${activeTab === 'stories' ? 'bg-white/15 text-white shadow-[0_2px_12px_rgba(255,255,255,0.08)]' : 'text-white/45 hover:text-white/80'}`}
              >
                <BookOpen className="w-3.5 h-3.5" /> VOCES
              </button>
            </div>
          </div>
          <p className="museo-body text-white/45 text-xs md:text-sm max-w-xl">
            Comparte y descubre la cultura de nuestra ciudad a través de videos, historias y memorias de la comunidad.
          </p>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="mx-5 lg:mx-10 border-t border-white/[0.08]" />

      {/* Dynamic Content Area */}
      <div className="relative max-w-6xl mx-auto px-5 lg:px-10 pt-4">
        <div ref={contentRef} className="w-full">

          {/* MULTIMEDIA TAB */}
          {activeTab === 'media' && (
            <div className="flex flex-col gap-3">
              {/* ── Toolbar: sub-tabs + upload ── */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                  {[
                    { key: 'recent' as const, label: 'Todos' },
                    { key: 'featured' as const, label: 'Destacados' },
                    ...(currentUserId ? [{ key: 'mine' as const, label: 'Mis videos' }] : []),
                    ...(isAdmin ? [{ key: 'pending' as const, label: 'Pendientes' }] : []),
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setVideoSubTab(tab.key)}
                      className={`whitespace-nowrap py-1.5 px-4 rounded-full museo-label text-[10px] tracking-[0.1em] transition-all duration-200 ${videoSubTab === tab.key
                          ? 'bg-white/15 text-white border border-white/25'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUploadModalOpen(true);
                    setUploadSuccess(false);
                    setVideoError(null);
                  }}
                  className="flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/15 border border-white/15 hover:border-white/30 rounded-full px-5 py-2.5 text-white museo-label tracking-[0.15em] text-[9px] md:text-[10px] transition-all duration-300 whitespace-nowrap group"
                >
                  <UploadCloud className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> SUBIR VIDEO
                </button>
              </div>

              {videoError && (
                <div className="rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-200 mt-0.5" />
                  <p className="museo-body text-red-100 text-sm">{videoError}</p>
                </div>
              )}

              {videosLoading && (
                <div className="flex items-center justify-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    <p className="museo-body text-white/50 text-xs">Cargando videos...</p>
                  </div>
                </div>
              )}

              {!videosLoading && videos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                    <Film className="w-7 h-7 text-white/25" />
                  </div>
                  <p className="museo-body text-white/50 text-sm text-center max-w-xs">
                    {videoSubTab === 'mine'
                      ? 'Aún no has subido videos. ¡Comparte el primero!'
                      : videoSubTab === 'featured'
                        ? 'Aún no hay videos destacados. Se muestran videos con más de 10 reacciones.'
                      : videoSubTab === 'pending'
                        ? 'No hay videos pendientes de revisión.'
                        : 'Aún no hay videos publicados.'}
                  </p>
                  {videoSubTab !== 'pending' && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadModalOpen(true);
                        setUploadSuccess(false);
                        setVideoError(null);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white/60 hover:text-white hover:bg-white/10 transition-all museo-label text-[10px] tracking-[0.15em]"
                    >
                      <UploadCloud className="w-3.5 h-3.5" /> Subir el primero
                    </button>
                  )}
                </div>
              )}

              {!videosLoading && videos.length > 0 && (
                <div
                  className={videoSubTab === 'recent'
                    ? 'flex flex-col gap-0 h-[85vh] md:h-[88vh] overflow-y-auto snap-y snap-mandatory hide-scrollbar rounded-2xl'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4'}
                >
                  {videos.map((video) => {
                    const videoHeart = getVideoHeartReaction(video.id);
                    const totalVideoComments = countVideoComments(videoComments[video.id] || []);

                    return (
                    <article
                      key={`${videoSubTab}-${video.id}`}
                      className={`rounded-2xl overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:border-white/20 transition-all duration-300 ${videoSubTab === 'recent' ? 'snap-start shrink-0 h-[85vh] md:h-[88vh] md:max-w-[480px] md:mx-auto w-full' : 'group'}`}
                    >
                      <div className={`relative ${videoSubTab === 'recent' ? 'h-full bg-black/90' : 'aspect-[9/12] sm:aspect-[9/14] bg-black/60'}`}>
                        {videoSubTab === 'recent' ? (
                          <video
                            ref={(el) => {
                              autoVideoRefs.current[video.id] = el;
                            }}
                            data-video-id={video.id}
                            src={activeAutoVideoId === video.id ? video.video_url : undefined}
                            poster={video.thumbnail_url || undefined}
                            muted
                            playsInline
                            loop
                            preload={activeAutoVideoId === video.id ? 'auto' : 'none'}
                            className="w-full h-full object-cover"
                          />
                        ) : playingVideoId === video.id ? (
                          <video
                            src={video.video_url}
                            poster={video.thumbnail_url || undefined}
                            controls
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                            onEnded={() => setPlayingVideoId(null)}
                          />
                        ) : (
                          <>
                            {video.thumbnail_url ? (
                              <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-full h-full object-cover opacity-90"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-black/60">
                                <Video className="w-10 h-10 text-white/60" />
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setPlayingVideoId(video.id)}
                              className="absolute inset-0 flex items-center justify-center"
                            >
                              <span className="w-14 h-14 rounded-full bg-black/50 border border-white/30 flex items-center justify-center hover:scale-110 transition-transform">
                                <Play className="w-6 h-6 text-white ml-0.5" />
                              </span>
                            </button>
                          </>
                        )}

                        {videoSubTab === 'recent' && (
                          <div className="absolute right-3.5 bottom-24 flex flex-col items-center gap-4 z-20">
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(video.user_id)}
                              className="w-12 h-12 rounded-full border-2 border-white/85 bg-black/40 overflow-hidden flex items-center justify-center shadow-[0_6px_16px_rgba(0,0,0,0.4)] hover:scale-105 transition-transform"
                            >
                              {video.profiles?.avatar_url ? (
                                <img
                                  src={video.profiles.avatar_url}
                                  alt={video.profiles?.full_name || 'Perfil'}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="museo-label text-[11px] tracking-[0.12em] text-white">
                                  {(video.profiles?.full_name || 'U').charAt(0).toUpperCase()}
                                </span>
                              )}
                            </button>

                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => handleVideoReaction(video.id, VIDEO_REACTION_EMOJI)}
                                disabled={videoInteractionLoading === video.id}
                                className={`w-12 h-12 rounded-full border flex items-center justify-center transition-all shadow-[0_5px_14px_rgba(0,0,0,0.35)] ${videoHeart?.hasReacted
                                    ? 'bg-red-500/30 border-red-300/50 text-red-200'
                                    : 'bg-black/45 border-white/25 text-white/85 hover:text-white'
                                  }`}
                              >
                                <Heart className={`w-5 h-5 ${videoHeart?.hasReacted ? 'fill-current' : ''}`} />
                              </button>
                              <span className="museo-body text-[11px] text-white/95 mt-1">
                                {videoHeart?.count || 0}
                              </span>
                            </div>

                            <div className="flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => setOpenVideoCommentsFor(video.id)}
                                className="w-12 h-12 rounded-full border border-white/25 bg-black/45 text-white/90 hover:text-white flex items-center justify-center shadow-[0_5px_14px_rgba(0,0,0,0.35)]"
                              >
                                <MessageCircle className="w-5 h-5" />
                              </button>
                              <span className="museo-body text-[11px] text-white/95 mt-1">
                                {totalVideoComments}
                              </span>
                            </div>

                            <div className="relative flex flex-col items-center">
                              <button
                                type="button"
                                onClick={() => setOpenVideoShareFor((prev) => (prev === video.id ? null : video.id))}
                                className="w-12 h-12 rounded-full border border-white/25 bg-black/45 text-white/90 hover:text-white flex items-center justify-center shadow-[0_5px_14px_rgba(0,0,0,0.35)]"
                              >
                                <Share2 className="w-5 h-5" />
                              </button>
                              <span className="museo-body text-[11px] text-white/95 mt-1">Compartir</span>

                              {openVideoShareFor === video.id && (
                                <div className="absolute right-14 bottom-0 rounded-2xl border border-white/20 bg-[#131620]/95 backdrop-blur-xl p-2.5 w-40 space-y-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.4)]">
                                  <button
                                    type="button"
                                    onClick={() => handleShareWhatsApp(video)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 museo-body"
                                  >
                                    WhatsApp
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleShareInstagram(video)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 museo-body"
                                  >
                                    Instagram
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleShareCopy(video)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 museo-body flex items-center gap-2"
                                  >
                                    <Link2 className="w-3.5 h-3.5" /> Copiar enlace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleShareNative(video)}
                                    className="w-full text-left px-3 py-2 rounded-xl text-xs text-white/90 hover:bg-white/10 museo-body"
                                  >
                                    Más opciones...
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {videoSubTab === 'recent' && (
                          <div className="absolute inset-x-0 bottom-0 p-4 pr-24 bg-gradient-to-t from-black/70 via-black/35 to-transparent z-[1]">
                            <h4 className="museo-headline text-white text-lg line-clamp-2">{video.title}</h4>
                            <button
                              type="button"
                              onClick={() => onViewProfile?.(video.user_id)}
                              className="museo-body text-white/85 text-xs mt-1 line-clamp-2 hover:text-white"
                            >
                              Por {video.profiles?.full_name || 'Usuario de la comunidad'}
                            </button>
                          </div>
                        )}
                      </div>

                      <div className={`${videoSubTab === 'recent' ? 'hidden' : 'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 pt-12'}`}>
                        <h4 className="museo-headline text-white text-sm line-clamp-2 mb-1">{video.title}</h4>
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(video.user_id)}
                          className="museo-body text-white/60 text-[11px] hover:text-white transition-colors"
                        >
                          {video.profiles?.full_name || 'Usuario'}
                        </button>

                        <div className="flex items-center gap-3 mt-2.5 text-white/50">
                          <span className="museo-body text-[10px] flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDuration(video.duration_secs)}
                          </span>
                          <span className="museo-body text-[10px]">{formatRelative(video.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-1.5 mt-3">
                          <button
                            type="button"
                            onClick={() => handleVideoReaction(video.id, VIDEO_REACTION_EMOJI)}
                            disabled={videoInteractionLoading === video.id}
                            className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${videoHeart?.hasReacted
                                ? 'bg-red-500/25 border-red-300/40 text-red-200'
                                : 'bg-white/5 border-white/15 text-white/60 hover:text-white'
                              }`}
                          >
                            <Heart className={`w-3.5 h-3.5 ${videoHeart?.hasReacted ? 'fill-current' : ''}`} />
                          </button>
                          <span className="museo-body text-[10px] text-white/60 min-w-[16px]">{videoHeart?.count || 0}</span>

                          <button
                            type="button"
                            onClick={() => setOpenVideoCommentsFor(video.id)}
                            className="w-8 h-8 rounded-full border border-white/15 bg-white/5 text-white/60 hover:text-white flex items-center justify-center transition-all"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <span className="museo-body text-[10px] text-white/60">{totalVideoComments}</span>

                          <div className="flex-1" />

                          {currentUserId === video.user_id && (
                            <button
                              type="button"
                              onClick={() => handleDeleteVideo(video.id)}
                              className="w-8 h-8 rounded-full border border-white/15 text-white/50 hover:text-red-300 hover:border-red-300/30 hover:bg-red-500/10 flex items-center justify-center transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {isAdmin && videoSubTab === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveVideo(video.id)}
                                className="px-2.5 py-1.5 rounded-full border border-emerald-300/40 text-emerald-200 hover:bg-emerald-500/20 transition-colors museo-label text-[8px] tracking-[0.14em]"
                              >
                                <CheckCircle className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectVideo(video.id)}
                                className="px-2.5 py-1.5 rounded-full border border-red-300/40 text-red-200 hover:bg-red-500/20 transition-colors museo-label text-[8px] tracking-[0.14em]"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>

                        {videoSubTab === 'mine' && (
                          <div className="mt-2">
                            <span className={`museo-label text-[7px] tracking-[0.16em] px-2 py-0.5 rounded-full border ${video.is_approved
                                ? 'bg-emerald-500/20 border-emerald-300/30 text-emerald-200'
                                : 'bg-amber-500/20 border-amber-300/30 text-amber-200'
                              }`}>
                              {video.is_approved ? 'APROBADO' : 'PENDIENTE'}
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                  })}
                </div>
              )}

              {uploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                  <div className="w-full max-w-2xl rounded-3xl border border-white/20 bg-[#2C2416]/95 shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden">
                    <div className="px-5 md:px-7 py-4 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h4 className="museo-headline text-white text-xl md:text-2xl">Subir Video Cultural</h4>
                        <p className="museo-body text-white/60 text-xs md:text-sm mt-1">
                          Se enviará a revisión de administración antes de publicarse.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeUploadModal}
                        disabled={isUploading}
                        className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-40"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-5 md:p-7 space-y-4">
                      {videoError && (
                        <div className="rounded-2xl border border-red-300/40 bg-red-500/10 px-4 py-3 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-200 mt-0.5" />
                          <p className="museo-body text-red-100 text-sm">{videoError}</p>
                        </div>
                      )}

                      {uploadSuccess ? (
                        <div className="rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-4 flex items-start gap-2">
                          <CheckCircle className="w-5 h-5 text-emerald-100 mt-0.5" />
                          <p className="museo-body text-emerald-100 text-sm">
                            Video enviado correctamente. Quedó en estado pendiente para validación admin.
                          </p>
                        </div>
                      ) : (
                        <>
                          <input
                            type="text"
                            placeholder="Título del video"
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                            className="w-full rounded-2xl bg-transparent border border-white/30 text-white px-4 py-3 text-sm focus:outline-none focus:border-white/60 focus:bg-white/5 transition-all museo-body placeholder:text-white/40"
                          />

                          <textarea
                            placeholder="Describe brevemente el video cultural (opcional)."
                            rows={3}
                            value={videoDescription}
                            onChange={(e) => setVideoDescription(e.target.value)}
                            className="w-full rounded-2xl bg-transparent border border-white/30 text-white px-4 py-3 text-sm focus:outline-none focus:border-white/60 focus:bg-white/5 transition-all museo-body placeholder:text-white/40"
                          />

                          <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => !isUploading && fileInputRef.current?.click()}
                            className={`rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${isDragging
                                ? 'border-white/70 bg-white/10'
                                : 'border-white/30 hover:border-white/50 hover:bg-white/5'
                              }`}
                          >
                            <Upload className="w-8 h-8 text-white/70 mx-auto mb-3" />
                            <p className="museo-body text-white/80 text-sm">
                              Arrastra tu video aquí o haz clic para seleccionar
                            </p>
                            <p className="museo-body text-white/50 text-xs mt-2">
                              MP4, MOV o WebM. Máximo {MAX_FILE_SIZE_MB}MB y {MAX_DURATION_SECS / 60} minutos.
                            </p>
                          </div>

                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="video/mp4,video/quicktime,video/webm"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleFileSelect(file);
                            }}
                            className="hidden"
                          />

                          {selectedFile && (
                            <div className="rounded-2xl border border-white/20 bg-white/5 px-4 py-3 flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="museo-body text-white text-sm truncate">{selectedFile.name}</p>
                                <p className="museo-body text-white/60 text-xs">{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedFile(null);
                                }}
                                className="p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          <label className="flex items-start gap-2 text-sm text-white/80">
                            <input
                              type="checkbox"
                              checked={culturalConsent}
                              onChange={(e) => setCulturalConsent(e.target.checked)}
                              className="mt-1"
                            />
                            <span className="museo-body text-xs md:text-sm">
                              Confirmo que este video trata sobre cultura, patrimonio, tradiciones o historia de Tulancingo.
                            </span>
                          </label>

                          {uploadProgress && (
                            <div>
                              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className="h-full bg-white/70 transition-all"
                                  style={{ width: `${uploadProgress.percent}%` }}
                                />
                              </div>
                              <p className="museo-body text-white/60 text-xs mt-1">Subiendo: {uploadProgress.percent}%</p>
                            </div>
                          )}

                          <div className="flex flex-col-reverse md:flex-row md:justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={closeUploadModal}
                              disabled={isUploading}
                              className="px-5 py-2.5 rounded-full border border-white/20 text-white/80 hover:text-white hover:border-white/40 hover:bg-white/10 transition-colors museo-label text-[10px] tracking-[0.18em] disabled:opacity-50"
                            >
                              CANCELAR
                            </button>
                            <button
                              type="button"
                              onClick={handleUploadVideo}
                              disabled={isUploading}
                              className="px-5 py-2.5 rounded-full border border-white/40 text-white hover:bg-white/15 transition-colors museo-label text-[10px] tracking-[0.18em] disabled:opacity-50"
                            >
                              {isUploading ? 'SUBIENDO...' : 'ENVIAR A REVISIÓN'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STORIES TAB */}
          {activeTab === 'stories' && (
            <div className="flex flex-col gap-5">
              {/* ── Stories toolbar ── */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-2">
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                  {[
                    { key: 'recent' as const, label: 'Recientes' },
                    { key: 'featured' as const, label: 'Destacados' },
                    ...(currentUserId ? [{ key: 'mine' as const, label: 'Mis historias' }] : []),
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setStoriesSubTab(tab.key)}
                      className={`whitespace-nowrap py-1.5 px-4 rounded-full museo-label text-[10px] tracking-[0.1em] transition-all duration-200 ${storiesSubTab === tab.key
                          ? 'bg-white/15 text-white border border-white/25'
                          : 'text-white/50 hover:text-white hover:bg-white/[0.06] border border-transparent'
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setComposerOpen((prev) => !prev)}
                  className="flex items-center justify-center gap-2 bg-white/[0.08] hover:bg-white/15 border border-white/15 hover:border-white/30 rounded-full px-5 py-2.5 text-white museo-label tracking-[0.15em] text-[9px] md:text-[10px] transition-all duration-300 whitespace-nowrap group"
                >
                  <MessageSquarePlus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> COMPARTIR HISTORIA
                </button>
              </div>

              {composerOpen && (
                <div className="rounded-3xl p-6 md:p-8 bg-transparent border border-white/20 backdrop-blur-3xl shadow-[inset_0_1px_2px_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.2)]">
                  <div className="grid grid-cols-1 gap-4">
                    <input
                      type="text"
                      placeholder="Titulo de tu relato"
                      value={storyTitle}
                      onChange={(e) => setStoryTitle(e.target.value)}
                      className="w-full rounded-2xl bg-transparent border border-white/30 text-white px-5 py-3 text-sm focus:outline-none focus:border-white/60 focus:bg-white/5 transition-all museo-body placeholder:text-white/40"
                    />
                    <textarea
                      placeholder="Comparte tu historia sobre Tulancingo"
                      value={storyContent}
                      onChange={(e) => setStoryContent(e.target.value)}
                      rows={5}
                      className="w-full rounded-2xl bg-transparent border border-white/30 text-white px-5 py-3 text-sm focus:outline-none focus:border-white/60 focus:bg-white/5 transition-all museo-body placeholder:text-white/40"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleCreateStory}
                        disabled={submittingStory}
                        className="bg-transparent border border-white/30 rounded-full px-6 py-3 text-white museo-label tracking-[0.2em] text-[10px] hover:border-white/60 hover:bg-white/10 transition-all duration-300"
                      >
                        {submittingStory ? 'PUBLICANDO...' : 'PUBLICAR RELATO'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {storiesError && (
                <p className="museo-body text-red-200 text-sm">{storiesError}</p>
              )}

              {storiesLoading && (
                <p className="museo-body text-white/60 text-sm">Cargando relatos...</p>
              )}

              {!storiesLoading && getFilteredStories().length > 0 && (
                <div className="flex flex-col gap-0 h-[80vh] md:h-[84vh] overflow-y-auto snap-y snap-mandatory hide-scrollbar rounded-2xl">
                  {getFilteredStories().map((story) => (
                    <div key={story.id} className="snap-start shrink-0 h-[80vh] md:h-[84vh] flex items-center justify-center p-2 md:p-4">
                      {editingStoryId === story.id ? (
                        // Edit Mode
                        <div className="w-full max-w-2xl rounded-2xl p-5 md:p-8 bg-white/[0.03] border border-white/[0.08]">
                          <h4 className="museo-headline text-white text-lg mb-4">Editar Relato</h4>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-xl bg-transparent border border-white/[0.1] text-white px-4 py-3 text-sm focus:outline-none focus:border-white/25 focus:bg-white/[0.03] transition-all museo-body placeholder:text-white/20 mb-3"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={5}
                            className="w-full rounded-xl bg-transparent border border-white/[0.1] text-white px-4 py-3 text-sm focus:outline-none focus:border-white/25 focus:bg-white/[0.03] transition-all museo-body placeholder:text-white/20 mb-4"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex-1 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.12] text-white museo-label tracking-[0.15em] text-[10px] hover:bg-white/15 transition-all"
                            >
                              GUARDAR
                            </button>
                            <button
                              onClick={() => { setEditingStoryId(null); setEditTitle(''); setEditContent(''); }}
                              className="flex-1 py-2.5 rounded-xl bg-transparent border border-white/[0.08] text-white/60 museo-label tracking-[0.15em] text-[10px] hover:bg-white/[0.04] transition-all"
                            >
                              CANCELAR
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode — full-height card
                        <div className="w-full max-w-2xl h-full rounded-2xl bg-white/[0.02] border border-white/[0.06] flex flex-col overflow-hidden">
                          {/* Story header + content */}
                          <div className="p-5 md:p-8 flex-shrink-0">
                            <div className="flex items-center justify-between mb-6 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                                  <span className="museo-label text-white/50 text-sm">
                                    {(story.profiles?.full_name || 'U')[0].toUpperCase()}
                                  </span>
                                </div>
                                <div className="min-w-0">
                                  <p className="museo-label text-white/70 text-[10px] tracking-[0.12em] truncate">
                                    {story.profiles?.full_name || 'Usuario'}
                                  </p>
                                  <p className="museo-body text-white/25 text-[10px]">{formatRelative(story.created_at)}</p>
                                </div>
                              </div>
                              {currentUserId === story.author_id && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <button onClick={() => handleEditStory(story)} className="p-2 text-white/25 hover:text-white/60 hover:bg-white/[0.04] rounded-lg transition-all">
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteStory(story.id)} className="p-2 text-white/25 hover:text-red-300/60 hover:bg-red-500/[0.04] rounded-lg transition-all">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            <h4 className="museo-headline text-white text-2xl md:text-3xl mb-4 leading-tight">{story.title}</h4>
                            <p className="museo-body text-white/50 text-sm md:text-base leading-relaxed italic">&ldquo;{story.content}&rdquo;</p>
                          </div>

                          {/* Reactions bar */}
                          <div className="px-5 md:px-8 py-3 flex items-center gap-1.5 flex-wrap border-t border-white/[0.04]">
                            {(storyReactions[story.id] || []).map((reaction) => (
                              <button
                                key={reaction.emoji}
                                onClick={() => setExpandedReactionPanel({ id: story.id, emoji: reaction.emoji })}
                                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all ${reaction.hasReacted
                                    ? 'bg-white/10 border border-white/20'
                                    : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                                  }`}
                              >
                                <span className="text-sm">{reaction.emoji}</span>
                                <span className="text-[9px] text-white/50">{reaction.count}</span>
                              </button>
                            ))}
                            <div className="relative">
                              <button
                                onClick={() => setEmojiPickerOpen(emojiPickerOpen === story.id ? null : story.id)}
                                disabled={reactionLoading === story.id}
                                className="p-1.5 text-white/25 hover:text-white/50 hover:bg-white/[0.04] rounded-lg transition-all"
                              >
                                <Smile className="w-4 h-4" />
                              </button>
                              {emojiPickerOpen === story.id && (
                                <>
                                  <div className="fixed md:hidden inset-0 bg-black/40 z-40" onClick={() => setEmojiPickerOpen(null)} />
                                  <div className="fixed md:absolute bottom-0 md:bottom-full md:right-0 left-0 right-0 md:left-auto md:mb-2 md:w-64 bg-[#0f0d0a]/95 backdrop-blur-xl border-t md:border border-white/[0.1] rounded-t-[20px] md:rounded-xl z-50">
                                    <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                                      <span className="museo-label text-white/50 text-[10px] tracking-[0.15em]">REACCIONAR</span>
                                      <button onClick={() => setEmojiPickerOpen(null)} className="text-white/30 hover:text-white">
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-4 md:flex md:flex-wrap gap-1 p-3">
                                      {REACTION_EMOJIS.map((emoji) => (
                                        <button
                                          key={emoji}
                                          onClick={() => { handleReaction(story.id, emoji); setEmojiPickerOpen(null); }}
                                          className="text-2xl md:text-lg hover:bg-white/[0.08] p-2 md:p-1.5 rounded-lg transition-all hover:scale-110 active:scale-95"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Comments section — scrollable */}
                          <div className="flex-1 flex flex-col min-h-0 border-t border-white/[0.04]">
                            {/* Toggle */}
                            <button
                              onClick={() => setExpandedCommentsStory(expandedCommentsStory === story.id ? null : story.id)}
                              className="flex items-center gap-2 px-5 md:px-8 py-3 text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span className="museo-label text-[10px] tracking-[0.1em]">
                                Comentarios ({(storyComments[story.id] || []).length})
                              </span>
                              {expandedCommentsStory === story.id ? (
                                <ChevronDown className="w-3 h-3" />
                              ) : (
                                <ChevronRight className="w-3 h-3" />
                              )}
                            </button>

                            {expandedCommentsStory === story.id && (
                              <div className="flex-1 flex flex-col min-h-0">
                                {/* Comment input */}
                                {currentUserId && (
                                  <div className="px-5 md:px-8 pb-3 flex-shrink-0 space-y-2">
                                    {replyingTo?.storyId === story.id && (
                                      <div className="flex items-center justify-between rounded-lg bg-blue-500/[0.06] border border-blue-400/15 px-3 py-1.5">
                                        <p className="museo-body text-[10px] text-blue-300/70">
                                          Respondiendo a <span className="text-blue-200">@{replyingTo.userName}</span>
                                        </p>
                                        <button onClick={() => setReplyingTo(null)} className="text-blue-200/40 hover:text-blue-200">
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                    <div className="flex gap-2">
                                      <input
                                        type="text"
                                        placeholder={replyingTo?.storyId === story.id ? 'Escribe tu respuesta...' : 'Escribe un comentario...'}
                                        value={commentText[story.id] || ''}
                                        onChange={(e) => setCommentText((prev) => ({ ...prev, [story.id]: e.target.value }))}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(story.id); }
                                        }}
                                        className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white px-4 py-2 text-xs focus:outline-none focus:border-white/20 focus:bg-white/[0.05] transition-all museo-body placeholder:text-white/20"
                                        autoFocus={replyingTo?.storyId === story.id}
                                      />
                                      <button
                                        onClick={() => handleAddComment(story.id)}
                                        className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.12] transition-all museo-label text-[9px] tracking-[0.1em]"
                                      >
                                        Enviar
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Comments list — scrollable */}
                                <div className="flex-1 overflow-y-auto px-5 md:px-8 pb-4 space-y-2">
                                  {(storyComments[story.id] || []).length === 0 ? (
                                    <p className="museo-body text-white/20 text-xs text-center py-4">Sé el primero en comentar</p>
                                  ) : (
                                    (storyComments[story.id] || []).map((comment) => renderCommentNode(comment, story.id, 0))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!storiesLoading && getFilteredStories().length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-14 h-14 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white/15" />
                  </div>
                  <p className="museo-body text-white/30 text-sm text-center max-w-xs">
                    {storiesSubTab === 'mine'
                      ? 'Aún no tienes historias. ¡Comparte la primera!'
                      : 'Aún no hay relatos destacados.'}
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Reaction Details Panel */}
      {expandedReactionPanel && (() => {
        const allReactions = [
          ...Object.values(storyReactions).flat(),
          ...Object.values(commentReactions).flat(),
        ];
        const reaction = allReactions.find(r => r.emoji === expandedReactionPanel.emoji);
        return reaction ? renderReactionPanel(reaction) : null;
      })()}

      {renderVideoCommentsPanel()}
    </section>
  );
};

export default CommunityExperience;