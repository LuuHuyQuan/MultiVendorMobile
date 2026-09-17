/* global jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// babel-preset-expo rewrites EXPO_PUBLIC_* reads to this ESM-only helper.
// Keep unit tests on Jest's CommonJS runtime while preserving the env contract.
jest.mock('expo/virtual/env', () => ({ env: process.env }));
