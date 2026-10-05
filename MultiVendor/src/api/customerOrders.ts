import { apiRequest, type ApiRequestOptions } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export type CustomerOrderSummary = {
  id: number;
  orderNumber: string;
  statusName: string;
  paymentStatus: string;
  grandTotal: number;
  placedAt: string;
  itemCount: number;
  paymentMethod: string;
  productPreviews?: {
    productId: number | null;
    productName: string;
    imageUrl: string | null;
  }[];
};

export type CustomerOrder = Omit<CustomerOrderSummary, 'itemCount' | 'paymentMethod'> & {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  shippingAddressJson: string;
  customerNote: string | null;
};

export type CustomerSellerOrder = {
  id: number;
  storeName: string;
  statusName: string;
  trackingNumber: string | null;
  shippingProvider: string | null;
  deliveredAt: string | null;
};

export type CustomerOrderItem = {
  id: number;
  sellerOrderId: number;
  productId: number | null;
  variantId: number | null;
  productName: string;
  variantName: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type CustomerOrderHistory = {
  id: number;
  previousStatus: string | null;
  newStatus: string;
  note: string | null;
  changedAt: string;
};

export type CustomerReturnRequest = {
  id: number;
  returnNumber: string;
  statusName: string;
  reasonDetail: string | null;
  requestedAt: string;
};

export type CustomerReturnItem = {
  id: number;
  returnRequestId: number;
  orderItemId: number;
  quantity: number;
};

export type CustomerOrderDetail = {
  order: CustomerOrder;
  sellerOrders: CustomerSellerOrder[];
  items: CustomerOrderItem[];
  history: CustomerOrderHistory[];
  returns: CustomerReturnRequest[];
  returnItems: CustomerReturnItem[];
  returnWindowDays: number;
};

type CustomerOrderPage = {
  items: CustomerOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
};

export type CustomerReturnLineRequest = {
  orderItemId: number;
  quantity: number;
};

const requestData = async <T>(path: string, options: ApiRequestOptions = {}): Promise<T> => {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, options);
  if (!response || response.success !== true || !('data' in response)) {
    throw new ApiError(502, 'Dữ liệu đơn hàng trả về không hợp lệ.', response);
  }
  return response.data;
};

export const customerOrdersApi = {
  async listAll(signal?: AbortSignal): Promise<CustomerOrderSummary[]> {
    const items: CustomerOrderSummary[] = [];
    let page = 1;
    while (true) {
      const result = await requestData<CustomerOrderPage>(
        `/customer-orders?page=${page}&pageSize=100`, { signal },
      );
      if (!Array.isArray(result.items) || !Number.isFinite(result.total)) {
        throw new ApiError(502, 'Danh sách đơn hàng không hợp lệ.', result);
      }
      items.push(...result.items);
      if (!result.items.length || items.length >= result.total) break;
      page += 1;
    }
    return [...new Map(items.map(item => [item.id, item])).values()];
  },

  detail: (id: number, signal?: AbortSignal) =>
    requestData<CustomerOrderDetail>(`/customer-orders/${id}`, { signal }),

  cancel: (id: number, reason: string) =>
    apiRequest<{ success: true; message: string }>(`/customer-orders/${id}/cancel`, {
      method: 'POST',
      body: { reason: reason.trim() },
    }),

  requestReturn: (id: number, reason: string, items: CustomerReturnLineRequest[]) =>
    requestData<{ id: number; returnNumber: string; message: string }>(
      `/customer-orders/${id}/returns`,
      { method: 'POST', body: { reason: reason.trim(), items } },
    ),
};
