import { products } from './data/catalog';
import type {
  CartQuantities,
  CustomerDetails,
  DemoCardDetails,
  Order,
  OrderLine,
} from './types';

const productMap = new Map(products.map(product => [product.id, product]));
const cents = (amount: number) => Math.round(amount * 100);

export function normalizeCart(value: unknown): CartQuantities {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const cart: CartQuantities = {};
  for (const [id, quantity] of Object.entries(value)) {
    const product = productMap.get(id);
    if (
      product &&
      typeof quantity === 'number' &&
      Number.isFinite(quantity) &&
      quantity >= 1
    ) {
      cart[id] = Math.min(product.stock, Math.floor(quantity));
    }
  }
  return cart;
}

export function changeQuantity(
  cart: CartQuantities,
  id: string,
  quantity: number,
): CartQuantities {
  return normalizeCart({ ...cart, [id]: quantity });
}

export function normalizeCoupon(value: unknown): string {
  return typeof value === 'string' && value.trim().toUpperCase() === 'SELLZY10'
    ? 'SELLZY10'
    : '';
}

export function orderLines(cart: CartQuantities): OrderLine[] {
  return Object.entries(normalizeCart(cart)).map(([productId, quantity]) => {
    const product = productMap.get(productId)!;
    return { productId, quantity, name: product.name, price: product.price };
  });
}

export function calculateTotals(cart: CartQuantities, coupon = '') {
  const lines = orderLines(cart);
  const subtotalCents = lines.reduce(
    (sum, line) => sum + cents(line.price) * line.quantity,
    0,
  );
  const discountCents = normalizeCoupon(coupon)
    ? Math.round(subtotalCents * 0.1)
    : 0;
  // Miễn phí giao hàng được tính trên giá trị sản phẩm trước khuyến mãi.
  const shippingCents = subtotalCents === 0 || subtotalCents >= 3500 ? 0 : 499;
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
  if (details.city.trim().length < 2) errors.city = 'Vui lòng nhập tỉnh/thành phố.';
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
): Order | null {
  const totals = calculateTotals(cart, coupon);
  if (!totals.itemCount || Object.keys(validateDelivery(details)).length)
    return null;
  const lines = orderLines(cart);
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
): CartQuantities {
  const next = { ...cart };
  const lines =
    order.lines ??
    order.productIds.map(productId => ({ productId, quantity: 1 }));
  lines.forEach(line => {
    next[line.productId] = (next[line.productId] ?? 0) + line.quantity;
  });
  return normalizeCart(next);
}
