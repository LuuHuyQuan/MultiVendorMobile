import {
  calculateTotals,
  changeQuantity,
  createOrder,
  normalizeCart,
  normalizeCoupon,
  orderLines,
  reorderCart,
  validateDelivery,
  validateDemoCard,
} from '../src/commerce';
import { products } from '../src/data/catalog';
import type { CustomerDetails, Order } from '../src/types';

const vitamin = products.find(product => product.id === 'vitamin-c-1000')!;
const validDelivery = (): CustomerDetails => ({
  fullName: '  Jane Nguyen  ',
  phone: '  +84 912 345 678  ',
  address: '  123 Main Street  ',
  city: '  Hanoi  ',
  payment: 'cash',
});

describe('cart normalization', () => {
  test.each([null, undefined, [], 'not a cart', 12])(
    'rejects malformed cart %p',
    input => {
      expect(normalizeCart(input)).toEqual({});
    },
  );

  test('drops unknown IDs and invalid quantities, floors units and clamps to stock', () => {
    expect(
      normalizeCart({
        'vitamin-c-1000': 999,
        'hand-sanitizer': 2.8,
        'kids-vitamin-c': '2',
        'apple-juice': 0,
        'omega-3': -1,
        thermometer: Number.NaN,
        'bp-monitor': Number.POSITIVE_INFINITY,
        'skin-combat': 0.5,
        unknown: 3,
      }),
    ).toEqual({ 'vitamin-c-1000': vitamin.stock, 'hand-sanitizer': 2 });
  });

  test('quantity updates do not mutate the original cart and zero removes a line', () => {
    const cart = { 'vitamin-c-1000': 2, 'hand-sanitizer': 1 };
    expect(changeQuantity(cart, 'vitamin-c-1000', 0)).toEqual({
      'hand-sanitizer': 1,
    });
    expect(changeQuantity(cart, 'vitamin-c-1000', vitamin.stock + 1)).toEqual({
      'vitamin-c-1000': vitamin.stock,
      'hand-sanitizer': 1,
    });
    expect(cart).toEqual({ 'vitamin-c-1000': 2, 'hand-sanitizer': 1 });
  });

  test('order lines use catalogue prices and preserve normalized quantities', () => {
    expect(orderLines({ 'vitamin-c-1000': 2, unknown: 1 })).toEqual([
      { productId: vitamin.id, quantity: 2, price: 27.49, name: vitamin.name },
    ]);
  });
});

describe('checkout totals', () => {
  test('calculates cents before multiplication and rounds the 10% coupon once', () => {
    expect(calculateTotals({ 'vitamin-c-1000': 2 }, ' sellzy10 ')).toEqual({
      subtotal: 54.98,
      discount: 5.5,
      shipping: 0,
      total: 49.48,
      itemCount: 2,
    });
    expect(calculateTotals({ 'vitamin-c-1000': 1 }, 'SELLZY10')).toEqual({
      subtotal: 27.49,
      discount: 2.75,
      shipping: 4.99,
      total: 29.73,
      itemCount: 1,
    });
  });

  test('free shipping uses the $35 merchandise threshold before the discount', () => {
    expect(calculateTotals({ thermometer: 1 }).shipping).toBe(4.99);
    expect(
      calculateTotals({ 'vitamin-c-1000': 1, 'hand-sanitizer': 1 }, 'SELLZY10'),
    ).toEqual({
      subtotal: 37.24,
      discount: 3.72,
      shipping: 0,
      total: 33.52,
      itemCount: 2,
    });
  });

  test('an empty or wholly invalid cart has no shipping or coupon discount', () => {
    const zeroTotals = {
      subtotal: 0,
      discount: 0,
      shipping: 0,
      total: 0,
      itemCount: 0,
    };
    expect(calculateTotals({}, 'SELLZY10')).toEqual(zeroTotals);
    expect(calculateTotals({ unknown: 1, 'vitamin-c-1000': 0 })).toEqual(
      zeroTotals,
    );
  });

  test('only accepts the advertised coupon, ignoring casing and outer spaces', () => {
    expect(normalizeCoupon(' sellzy10 ')).toBe('SELLZY10');
    for (const coupon of ['SELLZY100', '', null, 10, { code: 'SELLZY10' }]) {
      expect(normalizeCoupon(coupon)).toBe('');
    }
    expect(calculateTotals({ 'vitamin-c-1000': 2 }, 'OTHER').discount).toBe(0);
  });
});

