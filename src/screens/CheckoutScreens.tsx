import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { EmptyState, ScreenHeader, sharedStyles } from '../components/SellzyUI';
import { products } from '../data/catalog';
import { calculateTotals, validateDelivery } from '../commerce';
import { Icon, IconName } from '../components/Icon';
import { COLORS, money } from '../theme';
import { CartQuantities, CustomerDetails, Product } from '../types';
type CartProps = {
  topInset: number;
  cart: CartQuantities;
  couponCode: string;
  onApplyCoupon: (code: string) => boolean;
  onBack: () => void;
  onShop: () => void;
  onCheckout: () => void;
  onOpenProduct: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
};

const cartProducts = (cart: CartQuantities) =>
  products.filter(product => (cart[product.id] ?? 0) > 0);

export function CartScreen({
  topInset,
  cart,
  couponCode,
  onApplyCoupon,
  onBack,
  onShop,
  onCheckout,
  onOpenProduct,
  onSetQuantity,
  onRemove,
}: CartProps) {
  const [coupon, setCoupon] = useState(couponCode);
  const [couponError, setCouponError] = useState(false);
  const couponApplied = !!couponCode;
  const lines = cartProducts(cart);
  const { subtotal, discount, shipping, total } = calculateTotals(
    cart,
    couponCode,
  );

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle={`${lines.length} unique items`}
        title="Shopping Cart"
      />
      {!lines.length ? (
        <EmptyState
          actionLabel="Start Shopping"
          icon="▱"
          message="Your cart is waiting for something great. Explore today's wellness deals."
          onAction={onShop}
          title="Your cart is empty"
        />
      ) : (
        <>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.cartContent}
            showsVerticalScrollIndicator={false}
          >
            {lines.map(product => (
              <CartLine
                key={product.id}
                onOpen={() => onOpenProduct(product.id)}
                onRemove={() => onRemove(product.id)}
                onSetQuantity={quantity => onSetQuantity(product.id, quantity)}
                product={product}
                quantity={cart[product.id]}
              />
            ))}

            <Text style={styles.cardHeading}>Have a coupon?</Text>
            <View style={styles.couponRow}>
              <TextInput
                testID="coupon-input"
                accessibilityLabel="Coupon code"
                autoCapitalize="characters"
                onChangeText={value => {
                  setCoupon(value);
                  setCouponError(false);
                }}
                placeholder="Try SELLZY10"
                placeholderTextColor="#98A1A6"
                style={styles.couponInput}
                value={coupon}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Apply coupon"
                onPress={() => setCouponError(!onApplyCoupon(coupon))}
                style={styles.couponButton}
              >
                <Text style={styles.couponButtonText}>Apply</Text>
              </Pressable>
            </View>
            {couponError || couponApplied ? (
              <Text
                style={[
                  styles.couponMessage,
                  couponApplied && styles.couponSuccess,
                ]}
              >
                {couponError
                  ? 'This coupon is not valid. Try SELLZY10.'
                  : `${couponCode} applied — you saved ${money(discount)}!`}
              </Text>
            ) : null}
            {couponApplied ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onApplyCoupon('');
                  setCoupon('');
                  setCouponError(false);
                }}
              >
                <Text style={styles.removeCoupon}>Remove coupon</Text>
              </Pressable>
            ) : null}

            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Order Summary</Text>
              <SummaryRow label="Subtotal" value={money(subtotal)} />
              <SummaryRow
                label="Discount"
                positive
                value={discount ? `−${money(discount)}` : '$0.00'}
              />
              <SummaryRow
                label="Shipping"
                positive={shipping === 0}
                value={shipping === 0 ? 'FREE' : money(shipping)}
              />
              <View style={styles.summaryDivider} />
              <SummaryRow bold label="Total" value={money(total)} />
            </View>
          </ScrollView>
          <View style={styles.stickyFooter}>
            <View>
              <Text style={styles.footerLabel}>Total</Text>
              <Text style={styles.footerTotal}>{money(total)}</Text>
            </View>
            <Pressable
              testID="cart-checkout"
              accessibilityRole="button"
              onPress={onCheckout}
              style={styles.checkoutButton}
            >
              <Text style={styles.checkoutButtonText}>Checkout →</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function CartLine({
  product,
  quantity,
  onOpen,
  onRemove,
  onSetQuantity,
}: {
  product: Product;
  quantity: number;
  onOpen: () => void;
  onRemove: () => void;
  onSetQuantity: (quantity: number) => void;
}) {
  return (
    <View style={styles.cartLine}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${product.name}`}
        onPress={onOpen}
        style={styles.cartImageWrap}
      >
        <Image
          source={product.image}
          resizeMode="contain"
          style={styles.cartImage}
        />
      </Pressable>
      <View style={styles.cartLineBody}>
        <Text style={styles.cartStore}>{product.store}</Text>
        <Text numberOfLines={2} style={styles.cartName}>
          {product.name}
        </Text>
        <Text style={styles.cartPrice}>{money(product.price)}</Text>
        <View style={styles.cartLineActions}>
          <View style={styles.miniQuantity}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Decrease quantity of ${product.name}`}
              disabled={quantity <= 1}
              onPress={() => onSetQuantity(Math.max(1, quantity - 1))}
              style={styles.miniQuantityButton}
            >
              <Icon
                name="minus"
                size={16}
                color={quantity <= 1 ? COLORS.muted : COLORS.teal}
              />
            </Pressable>
            <Text style={styles.miniQuantityValue}>{quantity}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Increase quantity of ${product.name}`}
              disabled={quantity >= product.stock}
              onPress={() =>
                onSetQuantity(Math.min(product.stock, quantity + 1))
              }
              style={styles.miniQuantityButton}
            >
              <Icon
                name="plus"
                size={16}
                color={quantity >= product.stock ? COLORS.muted : COLORS.teal}
              />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Remove ${product.name} from cart`}
            onPress={onRemove}
            style={styles.removeButton}
          >
            <Text style={styles.removeText}>Remove</Text>
          </Pressable>
        </View>
      </View>
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
  initialDetails: CustomerDetails;
  onBack: () => void;
  onPlaceOrder: (details: CustomerDetails) => Promise<void>;
};

