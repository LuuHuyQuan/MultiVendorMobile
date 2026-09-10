import AsyncStorage from '@react-native-async-storage/async-storage';
import { createOrder } from '../src/commerce';
import { products } from '../src/data/catalog';
import {
  emptyStore,
  loadStore,
  restoreStore,
  saveStore,
  STORAGE_KEY,
} from '../src/storage';

const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);
const validOrder = () =>
  createOrder(
    { 'vitamin-c-1000': 2 },
    'SELLZY10',
    {
      fullName: 'Jane Nguyen',
      phone: '+84 912 345 678',
      address: '123 Main Street',
      city: 'Hanoi',
      payment: 'cash',
    },
    'SZ-persist',
    new Date(2026, 8, 8),
  )!;

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
  getItem.mockResolvedValue(null);
  setItem.mockResolvedValue();
});

describe('restoring saved shopping state', () => {
  test('a new install starts with an empty cart and orders, and independent defaults', () => {
    const first = restoreStore(null);
    first.profile.name = 'Changed';
    first.cart['vitamin-c-1000'] = 2;
    expect(restoreStore(null)).toEqual(emptyStore());
    expect(restoreStore(null).orders).toEqual([]);
  });

  test.each(['{broken', 'null', '[]', '{"version":2}', '{}'])(
    'rejects malformed or unsupported saved data %s',
    raw => {
      expect(() => restoreStore(raw)).toThrow();
    },
  );

  test('normalizes carts, removes duplicate/unknown wishlist IDs, and validates coupons', () => {
    const restored = restoreStore(
      JSON.stringify({
        version: 1,
        cart: { 'vitamin-c-1000': 9999, 'hand-sanitizer': -1, unknown: 3 },
        wishlistIds: ['vitamin-c-1000', 'vitamin-c-1000', 'unknown', 123],
        coupon: ' sellzy10 ',
      }),
    );
    expect(restored.cart).toEqual({
      'vitamin-c-1000': products.find(
        product => product.id === 'vitamin-c-1000',
      )!.stock,
    });
    expect(restored.wishlistIds).toEqual(['vitamin-c-1000']);
    expect(restored.coupon).toBe('SELLZY10');
    expect(
      restoreStore(JSON.stringify({ version: 1, coupon: 'EXPIRED' })).coupon,
    ).toBe('');
  });

  test('retains a complete order snapshot across serialization', () => {
    const store = emptyStore();
    store.orders = [validOrder()];
    expect(restoreStore(JSON.stringify(store)).orders).toEqual(store.orders);
  });

  test('discards malformed order records without losing valid orders', () => {
    const order = validOrder();
    const invalid = [
      null,
      { ...order, total: -1 },
      { ...order, itemCount: 0 },
      { ...order, itemCount: 1.5 },
      { ...order, status: 'unknown' },
      { ...order, productIds: [123] },
      { ...order, lines: [{ ...order.lines![0], quantity: 1.5 }] },
      { ...order, lines: [{ ...order.lines![0], price: '27.49' }] },
      { ...order, delivery: { ...order.delivery, address: null } },
      { ...order, delivery: { ...order.delivery, payment: 'other' } },
    ];
    expect(
      restoreStore(JSON.stringify({ version: 1, orders: [order, ...invalid] }))
        .orders,
    ).toEqual([order]);
  });

  test('restores valid profile/vendor fields and safely defaults malformed fields', () => {
    const restored = restoreStore(
      JSON.stringify({
        version: 1,
        profile: {
          name: 'Quan',
          email: 123,
          phone: '9'.repeat(501),
          payment: 'other',
          notifications: 'true',
        },
        vendorDraft: {
          storeName: 'My Store',
          description: 'x'.repeat(2001),
          ownerName: null,
        },
      }),
    );
    expect(restored.profile).toEqual({
      name: 'Quan',
      email: '',
      phone: '9'.repeat(500),
      address: '',
      city: '',
      payment: 'cash',
      notifications: false,
    });
    expect(restored.auth).toEqual({ isLoggedIn: false, email: '' });
    expect(restored.vendorDraft).toMatchObject({
      storeName: 'My Store',
      description: 'x'.repeat(2000),
      ownerName: '',
    });
  });

  test('restores a valid login session without storing a password', () => {
    const restored = restoreStore(
      JSON.stringify({
        version: 1,
        auth: { isLoggedIn: true, email: ' USER@Example.com ' },
      }),
    );
    expect(restored.auth).toEqual({
      isLoggedIn: true,
      email: 'user@example.com',
    });
    expect(JSON.stringify(restored)).not.toContain('password');
    expect(
      restoreStore(
        JSON.stringify({
          version: 1,
          auth: { isLoggedIn: true, email: 'invalid' },
        }),
      ).auth.isLoggedIn,
    ).toBe(false);
  });

  test('loads the correct key and propagates read errors instead of treating them as empty state', async () => {
    getItem.mockResolvedValueOnce(
      JSON.stringify({ version: 1, cart: { 'vitamin-c-1000': 2 } }),
    );
    expect((await loadStore()).cart).toEqual({ 'vitamin-c-1000': 2 });
    expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
    getItem.mockRejectedValueOnce(new Error('Storage unavailable'));
    await expect(loadStore()).rejects.toThrow('Storage unavailable');
  });

  test('propagates corrupt persisted JSON for the UI to offer recovery', async () => {
    getItem.mockResolvedValueOnce('not-json');
    await expect(loadStore()).rejects.toThrow();
  });
});

describe('queued writes', () => {
  test('serializes writes and snapshots each call before later state changes', async () => {
    let finishFirstWrite!: () => void;
    let markFirstStarted!: () => void;
    const firstStarted = new Promise<void>(resolve => {
      markFirstStarted = resolve;
    });
    setItem.mockImplementationOnce(() => {
      markFirstStarted();
      return new Promise<void>(resolve => {
        finishFirstWrite = resolve;
      });
    });
    const store = emptyStore();
    store.cart = { 'vitamin-c-1000': 1 };
    const firstWrite = saveStore(store);
    await firstStarted;
    store.cart['vitamin-c-1000'] = 2;
    const secondWrite = saveStore(store);
    store.cart['vitamin-c-1000'] = 3;
    await Promise.resolve();
    expect(setItem).toHaveBeenCalledTimes(1);
    expect(JSON.parse(setItem.mock.calls[0][1]).cart).toEqual({
      'vitamin-c-1000': 1,
    });
    finishFirstWrite();
    await Promise.all([firstWrite, secondWrite]);
    expect(setItem).toHaveBeenCalledTimes(2);
    expect(setItem.mock.calls[1][0]).toBe(STORAGE_KEY);
    expect(JSON.parse(setItem.mock.calls[1][1]).cart).toEqual({
      'vitamin-c-1000': 2,
    });
  });

  test('reports failed writes and allows a later save to succeed', async () => {
    setItem.mockRejectedValueOnce(new Error('Disk full'));
    await expect(saveStore(emptyStore())).rejects.toThrow('Disk full');
    const store = emptyStore();
    store.wishlistIds = ['vitamin-c-1000'];
    await expect(saveStore(store)).resolves.toBeUndefined();
    expect(setItem).toHaveBeenLastCalledWith(
      STORAGE_KEY,
      JSON.stringify(store),
    );
  });
});
