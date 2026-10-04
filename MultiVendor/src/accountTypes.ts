export type AccountProfile = {
  name: string;
  email: string;
  phone: string;
  recipientName: string;
  recipientPhone: string;
  address: string;
  district?: string;
  city: string;
  payment: 'cash' | 'card' | 'wallet';
  notifications: boolean;
};

export const defaultAccountProfile: AccountProfile = {
  name: '',
  email: '',
  phone: '',
  recipientName: '',
  recipientPhone: '',
  address: '',
  district: '',
  city: '',
  payment: 'cash',
  notifications: false,
};

export type AuthSession = {
  isLoggedIn: boolean;
  email: string;
};

export const defaultAuthSession: AuthSession = {
  isLoggedIn: false,
  email: '',
};

export type VendorDraft = {
  storeName: string;
  ownerName: string;
  email: string;
  category: string;
  description: string;
};

export const emptyVendorDraft: VendorDraft = {
  storeName: '',
  ownerName: '',
  email: '',
  category: 'Sống khỏe',
  description: '',
};
