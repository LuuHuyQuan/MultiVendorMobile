import React, { useState } from 'react';
import {
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
import { products, sellers } from '../data/catalog';
import { COLORS, money } from '../theme';
import type { Order, Product } from '../types';
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

function getCatalogueSellers(catalogProducts: Product[]) {
  const grouped = new Map<string, Product[]>();
  catalogProducts.forEach(product => {
    const listed = grouped.get(product.store) ?? [];
    listed.push(product);
    grouped.set(product.store, listed);
  });
  return [...grouped].map(([name, storeProducts], index) => {
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
}

type OrdersProps = {
  topInset: number;
  orders: Order[];
  catalogProducts?: Product[];
  cartCount: number;
  onCart: () => void;
  onShop: () => void;
  onOpenProduct: (id: string) => void;
  onReorder: (order: Order) => void;
};

export function OrdersScreen({
  topInset,
  orders,
  catalogProducts = products,
  cartCount,
  onCart,
  onShop,
  onOpenProduct,
  onReorder,
}: OrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const hasPlacedOrders = orders.some(order => order.simulated === false);
  const hasDemoOrders = orders.some(order => order.simulated !== false);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle="Tóm tắt đơn hàng đã lưu trên thiết bị"
        title="Đơn hàng của tôi"
      />
      {!orders.length ? (
        <EmptyState
          actionLabel="Khám phá sản phẩm"
          icon="▣"
          message="Đặt một đơn hàng để xem tóm tắt tại đây."
          onAction={onShop}
          title="Chưa có đơn hàng"
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
              {hasPlacedOrders
                ? 'Đơn đặt với cửa hàng có tóm tắt được lưu trên thiết bị này. Trạng thái hiển thị có thể chưa được cập nhật; ứng dụng chưa đồng bộ lịch sử và theo dõi giao hàng.'
                : 'Đơn hàng mẫu được lưu trên thiết bị này. Mở chi tiết để xem sản phẩm và thông tin giao hàng; chưa có thanh toán hoặc vận chuyển thực tế.'}
              {hasPlacedOrders && hasDemoOrders
                ? ' Các đơn hàng mẫu trong danh sách không được gửi tới cửa hàng.'
                : null}
            </Text>
          </View>
          {orders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderLabel}>ĐƠN HÀNG {order.id}</Text>
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
                    {order.simulated !== false
                      ? 'Đã lưu trên thiết bị'
                      : order.status === 'Processing'
                      ? 'Đang xử lý'
                      : order.status === 'Shipped'
                      ? 'Đang giao'
                      : 'Đã giao'}
                  </Text>
                </View>
              </View>
              <View style={styles.orderProducts}>
                {order.productIds.slice(0, 4).map(id => {
                  const product =
                    catalogProducts.find(item => item.id === id) ??
                    (order.simulated !== false
                      ? products.find(item => item.id === id)
                      : undefined);
                  return product ? (
                    <Pressable
                      accessibilityLabel={`Xem ${product.name}`}
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
                  ) : (
                    <View
                      accessibilityLabel="Sản phẩm không còn trong danh mục"
                      key={id}
                      style={styles.orderProductImageWrap}
                    >
                      <Icon color={COLORS.muted} name="shop" size={20} />
                    </View>
                  );
                })}
              </View>
              <View style={styles.orderBottom}>
                <View>
                  <Text style={styles.orderItems}>
                    {order.itemCount} sản phẩm
                  </Text>
                  <Text style={styles.orderTotal}>{money(order.total)}</Text>
                </View>
                <View style={styles.orderActions}>
                  <Pressable
                    accessibilityLabel={`Xem chi tiết đơn hàng ${order.id}`}
                    accessibilityRole="button"
                    onPress={() => setSelectedOrder(order)}
                    style={styles.detailsButton}
                  >
                    <Text style={styles.reorderText}>Chi tiết</Text>
                  </Pressable>
                  <Pressable
                    accessibilityLabel={`Mua lại đơn hàng ${order.id}`}
                    accessibilityRole="button"
                    onPress={() => onReorder(order)}
                    style={styles.reorderButton}
                  >
                    <Text style={styles.reorderText}>Mua lại</Text>
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
        {order.simulated === false
          ? 'Đơn đã được gửi tới cửa hàng. Đây là bản tóm tắt lưu trên thiết bị; trạng thái và lịch sử giao hàng chưa được đồng bộ tự động.'
          : 'Đây là đơn hàng mẫu được lưu trên thiết bị. Ứng dụng chưa kết nối thanh toán, đặt giao hàng hoặc theo dõi trực tiếp.'}
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
          Đơn hàng cũ này có {order.itemCount} sản phẩm. Giá và số lượng từng
          sản phẩm chưa được lưu.
        </AccountNotice>
      )}
      <View style={styles.detailSummary}>
        {order.subtotal !== undefined ? (
          <SummaryLine label="Tạm tính" value={money(order.subtotal)} />
        ) : null}
        {order.discount ? (
          <SummaryLine
            label={order.coupon ? `Giảm giá · ${order.coupon}` : 'Giảm giá'}
            value={`−${money(order.discount)}`}
          />
        ) : null}
        {order.shipping !== undefined ? (
          <SummaryLine
            label="Giao hàng"
            value={order.shipping === 0 ? 'Miễn phí' : money(order.shipping)}
          />
        ) : null}
        <SummaryLine label="Tổng đơn hàng" value={money(order.total)} />
      </View>
      {order.delivery ? (
        <View style={styles.deliveryCard}>
          <Text style={styles.detailSectionTitle}>Thông tin giao hàng</Text>
          <Text style={styles.deliveryName}>{order.delivery.fullName}</Text>
          <Text style={styles.deliveryText}>{order.delivery.phone}</Text>
          <Text style={styles.deliveryText}>
            {order.delivery.address}
            {order.delivery.district ? `, ${order.delivery.district}` : ''}, {order.delivery.city}
          </Text>
          <Text style={styles.deliveryPayment}>
            {order.delivery.payment === 'cash'
              ? order.simulated === false
                ? 'Thanh toán khi nhận hàng'
                : 'Thanh toán khi nhận hàng · lựa chọn mẫu'
              : order.simulated === false
                ? 'Thanh toán bằng thẻ'
                : 'Thẻ · thanh toán mô phỏng'}
          </Text>
        </View>
      ) : null}
      <Text style={styles.formHelp}>
        Mua lại sử dụng giá và tồn kho hiện tại. Đơn hàng đã lưu của bạn không
        thay đổi.
      </Text>
      <AccountAction label="Thêm sản phẩm vào giỏ" onPress={onReorder} />
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
  catalogProducts?: Product[];
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
  catalogProducts = products,
  cartCount,
  onCart,
  onShop,
  onOpenProduct,
  onAdd,
  onToggleLike,
}: WishlistProps) {
  const { width } = useWindowDimensions();
  const columns = width >= 750 ? 4 : width >= 550 ? 3 : width < 360 ? 1 : 2;
  const likedProducts = catalogProducts.filter(product => ids.includes(product.id));
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle={`${likedProducts.length} sản phẩm đã lưu`}
        title="Sản phẩm yêu thích"
      />
      {!likedProducts.length ? (
        <EmptyState
          actionLabel="Khám phá sản phẩm"
          icon="♡"
          message="Lưu những sản phẩm bạn yêu thích, chúng sẽ luôn ở đây chờ bạn."
          onAction={onShop}
          title="Danh sách yêu thích đang trống"
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
  liveCatalog?: boolean;
  onAuth: () => void;
  onLogout: () => void;
  onSaveProfile: (profile: AccountProfile) => void;
  onCart: () => void;
  onOrders: () => void;
  onWishlist: () => void;
  onSellers: () => void;
  onSellerPortal: () => void;
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
  liveCatalog = false,
  onAuth,
  onLogout,
  onSaveProfile,
  onCart,
  onOrders,
  onWishlist,
  onSellers,
  onSellerPortal,
  onHelp,
  onWallet,
}: AccountProps) {
  const [editor, setEditor] = useState<ProfileEditor | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const initials = auth.isLoggedIn && profile.name.trim()
    ? profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase()
    : auth.isLoggedIn
      ? 'S'
      : 'K';
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle="Thông tin mua sắm trên thiết bị này"
        title="Tài khoản của tôi"
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
                ? profile.name || 'Khách hàng Sellzy'
                : 'Khách mua sắm'}
            </Text>
            <Text style={styles.profileEmail}>
              {auth.isLoggedIn
                ? auth.email
                : 'Mua sắm tự do — không cần tài khoản'}
            </Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberText}>
                {auth.isLoggedIn ? 'ĐÃ ĐĂNG NHẬP' : 'CHẾ ĐỘ KHÁCH'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={
              auth.isLoggedIn ? 'Chỉnh sửa hồ sơ' : 'Đăng nhập'
            }
            accessibilityRole="button"
            onPress={() => (auth.isLoggedIn ? setEditor('profile') : onAuth())}
            style={styles.editButton}
            testID="account-auth-button"
          >
            <Text style={styles.editText}>
              {auth.isLoggedIn ? 'Sửa' : 'Đăng nhập'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.accountStats}>
          <AccountStat label="Đơn hàng" value={String(orderCount)} />
          <View style={styles.statDivider} />
          <AccountStat label="Yêu thích" value={String(wishlistCount)} />
          <View style={styles.statDivider} />
          <AccountStat label="Giỏ hàng" value={String(cartCount)} />
        </View>

        <Text style={styles.menuSection}>MUA SẮM</Text>
        <MenuItem
          icon="orders"
          label="Đơn hàng của tôi"
          onPress={onOrders}
          subtitle="Xem tóm tắt đã lưu hoặc mua lại"
        />
        <MenuItem
          icon="heart"
          label="Sản phẩm yêu thích"
          onPress={onWishlist}
          subtitle="Sản phẩm bạn đã lưu"
        />
        <MenuItem
          icon="pin"
          label="Địa chỉ giao hàng"
          onPress={() => setEditor('address')}
          subtitle={
            profile.address
              ? [profile.address, profile.district, profile.city]
                  .filter(Boolean)
                  .join(', ')
              : 'Lưu địa chỉ giao hàng mặc định'
          }
        />
        <MenuItem
          icon="credit-card"
          label="Phương thức thanh toán"
          onPress={() => setEditor('payment')}
          subtitle={
            liveCatalog || profile.payment === 'cash'
              ? 'Ưu tiên thanh toán khi nhận hàng'
              : 'Ưu tiên thanh toán thẻ mẫu'
          }
        />
        <MenuItem
          icon="wallet"
          label="Ví cá nhân"
          onPress={onWallet}
          subtitle={
            auth.isLoggedIn
              ? 'Số dư, ngân hàng, nạp và rút tiền'
              : 'Đăng nhập để mở ví'
          }
        />

        <Text style={styles.menuSection}>CỬA HÀNG</Text>
        <MenuItem
          icon="shop"
          label="Các cửa hàng"
          onPress={onSellers}
          subtitle="Xem sản phẩm theo từng cửa hàng"
        />
        {auth.isLoggedIn ? (
          <MenuItem
            icon="shop"
            label="Kênh người bán"
            onPress={onSellerPortal}
            subtitle="Sản phẩm và đơn hàng của cửa hàng bạn"
          />
        ) : null}
        <MenuItem
          icon="headset"
          label="Trợ giúp & hỗ trợ"
          onPress={onHelp}
          subtitle="Giải đáp về việc mua sắm trong ứng dụng"
        />
        <MenuItem
          icon="activity"
          label="Tùy chọn"
          onPress={() => setEditor('preferences')}
          subtitle="Cài đặt mua sắm và thông báo"
        />

        {auth.isLoggedIn ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowLogout(true)}
            style={styles.signOutButton}
            testID="account-logout"
          >
            <Icon color={COLORS.red} name="logout" size={16} />
            <Text style={styles.signOutText}>Đăng xuất</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onAuth}
            style={styles.loginButton}
            testID="account-login"
          >
            <Text style={styles.loginButtonText}>Đăng nhập tài khoản</Text>
          </Pressable>
        )}
        <Text style={styles.profileNote}>
          {auth.isLoggedIn
            ? 'Phiên đăng nhập được dùng với dịch vụ Sellzy. Mật khẩu của bạn không được lưu trên thiết bị.'
            : 'Bạn có thể mua sắm và thanh toán với tư cách khách. Đăng nhập là tùy chọn.'}
        </Text>
        <Text style={styles.version}>Sellzy Mobile · Phiên bản 1.0.0</Text>
      </ScrollView>
      {editor ? (
        <ProfileForm
          mode={editor}
          liveCatalog={liveCatalog}
          onClose={() => setEditor(null)}
          onSave={nextProfile => {
            onSaveProfile(nextProfile);
            setEditor(null);
          }}
          profile={profile}
        />
      ) : null}
      {showLogout ? (
        <AccountDialog onClose={() => setShowLogout(false)} title="Đăng xuất?">
          <AccountNotice>
            Dữ liệu mua sắm của tài khoản này vẫn được giữ trên thiết bị và sẽ
            xuất hiện khi bạn đăng nhập lại bằng cùng email.
          </AccountNotice>
          <AccountAction
            label="Có, đăng xuất"
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
            <Text style={styles.continueGuestText}>Tiếp tục đăng nhập</Text>
          </Pressable>
        </AccountDialog>
      ) : null}
    </View>
  );
}

