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
  clearSession,
  getSessionEmail,
  hasStoredSession,
  login,
  register,
} from './api/auth';
import { shopCartApi, type ShopCart } from './api/shopCart';
import { ApiError } from './api/errors';
import {
  changeQuantity,
  createOrder,
  normalizeCoupon,
  reorderCart,
} from './commerce';
import { categories, products } from './data/catalog';
import {
  baseProductId,
  cartKeyForVariant,
  loadLiveCatalog,
  type LiveCatalog,
} from './data/liveCatalog';
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
import AuthScreen from './screens/AuthScreen';
import WalletScreen from './screens/WalletScreen';
import SellerPortalScreen from './screens/SellerPortalScreen';
import { ProductDetailsScreen, ShopScreen } from './screens/ShopScreens';
import { emptyStore, loadStore, saveStore, StoreData } from './storage';
import { COLORS } from './theme';
import type {
  CustomerDetails,
  Order,
  Product,
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

const isRemoteCartId = (id: string) => /^\d+(?::\d+)?$/.test(id);
const toCartFor = (cart: StoreData['cart'], catalog: Product[]) => {
  const ids = new Set(catalog.map(product => product.id));
  return Object.fromEntries(
    Object.entries(cart).filter(([id]) => ids.has(id)),
  );
};
const withActiveCart = (
  cart: StoreData['cart'],
  nextActive: StoreData['cart'],
  catalog: Product[],
) => {
  const ids = new Set(catalog.map(product => product.id));
  return {
    ...Object.fromEntries(Object.entries(cart).filter(([id]) => !ids.has(id))),
    ...nextActive,
  };
};
const fromServerCart = (server: ShopCart, catalog: LiveCatalog) => {
  const result: StoreData['cart'] = {};
  server.items.forEach(line => {
    const base = catalog.products.find(product => product.id === String(line.productId));
    if (!base) return;
    const key = cartKeyForVariant(base, line.variantId);
    if (catalog.cartProducts.some(product => product.id === key)) {
      result[key] = line.quantity;
    }
  });
  return result;
};

export default function SellzyApp() {
  const insets = useSafeAreaInsets();
  const [routes, setRoutes] = useState<Route[]>([
    { name: 'home', key: 'home' },
  ]);
  const [data, setData] = useState<StoreData>(emptyStore);
  const dataRef = useRef(data);
  const accountScope = useRef<string | undefined>(undefined);
  const [remoteCatalog, setRemoteCatalog] = useState<LiveCatalog | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [serverSubtotal, setServerSubtotal] = useState<number | null>(null);
  const hydratedAccount = useRef('');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [toast, setToast] = useState('');
  const placing = useRef(false);
  const sequence = useRef(0);
  const route = routes[routes.length - 1];
  const { auth, cart, coupon, wishlistIds, orders, profile } = data;
  const hasDemoCart = Object.keys(cart).some(id => !isRemoteCartId(id));
  const liveCatalog = remoteCatalog !== null && !hasDemoCart;
  const activeProducts = liveCatalog ? remoteCatalog.products : products;
  const cartCatalog = liveCatalog ? remoteCatalog.cartProducts : products;
  const activeCategories = liveCatalog ? remoteCatalog.categories : categories;
  const activeCart = toCartFor(cart, cartCatalog);
  const activeWishlistIds = wishlistIds.filter(id =>
    activeProducts.some(product => product.id === id),
  );
  const cartCount = Object.values(activeCart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );

  useEffect(() => {
    let mounted = true;
    setLoadError(false);
    Promise.all([loadStore(), hasStoredSession(), getSessionEmail()])
      .then(async ([saved, hasSession, sessionEmail]) => {
        if (mounted) {
          const email = hasSession
            ? sessionEmail || saved.auth.email
            : '';
          let restored = saved;
          if (email) {
            const scoped = await loadStore(products, email);
            const shouldMigrate =
              saved.auth.isLoggedIn &&
              saved.auth.email === email &&
              !scoped.auth.isLoggedIn &&
              !Object.keys(scoped.cart).length &&
              !scoped.orders.length;
            restored = shouldMigrate ? saved : scoped;
            if (shouldMigrate) {
              await saveStore(saved, email);
              await saveStore(emptyStore());
            }
            accountScope.current = email;
          } else if (saved.auth.isLoggedIn) {
            restored = {
              ...saved,
              auth: { ...defaultAuthSession },
              profile: emptyStore().profile,
              orders: [],
            };
          }
          restored = {
            ...restored,
            auth: email
              ? { isLoggedIn: true, email }
              : { ...defaultAuthSession },
          };
          if (!mounted) return;
          dataRef.current = restored;
          setData(restored);
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
    const controller = new AbortController();
    let active = true;
    const timer = setTimeout(() => {
      controller.abort();
      if (active) setCatalogError(true);
    }, 30000);
    setCatalogError(false);
    loadLiveCatalog(controller.signal).then(
      catalog => {
        if (active && !controller.signal.aborted) setRemoteCatalog(catalog);
      },
      () => {
        if (active) setCatalogError(true);
      },
    ).finally(() => clearTimeout(timer));
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [catalogAttempt]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(timer);
  }, [toast]);

  const commit = (transform: (current: StoreData) => StoreData) => {
    const next = transform(dataRef.current);
    dataRef.current = next;
    setData(next);
    return saveStore(next, accountScope.current).then(
      () => setSaveError(false),
      () => setSaveError(true),
    );
  };
  const startFresh = async () => {
    const fresh = emptyStore();
    try {
      await clearSession();
    } catch {
      setLoadError(true);
      return;
    }
    saveStore(fresh).then(
      () => {
        accountScope.current = undefined;
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

  const addToCart = (id: string, quantity = 1, variantId?: number) => {
    const base = activeProducts.find(item => item.id === id);
    const key =
      liveCatalog && base && variantId
        ? cartKeyForVariant(base, variantId)
        : id;
    const product = cartCatalog.find(item => item.id === key);
    if (!product) return false;
    const existing = dataRef.current.cart[key] ?? 0;
    if (existing >= product.stock || existing + quantity > product.stock) {
      setToast('Số lượng đã đạt mức tồn kho hiện có.');
      return false;
    }
    commit(current => ({
      ...current,
      cart: withActiveCart(
        current.cart,
        changeQuantity(
          toCartFor(current.cart, cartCatalog),
          key,
          existing + quantity,
          cartCatalog,
        ),
        cartCatalog,
      ),
    }));
    setToast(
      `Đã thêm ${Math.min(
        quantity,
        product.stock - existing,
      )} sản phẩm vào giỏ hàng.`,
    );
    return true;
  };
  const buyNow = (id: string, quantity = 1, variantId?: number) => {
    if (addToCart(id, quantity, variantId)) beginCheckout();
  };
  const openCart = () => push({ name: 'cart' });
  const openShop = (category?: string, query?: string, sort?: SortMode) =>
    push({ name: 'shop', category, query, sort });
  const openProduct = (id: string) =>
    push({ name: 'product', productId: baseProductId(id) });
  const toggleWishlist = (id: string) => {
    const liked = dataRef.current.wishlistIds.includes(id);
    commit(current => ({
      ...current,
      wishlistIds: liked
        ? current.wishlistIds.filter(item => item !== id)
        : [...current.wishlistIds, id],
    }));
    setToast(
      liked
        ? 'Đã bỏ khỏi danh sách yêu thích.'
        : 'Đã thêm vào danh sách yêu thích.',
    );
  };
  const applyCoupon = (code: string) => {
    if (liveCatalog) return false;
    const normalized = normalizeCoupon(code);
    if (!normalized && code.trim()) return false;
    commit(current => ({ ...current, coupon: normalized }));
    return true;
  };
  const syncServerCart = async (localCart: StoreData['cart']) => {
    if (!remoteCatalog) throw new Error('Chưa tải được danh mục sản phẩm.');
    const desired = new Map<number, number>();
    Object.entries(localCart).forEach(([id, quantity]) => {
      const product = remoteCatalog.cartProducts.find(item => item.id === id);
      if (!product?.variantId) {
        throw new Error('Có sản phẩm không còn bán trong giỏ hàng.');
      }
      desired.set(product.variantId, quantity);
    });
    if (!desired.size) throw new Error('Giỏ hàng đang trống.');
    const existing = await shopCartApi.getCart();
    for (const item of existing.items) {
      const quantity = desired.get(item.variantId);
      if (quantity === undefined) {
        await shopCartApi.removeItem(item.variantId);
      } else if (quantity !== item.quantity) {
        await shopCartApi.updateItem(item.variantId, quantity);
      }
    }
    const existingIds = new Set(existing.items.map(item => item.variantId));
    for (const [variantId, quantity] of desired) {
      if (!existingIds.has(variantId)) {
        await shopCartApi.addItem(variantId, quantity);
      }
    }
    const verified = await shopCartApi.getCart();
    if (
      verified.items.length !== desired.size ||
      verified.items.some(item => desired.get(item.variantId) !== item.quantity)
    ) {
      throw new Error('Giỏ hàng đã thay đổi. Vui lòng thử lại.');
    }
    return verified;
  };
  const beginCheckout = async () => {
    const current = dataRef.current;
    const useLive = remoteCatalog !== null &&
      !Object.keys(current.cart).some(id => !isRemoteCartId(id));
    if (!useLive) {
      push({ name: 'checkout' });
      return;
    }
    if (!current.auth.isLoggedIn) {
      push({ name: 'auth', returnTo: 'checkout' });
      return;
    }
    try {
      const currentCart = toCartFor(current.cart, remoteCatalog.cartProducts);
      const verified = await syncServerCart(currentCart);
      setServerSubtotal(verified.subtotal / 1000);
      push({ name: 'checkout' });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await requireLogin('checkout');
        return;
      }
      setToast(
        error instanceof Error ? error.message : 'Không thể kiểm tra giỏ hàng.',
      );
    }
  };
  const placeOrder = async (details: CustomerDetails) => {
    if (placing.current) return;
    const current = dataRef.current;
    placing.current = true;
    try {
      let order: Order;
      if (liveCatalog) {
        if (!current.auth.isLoggedIn) {
          throw new Error('Vui lòng đăng nhập để đặt hàng.');
        }
        if (details.payment !== 'cash' || !details.district?.trim()) {
          throw new Error('Đơn hàng chỉ hỗ trợ COD và cần địa chỉ đầy đủ.');
        }
        const localCart = toCartFor(current.cart, cartCatalog);
        const verified = await syncServerCart(localCart);
        if (
          serverSubtotal !== null &&
          Math.round(verified.subtotal) !== Math.round(serverSubtotal * 1000)
        ) {
          setServerSubtotal(verified.subtotal / 1000);
          throw new Error('Giá đơn hàng đã thay đổi. Vui lòng xem lại tổng tiền.');
        }
        const placed = await shopCartApi.checkout({
          recipientName: details.fullName.trim(),
          phone: details.phone.trim(),
          addressLine: details.address.trim(),
          district: details.district.trim(),
          province: details.city.trim(),
        });
        const lines = verified.items.map(item => {
          const base = remoteCatalog?.products.find(
            product => product.id === String(item.productId),
          );
          return {
            productId: base
              ? cartKeyForVariant(base, item.variantId)
              : `${item.productId}:${item.variantId}`,
            name:
              item.variantName && !/^(default|mặc định)$/i.test(item.variantName)
                ? `${item.productName} · ${item.variantName}`
                : item.productName,
            price: item.unitPrice / 1000,
            quantity: item.quantity,
          };
        });
        order = {
          id: placed.orderNumber,
          date: new Date().toLocaleDateString('vi-VN'),
          total: placed.grandTotal / 1000,
          itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
          status: 'Processing',
          productIds: lines.map(line => line.productId),
          lines,
          delivery: { ...details, payment: 'cash' },
          subtotal: verified.subtotal / 1000,
          discount: 0,
          shipping: (placed.grandTotal - verified.subtotal) / 1000,
          simulated: false,
        };
      } else {
        const created = createOrder(
          toCartFor(current.cart, cartCatalog),
          current.coupon,
          details,
          `SZ-${Date.now().toString(36).toUpperCase()}-${++sequence.current}`,
          new Date(),
          cartCatalog,
        );
        if (!created) {
          throw new Error('Vui lòng kiểm tra thông tin giao hàng và giỏ hàng.');
        }
        order = created;
      }
      await commit(previous => ({
        ...previous,
        orders: [order, ...previous.orders],
        cart: withActiveCart(previous.cart, {}, cartCatalog),
        coupon: '',
      }));
      setRoutes([
        { name: 'home', key: 'home' },
        { name: 'success', key: order.id, orderId: order.id },
      ]);
    } finally {
      placing.current = false;
    }
  };
  const reorder = (order: Order) => {
    const reorderCatalog = order.simulated === false && remoteCatalog
      ? remoteCatalog.cartProducts
      : products;
    commit(current => ({
      ...current,
      cart: withActiveCart(
        current.cart,
        reorderCart(toCartFor(current.cart, reorderCatalog), order, reorderCatalog),
        reorderCatalog,
      ),
    }));
    openCart();
    setToast('Đã thêm sản phẩm trong đơn vào giỏ hàng.');
  };
  const finishAuthentication = async (email: string, fullName?: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const guest = dataRef.current;
    const account = await loadStore(
      [...products, ...(remoteCatalog?.cartProducts ?? [])],
      normalizedEmail,
    );
    const next: StoreData = {
      ...account,
      cart: { ...account.cart, ...guest.cart },
      wishlistIds: [...new Set([...account.wishlistIds, ...guest.wishlistIds])],
      auth: { isLoggedIn: true, email: normalizedEmail },
      profile: {
        ...account.profile,
        email: normalizedEmail,
        name:
          fullName?.trim() ||
          account.profile.name ||
          normalizedEmail
            .split('@')[0]
            .replace(/[._-]+/g, ' ')
            .replace(/\b\w/g, letter => letter.toUpperCase()),
      },
    };
    accountScope.current = normalizedEmail;
    dataRef.current = next;
    setData(next);
    await saveStore(next, normalizedEmail).then(
      () => setSaveError(false),
      () => setSaveError(true),
    );
    const returnTo = route.name === 'auth' ? route.returnTo : undefined;
    setRoutes(current => {
      const activeRoute = current[current.length - 1];
      const base =
        activeRoute?.name === 'auth' ? current.slice(0, -1) : current;
      if (returnTo === 'checkout') return base;
      const destination = returnTo === 'wallet' ? 'wallet' : 'account';
      if (base[base.length - 1]?.name === destination) return base;
      return [
        ...base,
        {
          name: destination,
          key: `${destination}-${++sequence.current}`,
        },
      ];
    });
    setToast('Đăng nhập thành công.');
    if (returnTo === 'checkout') await beginCheckout();
  };
  const signIn = async (email: string, password: string) => {
    await login({ email, password });
    await finishAuthentication(email);
  };
  const createAccount = async (
    fullName: string,
    email: string,
    password: string,
  ) => {
    await register({ fullName, email, password });
    try {
      await login({ email, password });
    } catch {
      throw new Error(
        'Tài khoản đã được tạo. Vui lòng đăng nhập sau khi hoàn tất xác minh.',
      );
    }
    await finishAuthentication(email, fullName);
  };
  const signOut = async () => {
    try {
      await clearSession();
    } catch {
      setToast('Không thể đăng xuất. Vui lòng thử lại.');
      return;
    }
    accountScope.current = undefined;
    hydratedAccount.current = '';
    const guest = await loadStore().catch(() => emptyStore());
    const next = { ...guest, auth: { ...defaultAuthSession } };
    dataRef.current = next;
    setData(next);
    setRoutes([{ name: 'account', key: 'account' }]);
    setToast('Bạn đã đăng xuất.');
  };
  const requireLogin = async (returnTo: 'wallet' | 'checkout') => {
    await clearSession().catch(() => undefined);
    accountScope.current = undefined;
    hydratedAccount.current = '';
    const guest = await loadStore().catch(() => emptyStore());
    const next = { ...guest, auth: { ...defaultAuthSession } };
    dataRef.current = next;
    setData(next);
    setRoutes(current => [
      ...current.filter(item => item.name !== 'auth'),
      { name: 'auth', returnTo, key: `auth-${++sequence.current}` },
    ]);
    setToast('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  };

  useEffect(() => {
    if (!ready || !liveCatalog || !remoteCatalog || !auth.isLoggedIn) return;
    if (hydratedAccount.current === auth.email) return;
    hydratedAccount.current = auth.email;
    if (Object.keys(toCartFor(dataRef.current.cart, remoteCatalog.cartProducts)).length) {
      return;
    }
    let cancelled = false;
    shopCartApi.getCart().then(server => {
      if (cancelled || !server.items.length) return;
      const restored = fromServerCart(server, remoteCatalog);
      if (!Object.keys(restored).length) return;
      commit(current => ({
        ...current,
        cart: { ...current.cart, ...restored },
      }));
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [ready, liveCatalog, remoteCatalog, auth.isLoggedIn, auth.email]);

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.brand}>Sellzy</Text>
        {loadError ? (
          <>
            <Text style={styles.loadingText}>
              Không thể mở dữ liệu mua sắm đã lưu.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setLoadAttempt(value => value + 1)}
              style={styles.retry}
            >
              <Text style={styles.white}>Thử lại</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={startFresh}
              style={styles.fresh}
            >
              <Text style={styles.freshText}>
                Bắt đầu với dữ liệu mới trên thiết bị
              </Text>
            </Pressable>
          </>
        ) : (
          <ActivityIndicator
            color={COLORS.teal}
            accessibilityLabel="Đang tải dữ liệu mua sắm đã lưu"
          />
        )}
      </View>
    );
  }

  const shared = {
    topInset: insets.top,
    cartCount,
    wishlistIds: activeWishlistIds,
    catalogProducts: activeProducts,
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
            catalogCategories={activeCategories}
            liveCatalog={liveCatalog}
            onShop={openShop}
            onSellers={() => push({ name: 'sellers' })}
          />
        );
      case 'shop':
        return (
          <ShopScreen
            {...shared}
            catalogCategories={activeCategories}
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
      case 'product': {
        const product = activeProducts.find(item => item.id === route.productId);
        if (!product) {
          return (
            <View style={styles.missingProduct}>
              <Text style={styles.loadingText}>Sản phẩm không còn trong danh mục.</Text>
              <Pressable onPress={goBack} style={styles.retry}>
                <Text style={styles.white}>Quay lại</Text>
              </Pressable>
            </View>
          );
        }
        return (
          <ProductDetailsScreen
            {...shared}
            product={product}
            onBuyNow={buyNow}
          />
        );
      }
      case 'cart':
        return (
          <CartScreen
            cart={activeCart}
            catalogProducts={cartCatalog}
            liveCatalog={liveCatalog}
            couponCode={coupon}
            onApplyCoupon={applyCoupon}
            onBack={goBack}
            onCheckout={beginCheckout}
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
                cart: withActiveCart(
                  current.cart,
                  changeQuantity(
                    toCartFor(current.cart, cartCatalog),
                    id,
                    quantity,
                    cartCatalog,
                  ),
                  cartCatalog,
                ),
              }));
            }}
            onShop={() => goRoot('shop')}
            topInset={insets.top}
          />
        );
      case 'checkout':
        return (
          <CheckoutScreen
            cart={activeCart}
            catalogProducts={cartCatalog}
            liveCatalog={liveCatalog}
            totalsOverride={
              liveCatalog && serverSubtotal !== null
                ? {
                    subtotal: serverSubtotal,
                    discount: 0,
                    shipping: 0,
                    total: serverSubtotal,
                  }
                : undefined
            }
            couponCode={coupon}
            onBack={goBack}
            onPlaceOrder={placeOrder}
            initialDetails={{
              fullName: profile.name,
              phone: profile.phone,
              address: profile.address,
              district: profile.district,
              city: profile.city,
              payment: liveCatalog ? 'cash' : profile.payment,
            }}
            topInset={insets.top}
          />
        );
      case 'success':
        return (
          <OrderSuccessScreen
            liveCatalog={orders.find(item => item.id === route.orderId)?.simulated === false}
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
            catalogProducts={[...products, ...(remoteCatalog?.cartProducts ?? [])]}
            onReorder={reorder}
            onShop={() => goRoot('shop')}
            orders={orders}
          />
        );
      case 'wishlist':
        return (
          <WishlistScreen
            {...shared}
            ids={activeWishlistIds}
            onShop={() => goRoot('shop')}
          />
        );
      case 'account':
        return (
          <AccountScreen
            {...shared}
            auth={auth}
            liveCatalog={liveCatalog}
            onAuth={() => push({ name: 'auth', returnTo: 'account' })}
            onLogout={signOut}
            profile={profile}
            onSaveProfile={next => {
              commit(current => ({ ...current, profile: next }));
              setToast('Đã lưu hồ sơ trên thiết bị.');
            }}
            onHelp={() => push({ name: 'help' })}
            onOrders={() => goRoot('orders')}
            onSellers={() => push({ name: 'sellers' })}
            onSellerPortal={() => push({ name: 'sellerPortal' })}
            onWishlist={() => goRoot('wishlist')}
            onWallet={() =>
              auth.isLoggedIn
                ? push({ name: 'wallet' })
                : push({ name: 'auth', returnTo: 'wallet' })
            }
            orderCount={orders.length}
            wishlistCount={activeWishlistIds.length}
          />
        );
      case 'auth':
        return (
          <AuthScreen
            onBack={goBack}
            onLogin={signIn}
            onRegister={createAccount}
          />
        );
      case 'wallet':
        return (
          <WalletScreen
            onBack={goBack}
            onRequireLogin={() => requireLogin('wallet')}
          />
        );
      case 'sellerPortal':
        return <SellerPortalScreen onBack={goBack} topInset={insets.top} />;
      case 'sellers':
        return (
          <SellersScreen
            {...shared}
            catalogVendors={liveCatalog ? remoteCatalog.vendors : undefined}
            onShop={store => push({ name: 'shop', store })}
            vendorDraft={data.vendorDraft}
            onSaveVendorDraft={next => {
              commit(current => ({ ...current, vendorDraft: next }));
              setToast('Đã lưu bản nháp cửa hàng trên thiết bị.');
            }}
          />
        );
      case 'help':
        return <HelpScreen liveCatalog={liveCatalog} onBack={goBack} topInset={insets.top} />;
    }
  };
  const showBottomNav = rootRoutes.includes(route.name);
  return (
    <View style={styles.app}>
      <StatusBar
        barStyle={route.name === 'home' ? 'light-content' : 'dark-content'}
      />
      {catalogError && !remoteCatalog ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setCatalogAttempt(value => value + 1)}
          style={styles.catalogWarning}
        >
          <Text style={styles.catalogWarningText}>
            Đang dùng danh mục mẫu trên thiết bị. Chạm để kết nối lại cửa hàng.
          </Text>
        </Pressable>
      ) : null}
      {remoteCatalog && hasDemoCart ? (
        <View style={styles.catalogWarning}>
          <Text style={styles.catalogWarningText}>
            Giỏ hàng mẫu còn sản phẩm. Hoàn tất hoặc xóa giỏ để chuyển sang cửa hàng trực tuyến.
          </Text>
        </View>
      ) : null}
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
            Các thay đổi hiện chỉ lưu trong bộ nhớ. Chạm để thử lưu lại.
          </Text>
        </Pressable>
      ) : null}
      {showBottomNav ? (
        <BottomNav
          active={route.name}
          bottomInset={insets.bottom}
          cartCount={cartCount}
          onSelect={goRoot}
          wishlistCount={activeWishlistIds.length}
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
  missingProduct: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 24,
  },
  catalogWarning: {
    backgroundColor: '#FFF3D2',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  catalogWarningText: {
    color: '#755900',
    textAlign: 'center',
    fontSize: 12,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    padding: 24,
    gap: 20,
  },
  brand: { fontSize: 40, color: COLORS.teal, fontWeight: '900' },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
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
  freshText: { color: COLORS.teal, fontSize: 14, fontWeight: '700' },
  white: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
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
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  saveWarning: { backgroundColor: '#FFF3D2', padding: 12 },
  warningText: { color: '#755900', fontSize: 13, textAlign: 'center' },
});
