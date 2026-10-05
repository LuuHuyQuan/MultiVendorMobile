import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './components/SellzyUI';
import { QuickCartModal } from './components/QuickCartModal';
import {
  clearSession,
  getSessionEmail,
  hasStoredSession,
  login,
  register,
} from './api/auth';
import { shopCartApi, type ShopCart, type ShopQuote } from './api/shopCart';
import { customerShoppingApi } from './api/customerShopping';
import { accountApi, type CustomerAddress } from './api/account';
import {
  customerOrdersApi,
  type CustomerOrderDetail,
  type CustomerOrderSummary,
  type CustomerReturnLineRequest,
} from './api/customerOrders';
import { ApiError } from './api/errors';
import {
  changeQuantity,
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
  type ProfileEditor,
} from './screens/AccountScreens';
import {
  CartScreen,
  CheckoutScreen,
  OrderSuccessScreen,
} from './screens/CheckoutScreens';
import HomeScreen from './screens/HomeScreen';
import AuthScreen from './screens/AuthScreen';
import WalletScreen from './screens/WalletScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import SellerPortalScreen from './screens/SellerPortalScreen';
import SellerOnboardingScreen from './screens/SellerOnboardingScreen';
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
const cartLineKey = (line: ShopCart['items'][number], catalog: LiveCatalog) => {
  const base = catalog.products.find(product => product.id === String(line.productId));
  return base
    ? cartKeyForVariant(base, line.variantId)
    : `${line.productId}:${line.variantId}`;
};
const createCheckoutKey = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, character => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random % 4) + 8).toString(16);
  });
const cartSignature = (cart: ShopCart, email: string) =>
  `${email}:${cart.items
    .map(item => `${item.variantId}:${item.quantity}`)
    .sort()
    .join('|')}`;
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
    result[cartLineKey(line, catalog)] = line.quantity;
  });
  return result;
};

const serverOrderToOrder = (server: CustomerOrderSummary, saved?: Order): Order => {
  const placed = new Date(server.placedAt);
  const status = server.statusName.toLowerCase();
  return {
    id: server.orderNumber,
    serverId: server.id,
    date: Number.isNaN(placed.getTime())
      ? server.placedAt
      : placed.toLocaleDateString('vi-VN'),
    total: server.grandTotal / 1000,
    itemCount: server.itemCount,
    status: status === 'delivered'
      ? 'Delivered'
      : status === 'shipped' || status === 'in_transit'
      ? 'Shipped'
      : 'Processing',
    statusName: server.statusName,
    paymentStatus: server.paymentStatus,
    paymentMethod: server.paymentMethod,
    productIds: saved?.productIds ?? [],
    lines: saved?.lines,
    simulated: false,
  };
};

type RemoteOrdersState = {
  email: string;
  state: 'loading' | 'ready' | 'error';
  items: Order[];
  error?: string;
};

