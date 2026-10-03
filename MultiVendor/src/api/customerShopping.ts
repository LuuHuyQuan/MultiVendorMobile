import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export type ProductReview = {
  id: number;
  author: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  verifiedPurchase: boolean;
};

export type MyProductReview = {
  id: number;
  rating: number;
  title: string | null;
  comment: string | null;
  isApproved: boolean;
};

export type ProductReviewsPage = {
  items: ProductReview[];
  total: number;
  average: number;
  page: number;
  pageSize: number;
  canReview: boolean;
  mine: MyProductReview | null;
};

export type SaveProductReviewRequest = {
  rating: number;
  title: string | null;
  comment: string | null;
};

type ApiMessageResponse = { success: true; message: string };

const readMessage = async (
  path: string,
  method: 'POST' | 'DELETE',
): Promise<string> => {
  const response = await apiRequest<ApiMessageResponse>(path, { method });
  if (!response || response.success !== true) {
    throw new ApiError(502, 'Không thể cập nhật danh sách yêu thích.', response);
  }
  return response.message;
};

const productPath = (productId: number) =>
  `/customer-shopping/products/${encodeURIComponent(String(productId))}`;

export const customerShoppingApi = {
  async getWishlistIds(): Promise<number[]> {
    const response = await apiRequest<ApiSuccessResponse<number[]>>(
      '/customer-shopping/wishlist/ids',
    );
    if (!response || response.success !== true || !Array.isArray(response.data)) {
      throw new ApiError(502, 'Dữ liệu yêu thích trả về không hợp lệ.', response);
    }
    return response.data;
  },

  addWishlist: (productId: number): Promise<string> =>
    readMessage(`/customer-shopping/wishlist/${encodeURIComponent(String(productId))}`, 'POST'),

  removeWishlist: (productId: number): Promise<string> =>
    readMessage(`/customer-shopping/wishlist/${encodeURIComponent(String(productId))}`, 'DELETE'),

  async getProductReviews(
    productId: number,
    page = 1,
    pageSize = 10,
    signal?: AbortSignal,
    authenticated = true,
  ): Promise<ProductReviewsPage> {
    let response: ApiSuccessResponse<ProductReviewsPage>;
    try {
      response = await apiRequest<ApiSuccessResponse<ProductReviewsPage>>(
        `${productPath(productId)}/reviews?page=${page}&pageSize=${pageSize}`,
        { signal, auth: authenticated },
      );
    } catch (error) {
      if (authenticated && error instanceof ApiError && error.status === 401) {
        return customerShoppingApi.getProductReviews(
          productId, page, pageSize, signal, false,
        );
      }
      throw error;
    }
    if (
      !response ||
      response.success !== true ||
      !response.data ||
      !Array.isArray(response.data.items)
    ) {
      throw new ApiError(502, 'Dữ liệu đánh giá trả về không hợp lệ.', response);
    }
    return response.data;
  },

  async saveProductReview(
    productId: number,
    request: SaveProductReviewRequest,
  ): Promise<string> {
    const response = await apiRequest<{ success: true; message: string }>(
      `${productPath(productId)}/review`,
      { method: 'PUT', body: request },
    );
    if (!response || response.success !== true) {
      throw new ApiError(502, 'Không thể lưu đánh giá.', response);
    }
    return response.message;
  },
};
