import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './components/SellzyUI';
import {
  changeQuantity,
  createOrder,
  normalizeCoupon,
  reorderCart,
} from './commerce';
import { products, getProduct } from './data/catalog';
import { defaultAuthSession } from './accountTypes';
import {
  AccountScreen,
  HelpScreen,
  OrdersScreen,
  SellersScreen,
  WishlistScreen,
} from './screens/AccountScreens';
import {
  CartScreen,
  CheckoutScreen,
  OrderSuccessScreen,
} from './screens/CheckoutScreens';
import HomeScreen from './screens/HomeScreen';
import { ProductDetailsScreen, ShopScreen } from './screens/ShopScreens';
import { emptyStore, loadStore, saveStore, StoreData } from './storage';
import { COLORS } from './theme';
import type {
  CustomerDetails,
  Order,
  Route,
  RouteName,
  SortMode,
} from './types';

const rootRoutes: RouteName[] = [
  'home',
  'shop',
  'orders',
  'wishlist',
  'account',
];

export default function SellzyApp() {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<Route[]>([
    { name: 'home', key: 'home' },
  ]);
  const [data, setData] = useState<StoreData>(emptyStore);
  const dataRef = useRef(data);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [toast, setToast] = useState('');
  const placing = useRef(false);
  const sequence = useRef(0);
  const route = routes[routes.length - 1];
  const { auth, cart, coupon, wishlistIds, orders, profile } = data;
  const cartCount = Object.values(cart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );

  useEffect(() => {
    let mounted = true;
    setLoadError(false);
    loadStore()
      .then(saved => {
        if (mounted) {
          dataRef.current = saved;
          setData(saved);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) setLoadError(true);
      });
    return () => {
      mounted = false;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const commit = (transform: (current: StoreData) => StoreData) => {
    const next = transform(dataRef.current);
    dataRef.current = next;
    setData(next);
    return saveStore(next).then(
      () => setSaveError(false),
      () => setSaveError(true),
    );
  };
  const startFresh = () => {
    const fresh = emptyStore();
    saveStore(fresh).then(
      () => {
        dataRef.current = fresh;
        setData(fresh);
        setLoadError(false);
        setReady(true);
      },
      () => setLoadError(true),
    );
  };
  const push = (next: Route) =>
    setRoutes(current => [
      ...current,
      { ...next, key: `${next.name}-${++sequence.current}` },
    ]);
  const goRoot = (name: RouteName) => setRoutes([{ name, key: name }]);
  const goBack = useCallback(
    () =>
      setRoutes(current =>
        current.length > 1
          ? current.slice(0, -1)
          : [{ name: 'home', key: 'home' }],
      ),
    [],
  );

  useEffect(() => {
    const listener = BackHandler.addEventListener('hardwareBackPress', () => {
      if (placing.current) return true;
      if (routes.length > 1 || route.name !== 'home') {
        goBack();
        return true;
      }
      return false;
    });
    return () => listener.remove();
  }, [route.name, routes.length, goBack]);

  const addToCart = (id: string, quantity = 1) => {
    const product = products.find(item => item.id === id);
    if (!product) return;
    const existing = dataRef.current.cart[id] ?? 0;
    if (existing >= product.stock) {
      setToast('You have reached the available stock.');
      return;
    }
    commit(current => ({
      ...current,
      cart: changeQuantity(current.cart, id, existing + quantity),
    }));
    setToast(
      `${Math.min(quantity, product.stock - existing)} added to your cart`,
    );
  };
  const openCart = () => push({ name: 'cart' });
  const openShop = (category?: string, query?: string, sort?: SortMode) =>
    push({ name: 'shop', category, query, sort });
  const openProduct = (id: string) => push({ name: 'product', productId: id });
  const toggleWishlist = (id: string) => {
    const liked = dataRef.current.wishlistIds.includes(id);
    commit(current => ({
      ...current,
      wishlistIds: liked
        ? current.wishlistIds.filter(item => item !== id)
        : [...current.wishlistIds, id],
    }));
    setToast(liked ? 'Removed from wishlist' : 'Saved to wishlist');
  };
  const applyCoupon = (code: string) => {
    const normalized = normalizeCoupon(code);
    if (!normalized && code.trim()) return false;
    commit(current => ({ ...current, coupon: normalized }));
    return true;
  };
  const placeOrder = async (details: CustomerDetails) => {
    if (placing.current) return;
    const current = dataRef.current;
    const order = createOrder(
      current.cart,
      current.coupon,
      details,
      `SZ-${Date.now().toString(36).toUpperCase()}-${++sequence.current}`,
    );
    if (!order) {
      setToast('Check your delivery details and cart.');
      return;
    }
    placing.current = true;
    await commit(previous => ({
      ...previous,
      orders: [order, ...previous.orders],
      cart: {},
      coupon: '',
    }));
    setRoutes([
      { name: 'home', key: 'home' },
      { name: 'success', key: order.id, orderId: order.id },
    ]);
    placing.current = false;
  };
  const reorder = (order: Order) => {
    commit(current => ({
      ...current,
      cart: reorderCart(current.cart, order),
    }));
    openCart();
    setToast('Order items added to your cart');
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.brand}>Sellzy</Text>
        {loadError ? (
          <>
            <Text style={styles.loadingText}>
              Your saved shopping data could not be opened.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLoadAttempt(value => value + 1)}
              style={styles.retry}
            >
              <Text style={styles.white}>Try again</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={startFresh}
              style={styles.fresh}
            >
              <Text style={styles.freshText}>Start with empty local data</Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator
            color={COLORS.teal}
            accessibilityLabel="Loading saved shopping data"
          />
        )}
      </View>
    );
  }

  const shared = {
    topInset: insets.top,
    cartCount,
    wishlistIds,
    onBack: goBack,
    onCart: openCart,
    onAdd: addToCart,
    onOpenProduct: openProduct,
    onToggleLike: toggleWishlist,
  };
  const renderRoute = () => {
    switch (route.name) {
      case 'home':
        return (
          <HomeScreen
            {...shared}
            onShop={openShop}
            onSellers={() => push({ name: 'sellers' })}
          />
        );
      case 'shop':
        return (
          <ShopScreen
            {...shared}
            canGoBack={routes.length > 1}
            initialCategory={route.category}
            initialQuery={route.query}
            initialStore={route.store}
            initialSort={route.sort}
            onFiltersChange={filters =>
              setRoutes(current =>
                current.map((item, index) =>
                  index === current.length - 1 ? { ...item, ...filters } : item,
                ),
              )
            }
          />
        );
      case 'product':
        return (
          <ProductDetailsScreen
            {...shared}
            product={getProduct(route.productId)}
            onBuyNow={() => push({ name: 'checkout' })}
          />
        );
      case 'cart':
        return (
          <CartScreen
            cart={cart}
            couponCode={coupon}
            onApplyCoupon={applyCoupon}
            onBack={goBack}
            onCheckout={() => push({ name: 'checkout' })}
            onOpenProduct={openProduct}
            onRemove={id => {
              commit(current => {
                const next = { ...current.cart };
                delete next[id];
                return {
                  ...current,
                  cart: next,
                  coupon: Object.keys(next).length ? current.coupon : '',
                };
              });
            }}
            onSetQuantity={(id, quantity) => {
              commit(current => ({
                ...current,
                cart: changeQuantity(current.cart, id, quantity),
              }));
            }}
            onShop={() => goRoot('shop')}
            topInset={insets.top}
          />
        );
      case 'checkout':
        return (
          <CheckoutScreen
            cart={cart}
            couponCode={coupon}
            onBack={goBack}
            onPlaceOrder={placeOrder}
            initialDetails={{
              fullName: profile.name,
              phone: profile.phone,
              address: profile.address,
              city: profile.city,
              payment: profile.payment,
            }}
            topInset={insets.top}
          />
        );
      case 'success':
        return (
          <OrderSuccessScreen
            onHome={() => goRoot('home')}
            onOrders={() => goRoot('orders')}
            orderId={route.orderId ?? ''}
            topInset={insets.top}
          />
        );
      case 'orders':
        return (
          <OrdersScreen
            {...shared}
            onReorder={reorder}
            onShop={() => goRoot('shop')}
            orders={orders}
          />
        );
      case 'wishlist':
        return (
          <WishlistScreen
            {...shared}
            ids={wishlistIds}
            onShop={() => goRoot('shop')}
          />
        );
      case 'account':
        return (
          <AccountScreen
            {...shared}
            auth={auth}
            onLogin={email => {
              const normalizedEmail = email.trim().toLowerCase();
              commit(current => ({
                ...current,
                auth: { isLoggedIn: true, email: normalizedEmail },
                profile: {
                  ...current.profile,
                  email: normalizedEmail,
                  name:
                    current.profile.name ||
                    normalizedEmail
                      .split('@')[0]
                      .replace(/[._-]+/g, ' ')
                      .replace(/\b\w/g, letter => letter.toUpperCase()),
                },
              }));
              setToast('Signed in successfully');
            }}
            onLogout={() => {
              commit(current => ({
                ...current,
                auth: { ...defaultAuthSession },
              }));
              setToast('You are now signed out');
            }}
            profile={profile}
            onSaveProfile={next => {
              commit(current => ({ ...current, profile: next }));
              setToast('Profile saved on this device');
            }}
            onHelp={() => push({ name: 'help' })}
            onOrders={() => goRoot('orders')}
            onSellers={() => push({ name: 'sellers' })}
            onWishlist={() => goRoot('wishlist')}
            orderCount={orders.length}
            wishlistCount={wishlistIds.length}
          />
        );
      case 'sellers':
        return (
          <SellersScreen
            {...shared}
            onShop={store => push({ name: 'shop', store })}
            vendorDraft={data.vendorDraft}
            onSaveVendorDraft={next => {
              commit(current => ({ ...current, vendorDraft: next }));
              setToast('Vendor draft saved on this device');
            }}
          />
        );
      case 'help':
        return <HelpScreen onBack={goBack} topInset={insets.top} />;
    }
  };
  const showBottomNav = rootRoutes.includes(route.name);
  return (
    <View style={styles.app}>
      <StatusBar
        barStyle={route.name === 'home' ? 'light-content' : 'dark-content'}
      />
      <View
        key={route.key ?? route.name}
        style={[
          styles.route,
          !showBottomNav && { paddingBottom: insets.bottom },
        ]}
      >
        {renderRoute()}
      </View>
      {saveError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            saveStore(dataRef.current).then(
              () => setSaveError(false),
              () => setSaveError(true),
            );
          }}
          style={styles.saveWarning}
        >
          <Text style={styles.warningText}>
            Changes are only in memory. Tap to retry saving.
          </Text>
        </Pressable>
      ) : null}
      {showBottomNav ? (
        <BottomNav
          active={route.name}
          bottomInset={insets.bottom}
          cartCount={cartCount}
          onSelect={goRoot}
          wishlistCount={wishlistIds.length}
        />
      ) : null}
      {toast ? (
        <View
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            styles.pointerEventsNone,
            { bottom: showBottomNav ? 78 + insets.bottom : 22 + insets.bottom },
          ]}
        >
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pointerEventsNone: { pointerEvents: 'none' },
  app: { flex: 1, backgroundColor: COLORS.white },
  route: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
    gap: 20,
  },
  brand: { fontSize: 40, color: COLORS.teal, fontWeight: '900' },
  loadingText: { color: COLORS.muted, textAlign: 'center' },
  retry: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    backgroundColor: COLORS.teal,
  },
  fresh: {
    minHeight: 44,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freshText: { color: COLORS.teal, fontWeight: '700' },
  white: { color: COLORS.white, fontWeight: '700' },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    padding: 14,
    borderRadius: 16,
    backgroundColor: COLORS.tealDark,
    elevation: 20,
  },
  toastText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  saveWarning: { backgroundColor: '#FFF3D2', padding: 12 },
  warningText: { color: '#755900', fontSize: 12, textAlign: 'center' },
});
