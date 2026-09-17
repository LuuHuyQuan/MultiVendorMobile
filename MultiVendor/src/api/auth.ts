import { apiRequest, refreshSession } from './client';
import {
  clearSession as clearStoredSession,
  hasStoredSession as hasStoredAuthSession,
  storeAuthTokens,
} from './tokenStorage';
import type {
  AuthTokenResponse,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from './types';

export const login = async (
  credentials: LoginRequest,
): Promise<AuthTokenResponse> => {
  const tokens = await apiRequest<AuthTokenResponse>('/auth/login', {
    method: 'POST',
    body: credentials,
    auth: false,
    retryOnUnauthorized: false,
  });

  await storeAuthTokens(tokens);
  return tokens;
};

export const register = (request: RegisterRequest): Promise<RegisterResponse> =>
  apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: request,
    auth: false,
    retryOnUnauthorized: false,
  });

export const refresh = (): Promise<AuthTokenResponse> => refreshSession();

export const clearSession = (): Promise<void> => clearStoredSession();

export const hasStoredSession = (): Promise<boolean> => hasStoredAuthSession();

export const authApi = {
  login,
  register,
  refresh,
  clearSession,
  hasStoredSession,
};
