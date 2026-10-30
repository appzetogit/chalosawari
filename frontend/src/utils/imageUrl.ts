/**
 * Utility functions for resolving local and absolute image / asset URLs
 */

// Resolves backend origin from environment or default dev host
export const getBackendOrigin = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Strip trailing /api or /api/ if present to get server origin
    return envUrl.replace(/\/api\/?$/, '');
  }
  return import.meta.env.DEV ? 'http://localhost:5000' : '';
};

/**
 * Resolves a single image path or URL.
 * Handles relative paths (/uploads/...), absolute URLs (http://, https://), data URLs, and blobs.
 */
export const resolveImageUrl = (url?: string | null): string => {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }

  const origin = getBackendOrigin();
  if (url.startsWith('/uploads/')) {
    return `${origin}${url}`;
  }
  if (url.startsWith('uploads/')) {
    return `${origin}/${url}`;
  }

  // If path starts with / but not /uploads/, prepend origin if not already root-relative asset
  if (url.startsWith('/')) {
    return `${origin}${url}`;
  }

  return `${origin}/${url}`;
};

/**
 * Recursively scans any API response payload and resolves relative /uploads paths
 * to absolute backend URLs. Bypasses File/Blob objects to protect frontend file uploading.
 */
export const resolveUploadsUrls = <T>(obj: T, origin: string = getBackendOrigin()): T => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/') && !obj.startsWith('//') && !obj.startsWith('data:')) {
      const baseOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
      return `${baseOrigin}${obj}` as unknown as T;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveUploadsUrls(item, origin)) as unknown as T;
  }

  if (typeof obj === 'object') {
    if (
      obj instanceof Blob ||
      obj instanceof File ||
      (typeof HTMLElement !== 'undefined' && obj instanceof HTMLElement)
    ) {
      return obj;
    }
    const newObj: Record<string, any> = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = resolveUploadsUrls((obj as any)[key], origin);
      }
    }
    return newObj as T;
  }

  return obj;
};
