const http = require('node:http');
const https = require('node:https');

const HOP_HEADERS = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailer', 'transfer-encoding', 'upgrade',
]);

function endToEndHeaders(headers) {
  const removed = new Set(HOP_HEADERS);
  for (const name of String(headers.connection || '').split(',')) {
    removed.add(name.trim().toLowerCase());
  }
  return Object.fromEntries(
    Object.entries(headers).filter(([name]) => !removed.has(name.toLowerCase())),
  );
}

function createApiProxyMiddleware(
  targetValue = process.env.API_PROXY_TARGET || 'http://127.0.0.1:5027',
  timeoutMs = 30_000,
) {
  let target;
  try {
    target = new URL(targetValue.trim());
  } catch {
    throw new Error('API_PROXY_TARGET must be a valid HTTP(S) server URL.');
  }
  if (!['http:', 'https:'].includes(target.protocol) || target.username ||
      target.password || target.search || target.hash) {
    throw new Error('API_PROXY_TARGET must be an HTTP(S) server URL without credentials, query or fragment.');
  }
  const transport = target.protocol === 'https:' ? https : http;
  const loopback = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(
    target.hostname.toLowerCase(),
  );
  const prefix = target.pathname.replace(/\/+$/, '');

  return function apiProxy(request, response, next) {
    if (!/^\/(?:api|uploads)(?:\/|\?|$)/.test(request.url || '')) {
      next();
      return;
    }

    const headers = endToEndHeaders(request.headers);
    // Use the socket address for rate limiting; never trust client supplied forwarding headers.
    for (const name of Object.keys(headers)) {
      if (name.toLowerCase() === 'forwarded' || name.toLowerCase().startsWith('x-forwarded-')) {
        delete headers[name];
      }
    }
    headers.host = target.host;
    headers['x-forwarded-for'] = request.socket.remoteAddress || '127.0.0.1';

    const unavailable = () => {
      if (response.writableEnded || response.destroyed) return;
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const body = JSON.stringify({
        success: false,
        message: 'Không thể kết nối API. Vui lòng kiểm tra máy chủ và thử lại.',
      });
      response.writeHead(503, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store',
      });
      response.end(body);
    };

    const upstream = transport.request(target, {
      method: request.method,
      path: `${prefix}${request.url}`,
      headers,
      // The ASP.NET development certificate is accepted only for a loopback target.
      ...(target.protocol === 'https:' ? { rejectUnauthorized: !loopback } : {}),
    }, upstreamResponse => {
      response.writeHead(
        upstreamResponse.statusCode || 502,
        endToEndHeaders(upstreamResponse.headers),
      );
      upstreamResponse.on('error', unavailable);
      upstreamResponse.pipe(response);
    });
    upstream.on('error', unavailable);
    upstream.setTimeout(timeoutMs, () => upstream.destroy());
    request.on('aborted', () => upstream.destroy());
    request.on('error', () => upstream.destroy());
    response.on('close', () => {
      if (!response.writableEnded) upstream.destroy();
    });
    request.pipe(upstream);
  };
}

module.exports = { createApiProxyMiddleware };
