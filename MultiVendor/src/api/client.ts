import { Platform } from 'react-native';

import { ApiError, createApiError, readResponseBody } from './errors';
import {
  clearSession,
  getStoredSession,
  isAccessTokenExpiring,
  storeAuthTokens,
} from './tokenStorage';
import type { AuthTokenResponse, StoredAuthSession } from './types';

declare const process: {
  env: {
    EXPO_PUBLIC_API_BASE_URL?: string;
  };
};

const platformBaseUrl = Platform.select({
  web: 'https://localhost:7226/api',
  android: 'http://10.0.2.2:5027/api',
  default: 'http://localhost:5027/api',
});

export const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || platformBaseUrl
).replace(/\/+$/, '');

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

const publicAuthPaths = ['/auth/login', '/auth/register', '/auth/refresh'];

const isPublicAuthPath = (path: string): boolean => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return publicAuthPaths.some(publicPath =>
    normalizedPath.endsWith(publicPath),
  );
};

const buildApiUrl = (path: string): string => {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
};

const isAuthTokenResponse = (value: unknown): value is AuthTokenResponse => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const tokens = value as Partial<AuthTokenResponse>;

  return (
    typeof tokens.tokenType === 'string' &&
    typeof tokens.accessToken === 'string' &&
    tokens.accessToken.length > 0 &&
    typeof tokens.refreshToken === 'string' &&
    tokens.refreshToken.length > 0 &&
    typeof tokens.expiresIn === 'number' &&
    Number.isFinite(tokens.expiresIn)
  );
};

const sessionToTokenResponse = (
  session: StoredAuthSession,
): AuthTokenResponse => ({
  tokenType: session.tokenType,
  accessToken: session.accessToken,
  refreshToken: session.refreshToken,
  expiresIn: Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 1000)),
});

let activeRefresh: Promise<AuthTokenResponse> | null = null;

const performTokenRefresh = async (): Promise<AuthTokenResponse> => {
  const originalSession = await getStoredSession();

  if (!originalSession?.refreshToken) {
    await clearSession();
    throw new ApiError(401, 'Phiên đăng nhập đã hết hạn.');
  }

  try {
    const response = await fetch(buildApiUrl('/auth/refresh'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: originalSession.refreshToken }),
    });
    const payload = await readResponseBody(response);

    if (!response.ok) {
      throw createApiError(response, payload);
    }

    if (!isAuthTokenResponse(payload)) {
      throw new ApiError(500, 'Dữ liệu token trả về không hợp lệ.', payload);
    }

    const currentSession = await getStoredSession();

    // Do not overwrite a logout or a newer login that happened while refreshing.
    if (currentSession?.refreshToken !== originalSession.refreshToken) {
      if (currentSession) {
        return sessionToTokenResponse(currentSession);
      }

      throw new ApiError(401, 'Phiên đăng nhập đã thay đổi.');
    }

    await storeAuthTokens(payload);
    return payload;
  } catch (error) {
    const currentSession = await getStoredSession();

    if (
      error instanceof ApiError &&
      (error.status === 400 || error.status === 401) &&
      currentSession?.refreshToken === originalSession.refreshToken
    ) {
      await clearSession();
    }

    throw error;
  }
};

export const refreshSession = (): Promise<AuthTokenResponse> => {
  if (activeRefresh) {
    return activeRefresh;
  }

  const refresh = performTokenRefresh();
  activeRefresh = refresh;

  const finishRefresh = () => {
    if (activeRefresh === refresh) {
      activeRefresh = null;
    }
  };

  refresh.then(finishRefresh, finishRefresh);

  return refresh;
};

const getRequestAccessToken = async (): Promise<string | null> => {
  const session = await getStoredSession();

  if (!session) {
    return null;
  }

  if (isAccessTokenExpiring(session)) {
    return (await refreshSession()).accessToken;
  }

  return session.accessToken;
};

const recoverFromUnauthorized = async (
  requestAccessToken: string | null,
): Promise<string | null> => {
  const currentSession = await getStoredSession();

  if (!currentSession) {
    return null;
  }

  if (currentSession.accessToken !== requestAccessToken) {
    return currentSession.accessToken;
  }

  return (await refreshSession()).accessToken;
};

const serializeBody = (
  body: unknown,
): NonNullable<RequestInit['body']> | undefined => {
  if (body === undefined) {
    return undefined;
  }

  return typeof body === 'string' ? body : JSON.stringify(body);
};

const executeRequest = async <T>(
  path: string,
  options: ApiRequestOptions,
  alreadyRetried: boolean,
  forcedAccessToken?: string,
): Promise<T> => {
  const {
    auth = true,
    retryOnUnauthorized = true,
    body,
    headers: optionHeaders,
    ...requestInit
  } = options;
  const useAuthentication = auth && !isPublicAuthPath(path);
  const accessToken = useAuthentication
    ? forcedAccessToken ?? (await getRequestAccessToken())
    : null;
  const headers = new Headers(optionHeaders);
  const serializedBody = serializeBody(body);

  if (serializedBody !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...requestInit,
    headers,
    body: serializedBody,
  });

  if (
    response.status === 401 &&
    useAuthentication &&
    retryOnUnauthorized &&
    !alreadyRetried
  ) {
    try {
      const renewedAccessToken = await recoverFromUnauthorized(accessToken);

      if (renewedAccessToken) {
        return executeRequest<T>(path, options, true, renewedAccessToken);
      }
    } catch {
      // Return the original unauthorized response below.
    }
  }

  const payload = await readResponseBody(response);

  if (!response.ok) {
    throw createApiError(response, payload);
  }

  return payload as T;
};

export const apiRequest = <T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> => executeRequest<T>(path, options, false);
