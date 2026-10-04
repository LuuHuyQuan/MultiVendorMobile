import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export interface CustomerProfile {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  roleName: string;
}

export interface CustomerAddress {
  id: number;
  userId: number;
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  ward: string | null;
  district: string | null;
  city: string;
  countryCode: string;
  postalCode: string | null;
  isDefault: boolean;
}

export interface CustomerAddressRequest {
  label: string;
  recipientName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  ward?: string | null;
  district?: string | null;
  city: string;
  countryCode: string;
  postalCode?: string | null;
  isDefault: boolean;
}

const data = async <T>(path: string, method = 'GET', body?: unknown): Promise<T> => {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, { method, body });
  if (!response || response.success !== true || !('data' in response)) {
    throw new ApiError(502, 'Dữ liệu tài khoản trả về không hợp lệ.', response);
  }
  return response.data;
};

export const accountApi = {
  getProfile: () => data<CustomerProfile>('/account/profile'),
  updateProfile: (request: { fullName: string; phone: string | null; avatarUrl: string | null }) =>
    data<CustomerProfile>('/account/profile', 'PUT', request),
  getAddresses: () => data<CustomerAddress[]>('/account/addresses'),
  addAddress: (request: CustomerAddressRequest) =>
    data<CustomerAddress>('/account/addresses', 'POST', request),
  updateAddress: (id: number, request: CustomerAddressRequest) =>
    data<CustomerAddress>(`/account/addresses/${id}`, 'PUT', request),
  setDefaultAddress: (id: number) =>
    apiRequest<{ success: true; message: string }>(`/account/addresses/${id}/default`, { method: 'POST' }),
  deleteAddress: (id: number) =>
    apiRequest<{ success: true; message: string }>(`/account/addresses/${id}`, { method: 'DELETE' }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiRequest<{ success: true; message: string }>('/account/password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    }),
};
