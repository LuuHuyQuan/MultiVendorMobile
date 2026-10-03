import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export type SellerApplication = {
  id: number;
  businessName: string;
  businessType: string | null;
  taxNumber: string | null;
  identityNumber: string | null;
  statusName: 'pending' | 'approved' | 'rejected' | 'cancelled';
  rejectionReason: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export type SellerDocument = {
  id: number;
  documentType: string;
  documentUrl: string;
  verificationStatus: string;
};

export type SellerOnboardingStatus = {
  application: SellerApplication | null;
  documents: SellerDocument[];
  store: {
    id: number;
    name: string;
    statusName: string;
    slug: string;
  } | null;
};

export type SubmitSellerApplication = {
  businessName: string;
  businessType: string | null;
  taxNumber: string | null;
  identityNumber: string | null;
  documents: { documentType: string; documentUrl: string }[];
};

async function readData<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, { method, body });
  if (!response || response.success !== true || !('data' in response)) {
    throw new ApiError(502, 'Dữ liệu đăng ký nhà bán trả về không hợp lệ.', response);
  }
  return response.data;
}

export const sellerOnboardingApi = {
  getMine: () => readData<SellerOnboardingStatus>('/seller-onboarding'),
  submit: (request: SubmitSellerApplication) =>
    readData<{ applicationId: number }>('/seller-onboarding', 'POST', request),
};
