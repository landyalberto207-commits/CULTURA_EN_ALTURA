/**
 * Capa de servicios API — Cultura en Altura
 *
 * Centraliza TODOS los endpoints de Supabase usados por la app.
 * Cada función es una operación atómica, fácilmente testeable y reutilizable.
 */
import { supabase } from '@/lib/supabase';

// ─── Tipos ──────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  email: string | null;
  full_name: string;
  is_admin: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface TourLocation {
  id: string;
  slug: string;
  name: string;
  description: string;
  cover_url: string | null;
  created_at: string;
}

export interface TourScene {
  id: string;
  location_id: string;
  order_index: number;
  title: string;
  description: string;
  narration: string | null;
  audio_url: string | null;
}

export interface TourHotspot {
  id: string;
  scene_id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  z: number;
}

export interface CommunityVideo {
  id: string;
  user_id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  cloudinary_id: string;
  duration_secs: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface Story {
  id: string;
  author_id: string;
  title: string;
  content: string;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface VideoComment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface StoryComment {
  id: string;
  story_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  profiles?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface Reaction {
  id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface TourRating {
  id: string;
  user_id: string;
  tour_slug: string;
  rating: number;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

// Helper genérico para manejar errores de Supabase
function unwrap<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data as T;
}

// ═══════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const authApi = {
  /** Iniciar sesión con email y contraseña */
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return data;
  },

  /** Registrar nuevo usuario */
  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw new Error(error.message);
    return data;
  },

  /** Cerrar sesión */
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  /** Obtener sesión actual */
  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    return data.session;
  },

  /** Obtener usuario actual */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error(error.message);
    return data.user;
  },
};

// ═══════════════════════════════════════════════════════════════════
// PROFILES ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const profilesApi = {
  /** Obtener perfil por ID */
  async getById(id: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Profile | null;
  },

  /** Obtener perfil por email */
  async getByEmail(email: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as Profile | null;
  },

  /** Obtener todos los perfiles */
  async getAll(): Promise<Profile[]> {
    return unwrap(await supabase.from('profiles').select('*').order('created_at', { ascending: false }));
  },

  /** Verificar si un usuario es admin */
  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .maybeSingle();
    if (error) return false;
    return Boolean((data as { is_admin?: boolean } | null)?.is_admin);
  },

  /** Actualizar perfil */
  async update(userId: string, updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) {
    return unwrap(
      await supabase.from('profiles').update(updates).eq('id', userId).select().single()
    );
  },

  /** Buscar perfiles por nombre */
  async search(query: string): Promise<Profile[]> {
    return unwrap(
      await supabase
        .from('profiles')
        .select('*')
        .ilike('full_name', `%${query}%`)
        .limit(20)
    );
  },
};

// ═══════════════════════════════════════════════════════════════════
// TOURS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const toursApi = {
  /** Obtener todas las ubicaciones de tours */
  async getAllLocations(): Promise<TourLocation[]> {
    return unwrap(await supabase.from('tour_locations').select('*').order('name'));
  },

  /** Obtener ubicación por slug */
  async getLocationBySlug(slug: string): Promise<TourLocation | null> {
    const { data, error } = await supabase
      .from('tour_locations')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as TourLocation | null;
  },

  /** Obtener escenas de una ubicación */
  async getScenes(locationId: string): Promise<TourScene[]> {
    return unwrap(
      await supabase
        .from('tour_scenes')
        .select('*')
        .eq('location_id', locationId)
        .order('order_index')
    );
  },

  /** Obtener hotspots de una escena */
  async getHotspots(sceneId: string): Promise<TourHotspot[]> {
    return unwrap(
      await supabase.from('tour_hotspots').select('*').eq('scene_id', sceneId)
    );
  },

  /** Obtener tour completo (ubicación + escenas + hotspots) */
  async getFullTour(slug: string) {
    const location = await this.getLocationBySlug(slug);
    if (!location) return null;

    const scenes = await this.getScenes(location.id);

    const scenesWithHotspots = await Promise.all(
      scenes.map(async (scene) => ({
        ...scene,
        hotspots: await this.getHotspots(scene.id),
      }))
    );

    return { location, scenes: scenesWithHotspots };
  },
};

