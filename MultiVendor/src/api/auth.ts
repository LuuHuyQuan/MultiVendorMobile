import { apiRequest, isAuthTokenResponse, refreshSession } from './client';
import { ApiError } from './errors';
import {
  clearSession as clearStoredSession,
  getStoredSessionEmail,
  hasStoredSession as hasStoredAuthSession,
  storeAuthTokens,
} from './tokenStorage';
import type {
  AuthTokenResponse,
  ApiSuccessResponse,
  CurrentUser,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from './types';

export const login = async (
  credentials: LoginRequest,
): Promise<AuthTokenResponse> => {
  const tokens = await apiRequest<unknown>('/auth/login', {
    method: 'POST',
    body: credentials,
    auth: false,
    retryOnUnauthorized: false,
  });

  if (!isAuthTokenResponse(tokens)) {
    throw new ApiError(502, 'Dữ liệu đăng nhập trả về không hợp lệ.', tokens);
  }

  await storeAuthTokens(tokens, credentials.email);
  return tokens;
};

export const register = (request: RegisterRequest): Promise<RegisterResponse> =>
  apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: request,
    auth: false,
    retryOnUnauthorized: false,
  });

export const forgotPassword = async (email: string): Promise<string> => {
  const response = await apiRequest<{ success: boolean; message: string }>(
    '/auth/forgot-password',
    {
      method: 'POST',
      body: { email },
      auth: false,
      retryOnUnauthorized: false,
    },
  );
  if (!response?.success) throw new ApiError(502, 'Không thể gửi yêu cầu khôi phục mật khẩu.', response);
  return response.message;
};

export const refresh = (): Promise<AuthTokenResponse> => refreshSession();

export const getCurrentUser = async (): Promise<CurrentUser> => {
  const response = await apiRequest<ApiSuccessResponse<CurrentUser>>('/auth/me');
  if (
    !response ||
    typeof response !== 'object' ||
    response.success !== true ||
    !response.data
  ) {
    throw new ApiError(502, 'Dữ liệu tài khoản trả về không hợp lệ.', response);
  }
  return response.data;
};

export const clearSession = (): Promise<void> => clearStoredSession();

export const hasStoredSession = (): Promise<boolean> => hasStoredAuthSession();

export const getSessionEmail = (): Promise<string | null> =>
  getStoredSessionEmail();

export const authApi = {
  login,
  register,
  forgotPassword,
  refresh,
  getCurrentUser,
  clearSession,
  hasStoredSession,
  getSessionEmail,
};
