import { apiRequest } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export interface ShopCartLine {
  productId: number;
  variantId: number;
  productName: string;
  variantName: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  availableQuantity: number;
  unitPrice: number;
  lineTotal: number;
  appliedMinQuantity: number | null;
}

export interface ShopCart {
  cartId: number | null;
  items: ShopCartLine[];
  subtotal: number;
}

export interface ShopCartItem {
  cartId: number;
  variantId: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  appliedMinQuantity: number | null;
}

export interface ShopCheckoutRequest {
  recipientName: string;
  phone: string;
  addressLine: string;
  ward?: string | null;
  district: string;
  province: string;
  customerNote?: string | null;
  couponCode?: string | null;
  paymentMethod?: 'COD' | 'WALLET';
  shippingMethod?: 'standard' | 'express';
  checkoutKey: string;
  expectedGrandTotal?: number;
}

export interface ShopQuoteRequest {
  couponCode?: string | null;
  shippingMethod?: 'standard' | 'express';
}

export interface ShopQuote {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  grandTotal: number;
  shippingMethod: 'standard' | 'express';
  couponCode: string | null;
}

export interface ShopCheckoutResult {
  orderId: number;
  orderNumber: string;
  grandTotal: number;
  paymentMethod: 'COD';
}

const requestData = async <T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> => {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, {
    method,
    body,
  });
  if (
    !response ||
    typeof response !== 'object' ||
    response.success !== true ||
    !('data' in response)
  ) {
    throw new ApiError(502, 'Dữ liệu giỏ hàng trả về không hợp lệ.', response);
  }
  return response.data;
};

export const shopCartApi = {
  getCart: () => requestData<ShopCart>('/shop/cart'),

  quote: (request: ShopQuoteRequest = {}) =>
    requestData<ShopQuote>('/shop/cart/quote', 'POST', request),

  addItem: (variantId: number, quantity: number) =>
    requestData<ShopCartItem>('/shop/cart/items', 'POST', {
      variantId,
      quantity,
    }),

  updateItem: (variantId: number, quantity: number) =>
    apiRequest<{ success: true; message: string }>(
      `/shop/cart/items/${encodeURIComponent(String(variantId))}`,
      { method: 'PUT', body: { quantity } },
    ),

  removeItem: (variantId: number) =>
    apiRequest<{ success: true; message: string }>(
      `/shop/cart/items/${encodeURIComponent(String(variantId))}`,
      { method: 'DELETE' },
    ),

  checkout: (request: ShopCheckoutRequest) =>
    requestData<ShopCheckoutResult>('/shop/cart/checkout', 'POST', request),
};
