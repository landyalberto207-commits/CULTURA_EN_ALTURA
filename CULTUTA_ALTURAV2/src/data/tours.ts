/* ══════════════════════════════════════════════════════════════════
   TOUR DATA — Types & Supabase API for tour narration
   Audio files are pre-generated via scripts/generate-audio.mjs
   Data is fetched from Supabase REST API (tour_locations, tour_scenes, tour_hotspots)
   ══════════════════════════════════════════════════════════════════ */

import { supabase } from '../lib/supabase';

export interface TourHotspot {
  label: string;
  description: string;
}

export interface TourScene {
  id: number;
  title: string;
  subtitle: string;
  narration: string;
  hotspots: TourHotspot[];
  audioFile: string;
}

export interface TourLocation {
  id: string;
  name: string;
  shortName: string;
  description: string;
  scenes: TourScene[];
}

/* ── Supabase row types ── */
interface DBLocation {
  id: string;
  name: string;
  short_name: string;
  description: string;
}

interface DBScene {
  id: number;
  location_id: string;
  scene_order: number;
  title: string;
  subtitle: string;
  narration: string;
  audio_file: string;
}

interface DBHotspot {
  id: number;
  scene_id: number;
  label: string;
  description: string;
  hotspot_order: number;
}

/* ── In-memory cache to avoid re-fetching on every scene change ── */
const cache = new Map<string, TourLocation>();

/* ── Fetch a single tour location with scenes & hotspots ── */
export async function fetchTourLocation(locationId: string): Promise<TourLocation | null> {
  // Return cached if available
  if (cache.has(locationId)) return cache.get(locationId)!;

  // Fetch location
  const { data: loc, error: locErr } = await supabase
    .from('tour_locations')
    .select('*')
    .eq('id', locationId)
    .single<DBLocation>();

  if (locErr || !loc) return null;

  // Fetch scenes ordered
  const { data: scenes, error: scenesErr } = await supabase
    .from('tour_scenes')
    .select('*')
    .eq('location_id', locationId)
    .order('scene_order', { ascending: true })
    .returns<DBScene[]>();

  if (scenesErr || !scenes) return null;

  // Fetch all hotspots for these scenes in one query
  const sceneIds = scenes.map((s) => s.id);
  const { data: hotspots } = await supabase
    .from('tour_hotspots')
    .select('*')
    .in('scene_id', sceneIds)
    .order('hotspot_order', { ascending: true })
    .returns<DBHotspot[]>();

  // Group hotspots by scene_id
  const hotspotMap = new Map<number, TourHotspot[]>();
  for (const h of hotspots ?? []) {
    const arr = hotspotMap.get(h.scene_id) ?? [];
    arr.push({ label: h.label, description: h.description });
    hotspotMap.set(h.scene_id, arr);
  }

  const result: TourLocation = {
    id: loc.id,
    name: loc.name,
    shortName: loc.short_name,
    description: loc.description,
    scenes: scenes.map((s) => ({
      id: s.scene_order,
      title: s.title,
      subtitle: s.subtitle,
      narration: s.narration,
      hotspots: hotspotMap.get(s.id) ?? [],
      audioFile: s.audio_file,
    })),
  };

  // Cache the result
  cache.set(locationId, result);
  return result;
}

/* ── Fetch all tour locations (without scenes — for listings) ── */
export async function fetchAllTourLocations(): Promise<Pick<TourLocation, 'id' | 'name' | 'shortName' | 'description'>[]> {
  const { data, error } = await supabase
    .from('tour_locations')
    .select('id, name, short_name, description')
    .returns<DBLocation[]>();

  if (error || !data) return [];

  return data.map((loc) => ({
    id: loc.id,
    name: loc.name,
    shortName: loc.short_name,
    description: loc.description,
  }));
}
