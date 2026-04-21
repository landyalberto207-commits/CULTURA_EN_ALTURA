import { describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { videosApi, profilesApi, toursApi } from '@/lib/api';

const SUPABASE_URL = 'https://test-project.supabase.co';

describe('Manejo de errores de red', () => {
  it('maneja error de red en perfiles', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
        return HttpResponse.json(
          { message: 'Internal Server Error', code: '500' },
          { status: 500 }
        );
      })
    );

    await expect(profilesApi.getAll()).rejects.toThrow();
  });

  it('maneja error de red en videos', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/community_videos`, () => {
        return HttpResponse.json(
          { message: 'Service Unavailable' },
          { status: 503 }
        );
      })
    );

    await expect(videosApi.getAll()).rejects.toThrow();
  });

  it('maneja error de red en tours', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tour_locations`, () => {
        return HttpResponse.json(
          { message: 'Timeout' },
          { status: 504 }
        );
      })
    );

    await expect(toursApi.getAllLocations()).rejects.toThrow();
  });
});

describe('Manejo de errores de autenticación', () => {
  it('maneja token expirado (401)', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/profiles`, () => {
        return HttpResponse.json(
          { message: 'JWT expired' },
          { status: 401 }
        );
      })
    );

    await expect(profilesApi.getAll()).rejects.toThrow();
  });

  it('maneja permisos insuficientes (403)', async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/community_videos`, () => {
        return HttpResponse.json(
          { message: 'new row violates row-level security policy' },
          { status: 403 }
        );
      })
    );

    // El approve debería fallar si no es admin
    await expect(videosApi.approve('video-1', 'user-1')).rejects.toThrow();
  });
});

describe('Manejo de datos vacíos', () => {
  it('retorna array vacío cuando no hay videos', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/community_videos`, () => {
        return HttpResponse.json([]);
      })
    );

    const videos = await videosApi.getApproved();
    expect(videos).toEqual([]);
  });

  it('retorna array vacío cuando no hay tours', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tour_locations`, () => {
        return HttpResponse.json([]);
      })
    );

    const locations = await toursApi.getAllLocations();
    expect(locations).toEqual([]);
  });

  it('retorna stats en cero cuando no hay calificaciones', async () => {
    server.use(
      http.get(`${SUPABASE_URL}/rest/v1/tour_ratings`, () => {
        return HttpResponse.json([]);
      })
    );

    const { ratingsApi } = await import('@/lib/api');
    const stats = await ratingsApi.getStats('catedral');
    expect(stats.average).toBe(0);
    expect(stats.count).toBe(0);
  });
});

describe('Validación de límites de datos', () => {
  it('respeta paginación en videos', async () => {
    const videos = await videosApi.getApproved(5, 0);
    expect(Array.isArray(videos)).toBe(true);
  });

  it('respeta paginación en stories', async () => {
    const { storiesApi } = await import('@/lib/api');
    const stories = await storiesApi.getAll(10, 0);
    expect(Array.isArray(stories)).toBe(true);
  });
});
