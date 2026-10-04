import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AccountProfile,
  AuthSession,
  defaultAuthSession,
  defaultAccountProfile,
  emptyVendorDraft,
  VendorDraft,
} from './accountTypes';
import { isRemoteProductId, normalizeCart, normalizeCoupon } from './commerce';
import { products } from './data/catalog';
import type { CartQuantities, Order, Product } from './types';

export const STORAGE_KEY = '@sellzy/store/v1';
export type StoreAccountScope = number | string;
export const accountStorageKey = (scope: StoreAccountScope): string => {
  if (typeof scope === 'string') {
    const email = scope.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Email tài khoản không hợp lệ.');
    }
    return `${STORAGE_KEY}/email/${encodeURIComponent(email)}`;
  }
  if (!Number.isSafeInteger(scope) || scope < 1) {
    throw new Error('Mã tài khoản không hợp lệ.');
  }
  return `${STORAGE_KEY}/account/${scope}`;
};
export type StoreData = {
  version: 1;
  cart: CartQuantities;
  wishlistIds: string[];
  wishlistMigrated: boolean;
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
    wishlistMigrated: false,
    coupon: '',
    orders: [],
    profile: { ...defaultAccountProfile },
    auth: { ...defaultAuthSession },
    vendorDraft: { ...emptyVendorDraft },
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function restoreStore(
  raw: string | null,
  catalog: Product[] = products,
): StoreData {
  if (raw === null) return emptyStore();
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.version !== 1)
    throw new Error('Dữ liệu đã lưu không được hỗ trợ.');
  const result = emptyStore();
  const ids = new Set(catalog.map(product => product.id));
  result.cart = normalizeCart(parsed.cart, catalog, true);
  result.coupon = normalizeCoupon(parsed.coupon);
  if (Array.isArray(parsed.wishlistIds)) {
    result.wishlistIds = [
      ...new Set(
        parsed.wishlistIds.filter(
          (id): id is string =>
            typeof id === 'string' && (ids.has(id) || isRemoteProductId(id)),
        ),
      ),
    ];
  }
  result.wishlistMigrated = parsed.wishlistMigrated === true;
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
              order.delivery.payment === 'card' ||
              order.delivery.payment === 'wallet'))),
    );
  }
  if (isRecord(parsed.profile)) {
    for (const key of [
      'name',
      'email',
      'phone',
      'recipientName',
      'recipientPhone',
      'address',
      'district',
      'city',
    ] as const) {
      if (typeof parsed.profile[key] === 'string')
        result.profile[key] = parsed.profile[key].slice(0, 500);
    }
    result.profile.payment =
      parsed.profile.payment === 'card' || parsed.profile.payment === 'wallet'
        ? parsed.profile.payment
        : 'cash';
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

export async function loadStore(
  catalog: Product[] = products,
  accountScope?: StoreAccountScope,
) {
  await writeQueue.catch(() => undefined);
  const key =
    accountScope === undefined ? STORAGE_KEY : accountStorageKey(accountScope);
  return restoreStore(await AsyncStorage.getItem(key), catalog);
}

// Writes are serialized: a slower earlier write cannot overwrite a newer cart.
let writeQueue: Promise<unknown> = Promise.resolve();
export function saveStore(
  data: StoreData,
  accountScope?: StoreAccountScope,
): Promise<void> {
  const key =
    accountScope === undefined ? STORAGE_KEY : accountStorageKey(accountScope);
  const snapshot = JSON.stringify(data);
  const next = writeQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(key, snapshot));
  writeQueue = next;
  return next;
}
