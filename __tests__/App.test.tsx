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

jest.setTimeout(60_000);

beforeEach(() => {
  getItem.mockReset();
  setItem.mockReset();
  setItem.mockResolvedValue();
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

test('hydrates local data and renders the home screen', async () => {
  getItem.mockResolvedValueOnce(null);

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
  getItem.mockReturnValueOnce(
    new Promise((_, reject) => {
      failRead = reject;
    }),
  );
  getItem.mockResolvedValueOnce(null);

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

  expect(getItem).toHaveBeenCalledTimes(2);
  expect(renderer.root.findByProps({ testID: 'home-shop-now' })).toBeTruthy();

  await ReactTestRenderer.act(async () => renderer.unmount());
});

test('completes a local checkout and shows the saved order', async () => {
  getItem.mockResolvedValueOnce(null);
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