type ProfileEditor = 'profile' | 'address' | 'payment' | 'preferences';

const editorTitles: Record<ProfileEditor, string> = {
  profile: 'Chỉnh sửa hồ sơ',
  address: 'Địa chỉ giao hàng',
  payment: 'Ưu tiên thanh toán',
  preferences: 'Tùy chọn',
};

function ProfileForm({
  mode,
  profile,
  liveCatalog,
  onSave,
  onClose,
}: {
  mode: ProfileEditor;
  profile: AccountProfile;
  liveCatalog: boolean;
  onSave: (profile: AccountProfile) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AccountProfile>(() => ({
    ...profile,
    payment: liveCatalog ? 'cash' : profile.payment,
  }));
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
      district: draft.district?.trim() ?? '',
      city: draft.city.trim(),
    };
    const nextErrors: typeof errors = {};
    if (mode === 'profile') {
      if (cleaned.name.length < 2) {
        nextErrors.name = 'Vui lòng nhập tên có ít nhất 2 ký tự.';
      }
      if (cleaned.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
        nextErrors.email = 'Nhập email hợp lệ hoặc để trống.';
      }
      if (cleaned.phone && !/^\+?[\d\s().-]{7,20}$/.test(cleaned.phone)) {
        nextErrors.phone = 'Nhập số điện thoại hợp lệ hoặc để trống.';
      }
    }
    if (mode === 'address') {
      const hasAddress = Boolean(
        cleaned.address || cleaned.district || cleaned.city,
      );
      if (hasAddress && cleaned.address.length < 5) {
        nextErrors.address = 'Vui lòng nhập địa chỉ có ít nhất 5 ký tự.';
      }
      if (hasAddress && cleaned.district.length < 2) {
        nextErrors.district = 'Vui lòng nhập quận/huyện.';
      }
      if (hasAddress && cleaned.city.length < 2) {
        nextErrors.city = 'Vui lòng nhập tỉnh/thành phố.';
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
            Lưu thông tin trên thiết bị để thanh toán nhanh hơn trong những lần
            sau. Email liên hệ ở đây không thay đổi email dùng để đăng nhập.
          </AccountNotice>
          <AccountField
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
            label="Họ và tên"
            maxLength={80}
            onChangeText={value => update('name', value)}
            placeholder="Nhập họ và tên"
            value={draft.name}
          />
          <AccountField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            keyboardType="email-address"
            label="Địa chỉ email (không bắt buộc)"
            maxLength={150}
            onChangeText={value => update('email', value)}
            placeholder="you@example.com"
            value={draft.email}
          />
          <AccountField
            autoComplete="tel"
            error={errors.phone}
            keyboardType="phone-pad"
            label="Số điện thoại (không bắt buộc)"
            maxLength={20}
            onChangeText={value => update('phone', value)}
            placeholder="Nhập số điện thoại"
            value={draft.phone}
          />
        </>
      ) : null}
      {mode === 'address' ? (
        <>
          <AccountNotice>
            Địa chỉ mặc định sẽ được điền khi thanh toán. Bạn có thể xem lại
            hoặc thay đổi trước khi lưu đơn hàng. Để trống cả hai trường để xóa
            địa chỉ đã lưu.
          </AccountNotice>
          <AccountField
            autoComplete="street-address"
            error={errors.address}
            label="Địa chỉ"
            maxLength={240}
            multiline
            onChangeText={value => update('address', value)}
            placeholder="Số nhà, tên đường, căn hộ"
            value={draft.address}
          />
          <AccountField
            autoCapitalize="words"
            error={errors.district}
            label="Quận / Huyện"
            maxLength={100}
            onChangeText={value => update('district', value)}
            placeholder="Nhập quận hoặc huyện"
            value={draft.district ?? ''}
          />
          <AccountField
            autoCapitalize="words"
            error={errors.city}
            label="Tỉnh / Thành phố"
            maxLength={100}
            onChangeText={value => update('city', value)}
            placeholder="Nhập tỉnh hoặc thành phố"
            value={draft.city}
          />
        </>
      ) : null}
      {mode === 'payment' ? (
        <>
          <AccountNotice>
            {liveCatalog
              ? 'Đơn hàng gửi đến cửa hàng hiện hỗ trợ thanh toán khi nhận hàng.'
              : 'Chọn phương thức mặc định cho đơn hàng mẫu. Ứng dụng không thu thập thông tin thẻ và không thực hiện giao dịch thật.'}
          </AccountNotice>
          <PaymentOption
            description="Được lưu làm phương thức ưu tiên."
            label="Thanh toán khi nhận hàng"
            onPress={() => update('payment', 'cash')}
            selected={draft.payment === 'cash'}
          />
          {!liveCatalog ? (
            <PaymentOption
              description="Thanh toán thẻ mô phỏng, không phát sinh giao dịch."
              label="Thẻ · chỉ dùng để minh họa"
              onPress={() => update('payment', 'card')}
              selected={draft.payment === 'card'}
            />
          ) : null}
        </>
      ) : null}
      {mode === 'preferences' ? (
        <>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.menuLabel}>Thông báo mua sắm</Text>
              <Text style={styles.formHelp}>
                Lưu tùy chọn của bạn. Phiên bản này chưa kết nối thông báo đẩy.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Tùy chọn thông báo mua sắm"
              onValueChange={value => update('notifications', value)}
              trackColor={{ false: COLORS.border, true: COLORS.teal }}
              value={draft.notifications}
            />
          </View>
          <View style={styles.detailSummary}>
            <SummaryLine label="Ngôn ngữ" value="Tiếng Việt" />
            <SummaryLine label="Tiền tệ" value="VND (₫)" />
          </View>
          <Text style={styles.formHelp}>
            Danh mục hiển thị bằng tiếng Việt và dùng đơn vị Việt Nam đồng.
          </Text>
        </>
      ) : null}
      <AccountAction label="Lưu thay đổi" onPress={save} />
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
  catalogProducts = products,
  catalogVendors,
  onBack,
  onCart,
  onShop,
  vendorDraft,
  onSaveVendorDraft,
}: {
  topInset: number;
  cartCount: number;
  catalogProducts?: Product[];
  catalogVendors?: { name: string; rating: number; productCount: number }[];
  onBack: () => void;
  onCart: () => void;
  onShop: (store: string) => void;
  vendorDraft?: VendorDraft;
  onSaveVendorDraft: (draft: VendorDraft) => void;
}) {
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const catalogueSellers = catalogVendors
    ? catalogVendors.map((vendor, index) => ({
        ...vendor,
        color: sellerColors[index % sellerColors.length],
      }))
    : getCatalogueSellers(catalogProducts);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        cartCount={cartCount}
        onBack={onBack}
        onCart={onCart}
        subtitle="Khám phá các cửa hàng trong danh mục"
        title="Các cửa hàng"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sellerHero}>
          <Text style={styles.sellerHeroEyebrow}>BÁN HÀNG CÙNG SELLZY</Text>
          <Text style={styles.sellerHeroTitle}>
            Sản phẩm thiết yếu cho cuộc sống khỏe, gói gọn một nơi.
          </Text>
          <Text style={styles.sellerHeroText}>
            Khám phá sản phẩm của từng cửa hàng và tìm lựa chọn phù hợp cho mỗi
            ngày.
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
                {seller.productCount} sản phẩm đang có
              </Text>
              <Text style={styles.verified}>
                Đánh giá danh mục {seller.rating.toFixed(1)} / 5
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Xem cửa hàng ${seller.name}`}
              accessibilityRole="button"
              onPress={() => onShop(seller.name)}
              style={styles.visitButton}
            >
              <Text style={styles.visitText}>Xem</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.vendorCallout}>
          <Text style={styles.vendorCalloutTitle}>
            Phát triển cửa hàng cùng Sellzy
          </Text>
          <Text style={styles.vendorCalloutText}>
            Lên kế hoạch cửa hàng bằng cách lưu bản nháp hồ sơ bán hàng trên
            thiết bị. Đăng ký và xuất bản cửa hàng chưa được kết nối.
          </Text>
          {vendorDraft?.storeName ? (
            <Text style={styles.vendorDraftLabel}>
              Bản nháp đã lưu: {vendorDraft.storeName}
            </Text>
          ) : null}
          {draftSaved ? (
            <Text accessibilityLiveRegion="polite" style={styles.vendorDraftLabel}>
              Đã lưu trên thiết bị. Chưa gửi hồ sơ đăng ký cửa hàng.
            </Text>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowVendorForm(true)}
            style={styles.vendorButton}
          >
            <Text style={styles.vendorButtonText}>
              {vendorDraft?.storeName
                ? 'Chỉnh sửa bản nháp cửa hàng'
                : 'Trở thành nhà bán hàng'}
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
            setDraftSaved(true);
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
      nextErrors.storeName = 'Vui lòng nhập tên cửa hàng có ít nhất 2 ký tự.';
    }
    if (nextDraft.ownerName.length < 2) {
      nextErrors.ownerName = 'Vui lòng nhập họ và tên.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextDraft.email)) {
      nextErrors.email = 'Vui lòng nhập email liên hệ hợp lệ.';
    }
    if (nextDraft.category.length < 2) {
      nextErrors.category = 'Vui lòng nhập danh mục sản phẩm.';
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      onSave(nextDraft);
    }
  };
  return (
    <AccountDialog
      onClose={onClose}
      subtitle="Chuẩn bị hồ sơ cửa hàng của bạn"
      title="Bản nháp nhà bán hàng"
    >
      <AccountNotice>
        Lưu bản nháp trên thiết bị. Biểu mẫu này không gửi đăng ký bán hàng hoặc
        tạo cửa hàng công khai.
      </AccountNotice>
      <AccountField
        autoCapitalize="words"
        error={errors.storeName}
        label="Tên cửa hàng"
        maxLength={80}
        onChangeText={value => update('storeName', value)}
        placeholder="Nhập tên cửa hàng"
        value={values.storeName}
      />
      <AccountField
        autoCapitalize="words"
        autoComplete="name"
        error={errors.ownerName}
        label="Tên chủ cửa hàng"
        maxLength={80}
        onChangeText={value => update('ownerName', value)}
        placeholder="Nhập họ và tên"
        value={values.ownerName}
      />
      <AccountField
        autoCapitalize="none"
        autoComplete="email"
        error={errors.email}
        keyboardType="email-address"
        label="Email liên hệ"
        maxLength={150}
        onChangeText={value => update('email', value)}
        placeholder="you@example.com"
        value={values.email}
      />
      <AccountField
        error={errors.category}
        label="Danh mục sản phẩm"
        maxLength={80}
        onChangeText={value => update('category', value)}
        placeholder="Ví dụ: Sống khỏe"
        value={values.category}
      />
      <AccountField
        label="Giới thiệu cửa hàng (không bắt buộc)"
        maxLength={600}
        multiline
        onChangeText={value => update('description', value)}
        placeholder="Chia sẻ điểm nổi bật của sản phẩm"
        value={values.description}
      />
      <AccountAction label="Lưu bản nháp trên thiết bị" onPress={save} />
    </AccountDialog>
  );
}

export function HelpScreen({
  topInset,
  onBack,
  liveCatalog = false,
}: {
  topInset: number;
  onBack: () => void;
  liveCatalog?: boolean;
}) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const questions = [
    [
      'Tôi xem đơn hàng ở đâu?',
      liveCatalog
        ? 'Mở Đơn hàng của tôi và chạm Chi tiết để xem bản tóm tắt đã lưu trên thiết bị. Trạng thái đơn chưa được đồng bộ tự động từ cửa hàng.'
        : 'Mở Đơn hàng của tôi và chạm Chi tiết để xem sản phẩm, tổng tiền cùng thông tin giao hàng đã lưu khi thanh toán. Đơn hàng được lưu trên thiết bị; phiên bản này chưa đặt giao hàng hoặc theo dõi trực tiếp.',
    ],
    [
      'Thanh toán có tạo đơn hàng thật không?',
      liveCatalog
        ? 'Có. Sau khi đăng nhập, đơn COD được gửi đến cửa hàng. Khi không kết nối được dịch vụ, ứng dụng chuyển về danh mục mẫu và đơn mẫu chỉ lưu trên thiết bị.'
        : 'Không. Thanh toán chỉ lưu đơn hàng mẫu trên thiết bị. Ứng dụng không gửi đơn cho cửa hàng, không thu tiền hoặc sắp xếp vận chuyển nên chưa áp dụng đổi trả, hoàn tiền.',
    ],
    [
      'Ứng dụng hỗ trợ phương thức thanh toán nào?',
      liveCatalog
        ? 'Đơn hàng gửi đến cửa hàng hiện hỗ trợ thanh toán khi nhận hàng. Ứng dụng không thu thập số thẻ.'
        : 'Bạn có thể chọn thanh toán khi nhận hàng hoặc thẻ mẫu. Cả hai chỉ là lựa chọn mô phỏng; ứng dụng không thu thập số thẻ hoặc trừ tiền.',
    ],
    [
      'Tôi dùng mã ưu đãi như thế nào?',
      liveCatalog
        ? 'Mã SELLZY10 chỉ áp dụng cho danh mục mẫu trên thiết bị. Đơn hàng gửi đến cửa hàng hiện chưa hỗ trợ mã ưu đãi.'
        : 'Nhập SELLZY10 trong giỏ hàng rồi chạm Áp dụng để giảm 10% giá trị sản phẩm. Hãy xem lại khoản giảm giá trong tổng tiền trước khi tiếp tục thanh toán.',
    ],
    [
      'Giỏ hàng và danh sách yêu thích có được lưu không?',
      'Giỏ hàng, danh sách yêu thích, đơn hàng và hồ sơ được lưu riêng cho khách và từng email đăng nhập trên thiết bị này. Dữ liệu tài khoản xuất hiện khi đăng nhập lại bằng cùng email, nhưng chưa đồng bộ giữa các thiết bị. Xóa dữ liệu ứng dụng hoặc gỡ ứng dụng sẽ xóa các thông tin này.',
    ],
    [
      'Chức năng mua lại hoạt động thế nào?',
      'Chạm Mua lại trong Đơn hàng của tôi để thêm sản phẩm đã lưu vào giỏ hàng. Việc mua lại dùng giá và tồn kho hiện tại; ưu đãi của đơn cũ không tự động được áp dụng lại.',
    ],
    [
      'Làm sao để trở thành nhà bán hàng?',
      'Mở Các cửa hàng rồi chạm Trở thành nhà bán hàng để tạo bản nháp hồ sơ cửa hàng. Bản nháp chỉ được lưu trên thiết bị; đăng ký bán hàng và cửa hàng công khai chưa được kết nối.',
    ],
  ];
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle="Hướng dẫn nhanh khi mua sắm với Sellzy"
        title="Trợ giúp & hỗ trợ"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.helpHero}>
          <View style={styles.helpHeroIcon}>
            <Icon color={COLORS.tealDark} name="headset" size={25} />
          </View>
          <Text style={styles.helpHeroTitle}>Chúng tôi có thể giúp gì?</Text>
          <Text style={styles.helpHeroText}>
            Tìm câu trả lời về sản phẩm, thanh toán và thông tin đã lưu.
          </Text>
        </View>
        <Text style={styles.faqHeading}>Câu hỏi thường gặp</Text>
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
          <Text style={styles.contactTitle}>Về trải nghiệm này</Text>
          <Text style={styles.contactText}>
            Sellzy là ứng dụng mua sắm mẫu với danh mục và luồng thanh toán trên
            thiết bị.
          </Text>
          <Text style={styles.contactHours}>
            Phiên bản này chưa kết nối hỗ trợ khách hàng trực tiếp.
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
    fontSize: 12,
    lineHeight: 18,
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
  orderDate: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF4D2',
  },
  statusDelivered: { backgroundColor: '#E7F7EE' },
  statusText: { color: '#8B6A00', fontSize: 11, fontWeight: '900' },
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
  orderItems: { color: COLORS.muted, fontSize: 12 },
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
    fontSize: 12,
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
  profileEmail: { color: '#CAE1DF', fontSize: 12, marginTop: 4 },
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
    fontSize: 10,
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
  editText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
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
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  statDivider: { width: 1, height: 34, backgroundColor: COLORS.border },
  menuSection: {
    color: COLORS.muted,
    fontSize: 11,
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
  menuSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
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
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  verified: {
    color: COLORS.success,
    fontSize: 10,
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
  visitText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  vendorCallout: {
    padding: 21,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: '#FFF7DB',
  },
  vendorCalloutTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900' },
  vendorCalloutText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
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
  vendorButtonText: { color: '#554200', fontSize: 13, fontWeight: '900' },
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
    fontSize: 13,
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
    fontSize: 13,
    lineHeight: 19,
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
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
  contactHours: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
});
