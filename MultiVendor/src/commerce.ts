import { products } from './data/catalog';
import type {
  CartQuantities,
  CustomerDetails,
  DemoCardDetails,
  Order,
  OrderLine,
  Product,
} from './types';

const productMap = new Map(products.map(product => [product.id, product]));
const mapFor = (catalog: Product[]) =>
  catalog === products
    ? productMap
    : new Map(catalog.map(product => [product.id, product]));
const cents = (amount: number) => Math.round(amount * 100);
export const FREE_SHIPPING_THRESHOLD = 500;
export const STANDARD_SHIPPING_FEE = 30;

// Storefront product IDs are positive 32-bit integers. Preserve these IDs in
// persisted carts while the network catalogue has not loaded yet.
export const isRemoteProductId = (id: string): boolean =>
  /^[1-9]\d{0,9}$/.test(id) && Number(id) <= 2_147_483_647;

export const isRemoteCartId = (id: string): boolean => {
  const [productId, variantId, extra] = id.split(':');
  return (
    extra === undefined &&
    isRemoteProductId(productId) &&
    (variantId === undefined || isRemoteProductId(variantId))
  );
};

export function normalizeCart(
  value: unknown,
  catalog: Product[] = products,
  preserveRemoteIds = false,
): CartQuantities {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const cart: CartQuantities = {};
  const currentProductMap = mapFor(catalog);
  for (const [id, quantity] of Object.entries(value)) {
    const product = currentProductMap.get(id);
    if (typeof quantity !== 'number' || !Number.isFinite(quantity) || quantity < 1) {
      continue;
    }
    if (product && product.stock > 0) {
      cart[id] = Math.min(product.stock, Math.floor(quantity));
    } else if (preserveRemoteIds && isRemoteCartId(id)) {
      cart[id] = Math.min(999, Math.floor(quantity));
    }
  }
  return cart;
}

export function changeQuantity(
  cart: CartQuantities,
  id: string,
  quantity: number,
  catalog: Product[] = products,
): CartQuantities {
  return normalizeCart({ ...cart, [id]: quantity }, catalog);
}

export function normalizeCoupon(value: unknown): string {
  return typeof value === 'string' && value.trim().toUpperCase() === 'SELLZY10'
    ? 'SELLZY10'
    : '';
}

export function orderLines(
  cart: CartQuantities,
  catalog: Product[] = products,
): OrderLine[] {
  const currentProductMap = mapFor(catalog);
  return Object.entries(normalizeCart(cart, catalog)).map(([productId, quantity]) => {
    const product = currentProductMap.get(productId)!;
    return { productId, quantity, name: product.name, price: product.price };
  });
}

export function calculateTotals(
  cart: CartQuantities,
  coupon = '',
  catalog: Product[] = products,
) {
  const lines = orderLines(cart, catalog);
  const subtotalCents = lines.reduce(
    (sum, line) => sum + cents(line.price) * line.quantity,
    0,
  );
  const discountCents = normalizeCoupon(coupon)
    ? Math.round(subtotalCents * 0.1)
    : 0;
  // Miễn phí giao hàng được tính trên giá trị sản phẩm trước khuyến mãi.
  const shippingCents =
    subtotalCents === 0 || subtotalCents >= cents(FREE_SHIPPING_THRESHOLD)
      ? 0
      : cents(STANDARD_SHIPPING_FEE);
  return {
    subtotal: subtotalCents / 100,
    discount: discountCents / 100,
    shipping: shippingCents / 100,
    total: (subtotalCents - discountCents + shippingCents) / 100,
    itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
}

export function validateDelivery(
  details: CustomerDetails,
): Partial<Record<keyof CustomerDetails, string>> {
  const errors: Partial<Record<keyof CustomerDetails, string>> = {};
  if (details.fullName.trim().length < 2)
    errors.fullName = 'Vui lòng nhập họ và tên.';
  if (
    !/^[+\d\s().-]+$/.test(details.phone) ||
    !/^\d{8,15}$/.test(details.phone.replace(/\D/g, ''))
  ) {
    errors.phone = 'Số điện thoại phải có từ 8–15 chữ số.';
  }
  if (details.address.trim().length < 5)
    errors.address = 'Vui lòng nhập địa chỉ nhận hàng.';
  if (details.city.trim().length < 2)
    errors.city = 'Vui lòng nhập tỉnh/thành phố.';
  if (details.payment !== 'cash' && details.payment !== 'card')
    errors.payment = 'Vui lòng chọn phương thức thanh toán.';
  return errors;
}

export function validateDemoCard(
  card: DemoCardDetails,
): Partial<Record<keyof DemoCardDetails, string>> {
  const errors: Partial<Record<keyof DemoCardDetails, string>> = {};
  const digits = card.number.replace(/\D/g, '');
  if (card.cardholder.trim().length < 2) {
    errors.cardholder = 'Vui lòng nhập tên chủ thẻ.';
  }
  if (!/^\d{16}$/.test(digits) || !passesLuhn(digits)) {
    errors.number = 'Vui lòng nhập số thẻ mẫu gồm 16 chữ số hợp lệ.';
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry.trim())) {
    errors.expiry = 'Dùng định dạng MM/YY.';
  }
  if (!/^\d{3,4}$/.test(card.cvv.trim())) {
    errors.cvv = 'CVV gồm 3 hoặc 4 chữ số.';
  }
  return errors;
}

function passesLuhn(value: string) {
  let sum = 0;
  let double = false;
  for (let index = value.length - 1; index >= 0; index -= 1) {
    let digit = Number(value[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function createOrder(
  cart: CartQuantities,
  coupon: string,
  details: CustomerDetails,
  id: string,
  now = new Date(),
  catalog: Product[] = products,
): Order | null {
  const totals = calculateTotals(cart, coupon, catalog);
  if (!totals.itemCount || Object.keys(validateDelivery(details)).length)
    return null;
  const lines = orderLines(cart, catalog);
  return {
    id,
    date: now.toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    ...totals,
    lines,
    productIds: lines.map(line => line.productId),
    coupon: normalizeCoupon(coupon),
    delivery: {
      fullName: details.fullName.trim(),
      phone: details.phone.trim(),
      address: details.address.trim(),
      city: details.city.trim(),
      payment: details.payment,
    },
    status: 'Processing',
    simulated: true,
  };
}

export function reorderCart(
  cart: CartQuantities,
  order: Order,
  catalog: Product[] = products,
): CartQuantities {
  const next = { ...cart };
  const lines =
    order.lines ??
    order.productIds.map(productId => ({ productId, quantity: 1 }));
  lines.forEach(line => {
    next[line.productId] = (next[line.productId] ?? 0) + line.quantity;
  });
  return normalizeCart(next, catalog);
}
