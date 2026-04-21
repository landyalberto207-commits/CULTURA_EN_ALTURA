import { describe, it, expect } from 'vitest';
import { toursApi, ratingsApi } from '@/lib/api';

describe('Flujo de recorridos 3D', () => {
  it('obtener todas las ubicaciones de tours', async () => {
    const locations = await toursApi.getAllLocations();
    expect(locations.length).toBe(3);

    const slugs = locations.map((l) => l.slug);
    expect(slugs).toContain('catedral');
    expect(slugs).toContain('ferrocarril');
    expect(slugs).toContain('huapalcalco');
  });

  it('obtener tour de catedral con escenas', async () => {
    const location = await toursApi.getLocationBySlug('catedral');
    expect(location).not.toBeNull();
    expect(location?.name).toContain('Catedral');

    const scenes = await toursApi.getScenes(location!.id);
    expect(scenes.length).toBeGreaterThanOrEqual(1);
    expect(scenes[0]).toHaveProperty('title');
    expect(scenes[0]).toHaveProperty('description');
  });

  it('obtener hotspots de una escena', async () => {
    const hotspots = await toursApi.getHotspots('scene-1');
    expect(Array.isArray(hotspots)).toBe(true);
    if (hotspots.length > 0) {
      expect(hotspots[0]).toHaveProperty('label');
      expect(hotspots[0]).toHaveProperty('description');
      expect(hotspots[0]).toHaveProperty('x');
      expect(hotspots[0]).toHaveProperty('y');
      expect(hotspots[0]).toHaveProperty('z');
    }
  });
});

describe('Flujo de calificaciones de tour', () => {
  it('obtener calificaciones de un tour', async () => {
    const ratings = await ratingsApi.getForTour('catedral');
    expect(Array.isArray(ratings)).toBe(true);
  });

  it('calcular estadísticas de calificaciones', async () => {
    const stats = await ratingsApi.getStats('catedral');
    expect(stats).toHaveProperty('average');
    expect(stats).toHaveProperty('count');
    expect(stats.average).toBeGreaterThanOrEqual(0);
    expect(stats.average).toBeLessThanOrEqual(5);
  });

  it('calificar un tour (upsert)', async () => {
    const rating = await ratingsApi.rate('catedral', 'user-1', 4);
    expect(rating).toBeDefined();
  });
});
