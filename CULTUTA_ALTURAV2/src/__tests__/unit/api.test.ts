import { describe, it, expect, vi, beforeEach } from 'vitest';
import { profilesApi, toursApi, videosApi, storiesApi, commentsApi, reactionsApi, ratingsApi, socialApi } from '@/lib/api';

describe('profilesApi', () => {
  it('getAll() devuelve lista de perfiles', async () => {
    const profiles = await profilesApi.getAll();
    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles.length).toBeGreaterThanOrEqual(1);
  });

  it('getById() devuelve perfil existente', async () => {
    const profile = await profilesApi.getById('user-1');
    expect(profile).not.toBeNull();
    expect(profile?.full_name).toBe('Usuario de Prueba');
  });

  it('getById() devuelve null para ID inexistente', async () => {
    const profile = await profilesApi.getById('nonexistent');
    expect(profile).toBeNull();
  });

  it('isAdmin() devuelve true para admin', async () => {
    const isAdmin = await profilesApi.isAdmin('admin-1');
    expect(isAdmin).toBe(true);
  });

  it('isAdmin() devuelve false para usuario normal', async () => {
    const isAdmin = await profilesApi.isAdmin('user-1');
    expect(isAdmin).toBe(false);
  });
});

describe('toursApi', () => {
  it('getAllLocations() devuelve lista de ubicaciones', async () => {
    const locations = await toursApi.getAllLocations();
    expect(Array.isArray(locations)).toBe(true);
    expect(locations.length).toBe(3);
  });

  it('getLocationBySlug() devuelve ubicación correcta', async () => {
    const loc = await toursApi.getLocationBySlug('catedral');
    expect(loc).not.toBeNull();
    expect(loc?.slug).toBe('catedral');
  });

  it('getLocationBySlug() devuelve null para slug inexistente', async () => {
    const loc = await toursApi.getLocationBySlug('noexiste');
    expect(loc).toBeNull();
  });

  it('getScenes() devuelve escenas de una ubicación', async () => {
    const scenes = await toursApi.getScenes('loc-catedral');
    expect(Array.isArray(scenes)).toBe(true);
    expect(scenes.length).toBeGreaterThanOrEqual(1);
  });

  it('getHotspots() devuelve hotspots de una escena', async () => {
    const hotspots = await toursApi.getHotspots('scene-1');
    expect(Array.isArray(hotspots)).toBe(true);
  });
});

describe('videosApi', () => {
  it('getApproved() devuelve solo videos aprobados', async () => {
    const videos = await videosApi.getApproved();
    expect(Array.isArray(videos)).toBe(true);
    for (const v of videos) {
      expect(v.status).toBe('approved');
    }
  });

  it('getPending() devuelve solo videos pendientes', async () => {
    const videos = await videosApi.getPending();
    expect(Array.isArray(videos)).toBe(true);
    for (const v of videos) {
      expect(v.status).toBe('pending');
    }
  });

  it('getAll() devuelve todos los videos', async () => {
    const videos = await videosApi.getAll();
    expect(Array.isArray(videos)).toBe(true);
  });

  it('create() crea un video con status pending', async () => {
    const video = await videosApi.create({
      user_id: 'user-1',
      title: 'Nuevo video',
      video_url: 'https://example.com/video.mp4',
      thumbnail_url: 'https://example.com/thumb.jpg',
      cloudinary_id: 'test-id',
      duration_secs: 30,
    });
    expect(video).toBeDefined();
    expect(video.status).toBe('pending');
  });
});

describe('storiesApi', () => {
  it('getAll() devuelve lista de relatos', async () => {
    const stories = await storiesApi.getAll();
    expect(Array.isArray(stories)).toBe(true);
  });

  it('create() crea un relato nuevo', async () => {
    const story = await storiesApi.create({
      author_id: 'user-1',
      title: 'Mi historia',
      content: 'Este es el contenido de mi historia de prueba que debe tener más de veinte caracteres.',
    });
    expect(story).toBeDefined();
  });
});

describe('commentsApi', () => {
  it('getForVideo() devuelve comentarios de un video', async () => {
    const comments = await commentsApi.getForVideo('video-1');
    expect(Array.isArray(comments)).toBe(true);
  });

  it('addToVideo() agrega un comentario', async () => {
    const comment = await commentsApi.addToVideo({
      video_id: 'video-1',
      user_id: 'user-1',
      content: 'Comentario de prueba',
    });
    expect(comment).toBeDefined();
  });
});

describe('reactionsApi', () => {
  it('getForVideo() devuelve reacciones', async () => {
    const reactions = await reactionsApi.getForVideo('video-1');
    expect(Array.isArray(reactions)).toBe(true);
  });
});

describe('ratingsApi', () => {
  it('getForTour() devuelve calificaciones', async () => {
    const ratings = await ratingsApi.getForTour('catedral');
    expect(Array.isArray(ratings)).toBe(true);
  });

  it('getStats() calcula promedio correctamente', async () => {
    const stats = await ratingsApi.getStats('catedral');
    expect(stats.average).toBeGreaterThanOrEqual(0);
    expect(stats.average).toBeLessThanOrEqual(5);
    expect(stats.count).toBeGreaterThanOrEqual(0);
  });
});

describe('socialApi', () => {
  it('getFollowers() devuelve lista de seguidores', async () => {
    const followers = await socialApi.getFollowers('admin-1');
    expect(Array.isArray(followers)).toBe(true);
  });

  it('getFollowing() devuelve lista de seguidos', async () => {
    const following = await socialApi.getFollowing('user-1');
    expect(Array.isArray(following)).toBe(true);
  });

  it('getCounts() devuelve conteos', async () => {
    const counts = await socialApi.getCounts('user-1');
    expect(counts).toHaveProperty('followers');
    expect(counts).toHaveProperty('following');
    expect(typeof counts.followers).toBe('number');
    expect(typeof counts.following).toBe('number');
  });
});
