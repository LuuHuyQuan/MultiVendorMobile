export type AccountProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  payment: 'cash' | 'card';
  notifications: boolean;
};

export const defaultAccountProfile: AccountProfile = {
  name: '',
  email: '',
  phone: '',
  address: '',
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
  category: 'Wellness',
  description: '',
};
