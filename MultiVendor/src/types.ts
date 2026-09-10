import type { ImageSourcePropType } from 'react-native';

export type Product = {
  id: string;
  name: string;
  store: string;
  category: string;
  image: ImageSourcePropType;
  price: number;
  oldPrice: number;
  rating: number;
  reviews: number;
  discount: number;
  stock: number;
  description: string;
  benefits: string[];
};

export type CartQuantities = Record<string, number>;

export type OrderStatus = 'Processing' | 'Shipped' | 'Delivered';

export type Order = {
  id: string;
  date: string;
  total: number;
  itemCount: number;
  status: OrderStatus;
  productIds: string[];
  lines?: OrderLine[];
  delivery?: CustomerDetails;
  subtotal?: number;
  discount?: number;
  shipping?: number;
  coupon?: string;
  simulated?: boolean;
};

export type OrderLine = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
};

export type SortMode = 'popular' | 'price' | 'price-desc' | 'discount';

export type CustomerDetails = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  payment: 'cash' | 'card';
};

export type DemoCardDetails = {
  cardholder: string;
  number: string;
  expiry: string;
  cvv: string;
};

export type RouteName =
  | 'home'
  | 'shop'
  | 'product'
  | 'cart'
  | 'checkout'
  | 'success'
  | 'orders'
  | 'wishlist'
  | 'account'
  | 'sellers'
  | 'help';

export type Route = {
  name: RouteName;
  productId?: string;
  category?: string;
  query?: string;
  store?: string;
  sort?: SortMode;
  key?: string;
  orderId?: string;
};
