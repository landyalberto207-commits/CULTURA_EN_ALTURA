const CLOUD_NAME = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string)?.trim();
const UPLOAD_PRESET = (import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string)?.trim();

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;
export const CLOUDINARY_IMAGE_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

export const MAX_FILE_SIZE_MB = 100;
export const MAX_DURATION_SECS = 180; // 3 minutes
export const ALLOWED_FORMATS = ['video/mp4', 'video/quicktime', 'video/webm'];
const ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.mkv'];
export const MAX_IMAGE_SIZE_MB = 8;
const ALLOWED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function buildThumbnailUrl(publicId: string): string {
  if (!CLOUD_NAME || !publicId) return '';
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_2.0,w_640,h_360,c_fill,f_jpg/${publicId}.jpg`;
}

function mapCloudinaryError(message: string, status: number): string {
  const lower = message.toLowerCase();

  if (lower.includes('unknown api key')) {
    return 'Cloudinary devolvió "Unknown API key". Revisa que el cloud_name sea correcto y que el upload preset sea UNSIGNED.';
  }

  if (lower.includes('upload preset not found')) {
    return 'No existe el upload preset configurado. Verifica VITE_CLOUDINARY_UPLOAD_PRESET en .env.local.';
  }

  if (lower.includes('unsigned') && lower.includes('preset')) {
    return `Cloudinary rechazó la combinación de preset/parámetros: ${message}`;
  }

  if (status === 401 || status === 403) {
    return 'Cloudinary rechazó la subida por permisos. Verifica cloud_name y configuración del upload preset.';
  }

  if (status === 413) {
    return 'Cloudinary rechazó el archivo por tamaño. Tu plan/preset está limitando el tamaño máximo.';
  }

  return message || `Error al subir el video (HTTP ${status}).`;
}

export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  duration: number;
  bytes: number;
  thumbnail_url: string;
}

export interface CloudinaryImageUploadResult {
  secure_url: string;
  public_id: string;
  bytes: number;
}

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

export function validateVideoFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime = !file.type || ALLOWED_FORMATS.includes(file.type);

  if (!hasAllowedMime && !hasAllowedExtension) {
    return 'Formato no permitido. Usa MP4, MOV o WebM.';
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `El video no puede superar ${MAX_FILE_SIZE_MB} MB.`;
  }
  return null;
}

export function validateImageFile(file: File): string | null {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_IMAGE_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  const hasAllowedMime = !file.type || ALLOWED_IMAGE_FORMATS.includes(file.type);

  if (!hasAllowedMime && !hasAllowedExtension) {
    return 'Formato de imagen no permitido. Usa JPG, PNG o WebP.';
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `La imagen no puede superar ${MAX_IMAGE_SIZE_MB} MB.`;
  }
  return null;
}

export function uploadVideoToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(
        new Error(
          'Falta configurar Cloudinary. Revisa VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en .env.local.'
        )
      );
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    // Use /video/upload endpoint, so resource_type is already video.
    // Do not send eager in unsigned uploads because many presets reject it.

    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_UPLOAD_URL);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            percent: Math.round((e.loaded / e.total) * 100),
            loaded: e.loaded,
            total: e.total,
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          secure_url: data.secure_url,
          public_id: data.public_id,
          duration: Math.round(data.duration ?? 0),
          bytes: data.bytes ?? 0,
          thumbnail_url: data.eager?.[0]?.secure_url ?? buildThumbnailUrl(data.public_id),
        });
      } else {
        let parsedError: any = null;
        try {
          parsedError = JSON.parse(xhr.responseText);
        } catch {
          parsedError = null;
        }

        const serverMessage = parsedError?.error?.message ?? '';
        reject(new Error(mapCloudinaryError(serverMessage, xhr.status)));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Error de red al subir el video.')));
    xhr.addEventListener('abort', () => reject(new Error('Subida cancelada.')));

    xhr.send(formData);
  });
}

export function uploadImageToCloudinary(
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<CloudinaryImageUploadResult> {
  return new Promise((resolve, reject) => {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(
        new Error(
          'Falta configurar Cloudinary. Revisa VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET en .env.local.'
        )
      );
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', CLOUDINARY_IMAGE_UPLOAD_URL);

    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          onProgress({
            percent: Math.round((e.loaded / e.total) * 100),
            loaded: e.loaded,
            total: e.total,
          });
        }
      });
    }

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          secure_url: data.secure_url,
          public_id: data.public_id,
          bytes: data.bytes ?? 0,
        });
      } else {
        let parsedError: any = null;
        try {
          parsedError = JSON.parse(xhr.responseText);
        } catch {
          parsedError = null;
        }

        const serverMessage = parsedError?.error?.message ?? '';
        reject(new Error(mapCloudinaryError(serverMessage, xhr.status)));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Error de red al subir la imagen.')));
    xhr.addEventListener('abort', () => reject(new Error('Subida de imagen cancelada.')));

    xhr.send(formData);
  });
}
