import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export type SellerProduct = {
  id: number;
  name: string;
  slug: string;
  statusName: string;
  statusLabel: string;
  categoryName: string;
  imageUrl: string | null;
  sku: string;
  price: number;
  availableQuantity: number;
  allowsQuantityPricing: boolean;
  createdAt: string;
};

export type SellerOrder = {
  id: number;
  orderId: number;
  orderNumber: string;
  statusName: string;
  customerName: string;
  total: number;
  itemCount: number;
  trackingNumber: string | null;
  shippingProvider: string | null;
  placedAt: string;
};

export type SellerDashboard = {
  storeId: number;
  storeName: string;
  summary: {
    totalProducts: number;
    pendingProducts: number;
    activeProducts: number;
    pendingOrders: number;
    confirmedRevenue: number;
  };
  categories: { id: number; name: string }[];
  products: SellerProduct[];
  orders: SellerOrder[];
};

export type CreateSellerProductRequest = {
  categoryId: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  allowsQuantityPricing: boolean;
  imageUrls: string[];
  sku: string;
  variantName: string;
  price: number;
  compareAtPrice?: number | null;
  quantity: number;
  lowStockThreshold: number;
};

export type SellerOrderStatusRequest = {
  status: 'processing' | 'shipped' | 'delivered';
  trackingNumber?: string;
  shippingProvider?: string;
};

async function readData<T>(path: string, method = 'GET', body?: unknown) {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, { method, body });
  if (!response || response.success !== true || !('data' in response)) {
    throw new ApiError(502, 'Dữ liệu cửa hàng trả về không hợp lệ.', response);
  }
  return response.data;
}

export const sellerPortalApi = {
  getDashboard: () => readData<SellerDashboard>('/seller-portal'),
  createProduct: (request: CreateSellerProductRequest) =>
    readData<{ id: number; message: string }>('/seller-portal/products', 'POST', request),
  resubmitProduct: (id: number) =>
    apiRequest<{ success: true; message: string }>(`/seller-portal/products/${id}/resubmit`, {
      method: 'POST',
    }),
  updateOrderStatus: (id: number, request: SellerOrderStatusRequest) =>
    apiRequest<{ success: true; message: string }>(`/seller-portal/orders/${id}/status`, {
      method: 'POST',
      body: request,
    }),
};