describe('delivery and orders', () => {
  test('validates demo card fields without storing card data', () => {
    expect(
      validateDemoCard({
        cardholder: 'Jane Nguyen',
        number: '4242 4242 4242 4242',
        expiry: '12/30',
        cvv: '123',
      }),
    ).toEqual({});
    expect(
      validateDemoCard({
        cardholder: '',
        number: '4242 4242 4242 4241',
        expiry: '13/30',
        cvv: '12',
      }),
    ).toEqual({
      cardholder: expect.any(String),
      number: expect.any(String),
      expiry: expect.any(String),
      cvv: expect.any(String),
    });
  });

  test('validates all required delivery fields and accepts formatted phone numbers', () => {
    expect(validateDelivery(validDelivery())).toEqual({});
    expect(
      validateDelivery({
        fullName: ' ',
        phone: '123abc45678',
        address: 'x',
        city: '',
        payment: 'other' as CustomerDetails['payment'],
      }),
    ).toEqual({
      fullName: expect.any(String),
      phone: expect.any(String),
      address: expect.any(String),
      city: expect.any(String),
      payment: expect.any(String),
    });
  });

  test.each(['1234567', '+1234567890123456', '12345678abc'])(
    'rejects invalid phone %s',
    phone => {
      expect(
        validateDelivery({ ...validDelivery(), phone }).phone,
      ).toBeDefined();
    },
  );

  test('does not create an empty order or an order with invalid delivery details', () => {
    expect(createOrder({}, '', validDelivery(), 'SZ-empty')).toBeNull();
    expect(
      createOrder({ unknown: 2 }, '', validDelivery(), 'SZ-unknown'),
    ).toBeNull();
    expect(
      createOrder(
        { 'vitamin-c-1000': 2 },
        '',
        { ...validDelivery(), address: '' },
        'SZ-invalid',
      ),
    ).toBeNull();
  });

  test('snapshots delivery details, prices and quantities and matches the checkout totals', () => {
    const cart = { 'vitamin-c-1000': 2, 'hand-sanitizer': 3 };
    const delivery = validDelivery();
    const order = createOrder(
      cart,
      'sellzy10',
      delivery,
      'SZ-test',
      new Date(2026, 8, 8),
    );
    expect(order).toMatchObject({
      id: 'SZ-test',
      date: 'Sep 8, 2026',
      status: 'Processing',
      simulated: true,
      ...calculateTotals(cart, 'SELLZY10'),
      coupon: 'SELLZY10',
      delivery: {
        fullName: 'Jane Nguyen',
        phone: '+84 912 345 678',
        address: '123 Main Street',
        city: 'Hanoi',
        payment: 'cash',
      },
      productIds: ['vitamin-c-1000', 'hand-sanitizer'],
      lines: [
        {
          productId: vitamin.id,
          quantity: 2,
          price: 27.49,
          name: vitamin.name,
        },
        {
          productId: 'hand-sanitizer',
          quantity: 3,
          price: 9.75,
          name: expect.any(String),
        },
      ],
    });
    delivery.address = 'Another address';
    cart['vitamin-c-1000'] = 9;
    expect(order!.delivery!.address).toBe('123 Main Street');
    expect(order!.lines![0].quantity).toBe(2);
  });

  test('reordering adds original quantities to the current cart and respects stock', () => {
    const order = createOrder(
      { 'vitamin-c-1000': 4, 'hand-sanitizer': 3 },
      '',
      validDelivery(),
      'SZ-repeat',
    )!;
    const cart = { 'vitamin-c-1000': vitamin.stock - 1, 'hand-sanitizer': 2 };
    expect(reorderCart(cart, order)).toEqual({
      'vitamin-c-1000': vitamin.stock,
      'hand-sanitizer': 5,
    });
    expect(cart['hand-sanitizer']).toBe(2);
    expect(order.lines![1].quantity).toBe(3);
  });

  test('reorders legacy orders without line snapshots using one of each known product', () => {
    const legacy: Order = {
      id: 'SZ-legacy',
      date: 'Sep 1, 2026',
      total: 27.49,
      itemCount: 1,
      status: 'Delivered',
      productIds: ['vitamin-c-1000', 'retired-product'],
    };
    expect(reorderCart({ 'vitamin-c-1000': 2 }, legacy)).toEqual({
      'vitamin-c-1000': 3,
    });
  });
});
