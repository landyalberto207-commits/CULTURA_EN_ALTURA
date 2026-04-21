import { describe, it, expect } from 'vitest';
import { videosApi, commentsApi, reactionsApi } from '@/lib/api';

describe('Flujo de video comunitario completo', () => {
  it('crear video → queda en pendiente', async () => {
    const video = await videosApi.create({
      user_id: 'user-1',
      title: 'Mi video de prueba',
      video_url: 'https://example.com/video.mp4',
      thumbnail_url: 'https://example.com/thumb.jpg',
      cloudinary_id: 'test-cld-id',
      duration_secs: 45,
    });

    expect(video).toBeDefined();
    expect(video.status).toBe('pending');
    expect(video.title).toBe('Mi video de prueba');
  });

  it('obtener feed de videos aprobados', async () => {
    const videos = await videosApi.getApproved();
    expect(Array.isArray(videos)).toBe(true);
    videos.forEach((v) => {
      expect(v.status).toBe('approved');
      expect(v.video_url).toBeTruthy();
    });
  });

  it('obtener videos pendientes para moderación', async () => {
    const pending = await videosApi.getPending();
    expect(Array.isArray(pending)).toBe(true);
    pending.forEach((v) => expect(v.status).toBe('pending'));
  });

  it('obtener videos de un usuario específico', async () => {
    const videos = await videosApi.getByUser('user-1');
    expect(Array.isArray(videos)).toBe(true);
  });
});

describe('Flujo de comentarios en video', () => {
  it('obtener comentarios de un video', async () => {
    const comments = await commentsApi.getForVideo('video-1');
    expect(Array.isArray(comments)).toBe(true);
  });

  it('agregar comentario a video', async () => {
    const comment = await commentsApi.addToVideo({
      video_id: 'video-1',
      user_id: 'user-1',
      content: 'Excelente video, me encantó la catedral!',
    });
    expect(comment).toBeDefined();
    expect(comment.content).toBe('Excelente video, me encantó la catedral!');
  });

  it('agregar respuesta a un comentario', async () => {
    const reply = await commentsApi.addToVideo({
      video_id: 'video-1',
      user_id: 'user-1',
      content: 'Gracias por tu comentario!',
      parent_id: 'comment-1',
    });
    expect(reply).toBeDefined();
    expect(reply.parent_id).toBe('comment-1');
  });
});

describe('Flujo de reacciones en video', () => {
  it('obtener reacciones de un video', async () => {
    const reactions = await reactionsApi.getForVideo('video-1');
    expect(Array.isArray(reactions)).toBe(true);
  });
});
