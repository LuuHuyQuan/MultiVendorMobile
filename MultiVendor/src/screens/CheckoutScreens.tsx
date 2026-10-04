import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { EmptyState, ScreenHeader, sharedStyles } from '../components/SellzyUI';
import { CartPromotions } from '../components/CartPromotions';
import { products } from '../data/catalog';
import { baseProductId } from '../data/liveCatalog';
import {
  calculateTotals,
  FREE_SHIPPING_THRESHOLD,
  validateDelivery,
  validateDemoCard,
} from '../commerce';
import { Icon, IconName } from '../components/Icon';
import { COLORS, money } from '../theme';
import { walletApi } from '../walletApi';
import {
  CartQuantities,
  CustomerDetails,
  DemoCardDetails,
  Product,
} from '../types';

type DisplayTotals = Pick<
  ReturnType<typeof calculateTotals>,
  'subtotal' | 'discount' | 'shipping' | 'total'
> & { tax?: number };

type CartProps = {
  topInset: number;
  cart: CartQuantities;
  couponCode: string;
  catalogProducts?: Product[];
  liveCatalog?: boolean;
  totalsOverride?: DisplayTotals;
  onApplyCoupon: (code: string) => Promise<boolean>;
  onBack: () => void;
  onHome: () => void;
  onShop: () => void;
  onSellers: () => void;
  onHelp: () => void;
  onCheckout: () => void;
  onOpenProduct: (id: string) => void;
  onAddProduct: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  wishlistIds: string[];
  onToggleWishlist: (id: string) => void;
};

const cartProducts = (cart: CartQuantities, catalogProducts: Product[]) =>
  catalogProducts.filter(product => (cart[product.id] ?? 0) > 0);

const unitPrice = (product: Product, quantity: number) =>
  product.priceTiers
    ?.filter(tier => tier.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0]?.price ?? product.price;

const screenTotals = (
  cart: CartQuantities,
  couponCode: string,
  catalogProducts: Product[],
  liveCatalog: boolean,
  override?: DisplayTotals,
): DisplayTotals => {
  if (override) return override;
  if (!liveCatalog) return calculateTotals(cart, couponCode);
  const subtotal = cartProducts(cart, catalogProducts).reduce(
    (sum, product) =>
      sum + unitPrice(product, cart[product.id]) * cart[product.id],
    0,
  );
  return { subtotal, discount: 0, shipping: 0, total: subtotal };
};

