import { API_BASE_URL } from '../api/client';
import { resolveApiImageUrl } from '../api/media';
import {
  storefrontApi,
  type StorefrontCategory,
  type StorefrontProductDetail,
  type StorefrontVendor,
} from '../api/storefront';
import type { Product } from '../types';

export type LiveCategory = { id: string; label: string; tint: string };

export type LiveCatalog = {
  products: Product[];
  cartProducts: Product[];
  categories: LiveCategory[];
  vendors: { name: string; rating: number; productCount: number }[];
};

const imageFallback = require('../assets/logo.png');

const imageSource = (path: string | null | undefined) => {
  if (!path?.trim()) return imageFallback;
  return { uri: resolveApiImageUrl(path, API_BASE_URL) };
};

const variantLabel = (name: string, variantName: string) =>
  variantName && !/^(default|mặc định)$/i.test(variantName.trim())
    ? `${name} · ${variantName}`
    : name;

export function cartKeyForVariant(product: Product, variantId: number) {
  return product.variantId === variantId
    ? product.id
    : `${product.id}:${variantId}`;
}

export function baseProductId(id: string) {
  return id.split(':')[0];
}

export function mapStorefrontProduct(
  detail: StorefrontProductDetail,
  category: StorefrontCategory | undefined,
  vendor: StorefrontVendor | undefined,
): { product: Product; cartProducts: Product[] } {
  const { product: listing } = detail;
  const variants = detail.variants.map(variant => ({
    id: variant.id,
    name: variant.name,
    price: variant.price / 1000,
    stock: Math.max(0, variant.availableQuantity),
    priceTiers: variant.quantityPriceTiers.map(tier => ({
      minQuantity: tier.minQuantity,
      price: tier.unitPrice / 1000,
    })),
  }));
  const chosen =
    detail.variants.find(variant => variant.availableQuantity > 0) ??
    detail.variants[0];
  if (!chosen) {
    throw new Error(`Sản phẩm ${listing.id} không có biến thể.`);
  }
  const compareAt = chosen.compareAtPrice ?? listing.compareAtPrice;
  const oldPrice = compareAt && compareAt > chosen.price
    ? compareAt / 1000
    : chosen.price / 1000;
  const product: Product = {
    id: String(listing.id),
    name: listing.name,
    store: vendor?.name ?? `Cửa hàng #${listing.storeId}`,
    category: category?.slug ?? listing.categoryName,
    image: imageSource(detail.images[0] ?? listing.imageUrl),
    price: chosen.price / 1000,
    oldPrice,
    rating: listing.ratingAverage,
    reviews: listing.ratingCount,
    discount: oldPrice > 0
      ? Math.max(0, Math.round((1 - chosen.price / 1000 / oldPrice) * 100))
      : 0,
    stock: Math.max(0, chosen.availableQuantity),
    description: detail.description || listing.shortDescription || '',
    benefits: chosen.attributeValues.map(value => `${value.attributeName}: ${value.value}`),
    variantId: chosen.id,
    priceTiers: variants.find(item => item.id === chosen.id)?.priceTiers,
    variants,
  };
  const cartProducts = [product];
  for (const variant of detail.variants) {
    if (variant.id === chosen.id) continue;
    const variantOldPrice = variant.compareAtPrice ?? listing.compareAtPrice;
    cartProducts.push({
      ...product,
      id: `${product.id}:${variant.id}`,
      name: variantLabel(product.name, variant.name),
      price: variant.price / 1000,
      oldPrice:
        variantOldPrice && variantOldPrice > variant.price
          ? variantOldPrice / 1000
          : variant.price / 1000,
      stock: Math.max(0, variant.availableQuantity),
      variantId: variant.id,
      priceTiers: variants.find(item => item.id === variant.id)?.priceTiers,
      variants: undefined,
    });
  }
  return { product, cartProducts };
}

async function allPages<T>(
  first: { items: T[]; total: number; pageSize: number },
  getPage: (page: number) => Promise<{ items: T[] }>,
): Promise<T[]> {
  const result = [...first.items];
  const pageSize = Math.max(1, first.pageSize);
  const pages = Math.ceil(first.total / pageSize);
  if (pages > 100) throw new Error('Danh mục quá lớn để tải trên thiết bị.');
  for (let page = 2; page <= pages; page += 1) {
    const next = await getPage(page);
    if (!Array.isArray(next.items) || next.items.length === 0) {
      throw new Error('Danh mục trả về thiếu trang dữ liệu.');
    }
    result.push(...next.items);
  }
  return result;
}

export async function loadLiveCatalog(signal?: AbortSignal): Promise<LiveCatalog> {
  const [firstProducts, categories, firstVendors] = await Promise.all([
    storefrontApi.getProducts({ page: 1, pageSize: 100 }, signal),
    storefrontApi.getCategories(signal),
    storefrontApi.getVendors({ page: 1, pageSize: 100 }, signal),
  ]);
  if (
    !Array.isArray(firstProducts.items) ||
    !Array.isArray(categories) ||
    !Array.isArray(firstVendors.items)
  ) {
    throw new Error('Danh mục trả về không hợp lệ.');
  }
  const [listings, vendors] = await Promise.all([
    allPages(firstProducts, page =>
      storefrontApi.getProducts({ page, pageSize: 100 }, signal),
    ),
    allPages(firstVendors, page =>
      storefrontApi.getVendors({ page, pageSize: 100 }, signal),
    ),
  ]);
  const categoryById = new Map(categories.map(item => [item.id, item]));
  const vendorById = new Map(vendors.map(item => [item.id, item]));
  const mapped: ReturnType<typeof mapStorefrontProduct>[] = [];
  for (let start = 0; start < listings.length; start += 8) {
    const batch = listings.slice(start, start + 8);
    const details = await Promise.all(
      batch.map(item => storefrontApi.getProduct(item.id, signal)),
    );
    mapped.push(
      ...details.map(detail =>
        mapStorefrontProduct(
          detail,
          categoryById.get(detail.product.categoryId),
          vendorById.get(detail.product.storeId),
        ),
      ),
    );
  }
  return {
    products: mapped.map(item => item.product),
    cartProducts: mapped.flatMap(item => item.cartProducts),
    vendors: vendors.map(item => ({
      name: item.name,
      rating: item.ratingAverage,
      productCount: item.productCount,
    })),
    categories: [
      { id: 'All', label: 'Tất cả', tint: '#E7F7F5' },
      ...categories.map(item => ({
        id: item.slug,
        label: item.name,
        tint: '#EAF1FF',
      })),
    ],
  };
}
