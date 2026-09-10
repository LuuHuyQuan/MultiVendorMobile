import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { COLORS, money } from '../theme';
import { Product, RouteName } from '../types';
import { Icon, IconName } from './Icon';

type HeaderProps = {
  title: string;
  subtitle?: string;
  canGoBack?: boolean;
  cartCount?: number;
  onBack?: () => void;
  onCart?: () => void;
};

export function ScreenHeader({
  title,
  subtitle,
  canGoBack,
  cartCount = 0,
  onBack,
  onCart,
}: HeaderProps) {
  return (
    <View style={styles.header}>
      {canGoBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          testID="header-back"
          onPress={onBack}
          style={({ pressed }) => [
            styles.circleButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="back" />
        </Pressable>
      ) : (
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkText}>S</Text>
        </View>
      )}

      <View style={styles.headerCopy}>
        <Text numberOfLines={1} style={styles.headerTitle}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {onCart ? (
        <Pressable
          accessibilityLabel={`${cartCount} items in cart`}
          accessibilityRole="button"
          testID="header-cart"
          onPress={onCart}
          style={({ pressed }) => [
            styles.cartButton,
            pressed && styles.pressed,
          ]}
        >
          <Icon name="cart" />
          {cartCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {cartCount > 9 ? '9+' : cartCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      ) : (
        <View style={styles.headerSpacer} />
      )}
    </View>
  );
}

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
};

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search products and stores',
}: SearchBarProps) {
  return (
    <View style={styles.searchBar}>
      <View style={styles.searchIcon}>
        <Icon name="search" color={COLORS.teal} size={20} />
      </View>
      <TextInput
        testID="product-search"
        accessibilityLabel="Search products"
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        placeholder={placeholder}
        placeholderTextColor="#98A1A6"
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.searchInput}
        value={value}
      />
      {value ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          onPress={() => onChangeText('')}
          style={styles.searchAction}
        >
          <Icon name="close" size={18} color={COLORS.muted} />
        </Pressable>
      ) : null}
      {onSubmit ? (
        <Pressable
          accessibilityLabel="Search products"
          accessibilityRole="button"
          testID="submit-search"
          onPress={onSubmit}
          style={styles.searchAction}
        >
          <Icon name="arrow-right" size={20} color={COLORS.teal} />
        </Pressable>
      ) : null}
    </View>
  );
}

type ProductCardProps = {
  product: Product;
  liked: boolean;
  compact?: boolean;
  onOpen: () => void;
  onAdd: () => void;
  onToggleLike: () => void;
};

