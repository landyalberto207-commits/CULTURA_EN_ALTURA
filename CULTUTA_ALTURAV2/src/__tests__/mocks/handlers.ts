import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://test-project.supabase.co';

// ─── Datos de prueba ────────────────────────────────────────────────
export const mockProfiles = [
  {
    id: 'user-1',
    email: 'test@example.com',
    full_name: 'Usuario de Prueba',
    is_admin: false,
    avatar_url: null,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'admin-1',
    email: 'admin@example.com',
    full_name: 'Admin de Prueba',
    is_admin: true,
    avatar_url: null,
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockTourLocations = [
  {
    id: 'loc-catedral',
    slug: 'catedral',
    name: 'Catedral de Tulancingo',
    description: 'Catedral histórica del siglo XVI',
    cover_url: 'https://example.com/catedral.jpg',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'loc-ferrocarril',
    slug: 'ferrocarril',
    name: 'Museo del Ferrocarril',
    description: 'Antigua estación de trenes',
    cover_url: 'https://example.com/ferrocarril.jpg',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'loc-huapalcalco',
    slug: 'huapalcalco',
    name: 'Pirámides de Huapalcalco',
    description: 'Zona arqueológica prehispánica',
    cover_url: 'https://example.com/huapalcalco.jpg',
    created_at: '2025-01-01T00:00:00Z',
  },
];

export const mockTourScenes = [
  {
    id: 'scene-1',
    location_id: 'loc-catedral',
    order_index: 0,
    title: 'Fachada Principal',
    description: 'Vista frontal de la catedral',
    narration: 'La catedral de Tulancingo...',
    audio_url: '/audio/catedral/escena1.mp3',
  },
  {
    id: 'scene-2',
    location_id: 'loc-catedral',
    order_index: 1,
    title: 'Interior del Templo',
    description: 'Nave central',
    narration: 'El interior revela...',
    audio_url: '/audio/catedral/escena2.mp3',
  },
];

export const mockHotspots = [
  {
    id: 'hotspot-1',
    scene_id: 'scene-1',
    label: 'Campanario',
    description: 'Torre de la campana principal',
    x: 0.5,
    y: 0.8,
    z: 0.2,
  },
];

export const mockVideos = [
  {
    id: 'video-1',
    user_id: 'user-1',
    title: 'Mi visita a la catedral',
    video_url: 'https://res.cloudinary.com/test/video/upload/v1/test.mp4',
    thumbnail_url: 'https://res.cloudinary.com/test/video/upload/so_2/test.jpg',
    cloudinary_id: 'test-video-1',
    duration_secs: 60,
    status: 'approved',
    created_at: '2025-06-01T00:00:00Z',
    profiles: { id: 'user-1', full_name: 'Usuario de Prueba', avatar_url: null },
  },
  {
    id: 'video-2',
    user_id: 'user-1',
    title: 'Video pendiente',
    video_url: 'https://res.cloudinary.com/test/video/upload/v1/pending.mp4',
    thumbnail_url: 'https://res.cloudinary.com/test/video/upload/so_2/pending.jpg',
    cloudinary_id: 'test-video-2',
    duration_secs: 30,
    status: 'pending',
    created_at: '2025-06-02T00:00:00Z',
    profiles: { id: 'user-1', full_name: 'Usuario de Prueba', avatar_url: null },
  },
];

export const mockStories = [
  {
    id: 'story-1',
    author_id: 'user-1',
    title: 'Mi experiencia cultural',
    content: 'Visité la catedral de Tulancingo y fue una experiencia increíble...',
    created_at: '2025-06-01T00:00:00Z',
    profiles: { id: 'user-1', full_name: 'Usuario de Prueba', avatar_url: null },
  },
];

export const mockComments = [
  {
    id: 'comment-1',
    video_id: 'video-1',
    user_id: 'user-1',
    content: 'Excelente video!',
    parent_id: null,
    created_at: '2025-06-01T12:00:00Z',
    profiles: { id: 'user-1', full_name: 'Usuario de Prueba', avatar_url: null },
  },
];

export const mockReactions = [
  {
    id: 'reaction-1',
    video_id: 'video-1',
    user_id: 'user-1',
    emoji: '❤️',
    created_at: '2025-06-01T12:00:00Z',
  },
];

export const mockTourRatings = [
  {
    id: 'rating-1',
    user_id: 'user-1',
    tour_slug: 'catedral',
    rating: 5,
    created_at: '2025-06-01T00:00:00Z',
  },
];

export const mockFollows = [
  {
    follower_id: 'user-1',
    following_id: 'admin-1',
    created_at: '2025-06-01T00:00:00Z',
  },
];

// ─── Helper para parsear query params de Supabase REST ──────────────
function parseSupabaseTable(url: URL): string {
  return url.pathname.replace('/rest/v1/', '').split('?')[0];
}

function getSelectParam(url: URL): string | null {
  return url.searchParams.get('select');
}

// ─── Handlers ───────────────────────────────────────────────────────
export const handlers = [
  // ── Auth ──────────────────────────────────────────────────────────
  http.post(`${SUPABASE_URL}/auth/v1/token`, async ({ request }) => {
    const url = new URL(request.url);
    const grantType = url.searchParams.get('grant_type');

    if (grantType === 'password') {
      const body = (await request.json()) as { email?: string; password?: string };

      if (body.email === 'admin@example.com' && body.password === 'admin123') {
        return HttpResponse.json({
          access_token: 'mock-admin-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: {
            id: 'admin-1',
            email: 'admin@example.com',
            role: 'authenticated',
            user_metadata: { full_name: 'Admin de Prueba' },
          },
        });
      }

      if (body.email === 'test@example.com' && body.password === 'test123') {
        return HttpResponse.json({
          access_token: 'mock-user-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: {
            id: 'user-1',
            email: 'test@example.com',
            role: 'authenticated',
            user_metadata: { full_name: 'Usuario de Prueba' },
          },
        });
      }

      return HttpResponse.json(
        { error: 'invalid_grant', error_description: 'Invalid login credentials' },
        { status: 400 }
      );
    }

    return HttpResponse.json({ error: 'unsupported_grant_type' }, { status: 400 });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/signup`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error: 'user_already_exists', message: 'User already registered' },
        { status: 422 }
      );
    }

    return HttpResponse.json({
      id: 'new-user-1',
      email: body.email,
      role: 'authenticated',
      user_metadata: {},
    });
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({});
  }),

  http.get(`${SUPABASE_URL}/auth/v1/session`, () => {
    return HttpResponse.json({ data: { session: null } });
  }),

  // ── Supabase REST API (PostgREST) ────────────────────────────────
  http.get(`${SUPABASE_URL}/rest/v1/:table`, ({ params, request }) => {
    const table = params.table as string;
    const url = new URL(request.url);
    const select = getSelectParam(url);

    switch (table) {
      case 'profiles': {
        const idFilter = url.searchParams.get('id');
        if (idFilter) {
          const id = idFilter.replace('eq.', '');
          const profile = mockProfiles.find((p) => p.id === id);
          return HttpResponse.json(profile ? [profile] : []);
        }
        if (select?.includes('is_admin')) {
          const emailFilter = url.searchParams.get('email');
          if (emailFilter) {
            const email = emailFilter.replace('eq.', '');
            const profile = mockProfiles.find((p) => p.email === email);
            return HttpResponse.json(profile ? [profile] : []);
          }
        }
        return HttpResponse.json(mockProfiles);
      }

      case 'tour_locations': {
        const slugFilter = url.searchParams.get('slug');
        if (slugFilter) {
          const slug = slugFilter.replace('eq.', '');
          const loc = mockTourLocations.find((l) => l.slug === slug);
          return HttpResponse.json(loc ? [loc] : []);
        }
        return HttpResponse.json(mockTourLocations);
      }

      case 'tour_scenes': {
        const locFilter = url.searchParams.get('location_id');
        if (locFilter) {
          const locId = locFilter.replace('eq.', '');
          return HttpResponse.json(mockTourScenes.filter((s) => s.location_id === locId));
        }
        return HttpResponse.json(mockTourScenes);
      }

      case 'tour_hotspots': {
        const sceneFilter = url.searchParams.get('scene_id');
        if (sceneFilter) {
          const sceneId = sceneFilter.replace('eq.', '');
          return HttpResponse.json(mockHotspots.filter((h) => h.scene_id === sceneId));
        }
        return HttpResponse.json(mockHotspots);
      }

      case 'community_videos': {
        const statusFilter = url.searchParams.get('status');
        if (statusFilter) {
          const status = statusFilter.replace('eq.', '');
          return HttpResponse.json(mockVideos.filter((v) => v.status === status));
        }
        return HttpResponse.json(mockVideos);
      }

      case 'stories':
        return HttpResponse.json(mockStories);

      case 'video_comments':
        return HttpResponse.json(mockComments);

      case 'story_comments':
        return HttpResponse.json(mockComments);

      case 'video_reactions':
        return HttpResponse.json(mockReactions);

      case 'story_reactions':
        return HttpResponse.json(mockReactions);

      case 'tour_ratings': {
        const slugFilter = url.searchParams.get('tour_slug');
        if (slugFilter) {
          const slug = slugFilter.replace('eq.', '');
          return HttpResponse.json(mockTourRatings.filter((r) => r.tour_slug === slug));
        }
        return HttpResponse.json(mockTourRatings);
      }

      case 'profile_follows':
        return HttpResponse.json(mockFollows);

      default:
        return HttpResponse.json([]);
    }
  }),

  // POST (insert)
  http.post(`${SUPABASE_URL}/rest/v1/:table`, async ({ params, request }) => {
    const table = params.table as string;
    const body = await request.json();

    switch (table) {
      case 'community_videos':
        return HttpResponse.json(
          { id: 'new-video-1', ...(body as object), status: 'pending', created_at: new Date().toISOString() },
          { status: 201 }
        );

      case 'stories':
        return HttpResponse.json(
          { id: 'new-story-1', ...(body as object), created_at: new Date().toISOString() },
          { status: 201 }
        );

      case 'video_comments':
      case 'story_comments':
        return HttpResponse.json(
          { id: 'new-comment-1', ...(body as object), created_at: new Date().toISOString() },
          { status: 201 }
        );

      case 'video_reactions':
      case 'story_reactions':
        return HttpResponse.json(
          { id: 'new-reaction-1', ...(body as object), created_at: new Date().toISOString() },
          { status: 201 }
        );

      case 'tour_ratings':
        return HttpResponse.json(
          { id: 'new-rating-1', ...(body as object), created_at: new Date().toISOString() },
          { status: 201 }
        );

      case 'profile_follows':
        return HttpResponse.json(
          { ...(body as object), created_at: new Date().toISOString() },
          { status: 201 }
        );

      default:
        return HttpResponse.json({ ...(body as object) }, { status: 201 });
    }
  }),

  // PATCH (update)
  http.patch(`${SUPABASE_URL}/rest/v1/:table`, async ({ params, request }) => {
    const table = params.table as string;
    const body = await request.json();

    if (table === 'community_videos') {
      return HttpResponse.json({ ...(body as object) });
    }

    if (table === 'profiles') {
      return HttpResponse.json({ ...(body as object) });
    }

    return HttpResponse.json({ ...(body as object) });
  }),

  // DELETE
  http.delete(`${SUPABASE_URL}/rest/v1/:table`, ({ params }) => {
    return HttpResponse.json({}, { status: 200 });
  }),

  // ── Supabase RPC (funciones) ─────────────────────────────────────
  http.post(`${SUPABASE_URL}/rest/v1/rpc/:funcName`, async ({ params, request }) => {
    const funcName = params.funcName as string;

    switch (funcName) {
      case 'get_video_stats':
        return HttpResponse.json({
          total_videos: 10,
          pending_videos: 2,
          approved_videos: 7,
          rejected_videos: 1,
        });

      case 'get_user_stats':
        return HttpResponse.json({
          total_users: 50,
          active_users: 30,
        });

      default:
        return HttpResponse.json({});
    }
  }),

  // ── Cloudinary ────────────────────────────────────────────────────
  http.post('https://api.cloudinary.com/v1_1/:cloudName/video/upload', () => {
    return HttpResponse.json({
      secure_url: 'https://res.cloudinary.com/test/video/upload/v1/mock-video.mp4',
      public_id: 'mock-video-id',
      duration: 45,
      bytes: 5000000,
      eager: [
        { secure_url: 'https://res.cloudinary.com/test/video/upload/so_2/mock-thumb.jpg' },
      ],
    });
  }),

  http.post('https://api.cloudinary.com/v1_1/:cloudName/image/upload', () => {
    return HttpResponse.json({
      secure_url: 'https://res.cloudinary.com/test/image/upload/v1/mock-image.jpg',
      public_id: 'mock-image-id',
      bytes: 500000,
    });
  }),
];
