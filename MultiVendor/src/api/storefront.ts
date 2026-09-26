import { apiRequest, type ApiRequestOptions } from './client';
import { ApiError } from './errors';
import type { ApiSuccessResponse } from './types';

export interface StorefrontPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface StorefrontProduct {
  id: number;
  storeId: number;
  categoryId: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  categoryName: string;
  imageUrl: string | null;
  price: number;
  compareAtPrice: number | null;
  isFeatured: boolean;
  ratingAverage: number;
  ratingCount: number;
  soldCount: number;
}

export interface StorefrontCategory {
  id: number;
  name: string;
  slug: string;
  imageUrl: string | null;
  productCount: number;
}

export interface StorefrontVariantAttributeValue {
  attributeId: number;
  attributeName: string;
  attributeCode: string;
  inputType: string;
  valueId: number;
  value: string;
  colorHex: string | null;
  sortOrder: number;
}

export interface StorefrontQuantityPriceTier {
  id: number;
  minQuantity: number;
  unitPrice: number;
}

export interface StorefrontVariant {
  id: number;
  sku: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  availableQuantity: number;
  attributeValues: StorefrontVariantAttributeValue[];
  quantityPriceTiers: StorefrontQuantityPriceTier[];
}

export interface StorefrontProductDetail {
  product: StorefrontProduct;
  description: string | null;
  images: string[];
  variants: StorefrontVariant[];
}

export interface StorefrontVendor {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  ratingAverage: number;
  ratingCount: number;
  productCount: number;
}

export interface StorefrontProductFilters {
  search?: string;
  category?: string;
  storeId?: number;
  featured?: boolean;
  page?: number;
  pageSize?: number;
}

export interface StorefrontVendorFilters {
  search?: string;
  page?: number;
  pageSize?: number;
}

type QueryValue = string | number | boolean | undefined;

const queryString = (params: Record<string, QueryValue>): string => {
  const entries = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) =>
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  return entries.length ? `?${entries.join('&')}` : '';
};

const requestData = async <T>(
  path: string,
  options?: ApiRequestOptions,
): Promise<T> => {
  const response = await apiRequest<ApiSuccessResponse<T>>(path, {
    auth: false,
    ...options,
  });
  if (
    !response ||
    typeof response !== 'object' ||
    response.success !== true ||
    !('data' in response)
  ) {
    throw new ApiError(502, 'Dữ liệu cửa hàng trả về không hợp lệ.', response);
  }
  return response.data;
};

export const storefrontApi = {
  getProducts: (filters: StorefrontProductFilters = {}, signal?: AbortSignal) =>
    requestData<StorefrontPage<StorefrontProduct>>(
      `/storefront/products${queryString({ ...filters })}`,
      { signal },
    ),

  getProduct: (id: number, signal?: AbortSignal) =>
    requestData<StorefrontProductDetail>(
      `/storefront/products/${encodeURIComponent(String(id))}`,
      { signal },
    ),

  getCategories: (signal?: AbortSignal) =>
    requestData<StorefrontCategory[]>('/storefront/categories', { signal }),

  getVendors: (filters: StorefrontVendorFilters = {}, signal?: AbortSignal) =>
    requestData<StorefrontPage<StorefrontVendor>>(
      `/storefront/vendors${queryString({ ...filters })}`,
      { signal },
    ),

  getVendor: (id: number, signal?: AbortSignal) =>
    requestData<StorefrontVendor>(
      `/storefront/vendors/${encodeURIComponent(String(id))}`,
      { signal },
    ),
};
