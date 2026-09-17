import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AccountProfile,
  AuthSession,
  emptyVendorDraft,
  VendorDraft,
} from '../accountTypes';
import {
  EmptyState,
  ProductCard,
  ScreenHeader,
  sharedStyles,
} from '../components/SellzyUI';
import { Icon, IconName } from '../components/Icon';
import { getProduct, products, sellers } from '../data/catalog';
import { COLORS, money } from '../theme';
import { Order } from '../types';
import {
  AccountAction,
  AccountDialog,
  AccountField,
  AccountNotice,
} from './AccountForms';

const sellerColors = [
  '#E7F7F5',
  '#FFF5D2',
  '#EAF1FF',
  '#EAF8E9',
  '#F1EAFE',
  '#FFECEA',
];

const catalogueSellers = Array.from(
  new Set(products.map(product => product.store)),
).map((name, index) => {
  const storeProducts = products.filter(product => product.store === name);
  const listedSeller = sellers.find(seller => seller.name === name);
  const rating =
    storeProducts.reduce((total, product) => total + product.rating, 0) /
    storeProducts.length;

  return {
    name,
    color: listedSeller?.color ?? sellerColors[index % sellerColors.length],
    productCount: storeProducts.length,
    rating,
  };
});

type OrdersProps = {
  topInset: number;
  orders: Order[];
  cartCount: number;
  onCart: () => void;
  onShop: () => void;
  onOpenProduct: (id: string) => void;
  onReorder: (order: Order) => void;
};

