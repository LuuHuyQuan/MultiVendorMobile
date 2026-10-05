/** Use the server in the scanned Expo project, including its API/upload proxy. */
export const getExpoApiBaseUrl = (hostUri?: string | null): string | undefined => {
  const host = hostUri?.trim();
  if (!host) {
    return undefined;
  }

  try {
    const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(host);
    const url = new URL(hasScheme ? host : `http://${host}`);
    if (
      !['http:', 'https:', 'exp:', 'exps:'].includes(url.protocol) ||
      !url.hostname ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname && url.pathname !== '/')
    ) {
      return undefined;
    }

    const localHost =
      /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]$)/i.test(
        url.hostname,
      ) || url.hostname.startsWith('[');
    const https =
      url.protocol === 'https:' ||
      url.protocol === 'exps:' ||
      ((!hasScheme || url.protocol === 'exp:') &&
        (url.port === '443' || !localHost));
    // Construct a new URL: assigning http: to exp: is ignored by URL implementations.
    return `${https ? 'https' : 'http'}://${url.host}/api`;
  } catch {
    return undefined;
  }
};

export const resolveApiBaseUrl = (options: {
  platform: string;
  apiBaseUrl?: string;
  webApiBaseUrl?: string;
  developmentHost?: string | null;
}): string => {
  const explicitUrl =
    (options.platform === 'web' ? options.webApiBaseUrl?.trim() : undefined) ||
    options.apiBaseUrl?.trim();
  const fallback = options.platform === 'android'
    ? 'http://10.0.2.2:5027/api'
    : 'http://localhost:5027/api';

  return (
    explicitUrl ||
    (options.platform === 'web' ? '/api' : getExpoApiBaseUrl(options.developmentHost)) ||
    fallback
  ).replace(/\/+$/, '');
};
