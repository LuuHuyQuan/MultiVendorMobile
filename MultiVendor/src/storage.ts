import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccountProfile,
  AuthSession,
  defaultAuthSession,
  defaultAccountProfile,
  emptyVendorDraft,
  VendorDraft,
} from './accountTypes';
import { normalizeCart, normalizeCoupon } from './commerce';
import { products } from './data/catalog';
import type { CartQuantities, Order } from './types';

export const STORAGE_KEY = '@sellzy/store/v1';
export type StoreData = {
  version: 1;
  cart: CartQuantities;
  wishlistIds: string[];
  coupon: string;
  orders: Order[];
  profile: AccountProfile;
  auth: AuthSession;
  vendorDraft: VendorDraft;
};

export function emptyStore(): StoreData {
  return {
    version: 1,
    cart: {},
    wishlistIds: [],
    coupon: '',
    orders: [],
    profile: { ...defaultAccountProfile },
    auth: { ...defaultAuthSession },
    vendorDraft: { ...emptyVendorDraft },
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function restoreStore(raw: string | null): StoreData {
  if (raw === null) return emptyStore();
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.version !== 1)
    throw new Error('Dữ liệu đã lưu không được hỗ trợ.');
  const result = emptyStore();
  const ids = new Set(products.map(product => product.id));
  result.cart = normalizeCart(parsed.cart);
  result.coupon = normalizeCoupon(parsed.coupon);
  if (Array.isArray(parsed.wishlistIds)) {
    result.wishlistIds = [
      ...new Set(
        parsed.wishlistIds.filter(
          (id): id is string => typeof id === 'string' && ids.has(id),
        ),
      ),
    ];
  }
  if (Array.isArray(parsed.orders)) {
    result.orders = parsed.orders.filter(
      (order): order is Order =>
        isRecord(order) &&
        typeof order.id === 'string' &&
        typeof order.date === 'string' &&
        typeof order.total === 'number' &&
        Number.isFinite(order.total) &&
        order.total >= 0 &&
        typeof order.itemCount === 'number' &&
        Number.isInteger(order.itemCount) &&
        order.itemCount > 0 &&
        ['Processing', 'Shipped', 'Delivered'].includes(String(order.status)) &&
        Array.isArray(order.productIds) &&
        order.productIds.every(id => typeof id === 'string') &&
        (!order.lines ||
          (Array.isArray(order.lines) &&
            order.lines.every(
              line =>
                isRecord(line) &&
                typeof line.productId === 'string' &&
                typeof line.name === 'string' &&
                typeof line.price === 'number' &&
                Number.isFinite(line.price) &&
                line.price >= 0 &&
                typeof line.quantity === 'number' &&
                Number.isInteger(line.quantity) &&
                line.quantity > 0,
            ))) &&
        (!order.delivery ||
          (isRecord(order.delivery) &&
            ['fullName', 'phone', 'address', 'city'].every(
              key =>
                typeof (order.delivery as Record<string, unknown>)[key] ===
                'string',
            ) &&
            (order.delivery.payment === 'cash' ||
              order.delivery.payment === 'card'))),
    );
  }
  if (isRecord(parsed.profile)) {
    for (const key of ['name', 'email', 'phone', 'address', 'city'] as const) {
      if (typeof parsed.profile[key] === 'string')
        result.profile[key] = parsed.profile[key].slice(0, 500);
    }
    result.profile.payment =
      parsed.profile.payment === 'card' ? 'card' : 'cash';
    result.profile.notifications = parsed.profile.notifications === true;
  }
  if (isRecord(parsed.auth)) {
    const email =
      typeof parsed.auth.email === 'string'
        ? parsed.auth.email.trim().toLowerCase().slice(0, 254)
        : '';
    result.auth = {
      isLoggedIn:
        parsed.auth.isLoggedIn === true &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
      email,
    };
  }
  if (isRecord(parsed.vendorDraft)) {
    for (const key of [
      'storeName',
      'ownerName',
      'email',
      'category',
      'description',
    ] as const) {
      if (typeof parsed.vendorDraft[key] === 'string')
        result.vendorDraft[key] = parsed.vendorDraft[key].slice(0, 2000);
    }
  }
  return result;
}

export async function loadStore() {
  return restoreStore(await AsyncStorage.getItem(STORAGE_KEY));
}

// Writes are serialized: a slower earlier write cannot overwrite a newer cart.
let writeQueue: Promise<unknown> = Promise.resolve();
export function saveStore(data: StoreData): Promise<void> {
  const snapshot = JSON.stringify(data);
  const next = writeQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STORAGE_KEY, snapshot));
  writeQueue = next;
  return next;
}
