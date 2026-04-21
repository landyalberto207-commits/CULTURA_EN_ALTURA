import { describe, it, expect } from 'vitest';
import { validateVideoFile, validateImageFile, MAX_FILE_SIZE_MB, MAX_IMAGE_SIZE_MB } from '@/lib/cloudinary';

function createMockFile(name: string, size: number, type: string): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('validateVideoFile()', () => {
  it('acepta MP4 válido', () => {
    const file = createMockFile('video.mp4', 10 * 1024 * 1024, 'video/mp4');
    expect(validateVideoFile(file)).toBeNull();
  });

  it('acepta MOV válido', () => {
    const file = createMockFile('video.mov', 10 * 1024 * 1024, 'video/quicktime');
    expect(validateVideoFile(file)).toBeNull();
  });

  it('acepta WebM válido', () => {
    const file = createMockFile('video.webm', 10 * 1024 * 1024, 'video/webm');
    expect(validateVideoFile(file)).toBeNull();
  });

  it('acepta archivo con extensión válida aunque no tenga MIME', () => {
    const file = createMockFile('video.mp4', 10 * 1024 * 1024, '');
    expect(validateVideoFile(file)).toBeNull();
  });

  it('rechaza formato no permitido', () => {
    const file = createMockFile('video.avi', 10 * 1024 * 1024, 'video/avi');
    expect(validateVideoFile(file)).toContain('Formato no permitido');
  });

  it(`rechaza archivo mayor a ${MAX_FILE_SIZE_MB}MB`, () => {
    const file = createMockFile('video.mp4', (MAX_FILE_SIZE_MB + 1) * 1024 * 1024, 'video/mp4');
    expect(validateVideoFile(file)).toContain(`${MAX_FILE_SIZE_MB} MB`);
  });

  it('acepta archivo justo en el límite de tamaño', () => {
    const file = createMockFile('video.mp4', MAX_FILE_SIZE_MB * 1024 * 1024, 'video/mp4');
    expect(validateVideoFile(file)).toBeNull();
  });
});

describe('validateImageFile()', () => {
  it('acepta JPEG válido', () => {
    const file = createMockFile('photo.jpg', 1024 * 1024, 'image/jpeg');
    expect(validateImageFile(file)).toBeNull();
  });

  it('acepta PNG válido', () => {
    const file = createMockFile('photo.png', 1024 * 1024, 'image/png');
    expect(validateImageFile(file)).toBeNull();
  });

  it('acepta WebP válido', () => {
    const file = createMockFile('photo.webp', 1024 * 1024, 'image/webp');
    expect(validateImageFile(file)).toBeNull();
  });

  it('rechaza formato no permitido', () => {
    const file = createMockFile('photo.bmp', 1024 * 1024, 'image/bmp');
    expect(validateImageFile(file)).toContain('Formato de imagen no permitido');
  });

  it(`rechaza imagen mayor a ${MAX_IMAGE_SIZE_MB}MB`, () => {
    const file = createMockFile('photo.jpg', (MAX_IMAGE_SIZE_MB + 1) * 1024 * 1024, 'image/jpeg');
    expect(validateImageFile(file)).toContain(`${MAX_IMAGE_SIZE_MB} MB`);
  });

  it('acepta imagen justo en el límite', () => {
    const file = createMockFile('photo.jpg', MAX_IMAGE_SIZE_MB * 1024 * 1024, 'image/jpeg');
    expect(validateImageFile(file)).toBeNull();
  });
});
