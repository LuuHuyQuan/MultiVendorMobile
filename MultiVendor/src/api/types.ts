export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export type ApiValidationErrors = Record<string, string[]>;

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ApiValidationErrors;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string | null;
}

export interface RegisterCreated {
  id: number;
}

export type RegisterResponse = ApiSuccessResponse<RegisterCreated>;

export interface AuthTokenResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

export interface StoredAuthSession {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
