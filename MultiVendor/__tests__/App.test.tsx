/**
 * @format
 */

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';
import { STORAGE_KEY } from '../src/storage';

const getItem = jest.mocked(AsyncStorage.getItem);
const setItem = jest.mocked(AsyncStorage.setItem);
const removeItem = jest.mocked(AsyncStorage.removeItem);
const fetchMock = jest.fn();

const AUTH_SESSION_KEY = '@sellzy/auth-session/v1';
const loginTokens = {
  tokenType: 'Bearer',
  accessToken: 'access-token-from-api',
  refreshToken: 'refresh-token-from-api',
  expiresIn: 3600,
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response;
}

jest.setTimeout(60_000);

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
  removeItem.mockReset();
  fetchMock.mockReset();
  getItem.mockImplementation(async key => {
    if (key === STORAGE_KEY || key === AUTH_SESSION_KEY) return null;
    throw new Error(`Unexpected storage key: ${key}`);
  });
  setItem.mockResolvedValue();
  removeItem.mockResolvedValue();
  fetchMock.mockResolvedValue(jsonResponse(loginTokens));
  globalThis.fetch = fetchMock;
});

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  props: Record<string, unknown>,
  event?: object,
) {
  await ReactTestRenderer.act(async () => {
    await renderer.root
      .findByProps(props)
      .props.onPress(event ?? { stopPropagation: jest.fn() });
  });
}

