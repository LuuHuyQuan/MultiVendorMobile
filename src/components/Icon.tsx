import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { COLORS } from '../theme';

const paths = {
  home: 'M3 10 12 3l9 7M5 9v11h5v-6h4v6h5V9',
  shop: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  cart: 'M2 3h3l2.4 12h11.8L22 7H6M8 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2M18 19a1 1 0 1 0 0 2 1 1 0 0 0 0-2',
  orders: 'M8 4H5v17h14V4h-3M8 2h8v5H8zM9 11h6M9 15h6',
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  back: 'm15 5-7 7 7 7',
  'chevron-right': 'm9 5 7 7-7 7',
  search: 'M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-2 6 6 6',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',
  'arrow-right': 'M4 12h16m-6-6 6 6-6 6',
  'arrow-up-right': 'M6 18 18 6M6 6h12v12',
  sort: 'M8 3v18m-4-4 4 4 4-4M16 21V3m-4 4 4-4 4 4',
  filter: 'M4 7h16M4 17h16M8 4v6M16 14v6',
  truck:
    'M1 5h13v12H1zM14 9h4l4 4v4h-8M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  shield: 'M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6l-9-4Zm-5 10 3 3 7-7',
  headset:
    'M3 13V10a9 9 0 0 1 18 0v3M3 11h3v8H3zM18 11h3v8h-3zM21 19c0 3-5 3-9 3',
  refresh: 'M20 7A9 9 0 1 0 21 14M20 2v6h-6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  mail: 'M3 4h18v16H3zM3 5l9 8 9-8',
  phone: 'M7 2H3v4c0 8 7 15 15 15h4v-4l-6-2-2 3a15 15 0 0 1-8-8l3-2-2-6Z',
  package:
    'm12 2 9 5v10l-9 5-9-5V7l9-5Zm0 10 9-5M12 12 3 7M12 12v10M7.5 4.5l9 5V14',
  'credit-card': 'M2 4h20v16H2zM2 9h20M6 15h4',
  star: 'm12 2 3.1 6.3 7 .9-5 4.9 1.2 6.9-6.3-3.3L5.7 21l1.2-6.9-5-4.9 7-.9L12 2Z',
  logout: 'M9 3H3v18h6M9 12h12m-5-5 5 5-5 5',
  info: 'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM12 11v6M12 7h.01',
  leaf: 'M20 3c-9 0-16 2-16 10a7 7 0 0 0 7 7c8 0 9-8 9-17ZM3 22 15 10',
  activity: 'M2 12h5l3-9 4 18 3-9h5',
  bottle: 'M9 2h6v4H9zM9 6v3c-3 0-4 2-4 4v8h14v-8c0-2-1-4-4-4V6M5 14h14',
} as const;

export type IconName = keyof typeof paths;

type IconProps = {
  name: IconName;
  size?: number;
  color?: string;
  filled?: boolean;
  strokeWidth?: number;
};

export function Icon({
  name,
  size = 22,
  color = COLORS.ink,
  filled = false,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <Svg
      accessible={false}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d={paths[name]}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