export default function SellzyApp() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [routes, setRoutes] = useState<Route[]>([
    { name: 'home', key: 'home' },
  ]);
  const [data, setData] = useState<StoreData>(emptyStore);
  const dataRef = useRef(data);
  const accountScope = useRef<string | undefined>(undefined);
  const [remoteCatalog, setRemoteCatalog] = useState<LiveCatalog | null>(null);
  const [remoteOrdersState, setRemoteOrdersState] = useState<RemoteOrdersState | null>(null);
  const [ordersRefresh, setOrdersRefresh] = useState(0);
  const [catalogError, setCatalogError] = useState(false);
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [serverQuote, setServerQuote] = useState<ShopQuote | null>(null);
  const [serverCart, setServerCart] = useState<{ email: string; cart: ShopCart } | null>(null);
  const [accountAddresses, setAccountAddresses] = useState<{ email: string; items: CustomerAddress[] } | null>(null);
  const hydratedAccount = useRef('');
  const cartReadyAccount = useRef('');
  const pendingGuestCart = useRef<StoreData['cart']>({});
  const cartQueue = useRef<Promise<void>>(Promise.resolve());
  const pendingGuestWishlist = useRef<string[]>([]);
  const wishlistReadyAccount = useRef('');
  const wishlistQueue = useRef<Promise<void>>(Promise.resolve());
  const defaultAddressId = useRef<number | null>(null);
  const profileAvatarUrl = useRef<string | null | undefined>(undefined);
  const profileMutationVersion = useRef(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [toast, setToast] = useState('');
  const [quickCartOpen, setQuickCartOpen] = useState(false);
  const placing = useRef(false);
  const checkoutAttempt = useRef<{ signature: string; key: string } | null>(null);
  const sequence = useRef(0);
  const route = routes[routes.length - 1];
  const { auth, cart, coupon, wishlistIds, orders, profile } = data;
  const currentRemoteOrders = auth.isLoggedIn && remoteOrdersState?.email === auth.email
    ? remoteOrdersState
    : null;
  const displayedOrders = currentRemoteOrders?.state === 'ready'
    ? [
        ...currentRemoteOrders.items,
        ...orders.filter(item => item.simulated !== false),
      ]
    : orders;
  const hasDemoCart = Object.keys(cart).some(id => !isRemoteCartId(id));
  const liveCatalog = remoteCatalog !== null && !hasDemoCart;
  const activeProducts = liveCatalog ? remoteCatalog.products : products;
  const remoteLines = serverCart?.email === auth.email && auth.isLoggedIn
    ? serverCart.cart.items
    : [];
  const cartCatalog = liveCatalog
    ? [
        ...remoteCatalog.cartProducts.map(product => {
          const line = remoteLines.find(item =>
            cartLineKey(item, remoteCatalog) === product.id,
          );
          return line
            ? {
                ...product,
                price: line.unitPrice / 1000,
                priceTiers: undefined,
                stock: line.availableQuantity,
              }
            : product;
        }),
        ...remoteLines.flatMap(line => {
          const id = cartLineKey(line, remoteCatalog);
          if (remoteCatalog.cartProducts.some(product => product.id === id)) return [];
          return [{
            id,
            name: line.variantName && !/^(default|mặc định)$/i.test(line.variantName)
              ? `${line.productName} · ${line.variantName}`
              : line.productName,
            store: 'Cửa hàng',
            category: '',
            image: require('./assets/logo.png'),
            price: line.unitPrice / 1000,
            oldPrice: line.unitPrice / 1000,
            rating: 0,
            reviews: 0,
            discount: 0,
            stock: line.availableQuantity,
            description: '',
            benefits: [],
            variantId: line.variantId,
          } satisfies Product];
        }),
      ]
    : products;
  const activeCategories = liveCatalog ? remoteCatalog.categories : categories;
  const activeCart = toCartFor(cart, cartCatalog);
  const activeWishlistIds = wishlistIds.filter(id =>
    activeProducts.some(product => product.id === id),
  );
  const cartCount = Object.values(activeCart).reduce(
    (sum, quantity) => sum + quantity,
    0,
  );
  const cartBaseIds = new Set(Object.keys(activeCart).map(baseProductId));
  const cartCategories = new Set(
    cartCatalog.filter(product => activeCart[product.id]).map(product => product.category),
  );
  const recommendations = activeProducts
    .filter(product => product.stock > 0 && !cartBaseIds.has(product.id))
    .sort((a, b) => Number(cartCategories.has(b.category)) - Number(cartCategories.has(a.category)))
    .slice(0, 12);

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

  // Auto-retry khi catalog lỗi, sau 5 giây
  useEffect(() => {
    if (!catalogError || remoteCatalog) return;
    const retryTimer = setTimeout(() => {
      setCatalogAttempt(value => value + 1);
    }, 5000);
    return () => clearTimeout(retryTimer);
  }, [catalogError, remoteCatalog]);

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
  const sameCartAccount = (email: string) =>
    dataRef.current.auth.isLoggedIn && dataRef.current.auth.email === email;

  const applyAccountAddresses = async (items: CustomerAddress[], email: string) => {
    if (!sameCartAccount(email)) return;
    const selected = items.find(address => address.isDefault) ?? items[0];
    defaultAddressId.current = selected?.id ?? null;
    setAccountAddresses({ email, items });
    await commit(previous => ({
      ...previous,
      profile: {
        ...previous.profile,
        recipientName: selected?.recipientName ?? '',
        recipientPhone: selected?.phone ?? '',
        address: selected?.addressLine1 ?? '',
        district: selected?.district ?? '',
        city: selected?.city ?? '',
      },
    }));
  };

  const selectAccountAddress = async (id: number) => {
    const email = dataRef.current.auth.email;
    if (!sameCartAccount(email)) throw new Error('Vui lòng đăng nhập để chọn địa chỉ.');
    profileMutationVersion.current += 1;
    await accountApi.setDefaultAddress(id);
    await applyAccountAddresses(await accountApi.getAddresses(), email);
    setToast('Đã chọn địa chỉ giao hàng mặc định.');
  };

  const deleteAccountAddress = async (id: number) => {
    const email = dataRef.current.auth.email;
    if (!sameCartAccount(email)) throw new Error('Vui lòng đăng nhập để xóa địa chỉ.');
    profileMutationVersion.current += 1;
    await accountApi.deleteAddress(id);
    await applyAccountAddresses(await accountApi.getAddresses(), email);
    setToast('Đã xóa địa chỉ giao hàng.');
  };

  const saveAccountProfile = async (next: StoreData['profile'], mode: ProfileEditor) => {
    const current = dataRef.current;
    profileMutationVersion.current += 1;
    if (!current.auth.isLoggedIn) {
      await commit(previous => ({ ...previous, profile: next }));
      setToast('Đã lưu thông tin trên thiết bị.');
      return;
    }
    const email = current.auth.email;
    if (mode === 'profile') {
      if (profileAvatarUrl.current === undefined) {
        profileAvatarUrl.current = (await accountApi.getProfile()).avatarUrl;
      }
      const server = await accountApi.updateProfile({
        fullName: next.name,
        phone: next.phone || null,
        avatarUrl: profileAvatarUrl.current,
      });
      if (!sameCartAccount(email)) return;
      await commit(previous => ({
        ...previous,
        profile: {
          ...previous.profile,
          name: server.fullName,
          phone: server.phone ?? '',
          email: server.email,
        },
      }));
    } else if (mode === 'address' || mode === 'address-new') {
      if (defaultAddressId.current === null) {
        const existing = await accountApi.getAddresses();
        defaultAddressId.current = (existing.find(address => address.isDefault) ?? existing[0])?.id ?? null;
      }
      if (!next.address) {
        if (mode === 'address' && defaultAddressId.current !== null) {
          await accountApi.deleteAddress(defaultAddressId.current);
        }
      } else {
        const request = {
          label: 'Nhà',
          recipientName: next.recipientName,
          phone: next.recipientPhone,
          addressLine1: next.address,
          district: next.district || null,
          city: next.city,
          countryCode: 'VN',
          isDefault: true,
        };
        if (mode === 'address' && defaultAddressId.current !== null) {
          await accountApi.updateAddress(defaultAddressId.current, request);
        } else {
          await accountApi.addAddress(request);
        }
      }
      const addresses = await accountApi.getAddresses();
      if (!sameCartAccount(email)) return;
      await applyAccountAddresses(addresses, email);
    } else {
      await commit(previous => ({ ...previous, profile: next }));
    }
    setToast(mode === 'payment' || mode === 'preferences'
      ? 'Đã lưu tùy chọn trên thiết bị.'
      : 'Đã đồng bộ thông tin tài khoản.');
  };

  useEffect(() => {
    if (!ready || !auth.isLoggedIn) return;
    let active = true;
    const email = auth.email;
    const startedAtVersion = profileMutationVersion.current;
    Promise.all([accountApi.getProfile(), accountApi.getAddresses()]).then(
      async ([server, addresses]) => {
        if (!active || !sameCartAccount(email) || startedAtVersion !== profileMutationVersion.current) return;
        const selected: CustomerAddress | undefined =
          addresses.find(address => address.isDefault) ?? addresses[0];
        defaultAddressId.current = selected?.id ?? null;
        profileAvatarUrl.current = server.avatarUrl;
        setAccountAddresses({ email, items: addresses });
        await commit(previous => ({
          ...previous,
          profile: {
            ...previous.profile,
            name: server.fullName,
            email: server.email,
            phone: server.phone ?? '',
            recipientName: selected?.recipientName ?? '',
            recipientPhone: selected?.phone ?? '',
            address: selected?.addressLine1 ?? '',
            district: selected?.district ?? '',
            city: selected?.city ?? '',
          },
        }));
      },
      error => {
        if (active && sameCartAccount(email)) {
          setToast(error instanceof Error ? error.message : 'Không thể tải thông tin tài khoản.');
        }
      },
    );
    return () => { active = false; };
  }, [ready, auth.isLoggedIn, auth.email]);

  useEffect(() => {
    if (!ready || !auth.isLoggedIn || !remoteCatalog || wishlistReadyAccount.current === auth.email) return;
    const email = auth.email;
    const validIds = new Set(remoteCatalog.products.map(product => Number(product.id)));
    const hydrate = async () => {
      const serverIds = new Set(await customerShoppingApi.getWishlistIds());
      const legacyIds = dataRef.current.wishlistMigrated ? [] : dataRef.current.wishlistIds;
      const pendingIds = [...legacyIds, ...pendingGuestWishlist.current]
        .map(id => Number(baseProductId(id)))
        .filter(id => Number.isSafeInteger(id) && validIds.has(id));
      for (const id of new Set(pendingIds)) {
        if (!sameCartAccount(email)) return;
        if (!serverIds.has(id)) {
          await customerShoppingApi.addWishlist(id);
          serverIds.add(id);
        }
      }
      if (!sameCartAccount(email)) return;
      await commit(current => ({
        ...current,
        wishlistIds: [...serverIds].map(String),
        wishlistMigrated: true,
      }));
      pendingGuestWishlist.current = [];
      wishlistReadyAccount.current = email;
    };
    hydrate().catch(error => {
      if (sameCartAccount(email)) {
        setToast(error instanceof Error ? error.message : 'Không thể đồng bộ sản phẩm yêu thích.');
      }
    });
  }, [ready, auth.isLoggedIn, auth.email, remoteCatalog]);
  const queueCartJob = (job: () => Promise<void>) => {
    const result = cartQueue.current.then(job);
    cartQueue.current = result.catch(() => undefined);
    return result;
  };
  const applyServerCart = async (server: ShopCart, email: string, catalog: LiveCatalog) => {
    if (!sameCartAccount(email)) return;
    setServerCart({ email, cart: server });
    const remoteItems = fromServerCart(server, catalog);
    const localItems = Object.fromEntries(
      Object.entries(dataRef.current.cart).filter(([id]) => isRemoteCartId(id)),
    );
    const changed = Object.keys(localItems).length !== Object.keys(remoteItems).length ||
      Object.entries(remoteItems).some(([id, quantity]) => localItems[id] !== quantity);
    if (changed) {
      setServerQuote(null);
      checkoutAttempt.current = null;
    }
    await commit(current => ({
      ...current,
      coupon: changed ? '' : current.coupon,
      cart: {
        ...Object.fromEntries(Object.entries(current.cart).filter(([id]) => !isRemoteCartId(id))),
        ...remoteItems,
      },
    }));
  };
  const hydrateServerCart = (email: string, catalog: LiveCatalog): Promise<void> => {
    if (hydratedAccount.current === email) return cartQueue.current;
    hydratedAccount.current = email;
    return queueCartJob(async () => {
      if (!sameCartAccount(email)) return;
      const guestItems = { ...pendingGuestCart.current };
      let server = await shopCartApi.getCart();
      for (const [id, quantity] of Object.entries(guestItems)) {
        const product = catalog.cartProducts.find(item => item.id === id);
        if (!product?.variantId || quantity < 1) continue;
        const existing = server.items.find(item => item.variantId === product.variantId)?.quantity ?? 0;
        const available = Math.max(0, product.stock - existing);
        const toAdd = Math.min(quantity, available);
        if (toAdd < 1) continue;
        await shopCartApi.addItem(product.variantId, toAdd);
        delete guestItems[id];
        pendingGuestCart.current = guestItems;
        server = await shopCartApi.getCart();
      }
      await applyServerCart(server, email, catalog);
      if (sameCartAccount(email)) cartReadyAccount.current = email;
      if (Object.keys(guestItems).length && sameCartAccount(email)) {
        setToast('Một số sản phẩm trong giỏ khách đã hết hàng hoặc không còn bán.');
      }
    }).catch(error => {
      if (sameCartAccount(email)) {
        hydratedAccount.current = '';
        cartReadyAccount.current = '';
        setToast(error instanceof Error ? error.message : 'Không thể tải giỏ hàng.');
      }
      throw error;
    });
  };
  const changeRemoteCart = (
    variantId: number,
    action: () => Promise<unknown>,
  ) => {
    const email = dataRef.current.auth.email;
    const catalog = remoteCatalog;
    if (!catalog || !sameCartAccount(email)) return;
    setServerQuote(null);
    checkoutAttempt.current = null;
    queueCartJob(async () => {
      if (!sameCartAccount(email)) return;
      try {
        await action();
      } finally {
        const server = await shopCartApi.getCart();
        await applyServerCart(server, email, catalog);
      }
    }).catch(error => {
      if (sameCartAccount(email)) {
        setToast(error instanceof Error ? error.message : `Không thể cập nhật sản phẩm ${variantId}.`);
      }
    });
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
    if (liveCatalog && auth.isLoggedIn && cartReadyAccount.current !== auth.email) {
      setToast('Đang đồng bộ giỏ hàng. Vui lòng thử lại.');
      return false;
    }
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
      coupon: liveCatalog ? '' : current.coupon,
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
    if (liveCatalog && dataRef.current.auth.isLoggedIn && product.variantId) {
      changeRemoteCart(product.variantId, () =>
        shopCartApi.addItem(product.variantId!, quantity),
      );
    }
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
  const removeCartItem = (id: string) => {
    if (liveCatalog && auth.isLoggedIn && cartReadyAccount.current !== auth.email) {
      setToast('Đang đồng bộ giỏ hàng. Vui lòng thử lại.');
      return;
    }
    const variantId = cartCatalog.find(product => product.id === id)?.variantId;
    commit(current => {
      const next = { ...current.cart };
      delete next[id];
      return {
        ...current,
        cart: next,
        coupon: liveCatalog || !Object.keys(next).length ? '' : current.coupon,
      };
    });
    if (liveCatalog && auth.isLoggedIn && variantId) {
      changeRemoteCart(variantId, async () => {
        try {
          await shopCartApi.removeItem(variantId);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      });
    }
  };
  const setCartQuantity = (id: string, quantity: number) => {
    if (liveCatalog && auth.isLoggedIn && cartReadyAccount.current !== auth.email) {
      setToast('Đang đồng bộ giỏ hàng. Vui lòng thử lại.');
      return;
    }
    const variantId = cartCatalog.find(product => product.id === id)?.variantId;
    commit(current => {
      const next = withActiveCart(
        current.cart,
        changeQuantity(
          toCartFor(current.cart, cartCatalog),
          id,
          quantity,
          cartCatalog,
        ),
        cartCatalog,
      );
      return {
        ...current,
        cart: next,
        coupon: liveCatalog || !Object.keys(next).length ? '' : current.coupon,
      };
    });
    if (liveCatalog && auth.isLoggedIn && variantId) {
      changeRemoteCart(variantId, async () => {
        if (quantity < 1) {
          try {
            await shopCartApi.removeItem(variantId);
          } catch (error) {
            if (!(error instanceof ApiError && error.status === 404)) throw error;
          }
          return;
        }
        try {
          await shopCartApi.updateItem(variantId, quantity);
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
          await shopCartApi.addItem(variantId, quantity);
        }
      });
    }
  };
  const clearCart = () => {
    if (liveCatalog && auth.isLoggedIn && cartReadyAccount.current !== auth.email) {
      setToast('Đang đồng bộ giỏ hàng. Vui lòng thử lại.');
      return;
    }
    commit(current => ({
      ...current,
      cart: withActiveCart(current.cart, {}, cartCatalog),
      coupon: '',
    }));
    if (liveCatalog && auth.isLoggedIn) {
      changeRemoteCart(0, async () => {
        const server = await shopCartApi.getCart();
        for (const item of server.items) {
          await shopCartApi.removeItem(item.variantId);
        }
      });
    }
  };
  const openCart = () => {
    if (remoteCatalog && dataRef.current.auth.isLoggedIn) {
      const email = dataRef.current.auth.email;
      const catalog = remoteCatalog;
      queueCartJob(async () => {
        if (!sameCartAccount(email)) return;
        const server = await shopCartApi.getCart();
        await applyServerCart(server, email, catalog);
      }).catch(error => {
        if (sameCartAccount(email)) {
          setToast(error instanceof Error ? error.message : 'Không thể tải giỏ hàng.');
        }
      });
    }
    if (windowWidth >= 800) setQuickCartOpen(true);
    else push({ name: 'cart' });
  };
  const openShop = (category?: string, query?: string, sort?: SortMode) =>
    push({ name: 'shop', category, query, sort });
  const openProduct = (id: string) =>
    push({ name: 'product', productId: baseProductId(id) });
  const toggleWishlist = (id: string) => {
    if (liveCatalog && auth.isLoggedIn && wishlistReadyAccount.current !== auth.email) {
      setToast('Đang đồng bộ sản phẩm yêu thích. Vui lòng thử lại.');
      return;
    }
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
    if (liveCatalog && auth.isLoggedIn) {
      const email = auth.email;
      const productId = Number(baseProductId(id));
      if (!Number.isSafeInteger(productId) || productId < 1) return;
      const job = wishlistQueue.current.then(async () => {
        if (!sameCartAccount(email)) return;
        if (liked) await customerShoppingApi.removeWishlist(productId);
        else await customerShoppingApi.addWishlist(productId);
        if (!sameCartAccount(email)) return;
        const ids = await customerShoppingApi.getWishlistIds();
        if (sameCartAccount(email)) {
          await commit(current => ({ ...current, wishlistIds: ids.map(String) }));
        }
      });
      wishlistQueue.current = job.catch(() => undefined);
      job.catch(async error => {
        if (!sameCartAccount(email)) return;
        try {
          const ids = await customerShoppingApi.getWishlistIds();
          await commit(current => ({ ...current, wishlistIds: ids.map(String) }));
        } catch {
          // Keep the local selection visible until the API is reachable again.
        }
        setToast(error instanceof Error ? error.message : 'Không thể cập nhật sản phẩm yêu thích.');
      });
    }
  };
  const applyCoupon = async (code: string): Promise<boolean> => {
    if (liveCatalog) {
      if (!auth.isLoggedIn || !remoteCatalog) {
        throw new Error('Vui lòng đăng nhập để dùng mã giảm giá.');
      }
      await verifyServerCart(remoteCatalog);
      const quote = await shopCartApi.quote({
        couponCode: code.trim().toUpperCase() || null,
        shippingMethod: 'standard',
      });
      await commit(current => ({ ...current, coupon: quote.couponCode ?? '' }));
      setServerQuote(quote);
      return true;
    }
    const normalized = normalizeCoupon(code);
    if (!normalized && code.trim()) return false;
    commit(current => ({ ...current, coupon: normalized }));
    return true;
  };
  const verifyServerCart = async (catalog: LiveCatalog) => {
    const email = dataRef.current.auth.email;
    await hydrateServerCart(email, catalog);
    await cartQueue.current;
    const server = await shopCartApi.getCart();
    const serverItems = fromServerCart(server, catalog);
    const localItems = Object.fromEntries(
      Object.entries(dataRef.current.cart).filter(([id]) => isRemoteCartId(id)),
    );
    const changed =
      Object.keys(localItems).length !== Object.keys(serverItems).length ||
      Object.entries(serverItems).some(([id, quantity]) => localItems[id] !== quantity);
    await applyServerCart(server, email, catalog);
    if (changed) {
      throw new Error('Giỏ hàng đã thay đổi trên thiết bị khác. Vui lòng xem lại trước khi đặt hàng.');
    }
    if (!server.items.length) throw new Error('Giỏ hàng đang trống.');
    return server;
  };
  const beginCheckout = async () => {
    const current = dataRef.current;
    const useLive = remoteCatalog !== null &&
      !Object.keys(current.cart).some(id => !isRemoteCartId(id));
    if (!useLive) {
      setToast(remoteCatalog
        ? 'Vui lòng xóa sản phẩm mẫu trong giỏ trước khi đặt hàng trực tuyến.'
        : 'Chưa kết nối được cửa hàng. Vui lòng thử lại khi có mạng.');
      return;
    }
    if (!current.auth.isLoggedIn) {
      push({ name: 'auth', returnTo: 'checkout' });
      return;
    }
    try {
      const verified = await verifyServerCart(remoteCatalog);
      const quote = await shopCartApi.quote({
        couponCode: dataRef.current.coupon || null,
        shippingMethod: 'standard',
      });
      if (Math.abs(verified.subtotal - quote.subtotal) > 0.005) {
        throw new Error('Giá giỏ hàng đã thay đổi. Vui lòng thử lại.');
      }
      const signature = cartSignature(verified, current.auth.email);
      if (checkoutAttempt.current?.signature !== signature) {
        checkoutAttempt.current = { signature, key: createCheckoutKey() };
      }
      setServerQuote(quote);
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
        if (!['cash', 'wallet'].includes(details.payment) || !details.district?.trim()) {
          throw new Error('Vui lòng chọn thanh toán khi nhận hàng hoặc ví, và nhập địa chỉ đầy đủ.');
        }
        if (!remoteCatalog) throw new Error('Chưa tải được danh mục sản phẩm.');
        const verified = await verifyServerCart(remoteCatalog);
        const quote = await shopCartApi.quote({
          couponCode: current.coupon || null,
          shippingMethod: 'standard',
        });
        if (
          !serverQuote ||
          Math.abs(verified.subtotal - quote.subtotal) > 0.005 ||
          Math.abs(quote.grandTotal - serverQuote.grandTotal) > 0.005
        ) {
          setServerQuote(quote);
          throw new Error('Tổng tiền đã thay đổi. Vui lòng xem lại trước khi đặt hàng.');
        }
        const signature = cartSignature(verified, current.auth.email);
        if (checkoutAttempt.current?.signature !== signature) {
          checkoutAttempt.current = { signature, key: createCheckoutKey() };
        }
        const placed = await shopCartApi.checkout({
          recipientName: details.fullName.trim(),
          phone: details.phone.trim(),
          addressLine: details.address.trim(),
          district: details.district.trim(),
          province: details.city.trim(),
          paymentMethod: details.payment === 'wallet' ? 'WALLET' : 'COD',
          shippingMethod: quote.shippingMethod,
          couponCode: quote.couponCode,
          checkoutKey: checkoutAttempt.current.key,
          expectedGrandTotal: quote.grandTotal,
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
          serverId: placed.orderId,
          statusName: 'pending',
          paymentStatus: details.payment === 'wallet' ? 'paid' : 'pending',
          paymentMethod: placed.paymentMethod,
          date: new Date().toLocaleDateString('vi-VN'),
          total: placed.grandTotal / 1000,
          itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
          status: 'Processing',
          productIds: lines.map(line => line.productId),
          lines,
          delivery: details,
          subtotal: quote.subtotal / 1000,
          discount: quote.discountTotal / 1000,
          shipping: quote.shippingTotal / 1000,
          tax: quote.taxTotal / 1000,
          simulated: false,
        };
        setServerCart({
          email: current.auth.email,
          cart: { cartId: verified.cartId, items: [], subtotal: 0 },
        });
        checkoutAttempt.current = null;
      } else {
        throw new Error('Chưa kết nối được cửa hàng. Vui lòng thử lại khi có mạng.');
      }
      await commit(previous => ({
        ...previous,
        orders: [order, ...previous.orders],
        cart: withActiveCart(previous.cart, {}, cartCatalog),
        coupon: '',
      }));
      setServerQuote(null);
      if (liveCatalog) setOrdersRefresh(value => value + 1);
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
    pendingGuestCart.current = guest.auth.isLoggedIn
      ? {}
      : Object.fromEntries(Object.entries(guest.cart).filter(([id]) => isRemoteCartId(id)));
    pendingGuestWishlist.current = guest.auth.isLoggedIn ? [] : guest.wishlistIds;
    wishlistReadyAccount.current = '';
    const account = await loadStore(
      [...products, ...(remoteCatalog?.cartProducts ?? [])],
      normalizedEmail,
    );
    const next: StoreData = {
      ...account,
      cart: { ...account.cart, ...guest.cart },
      wishlistIds: [...new Set([...account.wishlistIds, ...guest.wishlistIds])],
      wishlistMigrated: account.wishlistMigrated,
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
      const destination = returnTo === 'wallet'
        ? 'wallet'
        : returnTo === 'sellerOnboarding'
        ? 'sellerOnboarding'
        : 'account';
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
    if (remoteCatalog) {
      await hydrateServerCart(normalizedEmail, remoteCatalog).catch(() => undefined);
    }
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
    setRemoteOrdersState(null);
    setServerQuote(null);
    setServerCart(null);
    setAccountAddresses(null);
    checkoutAttempt.current = null;
    hydratedAccount.current = '';
    cartReadyAccount.current = '';
    pendingGuestCart.current = {};
    pendingGuestWishlist.current = [];
    wishlistReadyAccount.current = '';
    defaultAddressId.current = null;
    profileAvatarUrl.current = undefined;
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
    setRemoteOrdersState(null);
    setServerQuote(null);
    setServerCart(null);
    setAccountAddresses(null);
    checkoutAttempt.current = null;
    hydratedAccount.current = '';
    cartReadyAccount.current = '';
    pendingGuestCart.current = {};
    pendingGuestWishlist.current = [];
    wishlistReadyAccount.current = '';
    defaultAddressId.current = null;
    profileAvatarUrl.current = undefined;
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
    if (!ready || !auth.isLoggedIn) {
      setRemoteOrdersState(null);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const email = auth.email;
    setRemoteOrdersState({ email, state: 'loading', items: [] });
    customerOrdersApi.listAll(controller.signal).then(items => {
      if (cancelled) return;
      const saved = new Map(
        dataRef.current.orders
          .filter(item => item.simulated === false)
          .map(item => [item.id, item]),
      );
      setRemoteOrdersState({
        email,
        state: 'ready',
        items: items.map(item => serverOrderToOrder(item, saved.get(item.orderNumber))),
      });
    }).catch(error => {
      if (cancelled) return;
      setRemoteOrdersState({
        email,
        state: 'error',
        items: [],
        error: error instanceof Error
          ? error.message
          : 'Không thể tải lịch sử đơn hàng.',
      });
    });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [ready, auth.isLoggedIn, auth.email, ordersRefresh]);

  const loadOrderDetail = useCallback(
    (id: number): Promise<CustomerOrderDetail> => customerOrdersApi.detail(id),
    [],
  );
  const cancelOrder = async (id: number, reason: string) => {
    await customerOrdersApi.cancel(id, reason);
    setOrdersRefresh(value => value + 1);
  };
  const requestOrderReturn = async (
    id: number,
    reason: string,
    lines: CustomerReturnLineRequest[],
  ) => {
    await customerOrdersApi.requestReturn(id, reason, lines);
    setOrdersRefresh(value => value + 1);
  };
  const reorderServerOrder = (order: Order, detail: CustomerOrderDetail) => {
    const available = remoteCatalog?.cartProducts ?? [];
    const lines = detail.items.flatMap(item => {
      const product = available.find(candidate =>
        candidate.variantId === item.variantId &&
        baseProductId(candidate.id) === String(item.productId),
      );
      return product ? [{
        productId: product.id,
        name: item.productName,
        price: item.unitPrice / 1000,
        quantity: item.quantity,
      }] : [];
    });
    if (!lines.length) {
      setToast('Sản phẩm trong đơn không còn bán.');
      return;
    }
    reorder({ ...order, lines, productIds: lines.map(item => item.productId) });
  };

  useEffect(() => {
    if (!ready || !remoteCatalog || !auth.isLoggedIn) return;
    hydrateServerCart(auth.email, remoteCatalog).catch(() => undefined);
    // The account marker prevents duplicate hydration while UI state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, remoteCatalog, auth.isLoggedIn, auth.email]);

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
            isLoggedIn={auth.isLoggedIn}
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
            totalsOverride={
              liveCatalog && serverQuote !== null
                ? {
                    subtotal: serverQuote.subtotal / 1000,
                    discount: serverQuote.discountTotal / 1000,
                    shipping: serverQuote.shippingTotal / 1000,
                    tax: serverQuote.taxTotal / 1000,
                    total: serverQuote.grandTotal / 1000,
                  }
                : undefined
            }
            couponCode={liveCatalog ? serverQuote?.couponCode ?? '' : coupon}
            onApplyCoupon={applyCoupon}
            onBack={goBack}
            onCheckout={beginCheckout}
            onOpenProduct={openProduct}
            onRemove={removeCartItem}
            onSetQuantity={setCartQuantity}
            onClear={clearCart}
            wishlistIds={activeWishlistIds}
            onToggleWishlist={toggleWishlist}
            onAddProduct={id => { addToCart(id); }}
            onShop={() => goRoot('shop')}
            onHome={() => goRoot('home')}
            onSellers={() => push({ name: 'sellers' })}
            onHelp={() => push({ name: 'help' })}
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
              liveCatalog && serverQuote !== null
                ? {
                    subtotal: serverQuote.subtotal / 1000,
                    discount: serverQuote.discountTotal / 1000,
                    shipping: serverQuote.shippingTotal / 1000,
                    tax: serverQuote.taxTotal / 1000,
                    total: serverQuote.grandTotal / 1000,
                  }
                : undefined
            }
            couponCode={liveCatalog ? serverQuote?.couponCode ?? '' : coupon}
            onBack={goBack}
            onPlaceOrder={placeOrder}
            initialDetails={{
              fullName: profile.recipientName || profile.name,
              phone: profile.recipientPhone || profile.phone,
              address: profile.address,
              district: profile.district,
              city: profile.city,
              payment: liveCatalog && profile.payment === 'card' ? 'cash' : profile.payment,
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
            loading={currentRemoteOrders?.state === 'loading'}
            loadError={currentRemoteOrders?.state === 'error' ? currentRemoteOrders.error : undefined}
            onRefresh={() => setOrdersRefresh(value => value + 1)}
            onLoadDetail={loadOrderDetail}
            onCancelOrder={cancelOrder}
            onRequestReturn={requestOrderReturn}
            onReorderServer={reorderServerOrder}
            onReorder={reorder}
            onShop={() => goRoot('shop')}
            orders={displayedOrders}
            synced={currentRemoteOrders?.state === 'ready'}
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
            onAuth={() => push({ name: 'auth', returnTo: 'account' })}
            onLogout={signOut}
            profile={profile}
            addresses={accountAddresses?.email === auth.email ? accountAddresses.items : []}
            onSelectAddress={selectAccountAddress}
            onDeleteAddress={deleteAccountAddress}
            onSaveProfile={saveAccountProfile}
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
            onNotifications={() => auth.isLoggedIn
              ? push({ name: 'notifications' })
              : push({ name: 'auth', returnTo: 'account' })}
            orderCount={displayedOrders.length}
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
      case 'notifications':
        return <NotificationsScreen onBack={goBack} topInset={insets.top} onOpenAction={url => {
          if (url?.startsWith('/orders')) goRoot('orders');
          else if (url?.startsWith('/support')) push({ name: 'help' });
          else if (url?.startsWith('/account')) goRoot('account');
          else if (url?.startsWith('/wallet')) push({ name: 'wallet' });
        }} />;
      case 'sellerPortal':
        return <SellerPortalScreen onBack={goBack} topInset={insets.top} />;
      case 'sellerOnboarding':
        return (
          <SellerOnboardingScreen
            topInset={insets.top}
            isLoggedIn={auth.isLoggedIn}
            initialBusinessName={data.vendorDraft.storeName}
            onBack={goBack}
            onLogin={() => push({ name: 'auth', returnTo: 'sellerOnboarding' })}
            onSellerPortal={() => push({ name: 'sellerPortal' })}
          />
        );
      case 'sellers':
        return (
          <SellersScreen
            {...shared}
            catalogVendors={liveCatalog ? remoteCatalog.vendors : undefined}
            onShop={store => push({ name: 'shop', store })}
            onSellerOnboarding={() => push({ name: 'sellerOnboarding' })}
          />
        );
      case 'help':
        return <HelpScreen liveCatalog={liveCatalog} authEmail={auth.isLoggedIn ? auth.email : ''} profile={profile} onBack={goBack} topInset={insets.top} />;
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
      <QuickCartModal
        visible={quickCartOpen}
        cart={activeCart}
        catalogProducts={cartCatalog}
        recommendations={recommendations}
        onClose={() => setQuickCartOpen(false)}
        onViewCart={() => {
          setQuickCartOpen(false);
          push({ name: 'cart' });
        }}
        onCheckout={() => {
          setQuickCartOpen(false);
          beginCheckout();
        }}
        onOpenProduct={id => {
          setQuickCartOpen(false);
          openProduct(id);
        }}
        onAdd={id => { addToCart(id); }}
        onSetQuantity={setCartQuantity}
        onRemove={removeCartItem}
      />
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
