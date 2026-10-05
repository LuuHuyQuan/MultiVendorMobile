// Upload paths belong to the API host. A legacy localhost URL must not point
// back to the phone or emulator when the API runs on the development PC.
export function resolveApiImageUrl(path: string, apiBaseUrl: string): string {
  const origin = apiBaseUrl.startsWith('/') ? '' : new URL(apiBaseUrl).origin;
  let trimmed = path.trim();
  if (trimmed.startsWith('//')) {
    const protocol = origin
      ? new URL(apiBaseUrl).protocol
      : (globalThis as { location?: { protocol?: string } }).location?.protocol || 'http:';
    trimmed = `${protocol}${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    const url = new URL(trimmed);
    if (
      ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname.toLowerCase()) &&
      url.pathname.startsWith('/uploads/')
    ) {
      return `${origin}${url.pathname}${url.search}${url.hash}`;
    }
    return trimmed;
  }
  return `${origin}/${trimmed.replace(/^\/+/, '')}`;
}