export function CartScreen({
  topInset,
  cart,
  couponCode,
  catalogProducts = products,
  liveCatalog = false,
  totalsOverride,
  onApplyCoupon,
  onBack,
  onHome,
  onShop,
  onSellers,
  onHelp,
  onCheckout,
  onOpenProduct,
  onAddProduct,
  onSetQuantity,
  onRemove,
  onClear,
  wishlistIds,
  onToggleWishlist,
}: CartProps) {
  const { width } = useWindowDimensions();
  const wide = width >= 1200;
  const [coupon, setCoupon] = useState(couponCode);
  const [couponError, setCouponError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const couponApplied = !!couponCode;
  const lines = cartProducts(cart, catalogProducts);
  const { subtotal, discount, shipping, tax = 0, total } = screenTotals(
    cart,
    couponCode,
    catalogProducts,
    liveCatalog,
    totalsOverride,
  );
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      {wide ? (
        <View style={styles.cartDesktopNav}>
          <View style={styles.cartDesktopNavInner}>
            <Pressable accessibilityRole="button" onPress={onShop} style={styles.cartExploreButton}>
              <Icon name="shop" size={19} color={COLORS.white} />
              <Text style={styles.cartExploreText}>Explore All Categories</Text>
              <Icon name="chevron-right" size={17} color={COLORS.white} />
            </Pressable>
            <View style={styles.cartNavLinks}>
              <Pressable accessibilityRole="button" onPress={onHome} style={styles.cartNavLink}>
                <Text style={styles.cartNavText}>Home</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onShop} style={styles.cartNavLink}>
                <Text style={[styles.cartNavText, styles.cartNavActive]}>Shop</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onSellers} style={styles.cartNavLink}>
                <Text style={styles.cartNavText}>Sellers</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onHelp} style={styles.cartNavLink}>
                <Text style={styles.cartNavText}>Contact</Text>
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" onPress={onHelp} style={styles.cartNavSupport}>
              <Icon name="headset" size={23} color={COLORS.ink} />
              <View>
                <Text style={styles.cartNavSupportCaption}>Need help?</Text>
                <Text style={styles.cartNavSupportLabel}>Support</Text>
              </View>
            </Pressable>
          </View>
        </View>
      ) : null}
      {!wide ? (
        <ScreenHeader
          canGoBack
          onBack={onBack}
          subtitle={lines.length + ' sản phẩm khác nhau'}
          title="Giỏ hàng"
        />
      ) : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.cartContent, wide && styles.cartContentWide]}
        showsVerticalScrollIndicator={false}
      >
        {wide ? (
          <View style={styles.cartBreadcrumb}>
            <Pressable accessibilityRole="button" onPress={onHome} style={styles.cartBreadcrumbLink}>
              <Icon name="home" size={19} color={COLORS.ink} />
              <Text style={styles.cartBreadcrumbText}>Home</Text>
            </Pressable>
            <Text style={styles.cartBreadcrumbDot}>•</Text>
            <Text style={styles.cartBreadcrumbCurrent}>Cart</Text>
          </View>
        ) : null}
        {!liveCatalog ? (
          <View style={styles.demoNotice}>
            <Icon name="info" color="#77601A" size={18} />
            <Text style={styles.demoNoticeText}>Đang hiển thị sản phẩm mẫu. Cần kết nối cửa hàng để đặt hàng trực tuyến.</Text>
          </View>
        ) : null}
        {wide || lines.length ? (
          <View style={[styles.cartHeadingRow, !wide && styles.cartHeadingRowMobile]}>
            {wide ? (
              <Text style={styles.cartHeadingTitle}>Cart <Text style={styles.cartHeadingCount}>({lines.length} {lines.length === 1 ? 'item' : 'items'})</Text></Text>
            ) : (
              <Text style={styles.cartHeadingTitle}>Sản phẩm trong giỏ</Text>
            )}
            {lines.length ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Xóa tất cả sản phẩm khỏi giỏ hàng"
                onPress={onClear}
                style={styles.cartClearButton}
              >
                <Icon name="close" size={18} color={COLORS.red} />
                <Text style={styles.cartClearText}>{wide ? 'Remove All' : 'Xóa tất cả'}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {!lines.length ? (
          <EmptyState
            actionLabel="Mua sắm ngay"
            icon="▱"
            message="Giỏ hàng đang chờ sản phẩm phù hợp. Khám phá ưu đãi sức khỏe hôm nay nhé."
            onAction={onShop}
            title="Giỏ hàng đang trống"
          />
        ) : (
          <View style={[styles.cartColumns, wide && styles.cartColumnsWide]}>
            <View style={[styles.cartTable, wide && styles.cartTableWide]}>
              {wide ? (
                <View style={styles.cartTableHeader}>
                  <Text style={[styles.cartTableHeaderLabel, styles.cartProductCell]}>Product</Text>
                  <Text style={[styles.cartTableHeaderLabel, styles.cartPriceCell]}>Price</Text>
                  <Text style={[styles.cartTableHeaderLabel, styles.cartQuantityCell]}>Quantity</Text>
                  <Text style={[styles.cartTableHeaderLabel, styles.cartTotalCell]}>Total Price</Text>
                  <Text style={[styles.cartTableHeaderLabel, styles.cartActionCell]}>Action</Text>
                </View>
              ) : null}
              {lines.map(product => (
                <CartLine
                  key={product.id}
                  wide={wide}
                  liked={wishlistIds.includes(baseProductId(product.id))}
                  onToggleWishlist={() => onToggleWishlist(baseProductId(product.id))}
                  onOpen={() => onOpenProduct(product.id)}
                  onRemove={() => onRemove(product.id)}
                  onSetQuantity={quantity => onSetQuantity(product.id, quantity)}
                  product={product}
                  quantity={cart[product.id]}
                />
              ))}
            </View>

            <View style={[styles.cartAside, wide && styles.cartAsideWide]}>
              {!liveCatalog ? (
                <View style={styles.shippingNotice}>
                  <Icon color={COLORS.teal} name="truck" size={21} />
                  <Text style={styles.shippingNoticeText}>
                    {remainingForFreeShipping > 0 ? (
                      <>
                        {wide ? 'Spend ' : 'Mua thêm '}
                        <Text style={styles.shippingNoticeStrong}>{money(remainingForFreeShipping)}</Text>
                        {wide ? ' for Free Shipping' : ' để được miễn phí vận chuyển.'}
                      </>
                    ) : (
                      <Text style={styles.shippingNoticeStrong}>
                        {wide ? 'Your order qualifies for Free Shipping' : 'Đơn hàng đã đủ điều kiện miễn phí vận chuyển.'}
                      </Text>
                    )}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.summaryCard, styles.cartSummaryCard]}>
                <Text style={[styles.summaryTitle, styles.cartSummaryTitle]}>
                  {wide ? 'Order Summary' : 'Tóm tắt đơn hàng'}
                </Text>
                  <>
                    <View style={styles.couponRow}>
                      <TextInput
                        accessibilityLabel="Mã ưu đãi"
                        autoCapitalize="characters"
                        onChangeText={value => {
                          setCoupon(value);
                          setCouponError('');
                        }}
                        placeholder={wide ? 'Coupon Code' : liveCatalog ? 'Nhập mã giảm giá' : 'Nhập SELLZY10'}
                        placeholderTextColor="#98A1A6"
                        style={styles.couponInput}
                        value={coupon}
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Áp dụng mã ưu đãi"
                        onPress={() => {
                          onApplyCoupon(coupon).then(
                            valid => setCouponError(valid ? '' : 'Mã ưu đãi không hợp lệ.'),
                            error => setCouponError(error instanceof Error ? error.message : 'Không thể áp dụng mã ưu đãi.'),
                          );
                        }}
                        style={styles.couponButton}
                      >
                        <Text style={styles.couponButtonText}>{wide ? 'Apply' : 'Áp dụng'}</Text>
                      </Pressable>
                    </View>
                    {couponError ? (
                      <Text style={[styles.couponMessage, styles.couponError]}>
                        {couponError}
                      </Text>
                    ) : null}
                    {couponApplied ? (
                      <View style={styles.cartCouponApplied}>
                        <Text style={[styles.couponMessage, styles.couponSuccess]}>
                          Đã áp dụng {couponCode} · tiết kiệm {money(discount)}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Xóa mã ưu đãi"
                          onPress={() => {
                            onApplyCoupon('').then(() => {
                              setCoupon('');
                              setCouponError('');
                            }).catch(error => {
                              setCouponError(error instanceof Error ? error.message : 'Không thể xóa mã ưu đãi.');
                            });
                          }}
                        >
                          <Text style={styles.removeCoupon}>Xóa</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </>
                <SummaryRow label={wide ? 'Sub-Total' : 'Tạm tính'} value={money(subtotal)} />
                {discount > 0 ? (
                  <SummaryRow label={wide ? 'Discount' : 'Giảm giá'} positive value={'−' + money(discount)} />
                ) : null}
                {!liveCatalog ? (
                  <SummaryRow
                    label={wide ? 'Shipping' : 'Vận chuyển'}
                    positive={shipping === 0}
                    value={shipping === 0 ? (wide ? 'Free' : 'MIỄN PHÍ') : money(shipping)}
                  />
                ) : totalsOverride && shipping > 0 ? (
                  <SummaryRow label={wide ? 'Shipping' : 'Vận chuyển'} value={money(shipping)} />
                ) : null}
                {tax > 0 ? <SummaryRow label={wide ? 'Tax' : 'Thuế'} value={money(tax)} /> : null}
                {liveCatalog && !totalsOverride ? (
                  <Text style={styles.cartEstimateNote}>
                    Phí giao hàng và thuế sẽ được xác nhận khi thanh toán.
                  </Text>
                ) : null}
                <View style={styles.summaryDivider} />
                <SummaryRow
                  bold
                  label={liveCatalog && !totalsOverride ? (wide ? 'Estimated subtotal' : 'Tạm tính') : (wide ? 'Total' : 'Tổng cộng')}
                  value={money(total)}
                />
              </View>
              {wide ? (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: confirmed }}
                  onPress={() => setConfirmed(value => !value)}
                  style={styles.cartTermsRow}
                >
                  <View style={[styles.cartCheckbox, confirmed && styles.cartCheckboxChecked]}>
                    {confirmed ? <Icon name="check" size={14} color={COLORS.white} /> : null}
                  </View>
                  <Text style={styles.cartTermsText}>I have checked my cart and agree to continue to checkout</Text>
                </Pressable>
              ) : null}
              {wide ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !confirmed }}
                  disabled={!confirmed}
                  onPress={onCheckout}
                  style={[styles.cartAsideCheckout, !confirmed && styles.cartAsideCheckoutDisabled]}
                >
                  <Text style={styles.cartAsideCheckoutText}>{liveCatalog ? 'Proceed to checkout' : 'Connect to checkout'}</Text>
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={onShop} style={styles.cartContinueButton}>
                <Text style={styles.cartContinueText}>{wide ? 'Continue Shopping' : 'Tiếp tục mua sắm'}</Text>
                <Icon name="arrow-right" size={18} color={COLORS.ink} />
              </Pressable>
            </View>
          </View>
        )}
        {lines.length ? (
          <View style={[styles.cartPromotionsWrap, wide && styles.cartPromotionsWrapWide]}>
            <CartPromotions
              products={catalogProducts.filter(product => product.id === baseProductId(product.id))}
              liveCatalog={liveCatalog}
              wishlistIds={wishlistIds}
              onOpenProduct={onOpenProduct}
              onAdd={onAddProduct}
              onToggleLike={onToggleWishlist}
            />
          </View>
        ) : null}
      </ScrollView>
      {!wide && lines.length ? (
        <View style={styles.stickyFooter}>
          <View>
            <Text style={styles.footerLabel}>{liveCatalog ? 'Tạm tính' : 'Tổng cộng'}</Text>
            <Text style={styles.footerTotal}>{money(total)}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onCheckout} style={styles.checkoutButton}>
            <Text style={styles.checkoutButtonText}>{liveCatalog ? 'Thanh toán →' : 'Kết nối để đặt hàng'}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CartLine({
  product,
  quantity,
  wide,
  liked,
  onToggleWishlist,
  onOpen,
  onRemove,
  onSetQuantity,
}: {
  product: Product;
  quantity: number;
  wide: boolean;
  liked: boolean;
  onToggleWishlist?: () => void;
  onOpen: () => void;
  onRemove: () => void;
  onSetQuantity: (quantity: number) => void;
}) {
  const price = unitPrice(product, quantity);
  const oldPrice = product.oldPrice > price ? product.oldPrice : undefined;
  const chosenVariant = product.variants?.find(variant => variant.id === product.variantId);
  const variantName = chosenVariant?.name;
  const filledStars = Math.max(0, Math.min(5, Math.round(product.rating)));
  const quantityControl = (
    <View style={styles.miniQuantity}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Giảm số lượng ' + product.name}
        disabled={quantity <= 1}
        onPress={() => onSetQuantity(Math.max(1, quantity - 1))}
        style={styles.miniQuantityButton}
      >
        <Icon name="minus" size={16} color={quantity <= 1 ? COLORS.muted : COLORS.ink} />
      </Pressable>
      <Text style={styles.miniQuantityValue}>{quantity}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Tăng số lượng ' + product.name}
        disabled={quantity >= product.stock}
        onPress={() => onSetQuantity(Math.min(product.stock, quantity + 1))}
        style={styles.miniQuantityButton}
      >
        <Icon name="plus" size={16} color={quantity >= product.stock ? COLORS.muted : COLORS.ink} />
      </Pressable>
    </View>
  );
  const actions = (
    <View style={styles.cartRowActions}>
      {onToggleWishlist ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={(liked ? 'Bỏ yêu thích ' : 'Yêu thích ') + product.name}
          onPress={onToggleWishlist}
          style={styles.cartIconButton}
        >
          <Icon name="heart" size={22} color={liked ? COLORS.red : COLORS.ink} filled={liked} />
        </Pressable>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={'Xóa ' + product.name + ' khỏi giỏ hàng'}
        onPress={onRemove}
        style={styles.cartIconButton}
      >
        <Icon name="trash" size={21} color={COLORS.ink} />
      </Pressable>
    </View>
  );
  return (
    <View style={[styles.cartLine, wide && styles.cartLineWide]}>
      <View style={[styles.cartLineProduct, wide && styles.cartProductCell]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Xem ' + product.name}
          onPress={onOpen}
          style={[styles.cartImageWrap, wide && styles.cartImageWrapWide]}
        >
          <Image source={product.image} resizeMode="contain" style={styles.cartImage} />
        </Pressable>
        <View style={[styles.cartLineBody, wide && styles.cartLineBodyWide]}>
          <Pressable accessibilityRole="button" onPress={onOpen}>
            <Text numberOfLines={2} style={styles.cartName}>{product.name}</Text>
          </Pressable>
          {variantName ? (
            <Pressable accessibilityRole="button" onPress={onOpen} style={styles.cartVariantRow}>
              <Text numberOfLines={1} style={styles.cartVariantText}>{variantName}</Text>
              <Icon name="edit" size={15} color={COLORS.ink} />
            </Pressable>
          ) : (
            <Text numberOfLines={1} style={styles.cartStore}>{product.store}</Text>
          )}
          <Text style={styles.cartStock}>Available: {Math.max(0, product.stock)}</Text>
          {product.rating > 0 ? (
            <Text style={styles.cartRating}>
              <Text style={styles.cartRatingFilled}>{'★'.repeat(filledStars)}</Text>
              <Text style={styles.cartRatingEmpty}>{'★'.repeat(5 - filledStars)}</Text>
              <Text style={styles.cartRatingCount}> ({product.reviews})</Text>
            </Text>
          ) : null}
          {!wide ? (
            <View style={styles.cartMobilePriceRow}>
              <Text style={styles.cartPrice}>{money(price)}</Text>
              {oldPrice ? <Text style={styles.cartOldPrice}>{money(oldPrice)}</Text> : null}
            </View>
          ) : null}
        </View>
      </View>
      {wide ? (
        <>
          <View style={styles.cartPriceCell}>
            <Text style={styles.cartPrice}>{money(price)}</Text>
            {oldPrice ? <Text style={styles.cartOldPrice}>{money(oldPrice)}</Text> : null}
          </View>
          <View style={styles.cartQuantityCell}>{quantityControl}</View>
          <View style={styles.cartTotalCell}>
            <Text style={styles.cartLineTotal}>{money(price * quantity)}</Text>
          </View>
          <View style={styles.cartActionCell}>{actions}</View>
        </>
      ) : (
        <View style={styles.cartLineActions}>
          {quantityControl}
          <Text style={styles.cartLineTotal}>{money(price * quantity)}</Text>
          {actions}
        </View>
      )}
    </View>
  );
}

function SummaryRow({
  label,
  value,
  positive,
  bold,
}: {
  label: string;
  value: string;
  positive?: boolean;
  bold?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, bold && styles.summaryBold]}>
        {label}
      </Text>
      <Text
        style={[
          styles.summaryValue,
          positive && styles.summaryPositive,
          bold && styles.summaryTotal,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

type CheckoutProps = {
  topInset: number;
  cart: CartQuantities;
  couponCode: string;
  catalogProducts?: Product[];
  liveCatalog?: boolean;
  totalsOverride?: DisplayTotals;
  initialDetails: CustomerDetails;
  onBack: () => void;
  onPlaceOrder: (details: CustomerDetails) => Promise<void>;
};

export function CheckoutScreen({
  topInset,
  cart,
  couponCode,
  catalogProducts = products,
  liveCatalog = false,
  totalsOverride,
  initialDetails,
  onBack,
  onPlaceOrder,
}: CheckoutProps) {
  const [details, setDetails] = useState<CustomerDetails>(() => ({
    ...initialDetails,
    payment: liveCatalog ? 'cash' : initialDetails.payment,
  }));
  const [card, setCard] = useState<DemoCardDetails>({
    cardholder: '',
    number: '',
    expiry: '',
    cvv: '',
  });
  const [step, setStep] = useState(0);
  const [deliveryAttempted, setDeliveryAttempted] = useState(false);
  const [paymentAttempted, setPaymentAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletError, setWalletError] = useState('');
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lines = cartProducts(cart, catalogProducts);
  const { subtotal, discount, shipping, tax = 0, total } = screenTotals(
    cart,
    couponCode,
    catalogProducts,
    liveCatalog,
    totalsOverride,
  );
  const deliveryErrors = validateDelivery(details);
  const districtError =
    liveCatalog && (details.district ?? '').trim().length < 2
      ? 'Vui lòng nhập quận/huyện.'
      : undefined;
  const cardErrors = validateDemoCard(card);
  const deliveryValid =
    !districtError && Object.keys(deliveryErrors).length === 0;
  const paymentValid =
    details.payment === 'cash' ||
    (liveCatalog && details.payment === 'wallet' && walletBalance !== null && walletBalance >= Math.round(total * 1000)) ||
    (!liveCatalog && Object.keys(cardErrors).length === 0);

  useEffect(() => {
    if (!liveCatalog) return;
    let active = true;
    walletApi.getWallet().then(wallet => {
      if (!active) return;
      if (wallet.statusName === 'active') setWalletBalance(wallet.availableBalance);
      else setWalletError('Ví chưa hoạt động. Vui lòng chọn thanh toán khi nhận hàng.');
    }).catch(error => {
      if (active) setWalletError(error instanceof Error ? error.message : 'Không thể tải số dư ví.');
    });
    return () => { active = false; };
  }, [liveCatalog]);

  const update = (key: keyof CustomerDetails, value: string) =>
    setDetails(current => ({ ...current, [key]: value }));
  const updateCard = (key: keyof DemoCardDetails, value: string) =>
    setCard(current => ({ ...current, [key]: value }));
  const changeStep = (next: number) => {
    setStep(next);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };
  useEffect(() => {
    if (step === 0) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setStep(current => Math.max(0, current - 1));
        scrollRef.current?.scrollTo({ y: 0, animated: true });
        return true;
      },
    );
    return () => subscription.remove();
  }, [step]);
  const handleBack = () => {
    if (step > 0) changeStep(step - 1);
    else onBack();
  };
  const stepLabels = ['Giao hàng', 'Thanh toán', 'Xác nhận'];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[sharedStyles.screen, { paddingTop: topInset }]}
    >
      <ScreenHeader
        canGoBack
        onBack={handleBack}
        subtitle={`Bước ${step + 1}/3 · ${stepLabels[step]}`}
        title="Thanh toán"
      />
      {!lines.length ? (
        <EmptyState
          actionLabel="Quay lại giỏ hàng"
          icon="▱"
          message="Giỏ hàng của bạn không còn sản phẩm để đặt."
          onAction={onBack}
          title="Chưa có sản phẩm"
        />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.checkoutContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.steps}>
            {stepLabels.map((label, index) => (
              <View key={label} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    index <= step && styles.stepCircleActive,
                  ]}
                >
                  {index < step ? (
                    <Icon name="check" size={16} color={COLORS.white} />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        index <= step && styles.stepNumberActive,
                      ]}
                    >
                      {index + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    index <= step && styles.stepLabelActive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>

          {step === 0 ? (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Thông tin giao hàng</Text>
                <CheckoutField
                  error={
                    deliveryAttempted ? deliveryErrors.fullName : undefined
                  }
                  testID="checkout-name"
                  label="Họ và tên"
                  onChangeText={value => update('fullName', value)}
                  placeholder="Nhập họ và tên"
                  value={details.fullName}
                />
                <CheckoutField
                  error={deliveryAttempted ? deliveryErrors.phone : undefined}
                  testID="checkout-phone"
                  keyboardType="phone-pad"
                  label="Số điện thoại"
                  onChangeText={value => update('phone', value)}
                  placeholder="Nhập số điện thoại"
                  value={details.phone}
                />
                <CheckoutField
                  error={deliveryAttempted ? deliveryErrors.address : undefined}
                  testID="checkout-address"
                  label="Địa chỉ nhận hàng"
                  onChangeText={value => update('address', value)}
                  placeholder="Số nhà, tên đường"
                  value={details.address}
                />
                {liveCatalog ? (
                  <CheckoutField
                    error={deliveryAttempted ? districtError : undefined}
                    testID="checkout-district"
                    label="Quận / Huyện"
                    onChangeText={value => update('district', value)}
                    placeholder="Nhập quận hoặc huyện"
                    value={details.district ?? ''}
                  />
                ) : null}
                <CheckoutField
                  error={deliveryAttempted ? deliveryErrors.city : undefined}
                  testID="checkout-city"
                  label="Tỉnh / Thành phố"
                  onChangeText={value => update('city', value)}
                  placeholder="Nhập tỉnh hoặc thành phố"
                  value={details.city}
                />
                {deliveryAttempted && !deliveryValid ? (
                  <Text style={styles.formError}>
                    Vui lòng điền đầy đủ và chính xác thông tin giao hàng.
                  </Text>
                ) : null}
              </View>
              <CheckoutSummary
                cart={cart}
                couponCode={couponCode}
                discount={discount}
                tax={tax}
                lines={lines}
                shipping={shipping}
                subtotal={subtotal}
                total={total}
              />
              <Pressable
                accessibilityRole="button"
                testID="checkout-continue-payment"
                onPress={() => {
                  setDeliveryAttempted(true);
                  if (deliveryValid) changeStep(1);
                  else scrollRef.current?.scrollTo({ y: 0, animated: true });
                }}
                style={({ pressed }) => [
                  sharedStyles.primaryButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={sharedStyles.primaryButtonText}>
                  Tiếp tục thanh toán
                </Text>
              </Pressable>
            </>
          ) : null}

          {step === 1 ? (
            <>
              <View style={styles.formCard}>
                <Text style={styles.formTitle}>Phương thức thanh toán</Text>
                <PaymentOption
                  active={details.payment === 'cash'}
                  icon="truck"
                  label="Thanh toán khi nhận hàng"
                  onPress={() => update('payment', 'cash')}
                  subtitle={
                    liveCatalog
                      ? 'Thanh toán khi đơn hàng được giao'
                      : 'Đơn được lưu ngay, thanh toán khi nhận hàng'
                  }
                />
                {liveCatalog ? (
                  <PaymentOption
                    active={details.payment === 'wallet'}
                    icon="wallet"
                    label="Thanh toán bằng ví Sellzy"
                    onPress={() => update('payment', 'wallet')}
                    subtitle={walletBalance !== null
                      ? `Số dư: ${money(walletBalance / 1000)}`
                      : walletError || 'Đang kiểm tra số dư ví'}
                  />
                ) : null}
                {!liveCatalog ? (
                  <PaymentOption
                    active={details.payment === 'card'}
                    icon="credit-card"
                    label="Thẻ tín dụng hoặc ghi nợ"
                    onPress={() => update('payment', 'card')}
                    subtitle="Biểu mẫu thẻ mẫu — không phát sinh thanh toán"
                  />
                ) : null}
                {!liveCatalog && details.payment === 'card' ? (
                  <>
                    <View style={styles.demoNotice}>
                      <Icon name="shield" color="#77601A" size={18} />
                      <Text style={styles.demoNoticeText}>
                        Đây là bản mẫu. Dùng số 4242 4242 4242 4242. Thông tin
                        thẻ không bao giờ được lưu hoặc gửi đi.
                      </Text>
                    </View>
                    <CheckoutField
                      autoCapitalize="words"
                      autoComplete="off"
                      error={
                        paymentAttempted ? cardErrors.cardholder : undefined
                      }
                      testID="card-holder"
                      label="Tên in trên thẻ"
                      onChangeText={value => updateCard('cardholder', value)}
                      placeholder="Tên chủ thẻ mẫu"
                      value={card.cardholder}
                    />
                    <CheckoutField
                      autoComplete="off"
                      error={paymentAttempted ? cardErrors.number : undefined}
                      testID="card-number"
                      keyboardType="number-pad"
                      label="Số thẻ"
                      maxLength={19}
                      onChangeText={value => {
                        const digits = value.replace(/\D/g, '').slice(0, 16);
                        updateCard(
                          'number',
                          digits.replace(/(\d{4})(?=\d)/g, '$1 '),
                        );
                      }}
                      placeholder="4242 4242 4242 4242"
                      value={card.number}
                    />
                    <View style={styles.cardRow}>
                      <View style={styles.cardHalf}>
                        <CheckoutField
                          autoComplete="off"
                          error={
                            paymentAttempted ? cardErrors.expiry : undefined
                          }
                          testID="card-expiry"
                          keyboardType="number-pad"
                          label="Ngày hết hạn"
                          maxLength={5}
                          onChangeText={value => {
                            const digits = value.replace(/\D/g, '').slice(0, 4);
                            updateCard(
                              'expiry',
                              digits.length > 2
                                ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                                : digits,
                            );
                          }}
                          placeholder="MM/YY"
                          value={card.expiry}
                        />
                      </View>
                      <View style={styles.cardHalf}>
                        <CheckoutField
                          autoComplete="off"
                          error={paymentAttempted ? cardErrors.cvv : undefined}
                          testID="card-cvv"
                          keyboardType="number-pad"
                          label="CVV"
                          maxLength={4}
                          onChangeText={value =>
                            updateCard(
                              'cvv',
                              value.replace(/\D/g, '').slice(0, 4),
                            )
                          }
                          placeholder="123"
                          secureTextEntry
                          value={card.cvv}
                        />
                      </View>
                    </View>
                  </>
                ) : !liveCatalog ? (
                  <View style={styles.demoNotice}>
                    <Icon name="info" color="#77601A" size={18} />
                    <Text style={styles.demoNoticeText}>
                      Lựa chọn thanh toán khi nhận hàng chỉ được lưu cho bản
                      mẫu. Không có người bán hoặc đơn vị vận chuyển nào nhận
                      đơn này.
                    </Text>
                  </View>
                ) : null}
                {paymentAttempted && !paymentValid ? (
                  <Text style={styles.formError}>
                    {details.payment === 'wallet'
                      ? walletError || 'Số dư ví không đủ để thanh toán đơn hàng.'
                      : 'Vui lòng kiểm tra các trường thẻ mẫu đang được đánh dấu.'}
                  </Text>
                ) : null}
              </View>
              <View style={styles.checkoutActions}>
                <Pressable
                  accessibilityRole="button"
                  testID="checkout-back-delivery"
                  onPress={() => changeStep(0)}
                  style={[
                    sharedStyles.secondaryButton,
                    styles.checkoutActionButton,
                  ]}
                >
                  <Text style={sharedStyles.secondaryButtonText}>Quay lại</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  testID="checkout-review-order"
                  onPress={() => {
                    setPaymentAttempted(true);
                    if (paymentValid) changeStep(2);
                  }}
                  style={[
                    sharedStyles.primaryButton,
                    styles.checkoutActionButton,
                  ]}
                >
                  <Text style={sharedStyles.primaryButtonText}>
                    Xem lại đơn hàng
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>Giao hàng</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sửa thông tin giao hàng"
                    onPress={() => changeStep(0)}
                    style={styles.editLink}
                  >
                    <Text style={styles.editLinkText}>Sửa</Text>
                  </Pressable>
                </View>
                <Text style={styles.reviewStrong}>{details.fullName}</Text>
                <Text style={styles.reviewText}>{details.phone}</Text>
                <Text style={styles.reviewText}>
                  {[
                    details.address,
                    liveCatalog ? details.district : '',
                    details.city,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </Text>
              </View>
              <View style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewTitle}>Thanh toán</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Sửa phương thức thanh toán"
                    onPress={() => changeStep(1)}
                    style={styles.editLink}
                  >
                    <Text style={styles.editLinkText}>Sửa</Text>
                  </Pressable>
                </View>
                <Text style={styles.reviewStrong}>
                  {details.payment === 'cash'
                    ? 'Thanh toán khi nhận hàng'
                    : details.payment === 'wallet'
                    ? 'Thanh toán bằng ví Sellzy'
                    : `Thẻ mẫu kết thúc bằng ${card.number
                        .replace(/\D/g, '')
                        .slice(-4)}`}
                </Text>
                {!liveCatalog ? (
                  <Text style={styles.reviewText}>
                    Bản mẫu trên thiết bị không thực hiện bất kỳ khoản thanh
                    toán nào.
                  </Text>
                ) : null}
              </View>
              <CheckoutSummary
                cart={cart}
                couponCode={couponCode}
                discount={discount}
                tax={tax}
                lines={lines}
                shipping={shipping}
                subtotal={subtotal}
                total={total}
              />
              <View style={styles.checkoutActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => changeStep(1)}
                  style={[
                    sharedStyles.secondaryButton,
                    styles.checkoutActionButton,
                  ]}
                >
                  <Text style={sharedStyles.secondaryButtonText}>Quay lại</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  testID="place-order"
                  disabled={submitting || !lines.length}
                  accessibilityState={{
                    disabled: submitting || !lines.length,
                    busy: submitting,
                  }}
                  onPress={async () => {
                    setSubmitting(true);
                    setSubmitError('');
                    try {
                      await onPlaceOrder(details);
                    } catch (error) {
                      setSubmitError(
                        error instanceof Error && error.message
                          ? error.message
                          : 'Chưa thể đặt hàng. Vui lòng thử lại.',
                      );
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  style={({ pressed }) => [
                    sharedStyles.primaryButton,
                    styles.checkoutActionButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={sharedStyles.primaryButtonText}>
                    {submitting
                      ? 'Đang đặt hàng…'
                      : liveCatalog
                      ? 'Đặt hàng'
                      : 'Đặt đơn mẫu'}
                  </Text>
                </Pressable>
              </View>
              {submitError ? (
                <Text accessibilityLiveRegion="polite" style={styles.formError}>
                  {submitError}
                </Text>
              ) : null}
              <Text style={styles.secureText}>
                {liveCatalog
                  ? 'Đơn hàng sẽ được gửi đến cửa hàng để xử lý.'
                  : 'Khi đặt đơn mẫu, bạn chỉ lưu tóm tắt đơn hàng trên thiết bị. Không có thanh toán hoặc vận chuyển nào được khởi tạo.'}
              </Text>
            </>
          ) : null}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function CheckoutSummary({
  cart,
  couponCode,
  discount,
  tax,
  lines,
  shipping,
  subtotal,
  total,
}: {
  cart: CartQuantities;
  couponCode: string;
  discount: number;
  tax: number;
  lines: Product[];
  shipping: number;
  subtotal: number;
  total: number;
}) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Đơn hàng của bạn</Text>
      {lines.map(product => (
        <View key={product.id} style={styles.checkoutLine}>
          <Text numberOfLines={1} style={styles.checkoutLineName}>
            {cart[product.id]} × {product.name}
          </Text>
          <Text style={styles.checkoutLinePrice}>
            {money(unitPrice(product, cart[product.id]) * cart[product.id])}
          </Text>
        </View>
      ))}
      <View style={styles.summaryDivider} />
      <SummaryRow label="Tạm tính" value={money(subtotal)} />
      {discount > 0 ? (
        <SummaryRow
          label={couponCode ? `Giảm giá (${couponCode})` : 'Giảm giá'}
          positive
          value={`−${money(discount)}`}
        />
      ) : null}
      <SummaryRow
        label="Vận chuyển"
        positive={shipping === 0}
        value={shipping === 0 ? 'MIỄN PHÍ' : money(shipping)}
      />
      {tax > 0 ? <SummaryRow label="Thuế" value={money(tax)} /> : null}
      <SummaryRow bold label="Tổng đơn hàng" value={money(total)} />
    </View>
  );
}

function CheckoutField({
  label,
  error,
  maxLength = 200,
  ...props
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  error?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={sharedStyles.label}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        maxLength={maxLength}
        placeholderTextColor="#98A1A6"
        style={[sharedStyles.input, !!error && styles.inputError]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.formError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function PaymentOption({
  active,
  icon,
  label,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: IconName;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: active }}
      onPress={onPress}
      style={[styles.paymentOption, active && styles.paymentOptionActive]}
    >
      <View style={styles.paymentIcon}>
        <Icon name={icon} color={COLORS.teal} />
      </View>
      <View style={styles.paymentCopy}>
        <Text style={styles.paymentLabel}>{label}</Text>
        <Text style={styles.paymentSubtitle}>{subtitle}</Text>
      </View>
      <View style={[styles.radio, active && styles.radioActive]}>
        {active ? <View style={styles.radioDot} /> : null}
      </View>
    </Pressable>
  );
}

export function OrderSuccessScreen({
  topInset,
  orderId,
  onOrders,
  onHome,
  liveCatalog = false,
}: {
  topInset: number;
  orderId: string;
  onOrders: () => void;
  onHome: () => void;
  liveCatalog?: boolean;
}) {
  return (
    <View
      style={[
        sharedStyles.screen,
        styles.successScreen,
        { paddingTop: topInset },
      ]}
    >
      <View style={styles.successIconWrap}>
        <Icon name="check" color={COLORS.teal} size={55} />
      </View>
      <Text style={styles.successTitle}>
        {liveCatalog ? 'Đặt hàng thành công!' : 'Đã lưu đơn hàng!'}
      </Text>
      <Text style={styles.successMessage}>
        {liveCatalog
          ? 'Đơn hàng đã được gửi đến cửa hàng. Bản tóm tắt được lưu trên thiết bị này; trạng thái giao hàng chưa được đồng bộ.'
          : 'Đơn hàng mẫu đã sẵn sàng để xem lại trong mục Đơn hàng của tôi.'}
      </Text>
      <View style={styles.orderIdCard}>
        <Text style={styles.orderIdLabel}>MÃ ĐƠN HÀNG</Text>
        <Text style={styles.orderId}>{orderId}</Text>
        {!liveCatalog ? (
          <Text style={styles.orderEta}>
            Đã lưu trên thiết bị · Không thanh toán hoặc vận chuyển
          </Text>
        ) : null}
      </View>
      <Pressable
        accessibilityRole="button"
        testID="view-orders"
        onPress={onOrders}
        style={[sharedStyles.primaryButton, styles.successButton]}
      >
        <Text style={sharedStyles.primaryButtonText}>Xem đơn hàng của tôi</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onHome}
        style={[sharedStyles.secondaryButton, styles.successButton]}
      >
        <Text style={sharedStyles.secondaryButtonText}>Tiếp tục mua sắm</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  cartDesktopNav: {
    width: '100%',
    minHeight: 76,
    borderBottomWidth: 1,
    borderBottomColor: '#DDE4EA',
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  cartDesktopNavInner: {
    width: '100%',
    maxWidth: 1680,
    paddingHorizontal: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cartExploreButton: {
    minHeight: 50,
    paddingHorizontal: 20,
    backgroundColor: COLORS.teal,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartExploreText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  cartNavLinks: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartNavLink: { paddingHorizontal: 15, minHeight: 48, justifyContent: 'center' },
  cartNavText: { color: '#20272D', fontSize: 15, fontWeight: '700' },
  cartNavActive: { color: COLORS.teal },
  cartNavSupport: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
  cartNavSupportCaption: { color: COLORS.muted, fontSize: 12 },
  cartNavSupportLabel: { color: COLORS.ink, fontSize: 16, marginTop: 2 },
  cartContentWide: {
    width: '100%',
    maxWidth: 1680,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 80,
  },
  cartBreadcrumb: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 42,
  },
  cartBreadcrumbLink: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBreadcrumbText: { color: COLORS.ink, fontSize: 15 },
  cartBreadcrumbDot: { color: '#A3ADB5', fontSize: 14 },
  cartBreadcrumbCurrent: { color: '#8B9AAA', fontSize: 15 },
  cartHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  cartHeadingRowMobile: { marginBottom: 16 },
  cartHeadingTitle: { color: '#101C2A', fontSize: 21, fontWeight: '700' },
  cartHeadingCount: { fontSize: 16, fontWeight: '400' },
  cartClearButton: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 42 },
  cartClearText: { color: COLORS.red, fontSize: 15, fontWeight: '700' },
  cartColumns: { gap: 24 },
  cartColumnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  cartTable: { backgroundColor: COLORS.white },
  cartTableWide: {
    flex: 2,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#DDE4EA',
    borderRadius: 17,
    overflow: 'hidden',
  },
  cartTableHeader: {
    height: 46,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F5F7',
  },
  cartTableHeaderLabel: { color: '#334256', fontSize: 15, fontWeight: '500' },
  cartProductCell: { width: '46%' },
  cartPriceCell: { width: '14%', alignItems: 'flex-start' },
  cartQuantityCell: { width: '14%', alignItems: 'flex-start' },
  cartTotalCell: { width: '16%', alignItems: 'flex-start' },
  cartActionCell: { width: '10%', alignItems: 'center' },
  cartLineWide: {
    minHeight: 151,
    marginBottom: 0,
    padding: 16,
    borderWidth: 0,
    borderTopWidth: 1,
    borderTopColor: '#DDE4EA',
    borderRadius: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartLineProduct: { flexDirection: 'row', alignItems: 'center' },
  cartImageWrapWide: { width: 118, height: 118, borderRadius: 15 },
  cartLineBodyWide: { minWidth: 0, paddingLeft: 16 },
  cartVariantRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 },
  cartVariantText: { color: '#3C526B', fontSize: 13, flexShrink: 1 },
  cartStock: { color: '#3C526B', fontSize: 12, marginTop: 10 },
  cartRating: { marginTop: 8, fontSize: 17, lineHeight: 20 },
  cartRatingFilled: { color: '#FDBB0B' },
  cartRatingEmpty: { color: '#C4CDD5' },
  cartRatingCount: { color: '#3C526B', fontSize: 11 },
  cartMobilePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
  cartOldPrice: {
    color: '#91A1B1',
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginTop: 4,
  },
  cartLineTotal: { color: '#101C2A', fontSize: 14, fontWeight: '700' },
  cartRowActions: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  cartIconButton: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
  cartAside: { gap: 18 },
  cartAsideWide: {
    flex: 1,
    minWidth: 300,
    padding: 24,
    borderWidth: 1,
    borderColor: '#DDE4EA',
    borderRadius: 17,
  },
  cartSummaryCard: {
    marginTop: 0,
    padding: 20,
    borderWidth: 1,
    borderColor: '#DDE4EA',
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  cartSummaryTitle: { fontSize: 20, marginBottom: 23 },
  cartCouponApplied: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cartEstimateNote: { color: COLORS.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  cartTermsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  cartCheckbox: { width: 20, height: 20, borderWidth: 2, borderColor: '#D5DEE5', borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  cartCheckboxChecked: { backgroundColor: COLORS.teal, borderColor: COLORS.teal },
  cartTermsText: { color: '#34485D', fontSize: 13, flex: 1, lineHeight: 19 },
  cartAsideCheckout: {
    height: 50,
    borderRadius: 26,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartAsideCheckoutDisabled: { opacity: 0.55 },
  cartAsideCheckoutText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  cartContinueButton: {
    height: 49,
    borderWidth: 1,
    borderColor: '#D6DFE6',
    borderRadius: 26,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  cartContinueText: { color: '#101C2A', fontSize: 14, fontWeight: '700' },
  cartPromotionsWrap: { marginTop: 42 },
  cartPromotionsWrapWide: { marginTop: 72 },
  removeCoupon: {
    color: COLORS.teal,
    fontWeight: '700',
    fontSize: 12,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.72 },
  cartContent: { padding: 16, paddingBottom: 30, width: '100%' },
  cartLine: {
    flexDirection: 'column',
    padding: 12,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  cartImageWrap: {
    width: 82,
    height: 112,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  cartImage: { width: '90%', height: '90%' },
  cartLineBody: { flex: 1, paddingLeft: 13, minWidth: 0 },
  cartStore: { color: '#3C526B', fontSize: 12, marginTop: 9 },
  cartName: {
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    marginTop: 0,
  },
  cartPrice: {
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  cartLineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  miniQuantity: {
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniQuantityButton: {
    width: 34,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniQuantityValue: {
    minWidth: 20,
    textAlign: 'center',
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '900',
  },
  shippingNotice: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#E7F7F0',
  },
  shippingNoticeText: {
    flex: 1,
    color: '#101C2A',
    fontSize: 13,
    lineHeight: 19,
  },
  shippingNoticeStrong: { color: COLORS.teal, fontWeight: '900' },
  couponRow: { height: 50, flexDirection: 'row' },
  couponInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
  },
  couponButton: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: COLORS.teal,
  },
  couponButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  couponMessage: { color: COLORS.muted, fontSize: 12, marginTop: 7 },
  couponError: { color: COLORS.red, fontWeight: '700' },
  couponSuccess: { color: COLORS.success, fontWeight: '800' },
  summaryCard: {
    marginTop: 18,
    padding: 17,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
  },
  summaryTitle: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  summaryLabel: { color: COLORS.muted, fontSize: 13 },
  summaryValue: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  summaryPositive: { color: COLORS.success },
  summaryBold: { color: COLORS.ink, fontSize: 15, fontWeight: '900' },
  summaryTotal: { fontSize: 19, fontWeight: '900' },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 10,
  },
  stickyFooter: {
    minHeight: 90,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { color: COLORS.muted, fontSize: 12 },
  footerTotal: {
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 2,
  },
  checkoutButton: {
    height: 52,
    minWidth: 150,
    paddingHorizontal: 22,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  checkoutButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  checkoutContent: { padding: 16, paddingBottom: 35 },
  steps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 31,
    height: 31,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  stepCircleActive: { borderColor: COLORS.teal, backgroundColor: COLORS.teal },
  stepNumber: { color: COLORS.muted, fontSize: 11, fontWeight: '900' },
  stepNumberActive: { color: COLORS.white },
  stepLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 5,
  },
  stepLabelActive: { color: COLORS.teal },
  formCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    backgroundColor: COLORS.white,
  },
  formTitle: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 16,
  },
  fieldWrap: { marginBottom: 14 },
  inputError: { borderColor: COLORS.red },
  formError: { color: COLORS.red, fontSize: 12, fontWeight: '700' },
  paymentOption: {
    minHeight: 70,
    padding: 11,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentOptionActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  paymentIconText: { color: COLORS.teal, fontSize: 17, fontWeight: '900' },
  paymentCopy: { flex: 1, paddingHorizontal: 11 },
  paymentLabel: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  paymentSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#B6BFBC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: COLORS.teal },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  demoNotice: {
    padding: 11,
    borderRadius: 12,
    backgroundColor: '#FFF7DD',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginBottom: 14,
  },
  demoNoticeText: {
    flex: 1,
    color: '#77601A',
    fontSize: 12,
    lineHeight: 18,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  cardHalf: { flex: 1 },
  checkoutActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  checkoutActionButton: { flex: 1 },
  reviewCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    backgroundColor: COLORS.white,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  reviewTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  editLink: { minWidth: 44, minHeight: 36, alignItems: 'flex-end' },
  editLinkText: { color: COLORS.teal, fontSize: 12, fontWeight: '900' },
  reviewStrong: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  reviewText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 3,
  },
  checkoutLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkoutLineName: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 12,
    paddingRight: 10,
  },
  checkoutLinePrice: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  secureText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 12,
  },
  successScreen: {
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconWrap: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  successIcon: { color: COLORS.teal, fontSize: 53, fontWeight: '900' },
  successTitle: {
    color: COLORS.ink,
    fontSize: 29,
    fontWeight: '900',
    marginTop: 25,
  },
  successMessage: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 9,
  },
  orderIdCard: {
    width: '100%',
    padding: 20,
    marginTop: 24,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  orderIdLabel: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '800',
  },
  orderId: { color: COLORS.ink, fontSize: 23, fontWeight: '900', marginTop: 7 },
  orderEta: {
    color: COLORS.teal,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  successButton: { width: '100%', marginTop: 13 },
});