// ═══════════════════════════════════════════════════════════════════
// COMMUNITY VIDEOS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const videosApi = {
  /** Obtener videos aprobados (feed público) */
  async getApproved(limit = 20, offset = 0): Promise<CommunityVideo[]> {
    return unwrap(
      await supabase
        .from('community_videos')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );
  },

  /** Obtener videos pendientes (para moderación) */
  async getPending(): Promise<CommunityVideo[]> {
    return unwrap(
      await supabase
        .from('community_videos')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    );
  },

  /** Obtener todos los videos (admin) */
  async getAll(): Promise<CommunityVideo[]> {
    return unwrap(
      await supabase
        .from('community_videos')
        .select('*, profiles(id, full_name, avatar_url)')
        .order('created_at', { ascending: false })
    );
  },

  /** Obtener video por ID */
  async getById(id: string): Promise<CommunityVideo | null> {
    const { data, error } = await supabase
      .from('community_videos')
      .select('*, profiles(id, full_name, avatar_url)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data as CommunityVideo | null;
  },

  /** Obtener videos de un usuario */
  async getByUser(userId: string): Promise<CommunityVideo[]> {
    return unwrap(
      await supabase
        .from('community_videos')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  /** Subir video (crear registro tras subir a Cloudinary) */
  async create(video: {
    user_id: string;
    title: string;
    video_url: string;
    thumbnail_url: string;
    cloudinary_id: string;
    duration_secs: number;
  }) {
    return unwrap(
      await supabase
        .from('community_videos')
        .insert({ ...video, status: 'pending' })
        .select()
        .single()
    );
  },

  /** Aprobar video (admin) */
  async approve(videoId: string, reviewerId: string) {
    return unwrap(
      await supabase
        .from('community_videos')
        .update({ status: 'approved', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
        .eq('id', videoId)
        .select()
        .single()
    );
  },

  /** Rechazar video (admin) */
  async reject(videoId: string, reviewerId: string) {
    return unwrap(
      await supabase
        .from('community_videos')
        .update({ status: 'rejected', reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
        .eq('id', videoId)
        .select()
        .single()
    );
  },

  /** Eliminar video */
  async delete(videoId: string) {
    const { error } = await supabase.from('community_videos').delete().eq('id', videoId);
    if (error) throw new Error(error.message);
  },
};

// ═══════════════════════════════════════════════════════════════════
// STORIES ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const storiesApi = {
  /** Obtener todos los relatos */
  async getAll(limit = 20, offset = 0): Promise<Story[]> {
    return unwrap(
      await supabase
        .from('stories')
        .select('*, profiles(id, full_name, avatar_url)')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
    );
  },

  /** Obtener relatos de un usuario */
  async getByUser(userId: string): Promise<Story[]> {
    return unwrap(
      await supabase
        .from('stories')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('author_id', userId)
        .order('created_at', { ascending: false })
    );
  },

  /** Crear un relato */
  async create(story: { author_id: string; title: string; content: string }) {
    return unwrap(
      await supabase.from('stories').insert(story).select().single()
    );
  },

  /** Eliminar un relato */
  async delete(storyId: string) {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (error) throw new Error(error.message);
  },
};

// ═══════════════════════════════════════════════════════════════════
// COMMENTS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const commentsApi = {
  /** Obtener comentarios de un video */
  async getForVideo(videoId: string): Promise<VideoComment[]> {
    return unwrap(
      await supabase
        .from('video_comments')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('video_id', videoId)
        .order('created_at', { ascending: true })
    );
  },

  /** Obtener comentarios de un relato */
  async getForStory(storyId: string): Promise<StoryComment[]> {
    return unwrap(
      await supabase
        .from('story_comments')
        .select('*, profiles(id, full_name, avatar_url)')
        .eq('story_id', storyId)
        .order('created_at', { ascending: true })
    );
  },

  /** Agregar comentario a un video */
  async addToVideo(comment: { video_id: string; user_id: string; content: string; parent_id?: string }) {
    return unwrap(
      await supabase.from('video_comments').insert(comment).select().single()
    );
  },

  /** Agregar comentario a un relato */
  async addToStory(comment: { story_id: string; user_id: string; content: string; parent_id?: string }) {
    return unwrap(
      await supabase.from('story_comments').insert(comment).select().single()
    );
  },

  /** Eliminar comentario de video */
  async deleteVideoComment(commentId: string) {
    const { error } = await supabase.from('video_comments').delete().eq('id', commentId);
    if (error) throw new Error(error.message);
  },

  /** Eliminar comentario de relato */
  async deleteStoryComment(commentId: string) {
    const { error } = await supabase.from('story_comments').delete().eq('id', commentId);
    if (error) throw new Error(error.message);
  },
};

// ═══════════════════════════════════════════════════════════════════
// REACTIONS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const reactionsApi = {
  /** Obtener reacciones de un video */
  async getForVideo(videoId: string): Promise<Reaction[]> {
    return unwrap(
      await supabase.from('video_reactions').select('*').eq('video_id', videoId)
    );
  },

  /** Obtener reacciones de un relato */
  async getForStory(storyId: string): Promise<Reaction[]> {
    return unwrap(
      await supabase.from('story_reactions').select('*').eq('story_id', storyId)
    );
  },

  /** Dar/quitar reacción a un video (toggle) */
  async toggleVideoReaction(videoId: string, userId: string, emoji = '❤️') {
    // Verificar si ya existe
    const { data: existing } = await supabase
      .from('video_reactions')
      .select('id')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('video_reactions').delete().eq('id', existing.id);
      return { action: 'removed' as const };
    } else {
      await supabase.from('video_reactions').insert({ video_id: videoId, user_id: userId, emoji });
      return { action: 'added' as const };
    }
  },

  /** Dar/quitar reacción a un relato (toggle) */
  async toggleStoryReaction(storyId: string, userId: string, emoji = '❤️') {
    const { data: existing } = await supabase
      .from('story_reactions')
      .select('id')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      await supabase.from('story_reactions').delete().eq('id', existing.id);
      return { action: 'removed' as const };
    } else {
      await supabase.from('story_reactions').insert({ story_id: storyId, user_id: userId, emoji });
      return { action: 'added' as const };
    }
  },
};

// ═══════════════════════════════════════════════════════════════════
// TOUR RATINGS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const ratingsApi = {
  /** Obtener calificaciones de un tour */
  async getForTour(tourSlug: string): Promise<TourRating[]> {
    return unwrap(
      await supabase.from('tour_ratings').select('*').eq('tour_slug', tourSlug)
    );
  },

  /** Obtener promedio y conteo de un tour */
  async getStats(tourSlug: string): Promise<{ average: number; count: number }> {
    const ratings = await this.getForTour(tourSlug);
    if (ratings.length === 0) return { average: 0, count: 0 };
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return { average: sum / ratings.length, count: ratings.length };
  },

  /** Obtener calificación de un usuario para un tour */
  async getUserRating(tourSlug: string, userId: string): Promise<number | null> {
    const { data } = await supabase
      .from('tour_ratings')
      .select('rating')
      .eq('tour_slug', tourSlug)
      .eq('user_id', userId)
      .maybeSingle();
    return (data as { rating: number } | null)?.rating ?? null;
  },

  /** Calificar un tour (upsert) */
  async rate(tourSlug: string, userId: string, rating: number) {
    return unwrap(
      await supabase
        .from('tour_ratings')
        .upsert({ tour_slug: tourSlug, user_id: userId, rating }, { onConflict: 'tour_slug,user_id' })
        .select()
        .single()
    );
  },
};

