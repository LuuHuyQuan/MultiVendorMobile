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
    // Placehold defaults to SVG, which native Image cannot decode. Request
    // its raster format while preserving dimensions, colours and query text.
    if (url.hostname.toLowerCase() === 'placehold.co') {
      const rasterPath = `${url.pathname.replace(/(?:\/|\.)(?:svg|png|jpe?g|gif|webp|avif)\/?$/i, '').replace(/\/$/, '')}/png`;
      const query = url.search.slice(1).split('&')
        .filter(parameter => !/^format(?:=|$)/i.test(parameter)).join('&');
      return `${url.origin}${rasterPath}${query ? `?${query}` : ''}${url.hash}`;
    }
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
