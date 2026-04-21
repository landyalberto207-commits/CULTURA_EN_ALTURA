import { describe, it, expect } from 'vitest';
import { socialApi, profilesApi, storiesApi } from '@/lib/api';

describe('Flujo social (seguidores)', () => {
  it('obtener seguidores de un usuario', async () => {
    const followers = await socialApi.getFollowers('admin-1');
    expect(Array.isArray(followers)).toBe(true);
  });

  it('obtener seguidos de un usuario', async () => {
    const following = await socialApi.getFollowing('user-1');
    expect(Array.isArray(following)).toBe(true);
  });

  it('obtener conteos de seguidores/seguidos', async () => {
    const counts = await socialApi.getCounts('user-1');
    expect(typeof counts.followers).toBe('number');
    expect(typeof counts.following).toBe('number');
  });

  it('seguir a un usuario', async () => {
    const result = await socialApi.follow('user-1', 'admin-1');
    expect(result).toBeDefined();
  });
});

describe('Flujo de perfiles', () => {
  it('obtener todos los perfiles', async () => {
    const profiles = await profilesApi.getAll();
    expect(profiles.length).toBeGreaterThanOrEqual(1);
    profiles.forEach((p) => {
      expect(p).toHaveProperty('id');
      expect(p).toHaveProperty('full_name');
      expect(p).toHaveProperty('email');
    });
  });

  it('obtener perfil por ID', async () => {
    const profile = await profilesApi.getById('user-1');
    expect(profile).not.toBeNull();
    expect(profile?.full_name).toBe('Usuario de Prueba');
    expect(profile?.is_admin).toBe(false);
  });

  it('obtener perfil de admin', async () => {
    const profile = await profilesApi.getById('admin-1');
    expect(profile).not.toBeNull();
    expect(profile?.is_admin).toBe(true);
  });
});

describe('Flujo de relatos', () => {
  it('obtener todos los relatos', async () => {
    const stories = await storiesApi.getAll();
    expect(Array.isArray(stories)).toBe(true);
  });

  it('crear un relato', async () => {
    const story = await storiesApi.create({
      author_id: 'user-1',
      title: 'Mi visita a Tulancingo',
      content: 'Fue una experiencia increíble visitar los sitios patrimoniales de Tulancingo...',
    });
    expect(story).toBeDefined();
  });

  it('obtener relatos de un usuario', async () => {
    const stories = await storiesApi.getByUser('user-1');
    expect(Array.isArray(stories)).toBe(true);
  });
});