// ═══════════════════════════════════════════════════════════════════
// SOCIAL / FOLLOWS ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

export const socialApi = {
  /** Obtener seguidores de un usuario */
  async getFollowers(userId: string): Promise<Follow[]> {
    return unwrap(
      await supabase.from('profile_follows').select('*').eq('following_id', userId)
    );
  },

  /** Obtener seguidos por un usuario */
  async getFollowing(userId: string): Promise<Follow[]> {
    return unwrap(
      await supabase.from('profile_follows').select('*').eq('follower_id', userId)
    );
  },

  /** Verificar si un usuario sigue a otro */
  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const { data } = await supabase
      .from('profile_follows')
      .select('follower_id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    return data !== null;
  },

  /** Seguir a un usuario */
  async follow(followerId: string, followingId: string) {
    return unwrap(
      await supabase
        .from('profile_follows')
        .insert({ follower_id: followerId, following_id: followingId })
        .select()
        .single()
    );
  },

  /** Dejar de seguir a un usuario */
  async unfollow(followerId: string, followingId: string) {
    const { error } = await supabase
      .from('profile_follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId);
    if (error) throw new Error(error.message);
  },

  /** Obtener conteo de seguidores y seguidos */
  async getCounts(userId: string): Promise<{ followers: number; following: number }> {
    const [followers, following] = await Promise.all([
      this.getFollowers(userId),
      this.getFollowing(userId),
    ]);
    return { followers: followers.length, following: following.length };
  },
};
