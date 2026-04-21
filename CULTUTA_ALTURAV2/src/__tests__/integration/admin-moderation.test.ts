import { describe, it, expect } from 'vitest';
import { videosApi } from '@/lib/api';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

const SUPABASE_URL = 'https://test-project.supabase.co';

describe('Flujo de moderación de videos (admin)', () => {
  it('admin obtiene videos pendientes', async () => {
    const pending = await videosApi.getPending();
    expect(Array.isArray(pending)).toBe(true);
    pending.forEach((v) => expect(v.status).toBe('pending'));
  });

  it('admin aprueba un video', async () => {
    const result = await videosApi.approve('video-2', 'admin-1');
    expect(result).toBeDefined();
    expect(result.status).toBe('approved');
    expect(result.reviewed_by).toBe('admin-1');
  });

  it('admin rechaza un video', async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/community_videos`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        return HttpResponse.json({
          id: 'video-2',
          ...body,
          status: body.status,
        });
      })
    );

    const result = await videosApi.reject('video-2', 'admin-1');
    expect(result).toBeDefined();
    expect(result.status).toBe('rejected');
    expect(result.reviewed_by).toBe('admin-1');
  });

  it('admin obtiene todos los videos (todos los estados)', async () => {
    const all = await videosApi.getAll();
    expect(Array.isArray(all)).toBe(true);
    const statuses = new Set(all.map((v) => v.status));
    // Debería haber al menos approved y pending en los mocks
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('admin elimina un video', async () => {
    // No debería lanzar error
    await expect(videosApi.delete('video-1')).resolves.not.toThrow();
  });

  it('error al aprobar video inexistente devuelve error', async () => {
    server.use(
      http.patch(`${SUPABASE_URL}/rest/v1/community_videos`, () => {
        return HttpResponse.json(
          { message: 'No rows found', code: 'PGRST116' },
          { status: 406 }
        );
      })
    );

    await expect(videosApi.approve('nonexistent', 'admin-1')).rejects.toThrow();
  });
});