test('signs a guest in through the API, persists tokens, and logs out', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
  expect(getItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  await press(renderer, { accessibilityLabel: 'Account' });
  expect(renderer.root.findByProps({ children: 'Guest shopper' })).toBeTruthy();
  await press(renderer, { testID: 'account-login' });
  expect(renderer.root.findByProps({ children: 'Welcome back' })).toBeTruthy();
  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ testID: 'auth-email' })
      .props.onChangeText('USER@example.com');
    renderer.root
      .findByProps({ testID: 'auth-password' })
      .props.onChangeText('secret1');
  });
  await press(renderer, { testID: 'auth-submit' });

  expect(
    renderer.root.findByProps({ children: 'user@example.com' }),
  ).toBeTruthy();
  expect(renderer.root.findByProps({ children: 'SIGNED IN' })).toBeTruthy();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  const [loginUrl, loginRequest] = fetchMock.mock.calls[0];
  expect(loginUrl).toMatch(/\/auth\/login$/);
  expect(loginRequest).toMatchObject({ method: 'POST' });
  expect(JSON.parse(loginRequest.body)).toEqual({
    email: 'user@example.com',
    password: 'secret1',
  });

  const tokenWrite = setItem.mock.calls.find(
    ([key]) => key === AUTH_SESSION_KEY,
  );
  expect(tokenWrite).toBeDefined();
  expect(JSON.parse(tokenWrite![1])).toMatchObject({
    tokenType: 'Bearer',
    accessToken: 'access-token-from-api',
    refreshToken: 'refresh-token-from-api',
  });
  const storeWrite = [...setItem.mock.calls]
    .reverse()
    .find(([key]) => key === STORAGE_KEY);
  expect(storeWrite).toBeDefined();
  expect(JSON.parse(storeWrite![1]).auth).toEqual({
    isLoggedIn: true,
    email: 'user@example.com',
  });
  expect(setItem.mock.calls.map(([, value]) => value).join('\n')).not.toContain(
    'secret1',
  );

  await press(renderer, { testID: 'account-logout' });
  await press(renderer, { testID: 'logout-confirm' });
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  expect(renderer.root.findByProps({ children: 'Guest shopper' })).toBeTruthy();
  expect(removeItem).toHaveBeenCalledWith(AUTH_SESSION_KEY);
  const logoutStoreWrite = [...setItem.mock.calls]
    .reverse()
    .find(([key]) => key === STORAGE_KEY);
  expect(JSON.parse(logoutStoreWrite![1]).auth).toEqual({
    isLoggedIn: false,
    email: '',
  });

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('hydrates local data and renders the home screen', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(getItem).toHaveBeenCalledWith(STORAGE_KEY);
  expect(renderer.root.findByProps({ testID: 'home-shop-now' })).toBeTruthy();
  expect(renderer.root.findByProps({ testID: 'header-cart' })).toBeTruthy();

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('offers a retry after a local-data read failure', async () => {
  let failRead!: (reason: Error) => void;
  let storeReads = 0;
  getItem.mockImplementation(key => {
    if (key === AUTH_SESSION_KEY) return Promise.resolve(null);
    if (key !== STORAGE_KEY) {
      return Promise.reject(new Error(`Unexpected storage key: ${key}`));
    }
    storeReads += 1;
    if (storeReads === 1) {
      return new Promise((_, reject) => {
        failRead = reject;
      });
    }
    return Promise.resolve(null);
  });

  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });
  await ReactTestRenderer.act(async () => {
    failRead(new Error('Storage unavailable'));
  });

  expect(
    renderer.root.findByProps({
      children: 'Your saved shopping data could not be opened.',
    }),
  ).toBeTruthy();
  const retry = renderer.root
    .findAllByProps({ accessibilityRole: 'button' })
    .find(node => typeof node.props.onPress === 'function');
  expect(retry).toBeDefined();

  await ReactTestRenderer.act(async () => {
    retry!.props.onPress();
  });

  expect(storeReads).toBe(2);
  expect(renderer.root.findByProps({ testID: 'home-shop-now' })).toBeTruthy();

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('completes a local checkout and shows the saved order', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  await press(renderer, { testID: 'add-vitamin-c-1000' });
  await press(renderer, { testID: 'header-cart' });

  await ReactTestRenderer.act(async () => {
    renderer.root
      .findByProps({ testID: 'coupon-input' })
      .props.onChangeText('sellzy10');
  });
  await press(renderer, { accessibilityLabel: 'Apply coupon' });
  expect(
    renderer.root.findByProps({
      children: 'SELLZY10 applied — you saved $2.75!',
    }),
  ).toBeTruthy();

  await press(renderer, { testID: 'cart-checkout' });
  const values = [
    ['checkout-name', 'Jane Nguyen'],
    ['checkout-phone', '+84 912 345 678'],
    ['checkout-address', '123 Main Street'],
    ['checkout-city', 'Hanoi'],
  ] as const;
  for (const [testID, value] of values) {
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID }).props.onChangeText(value);
    });
  }

  await press(renderer, { testID: 'checkout-continue-payment' });
  await press(renderer, { accessibilityLabel: 'Credit or debit card' });
  const cardValues = [
    ['card-holder', 'Jane Nguyen'],
    ['card-number', '4242424242424242'],
    ['card-expiry', '1230'],
    ['card-cvv', '123'],
  ] as const;
  for (const [testID, value] of cardValues) {
    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({ testID }).props.onChangeText(value);
    });
  }
  await press(renderer, { testID: 'checkout-review-order' });
  expect(
    renderer.root.findByProps({ children: 'Demo card ending 4242' }),
  ).toBeTruthy();

  await press(renderer, { testID: 'place-order' });
  expect(renderer.root.findByProps({ children: 'Order saved!' })).toBeTruthy();
  await press(renderer, { testID: 'view-orders' });
  expect(renderer.root.findByProps({ children: 'Saved locally' })).toBeTruthy();

  const saved = JSON.parse(setItem.mock.calls.at(-1)![1]);
  expect(saved.cart).toEqual({});
  expect(saved.orders).toHaveLength(1);
  expect(saved.orders[0]).toMatchObject({
    coupon: 'SELLZY10',
    itemCount: 1,
    simulated: true,
  });
  expect(saved.orders[0].delivery.payment).toBe('card');
  expect(JSON.stringify(saved)).not.toContain('4242 4242');

  await ReactTestRenderer.act(async () => renderer.unmount());
});