export function CheckoutScreen({
  topInset,
  cart,
  couponCode,
  initialDetails,
  onBack,
  onPlaceOrder,
}: CheckoutProps) {
  const [details, setDetails] = useState<CustomerDetails>(initialDetails);
  const [attempted, setAttempted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const lines = cartProducts(cart);
  const { subtotal, discount, shipping, total } = calculateTotals(
    cart,
    couponCode,
  );
  const errors = validateDelivery(details);
  const valid = Object.keys(errors).length === 0;

  const update = (key: keyof CustomerDetails, value: string) =>
    setDetails(current => ({ ...current, [key]: value }));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[sharedStyles.screen, { paddingTop: topInset }]}
    >
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle="Review delivery and payment"
        title="Checkout"
      />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.checkoutContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.steps}>
          {['Cart', 'Delivery', 'Payment'].map((step, index) => (
            <View key={step} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index < 2 && styles.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    index < 2 && styles.stepNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[styles.stepLabel, index < 2 && styles.stepLabelActive]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Delivery details</Text>
          <CheckoutField
            error={attempted ? errors.fullName : undefined}
            testID="checkout-name"
            label="Full name"
            onChangeText={value => update('fullName', value)}
            placeholder="Your full name"
            value={details.fullName}
          />
          <CheckoutField
            error={attempted ? errors.phone : undefined}
            testID="checkout-phone"
            keyboardType="phone-pad"
            label="Phone number"
            onChangeText={value => update('phone', value)}
            placeholder="Phone number"
            value={details.phone}
          />
          <CheckoutField
            error={attempted ? errors.address : undefined}
            testID="checkout-address"
            label="Street address"
            onChangeText={value => update('address', value)}
            placeholder="House number and street"
            value={details.address}
          />
          <CheckoutField
            error={attempted ? errors.city : undefined}
            testID="checkout-city"
            label="City"
            onChangeText={value => update('city', value)}
            placeholder="City"
            value={details.city}
          />
          {attempted && !valid ? (
            <Text style={styles.formError}>
              Please complete all delivery fields correctly.
            </Text>
          ) : null}
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Payment method</Text>
          <PaymentOption
            active={details.payment === 'cash'}
            icon="truck"
            label="Cash on delivery"
            onPress={() => update('payment', 'cash')}
            subtitle="Payment at delivery"
          />
          <PaymentOption
            active={details.payment === 'card'}
            icon="credit-card"
            label="Credit or debit card"
            onPress={() => update('payment', 'card')}
            subtitle="Demo payment — no charge is made"
          />
          {details.payment === 'card' ? (
            <View style={styles.demoNotice}>
              <Text style={styles.demoNoticeText}>
                Card checkout is shown in demo mode. No real payment details are
                requested.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Your order</Text>
          {lines.map(product => (
            <View key={product.id} style={styles.checkoutLine}>
              <Text numberOfLines={1} style={styles.checkoutLineName}>
                {cart[product.id]} × {product.name}
              </Text>
              <Text style={styles.checkoutLinePrice}>
                {money(product.price * cart[product.id])}
              </Text>
            </View>
          ))}
          <View style={styles.summaryDivider} />
          <SummaryRow label="Subtotal" value={money(subtotal)} />
          {couponCode ? (
            <SummaryRow
              label={`Discount (${couponCode})`}
              positive
              value={`−${money(discount)}`}
            />
          ) : null}
          <SummaryRow
            label="Shipping"
            positive={shipping === 0}
            value={shipping === 0 ? 'FREE' : money(shipping)}
          />
          <SummaryRow bold label="Order total" value={money(total)} />
        </View>

        <Pressable
          accessibilityRole="button"
          testID="place-order"
          disabled={submitting || !lines.length}
          accessibilityState={{
            disabled: submitting || !lines.length,
            busy: submitting,
          }}
          onPress={async () => {
            setAttempted(true);
            if (!valid) {
              scrollRef.current?.scrollTo({ y: 0, animated: true });
              return;
            }
            setSubmitting(true);
            try {
              await onPlaceOrder(details);
            } finally {
              setSubmitting(false);
            }
          }}
          style={({ pressed }) => [
            sharedStyles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={sharedStyles.primaryButtonText}>
            {submitting
              ? 'Saving your order…'
              : `Place Demo Order · ${money(total)}`}
          </Text>
        </Pressable>
        <Text style={styles.secureText}>
          Demo checkout: this order stays on your device. No payment or shipment
          is initiated.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CheckoutField({
  label,
  error,
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
        maxLength={200}
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
}: {
  topInset: number;
  orderId: string;
  onOrders: () => void;
  onHome: () => void;
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
      <Text style={styles.successTitle}>Order saved!</Text>
      <Text style={styles.successMessage}>
        Your demo order is ready to review in My Orders.
      </Text>
      <View style={styles.orderIdCard}>
        <Text style={styles.orderIdLabel}>ORDER NUMBER</Text>
        <Text style={styles.orderId}>{orderId}</Text>
        <Text style={styles.orderEta}>
          Saved locally · No charge or shipment
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        testID="view-orders"
        onPress={onOrders}
        style={[sharedStyles.primaryButton, styles.successButton]}
      >
        <Text style={sharedStyles.primaryButtonText}>View My Orders</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={onHome}
        style={[sharedStyles.secondaryButton, styles.successButton]}
      >
        <Text style={sharedStyles.secondaryButtonText}>Continue Shopping</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  removeCoupon: {
    color: COLORS.teal,
    fontWeight: '700',
    fontSize: 12,
    paddingVertical: 14,
  },
  removeButton: {
    paddingHorizontal: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.72 },
  cartContent: { padding: 16, paddingBottom: 30 },
  cartLine: {
    flexDirection: 'row',
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
  cartLineBody: { flex: 1, paddingLeft: 13 },
  cartStore: { color: COLORS.teal, fontSize: 9, fontWeight: '900' },
  cartName: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  cartPrice: {
    color: COLORS.ink,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 7,
  },
  cartLineActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
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
  miniQuantityText: { color: COLORS.teal, fontSize: 15, fontWeight: '900' },
  miniQuantityValue: {
    minWidth: 20,
    textAlign: 'center',
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '900',
  },
  removeText: { color: COLORS.red, fontSize: 10, fontWeight: '800' },
  cardHeading: {
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 9,
    marginBottom: 10,
  },
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
  couponButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  couponMessage: { color: COLORS.muted, fontSize: 10, marginTop: 7 },
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
  summaryLabel: { color: COLORS.muted, fontSize: 12 },
  summaryValue: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
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
  footerLabel: { color: COLORS.muted, fontSize: 10 },
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
    fontSize: 9,
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
  formError: { color: COLORS.red, fontSize: 10, fontWeight: '700' },
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
  paymentLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '900' },
  paymentSubtitle: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
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
  demoNotice: { padding: 11, borderRadius: 12, backgroundColor: '#FFF7DD' },
  demoNoticeText: { color: '#77601A', fontSize: 10, lineHeight: 15 },
  checkoutLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 5,
  },
  checkoutLineName: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 11,
    paddingRight: 10,
  },
  checkoutLinePrice: { color: COLORS.ink, fontSize: 11, fontWeight: '800' },
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
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '800',
  },
  orderId: { color: COLORS.ink, fontSize: 23, fontWeight: '900', marginTop: 7 },
  orderEta: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 8,
  },
  successButton: { width: '100%', marginTop: 13 },
});