export function OrdersScreen({
  topInset,
  orders,
  cartCount,
  onCart,
  onShop,
  onOpenProduct,
  onReorder,
}: OrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle="Your saved checkout history"
        title="My Orders"
      />
      {!orders.length ? (
        <EmptyState
          actionLabel="Explore Products"
          icon="▣"
          message="Complete a demo checkout to save an order here and view its summary."
          onAction={onShop}
          title="No orders yet"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoBanner}>
            <View style={styles.infoIcon}>
              <Icon color={COLORS.white} name="info" size={16} />
            </View>
            <Text style={styles.infoText}>
              Orders are saved on this device. Open a summary to review items
              and delivery details; no shipment or payment is created.
            </Text>
          </View>
          {orders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderLabel}>ORDER {order.id}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    order.status === 'Delivered' && styles.statusDelivered,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      order.status === 'Delivered' &&
                        styles.statusDeliveredText,
                    ]}
                  >
                    {order.simulated ? 'Saved locally' : order.status}
                  </Text>
                </View>
              </View>
              <View style={styles.orderProducts}>
                {order.productIds.slice(0, 4).map(id => {
                  const product = getProduct(id);
                  return (
                    <Pressable
                      accessibilityLabel={`View ${product.name}`}
                      accessibilityRole="button"
                      key={id}
                      onPress={() => onOpenProduct(id)}
                      style={styles.orderProductImageWrap}
                    >
                      <Image
                        source={product.image}
                        resizeMode="contain"
                        style={styles.orderProductImage}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.orderBottom}>
                <View>
                  <Text style={styles.orderItems}>
                    {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'}
                  </Text>
                  <Text style={styles.orderTotal}>{money(order.total)}</Text>
                </View>
                <View style={styles.orderActions}>
                  <Pressable
                    accessibilityLabel={`View order ${order.id} details`}
                    accessibilityRole="button"
                    onPress={() => setSelectedOrder(order)}
                    style={styles.detailsButton}
                  >
                    <Text style={styles.reorderText}>Details</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Reorder ${order.id}`}
                    accessibilityRole="button"
                    onPress={() => onReorder(order)}
                    style={styles.reorderButton}
                  >
                    <Text style={styles.reorderText}>Reorder</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {selectedOrder ? (
        <OrderDetails
          onClose={() => setSelectedOrder(null)}
          onReorder={() => {
            onReorder(selectedOrder);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      ) : null}
    </View>
  );
}

function OrderDetails({
  order,
  onClose,
  onReorder,
}: {
  order: Order;
  onClose: () => void;
  onReorder: () => void;
}) {
  return (
    <AccountDialog onClose={onClose} subtitle={order.date} title={order.id}>
      <AccountNotice>
        This is a locally saved demo order. No charge, delivery booking or live
        tracking is connected.
      </AccountNotice>
      {order.lines?.length ? (
        order.lines.map(line => (
          <View key={line.productId} style={styles.detailLine}>
            <View style={styles.detailLineCopy}>
              <Text style={styles.detailLineName}>{line.name}</Text>
              <Text style={styles.detailLineMeta}>
                {line.quantity} × {money(line.price)}
              </Text>
            </View>
            <Text style={styles.detailLinePrice}>
              {money((Math.round(line.price * 100) * line.quantity) / 100)}
            </Text>
          </View>
        ))
      ) : (
        <AccountNotice>
          This older order contains {order.itemCount} items. Individual line
          prices and quantities were not saved.
        </AccountNotice>
      )}
      <View style={styles.detailSummary}>
        {order.subtotal !== undefined ? (
          <SummaryLine label="Subtotal" value={money(order.subtotal)} />
        ) : null}
        {order.discount ? (
          <SummaryLine
            label={order.coupon ? `Discount · ${order.coupon}` : 'Discount'}
            value={`−${money(order.discount)}`}
          />
        ) : null}
        {order.shipping !== undefined ? (
          <SummaryLine
            label="Delivery"
            value={order.shipping === 0 ? 'Free' : money(order.shipping)}
          />
        ) : null}
        <SummaryLine label="Order total" value={money(order.total)} />
      </View>
      {order.delivery ? (
        <View style={styles.deliveryCard}>
          <Text style={styles.detailSectionTitle}>Delivery details</Text>
          <Text style={styles.deliveryName}>{order.delivery.fullName}</Text>
          <Text style={styles.deliveryText}>{order.delivery.phone}</Text>
          <Text style={styles.deliveryText}>
            {order.delivery.address}, {order.delivery.city}
          </Text>
          <Text style={styles.deliveryPayment}>
            {order.delivery.payment === 'cash'
              ? 'Cash on delivery · demo preference'
              : 'Card · simulated payment'}
          </Text>
        </View>
      ) : null}
      <Text style={styles.formHelp}>
        Reordering uses current catalogue prices and available stock. Your saved
        order remains unchanged.
      </Text>
      <AccountAction label="Add items to cart" onPress={onReorder} />
    </AccountDialog>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

type WishlistProps = {
  topInset: number;
  ids: string[];
  cartCount: number;
  onCart: () => void;
  onShop: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string) => void;
  onToggleLike: (id: string) => void;
};

export function WishlistScreen({
  topInset,
  ids,
  cartCount,
  onCart,
  onShop,
  onOpenProduct,
  onAdd,
  onToggleLike,
}: WishlistProps) {
  const { width } = useWindowDimensions();
  const columns = width >= 750 ? 4 : width >= 550 ? 3 : width < 360 ? 1 : 2;
  const likedProducts = products.filter(product => ids.includes(product.id));
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle={`${likedProducts.length} saved items`}
        title="My Wishlist"
      />
      {!likedProducts.length ? (
        <EmptyState
          actionLabel="Discover Products"
          icon="♡"
          message="Save products you love and they’ll be waiting here for you."
          onAction={onShop}
          title="Your wishlist is empty"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.wishlistGrid}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridInner}>
            {likedProducts.map(product => (
              <View
                key={product.id}
                style={[styles.gridCell, { width: `${100 / columns}%` }]}
              >
                <ProductCard
                  compact
                  liked
                  onAdd={() => onAdd(product.id)}
                  onOpen={() => onOpenProduct(product.id)}
                  onToggleLike={() => onToggleLike(product.id)}
                  product={product}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

type AccountProps = {
  topInset: number;
  cartCount: number;
  wishlistCount: number;
  orderCount: number;
  auth: AuthSession;
  profile: AccountProfile;
  onAuth: () => void;
  onLogout: () => void;
  onSaveProfile: (profile: AccountProfile) => void;
  onCart: () => void;
  onOrders: () => void;
  onWishlist: () => void;
  onSellers: () => void;
  onHelp: () => void;
  onWallet: () => void;
};

export function AccountScreen({
  topInset,
  cartCount,
  wishlistCount,
  orderCount,
  auth,
  profile,
  onAuth,
  onLogout,
  onSaveProfile,
  onCart,
  onOrders,
  onWishlist,
  onSellers,
  onHelp,
  onWallet,
}: AccountProps) {
  const [editor, setEditor] = useState<ProfileEditor | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const initials = profile.name.trim()
    ? profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase()
    : 'S';
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle="Your shopping details, on this device"
        title="My Account"
      />
      <ScrollView
        contentContainerStyle={styles.accountContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>
              {auth.isLoggedIn
                ? profile.name || 'Sellzy shopper'
                : 'Guest shopper'}
            </Text>
            <Text style={styles.profileEmail}>
              {auth.isLoggedIn
                ? auth.email
                : 'Shop freely — no account required'}
            </Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberText}>
                {auth.isLoggedIn ? 'SIGNED IN' : 'GUEST MODE'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={auth.isLoggedIn ? 'Edit profile' : 'Sign in'}
            accessibilityRole="button"
            onPress={() =>
              auth.isLoggedIn ? setEditor('profile') : onAuth()
            }
            style={styles.editButton}
            testID="account-auth-button"
          >
            <Text style={styles.editText}>
              {auth.isLoggedIn ? 'Edit' : 'Sign in'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.accountStats}>
          <AccountStat label="Orders" value={String(orderCount)} />
          <View style={styles.statDivider} />
          <AccountStat label="Wishlist" value={String(wishlistCount)} />
          <View style={styles.statDivider} />
          <AccountStat label="Cart" value={String(cartCount)} />
        </View>

        <Text style={styles.menuSection}>SHOPPING</Text>
        <MenuItem
          icon="orders"
          label="My Orders"
          onPress={onOrders}
          subtitle="View saved summaries or reorder"
        />
        <MenuItem
          icon="heart"
          label="Wishlist"
          onPress={onWishlist}
          subtitle="Your saved items"
        />
        <MenuItem
          icon="pin"
          label="Delivery Addresses"
          onPress={() => setEditor('address')}
          subtitle={
            profile.address
              ? `${profile.address}, ${profile.city}`
              : 'Save your default delivery address'
          }
        />
        <MenuItem
          icon="credit-card"
          label="Payment Methods"
          onPress={() => setEditor('payment')}
          subtitle={
            profile.payment === 'cash'
              ? 'Cash on delivery preferred'
              : 'Demo card payment preferred'
          }
        />
        <MenuItem
          icon="wallet"
          label="Personal Wallet"
          onPress={onWallet}
          subtitle={
            auth.isLoggedIn
              ? 'Balance, banks, top-ups and withdrawals'
              : 'Sign in to open your wallet'
          }
        />

        <Text style={styles.menuSection}>MARKETPLACE</Text>
        <MenuItem
          icon="shop"
          label="Our Sellers"
          onPress={onSellers}
          subtitle="Browse products by store"
        />
        <MenuItem
          icon="headset"
          label="Help & Support"
          onPress={onHelp}
          subtitle="Answers about shopping in this app"
        />
        <MenuItem
          icon="activity"
          label="Preferences"
          onPress={() => setEditor('preferences')}
          subtitle="Shopping settings and notification preference"
        />

        {auth.isLoggedIn ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowLogout(true)}
            style={styles.signOutButton}
            testID="account-logout"
          >
            <Icon color={COLORS.red} name="logout" size={16} />
            <Text style={styles.signOutText}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onAuth}
            style={styles.loginButton}
            testID="account-login"
          >
            <Text style={styles.loginButtonText}>Sign in to your account</Text>
          </Pressable>
        )}
        <Text style={styles.profileNote}>
          {auth.isLoggedIn
            ? 'Your secure session is shared with the Sellzy service. Your password is never saved.'
            : 'You can shop and checkout as a guest. Sign in is optional.'}
        </Text>
        <Text style={styles.version}>Sellzy Mobile · Version 1.0.0</Text>
      </ScrollView>
      {editor ? (
        <ProfileForm
          mode={editor}
          onClose={() => setEditor(null)}
          onSave={nextProfile => {
            onSaveProfile(nextProfile);
            setEditor(null);
          }}
          profile={profile}
        />
      ) : null}
      {showLogout ? (
        <AccountDialog onClose={() => setShowLogout(false)} title="Sign out?">
          <AccountNotice>
            Your cart, wishlist, orders and local shopping details will remain
            on this device.
          </AccountNotice>
          <AccountAction
            label="Yes, sign out"
            onPress={() => {
              onLogout();
              setShowLogout(false);
            }}
            testID="logout-confirm"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowLogout(false)}
            style={styles.continueGuestButton}
          >
            <Text style={styles.continueGuestText}>Stay signed in</Text>
          </Pressable>
        </AccountDialog>
      ) : null}
    </View>
  );
}

type ProfileEditor = 'profile' | 'address' | 'payment' | 'preferences';

const editorTitles: Record<ProfileEditor, string> = {
  profile: 'Edit your profile',
  address: 'Delivery address',
  payment: 'Payment preference',
  preferences: 'Preferences',
};

function ProfileForm({
  mode,
  profile,
  onSave,
  onClose,
}: {
  mode: ProfileEditor;
  profile: AccountProfile;
  onSave: (profile: AccountProfile) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [errors, setErrors] = useState<
    Partial<Record<keyof AccountProfile, string>>
  >({});
  const update = <K extends keyof AccountProfile>(
    key: K,
    value: AccountProfile[K],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const save = () => {
    const cleaned = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      address: draft.address.trim(),
      city: draft.city.trim(),
    };
    const nextErrors: typeof errors = {};
    if (mode === 'profile') {
      if (cleaned.name.length < 2) {
        nextErrors.name = 'Enter a name with at least 2 characters.';
      }
      if (cleaned.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
        nextErrors.email = 'Enter a valid email address or leave it empty.';
      }
      if (cleaned.phone && !/^\+?[\d\s().-]{7,20}$/.test(cleaned.phone)) {
        nextErrors.phone = 'Enter a valid phone number or leave it empty.';
      }
    }
    if (mode === 'address') {
      if (cleaned.address.length < 5) {
        nextErrors.address =
          'Enter a street address with at least 5 characters.';
      }
      if (cleaned.city.length < 2) {
        nextErrors.city = 'Enter your city or town.';
      }
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      onSave(cleaned);
    }
  };
  return (
    <AccountDialog onClose={onClose} title={editorTitles[mode]}>
      {mode === 'profile' ? (
        <>
          <AccountNotice>
            Save your details on this device to make future checkouts easier.
          </AccountNotice>
          <AccountField
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
            label="Full name"
            maxLength={80}
            onChangeText={value => update('name', value)}
            placeholder="Your name"
            value={draft.name}
          />
          <AccountField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            keyboardType="email-address"
            label="Email address (optional)"
            maxLength={150}
            onChangeText={value => update('email', value)}
            placeholder="you@example.com"
            value={draft.email}
          />
          <AccountField
            autoComplete="tel"
            error={errors.phone}
            keyboardType="phone-pad"
            label="Phone number (optional)"
            maxLength={20}
            onChangeText={value => update('phone', value)}
            placeholder="Your phone number"
            value={draft.phone}
          />
        </>
      ) : null}
      {mode === 'address' ? (
        <>
          <AccountNotice>
            This default address will be filled in at checkout. You can review
            or change it before saving an order.
          </AccountNotice>
          <AccountField
            autoComplete="street-address"
            error={errors.address}
            label="Street address"
            maxLength={240}
            multiline
            onChangeText={value => update('address', value)}
            placeholder="House number, street, apartment"
            value={draft.address}
          />
          <AccountField
            autoCapitalize="words"
            error={errors.city}
            label="City / Town"
            maxLength={100}
            onChangeText={value => update('city', value)}
            placeholder="Your city"
            value={draft.city}
          />
        </>
      ) : null}
      {mode === 'payment' ? (
        <>
          <AccountNotice>
            Choose the default option for demo checkout. No card details are
            collected and no money is charged.
          </AccountNotice>
          <PaymentOption
            description="Saved as your preferred method."
            label="Cash on delivery"
            onPress={() => update('payment', 'cash')}
            selected={draft.payment === 'cash'}
          />
          <PaymentOption
            description="Simulated card checkout, with no charge."
            label="Card · demo only"
            onPress={() => update('payment', 'card')}
            selected={draft.payment === 'card'}
          />
        </>
      ) : null}
      {mode === 'preferences' ? (
        <>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.menuLabel}>Shopping notifications</Text>
              <Text style={styles.formHelp}>
                Save your preference. Push notifications are not connected in
                this version.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Shopping notification preference"
              onValueChange={value => update('notifications', value)}
              trackColor={{ false: COLORS.border, true: COLORS.teal }}
              value={draft.notifications}
            />
          </View>
          <View style={styles.detailSummary}>
            <SummaryLine label="Language" value="English" />
            <SummaryLine label="Currency" value="USD ($)" />
          </View>
          <Text style={styles.formHelp}>
            This catalogue currently uses English and US dollars.
          </Text>
        </>
      ) : null}
      <AccountAction label="Save changes" onPress={save} />
    </AccountDialog>
  );
}

function PaymentOption({
  selected,
  label,
  description,
  onPress,
}: {
  selected: boolean;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.paymentOption, selected && styles.paymentSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.preferenceCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.formHelp}>{description}</Text>
      </View>
    </Pressable>
  );
}

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: IconName;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
    >
      <View style={styles.menuIconWrap}>
        <Icon color={COLORS.teal} name={icon} size={20} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Icon color={COLORS.muted} name="chevron-right" size={20} />
    </Pressable>
  );
}

export function SellersScreen({
  topInset,
  cartCount,
  onBack,
  onCart,
  onShop,
  vendorDraft,
  onSaveVendorDraft,
}: {
  topInset: number;
  cartCount: number;
  onBack: () => void;
  onCart: () => void;
  onShop: (store: string) => void;
  vendorDraft?: VendorDraft;
  onSaveVendorDraft: (draft: VendorDraft) => void;
}) {
  const [showVendorForm, setShowVendorForm] = useState(false);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        cartCount={cartCount}
        onBack={onBack}
        onCart={onCart}
        subtitle="Discover the stores in our catalogue"
        title="Our Sellers"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sellerHero}>
          <Text style={styles.sellerHeroEyebrow}>SELL WITH SELLZY</Text>
          <Text style={styles.sellerHeroTitle}>
            Your wellness essentials, all in one place.
          </Text>
          <Text style={styles.sellerHeroText}>
            Explore each store’s collection and find your next everyday
            favourite.
          </Text>
        </View>
        {catalogueSellers.map(seller => (
          <View key={seller.name} style={styles.sellerCard}>
            <View
              style={[styles.sellerLogo, { backgroundColor: seller.color }]}
            >
              <Text style={styles.sellerLogoText}>{seller.name.charAt(0)}</Text>
            </View>
            <View style={styles.sellerCopy}>
              <Text style={styles.sellerName}>{seller.name}</Text>
              <Text style={styles.sellerMeta}>
                {seller.productCount}{' '}
                {seller.productCount === 1 ? 'product' : 'products'} available
              </Text>
              <Text style={styles.verified}>
                Catalogue rating {seller.rating.toFixed(1)} / 5
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Visit ${seller.name}`}
              accessibilityRole="button"
              onPress={() => onShop(seller.name)}
              style={styles.visitButton}
            >
              <Text style={styles.visitText}>Visit</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.vendorCallout}>
          <Text style={styles.vendorCalloutTitle}>
            Grow your business with Sellzy
          </Text>
          <Text style={styles.vendorCalloutText}>
            Plan your store by saving a vendor profile draft on this device.
            Publishing and seller registration are not connected yet.
          </Text>
          {vendorDraft?.storeName ? (
            <Text style={styles.vendorDraftLabel}>
              Saved draft: {vendorDraft.storeName}
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowVendorForm(true)}
            style={styles.vendorButton}
          >
            <Text style={styles.vendorButtonText}>
              {vendorDraft?.storeName ? 'Edit Vendor Draft' : 'Become a Vendor'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
      {showVendorForm ? (
        <VendorForm
          draft={vendorDraft ?? emptyVendorDraft}
          onClose={() => setShowVendorForm(false)}
          onSave={nextDraft => {
            onSaveVendorDraft(nextDraft);
            setShowVendorForm(false);
            Alert.alert(
              'Vendor draft saved',
              'Your store details are saved on this device. No application has been sent and no store has been published.',
            );
          }}
        />
      ) : null}
    </View>
  );
}

function VendorForm({
  draft,
  onSave,
  onClose,
}: {
  draft: VendorDraft;
  onSave: (draft: VendorDraft) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState(draft);
  const [errors, setErrors] = useState<
    Partial<Record<keyof VendorDraft, string>>
  >({});
  const update = (key: keyof VendorDraft, value: string) => {
    setValues(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const save = () => {
    const nextDraft = {
      storeName: values.storeName.trim(),
      ownerName: values.ownerName.trim(),
      email: values.email.trim(),
      category: values.category.trim(),
      description: values.description.trim(),
    };
    const nextErrors: typeof errors = {};
    if (nextDraft.storeName.length < 2) {
      nextErrors.storeName = 'Enter a store name with at least 2 characters.';
    }
    if (nextDraft.ownerName.length < 2) {
      nextErrors.ownerName = 'Enter your full name.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextDraft.email)) {
      nextErrors.email = 'Enter a valid contact email.';
    }
    if (nextDraft.category.length < 2) {
      nextErrors.category = 'Enter a product category.';
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      onSave(nextDraft);
    }
  };
  return (
    <AccountDialog
      onClose={onClose}
      subtitle="Prepare your store profile"
      title="Your vendor draft"
    >
      <AccountNotice>
        Save a draft on this device. This form does not submit a seller
        application or create a public store.
      </AccountNotice>
      <AccountField
        autoCapitalize="words"
        error={errors.storeName}
        label="Store name"
        maxLength={80}
        onChangeText={value => update('storeName', value)}
        placeholder="Your store name"
        value={values.storeName}
      />
      <AccountField
        autoCapitalize="words"
        autoComplete="name"
        error={errors.ownerName}
        label="Owner name"
        maxLength={80}
        onChangeText={value => update('ownerName', value)}
        placeholder="Your full name"
        value={values.ownerName}
      />
      <AccountField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        keyboardType="email-address"
        label="Contact email"
        maxLength={150}
        onChangeText={value => update('email', value)}
        placeholder="you@example.com"
        value={values.email}
      />
      <AccountField
        error={errors.category}
        label="Product category"
        maxLength={80}
        onChangeText={value => update('category', value)}
        placeholder="e.g. Wellness"
        value={values.category}
      />
      <AccountField
        label="About your store (optional)"
        maxLength={600}
        multiline
        onChangeText={value => update('description', value)}
        placeholder="Tell us what makes your products special"
        value={values.description}
      />
      <AccountAction label="Save draft on this device" onPress={save} />
    </AccountDialog>
  );
}

export function HelpScreen({
  topInset,
  onBack,
}: {
  topInset: number;
  onBack: () => void;
}) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const questions = [
    [
      'Where can I find my order?',
      'Open My Orders and tap Details to see the items, total and delivery details saved at checkout. Orders stay on this device. This version does not book deliveries or provide live tracking.',
    ],
    [
      'Does checkout place a real order?',
      'No. Checkout saves a demo order on your device. It does not send an order to a seller, take payment or arrange a shipment, so returns and refunds do not apply.',
    ],
    [
      'Which payment methods are supported?',
      'You can choose cash on delivery or the card demo option. Both are simulated preferences; the app does not collect card numbers or charge money.',
    ],
    [
      'How do I use a coupon?',
      'Enter SELLZY10 in the cart and tap Apply for a 10% discount on the product subtotal. Review the discount in your total before continuing to checkout.',
    ],
    [
      'Will my cart and wishlist be saved?',
      'Your cart, wishlist, orders and saved profile are stored on this device. They are available when you reopen the app, but are not synced to an online account. Clearing app data or uninstalling removes these details.',
    ],
    [
      'How does reordering work?',
      'Tap Reorder in My Orders to add the saved items to your cart. Reordering uses current catalogue prices and available stock; discounts from the earlier order are not automatically reused.',
    ],
    [
      'How do I become a vendor?',
      'Open Our Sellers and tap Become a Vendor to prepare a store profile draft. The draft is saved on this device only. Seller registration and public stores are not connected.',
    ],
  ];
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle="A quick guide to Sellzy"
        title="Help & Support"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.helpHero}>
          <View style={styles.helpHeroIcon}>
            <Icon color={COLORS.tealDark} name="headset" size={25} />
          </View>
          <Text style={styles.helpHeroTitle}>How can we help?</Text>
          <Text style={styles.helpHeroText}>
            Find answers about products, checkout and your saved details.
          </Text>
        </View>
        <Text style={styles.faqHeading}>Frequently asked questions</Text>
        {questions.map(([question, answer], index) => (
          <View key={question} style={styles.faqCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedQuestion === index }}
              onPress={() =>
                setExpandedQuestion(expandedQuestion === index ? null : index)
              }
              style={styles.faqToggle}
            >
              <Text style={styles.faqQuestion}>{question}</Text>
              <Icon
                color={COLORS.teal}
                name={expandedQuestion === index ? 'minus' : 'plus'}
                size={19}
              />
            </Pressable>
            {expandedQuestion === index ? (
              <Text style={styles.faqAnswer}>{answer}</Text>
            ) : null}
          </View>
        ))}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>About this experience</Text>
          <Text style={styles.contactText}>
            Sellzy is a sample shopping app with a local catalogue and checkout.
          </Text>
          <Text style={styles.contactHours}>
            Live customer support is not connected in this version.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  content: { padding: 16, paddingBottom: 30 },
  infoBanner: {
    padding: 13,
    marginBottom: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  infoIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  infoText: {
    flex: 1,
    color: COLORS.tealDark,
    fontSize: 10,
    lineHeight: 15,
    marginLeft: 10,
  },
  orderCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    backgroundColor: COLORS.white,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '900' },
  orderDate: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF4D2',
  },
  statusDelivered: { backgroundColor: '#E7F7EE' },
  statusText: { color: '#8B6A00', fontSize: 9, fontWeight: '900' },
  statusDeliveredText: { color: COLORS.success },
  orderProducts: { flexDirection: 'row', gap: 8, marginVertical: 15 },
  orderProductImageWrap: {
    width: 61,
    height: 61,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  orderProductImage: { width: '90%', height: '90%' },
  orderBottom: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginLeft: 12,
  },
  orderItems: { color: COLORS.muted, fontSize: 9 },
  orderTotal: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },
  reorderButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  reorderText: { color: COLORS.teal, fontSize: 11, fontWeight: '900' },
  detailLine: {
    minHeight: 61,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLineCopy: { flex: 1, paddingRight: 12 },
  detailLineName: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  detailLineMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  detailLinePrice: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  detailSummary: {
    padding: 15,
    marginTop: 17,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
  },
  summaryLine: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: { flex: 1, color: COLORS.muted, fontSize: 11 },
  summaryValue: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  deliveryCard: {
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
  },
  detailSectionTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  deliveryName: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  deliveryText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  deliveryPayment: {
    alignSelf: 'flex-start',
    color: COLORS.tealDark,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 9,
  },
  formHelp: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  wishlistGrid: { paddingHorizontal: 11, paddingBottom: 28 },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { padding: 5 },
  accountContent: { padding: 16, paddingBottom: 30 },
  profileCard: {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealDark,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  avatarText: { color: COLORS.tealDark, fontSize: 20, fontWeight: '900' },
  profileCopy: { flex: 1, paddingHorizontal: 13 },
  profileName: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  profileEmail: { color: '#CAE1DF', fontSize: 10, marginTop: 4 },
  memberBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.yellow,
  },
  memberText: {
    color: '#5E4900',
    fontSize: 7,
    letterSpacing: 0.6,
    fontWeight: '900',
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#5E9996',
    borderRadius: 15,
  },
  editText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  accountStats: {
    minHeight: 83,
    marginTop: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.ink, fontSize: 19, fontWeight: '900' },
  statLabel: { color: COLORS.muted, fontSize: 9, marginTop: 4 },
  statDivider: { width: 1, height: 34, backgroundColor: COLORS.border },
  menuSection: {
    color: COLORS.muted,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 9,
  },
  menuItem: {
    minHeight: 67,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  menuIcon: { color: COLORS.teal, fontSize: 16, fontWeight: '900' },
  menuCopy: { flex: 1, paddingHorizontal: 12 },
  menuLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  menuSubtitle: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  menuArrow: { color: COLORS.muted, fontSize: 25 },
  signOutButton: {
    height: 49,
    marginTop: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF0F3',
  },
  signOutText: { color: COLORS.red, fontSize: 12, fontWeight: '900' },
  loginButton: {
    height: 49,
    marginTop: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  loginButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  continueGuestButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  continueGuestText: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  profileNote: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
  },
  preferenceRow: {
    minHeight: 72,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  preferenceCopy: { flex: 1 },
  paymentOption: {
    minHeight: 72,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
  },
  paymentSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.teal },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  version: {
    color: '#A0A8AA',
    fontSize: 9,
    textAlign: 'center',
    marginTop: 14,
  },
  sellerHero: {
    padding: 23,
    marginBottom: 18,
    borderRadius: 21,
    backgroundColor: COLORS.tealDark,
  },
  sellerHeroEyebrow: {
    color: COLORS.yellow,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '900',
  },
  sellerHeroTitle: {
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 9,
  },
  sellerHeroText: {
    color: '#CDE2E0',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 8,
  },
  sellerCard: {
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerLogo: {
    width: 57,
    height: 57,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerLogoText: { color: COLORS.tealDark, fontSize: 21, fontWeight: '900' },
  sellerCopy: { flex: 1, paddingHorizontal: 12 },
  sellerName: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  sellerMeta: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '800',
    marginTop: 4,
  },
  verified: {
    color: COLORS.success,
    fontSize: 8,
    fontWeight: '800',
    marginTop: 4,
  },
  visitButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  visitText: { color: COLORS.white, fontSize: 10, fontWeight: '900' },
  vendorCallout: {
    padding: 21,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: '#FFF7DB',
  },
  vendorCalloutTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900' },
  vendorCalloutText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  vendorDraftLabel: {
    alignSelf: 'flex-start',
    color: COLORS.tealDark,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 12,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  vendorButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 14,
    borderRadius: 19,
    backgroundColor: COLORS.yellow,
  },
  vendorButtonText: { color: '#554200', fontSize: 10, fontWeight: '900' },
  helpHero: {
    padding: 25,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: COLORS.tealDark,
  },
  helpHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  helpHeroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 13,
  },
  helpHeroText: {
    color: '#CDE2E0',
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  faqHeading: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 12,
  },
  faqCard: {
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  faqToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
  },
  faqAnswer: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 7,
  },
  contactCard: {
    padding: 19,
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: COLORS.tealSoft,
  },
  contactTitle: { color: COLORS.tealDark, fontSize: 16, fontWeight: '900' },
  contactText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
  },
  contactHours: { color: COLORS.muted, fontSize: 10, marginTop: 4 },
});
