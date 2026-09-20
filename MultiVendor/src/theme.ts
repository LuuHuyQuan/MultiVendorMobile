export const COLORS = {
  teal: '#078B81',
  tealDark: '#075D63',
  tealSoft: '#E7F7F5',
  yellow: '#FFC928',
  red: '#D91F52',
  ink: '#20272D',
  muted: '#737E84',
  border: '#E3E9E7',
  surface: '#F5F8F7',
  white: '#FFFFFF',
  success: '#2E9D64',
  orange: '#F19938',
};

const vndFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  maximumFractionDigits: 0,
});

// Catalogue prices are stored in thousands of đồng, matching the web storefront.
export const money = (value: number) =>
  vndFormatter.format(Math.round(value * 1000));