export function ProductCard({
  product,
  liked,
  compact,
  onOpen,
  onAdd,
  onToggleLike,
}: ProductCardProps) {
  return (
    <View
      style={[
        styles.productCard,
        compact ? styles.productCardCompact : styles.productCardWide,
      ]}
    >
      <View
        style={[
          styles.productImageWrap,
          compact && styles.productImageWrapCompact,
        ]}
      >
        <Pressable
          accessibilityLabel={`View ${product.name}, ${money(product.price)}`}
          accessibilityRole="button"
          testID={`product-${product.id}`}
          onPress={onOpen}
          style={styles.productImageButton}
        >
          <Image
            source={product.image}
            resizeMode="contain"
            style={styles.productImage}
          />
        </Pressable>
        <View style={[styles.discountBadge, styles.pointerEventsNone]}>
          <Text style={styles.discountText}>{product.discount}% OFF</Text>
        </View>
        <Pressable
          accessibilityLabel={`${
            liked ? 'Remove from wishlist' : 'Add to wishlist'
          }: ${product.name}`}
          accessibilityRole="button"
          accessibilityState={{ selected: liked }}
          testID={`wishlist-${product.id}`}
          hitSlop={8}
          onPress={event => {
            event.stopPropagation();
            onToggleLike();
          }}
          style={styles.likeButton}
        >
          <Icon
            name="heart"
            color={liked ? COLORS.red : COLORS.ink}
            filled={liked}
            size={19}
          />
        </Pressable>
      </View>
      <Text numberOfLines={1} style={styles.storeLabel}>
        {product.store}
      </Text>
      <Pressable
        accessibilityLabel={`View ${product.name}`}
        accessibilityRole="button"
        onPress={onOpen}
      >
        <Text
          numberOfLines={2}
          style={[styles.productName, compact && styles.productNameCompact]}
        >
          {product.name}
        </Text>
      </Pressable>
      <View style={styles.ratingRow}>
        <Icon name="star" filled color={COLORS.orange} size={13} />
        <Text style={styles.ratingText}>{product.rating}</Text>
        <Text style={styles.reviewText}>({product.reviews})</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{money(product.price)}</Text>
        {!compact ? (
          <Text style={styles.oldPrice}>{money(product.oldPrice)}</Text>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={`Add ${product.name} to cart`}
        accessibilityRole="button"
        accessibilityState={{ disabled: product.stock === 0 }}
        disabled={product.stock === 0}
        testID={`add-${product.id}`}
        onPress={event => {
          event.stopPropagation();
          onAdd();
        }}
        style={({ pressed }) => [
          styles.addButton,
          pressed && styles.addButtonPressed,
        ]}
      >
        <Icon name="plus" color={COLORS.white} size={15} />
        <Text style={styles.addButtonText}>
          {product.stock > 0 ? 'Add' : 'Sold out'}
        </Text>
      </Pressable>
    </View>
  );
}

type BottomNavProps = {
  active: RouteName;
  cartCount: number;
  wishlistCount: number;
  bottomInset: number;
  onSelect: (route: RouteName) => void;
};

const navItems: { route: RouteName; label: string; icon: IconName }[] = [
  { route: 'home', label: 'Home', icon: 'home' },
  { route: 'shop', label: 'Shop', icon: 'shop' },
  { route: 'orders', label: 'Orders', icon: 'orders' },
  { route: 'wishlist', label: 'Wishlist', icon: 'heart' },
  { route: 'account', label: 'Account', icon: 'user' },
];

export function BottomNav({
  active,
  wishlistCount,
  bottomInset,
  onSelect,
}: BottomNavProps) {
  return (
    <View
      style={[styles.bottomNav, { paddingBottom: Math.max(bottomInset, 8) }]}
    >
      {navItems.map(item => {
        const selected = active === item.route;
        const count = item.route === 'wishlist' ? wishlistCount : 0;
        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            testID={`nav-${item.route}`}
            key={item.route}
            onPress={() => onSelect(item.route)}
            style={styles.navItem}
          >
            <View>
              <Icon
                name={item.icon}
                color={selected ? COLORS.teal : COLORS.muted}
              />
              {count > 0 ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>
                    {count > 9 ? '9+' : count}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.navLabel, selected && styles.navLabelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

type EmptyStateProps = {
  icon: string;
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
};

export function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Icon
          name={icon === '♡' ? 'heart' : icon === '▱' ? 'cart' : 'package'}
          color={COLORS.teal}
          size={38}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyText}>{message}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={onAction}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.primaryButtonText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export const sharedStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.white },
  content: { paddingHorizontal: 16, paddingBottom: 28 },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  label: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 15,
    color: COLORS.ink,
    backgroundColor: COLORS.white,
    fontSize: 14,
  },
  primaryButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: { color: COLORS.white, fontSize: 15, fontWeight: '800' },
  secondaryButton: {
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  secondaryButtonText: { color: COLORS.teal, fontSize: 14, fontWeight: '800' },
});

const styles = StyleSheet.create({
  pointerEventsNone: { pointerEvents: 'none' },
  pressed: { opacity: 0.7 },
  header: {
    minHeight: 72,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { color: COLORS.white, fontSize: 23, fontWeight: '900' },
  headerCopy: { flex: 1, paddingHorizontal: 12 },
  headerTitle: {
    color: COLORS.ink,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
  },
  headerSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  headerSpacer: { width: 44 },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  badge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  badgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  searchBar: {
    height: 52,
    marginHorizontal: 16,
    marginVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 26,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  searchIcon: { marginRight: 8 },
  searchAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    height: 50,
    color: COLORS.ink,
    fontSize: 14,
    paddingVertical: 0,
  },
  productCard: {
    padding: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    boxShadow: '0px 5px 10px rgba(23, 66, 62, 0.06)',
    elevation: 2,
  },
  productCardWide: { width: 235 },
  productCardCompact: { flex: 1, minWidth: 0 },
  productImageWrap: {
    height: 180,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  productImageWrapCompact: { height: 145 },
  productImageButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: { width: '92%', height: '90%' },
  discountBadge: {
    position: 'absolute',
    left: 8,
    top: 8,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: COLORS.red,
  },
  discountText: { color: COLORS.white, fontSize: 8, fontWeight: '900' },
  likeButton: {
    position: 'absolute',
    right: 8,
    top: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  storeLabel: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 11,
  },
  productName: {
    color: COLORS.ink,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '800',
    minHeight: 44,
    marginTop: 4,
  },
  productNameCompact: { fontSize: 13, lineHeight: 18, minHeight: 44 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7 },
  ratingText: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: '800',
    marginLeft: 3,
  },
  reviewText: { color: COLORS.muted, fontSize: 10, marginLeft: 3 },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 7,
  },
  price: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  oldPrice: {
    color: '#9BA3A6',
    fontSize: 11,
    textDecorationLine: 'line-through',
  },
  addButton: {
    height: 44,
    flexDirection: 'row',
    gap: 5,
    marginTop: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  addButtonPressed: { backgroundColor: COLORS.tealDark },
  addButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  bottomNav: {
    minHeight: 68,
    paddingTop: 7,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    boxShadow: '0px -3px 8px rgba(22, 62, 59, 0.06)',
    elevation: 10,
  },
  navItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  navLabelActive: { color: COLORS.teal, fontWeight: '900' },
  navBadge: {
    position: 'absolute',
    right: -10,
    top: -2,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 3,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBadgeText: { color: COLORS.white, fontSize: 8, fontWeight: '900' },
  emptyState: {
    flex: 1,
    paddingHorizontal: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: COLORS.tealSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.ink,
    fontSize: 21,
    fontWeight: '900',
    marginTop: 22,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButton: {
    minWidth: 185,
    height: 50,
    marginTop: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
