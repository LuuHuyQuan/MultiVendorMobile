import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ProductCard, SearchBar } from '../components/SellzyUI';
import { Icon, IconName } from '../components/Icon';
import { categories, products, sellers } from '../data/catalog';
import { COLORS } from '../theme';

type Props = {
  topInset: number;
  cartCount: number;
  wishlistIds: string[];
  onShop: (
    category?: string,
    query?: string,
    sort?: 'popular' | 'price' | 'price-desc' | 'discount',
  ) => void;
  onCart: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string) => void;
  onToggleLike: (id: string) => void;
  onSellers: () => void;
};

const LOGO = require('../assets/logo.png');
const categoryIcons: Record<string, IconName> = {
  Vitamins: 'bottle',
  'Personal Care': 'shield',
  Wellness: 'heart',
  Devices: 'activity',
  Nutrition: 'leaf',
};
const benefits: { icon: IconName; title: string; text: string }[] = [
  { icon: 'truck', title: 'Free Shipping', text: 'On orders over $35' },
  { icon: 'heart', title: 'Saved Favorites', text: 'Keep your picks close' },
  { icon: 'package', title: 'Your Orders', text: 'Everything in one place' },
  { icon: 'credit-card', title: 'Easy Checkout', text: 'Cash on delivery' },
];

export default function HomeScreen({
  topInset,
  cartCount,
  wishlistIds,
  onShop,
  onCart,
  onOpenProduct,
  onAdd,
  onToggleLike,
  onSellers,
}: Props) {
  const [query, setQuery] = useState('');

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.promo,
          { paddingTop: topInset, minHeight: 42 + topInset },
        ]}
      >
        <Icon name="leaf" size={14} color={COLORS.white} />
        <Text style={styles.promoText}>Wellness essentials</Text>
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>UP TO 31% OFF</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Browse sellers"
          accessibilityRole="button"
          testID="home-sellers"
          onPress={onSellers}
          style={styles.menuButton}
        >
          <Icon name="menu" />
        </Pressable>
        <Image
          accessibilityLabel="Sellzy"
          source={LOGO}
          resizeMode="contain"
          style={styles.logo}
        />
        <Pressable
          accessibilityLabel={`${cartCount} items in cart`}
          accessibilityRole="button"
          testID="header-cart"
          onPress={onCart}
          style={styles.cartButton}
        >
          <Icon name="cart" />
          {cartCount ? (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>
                {cartCount > 9 ? '9+' : cartCount}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <SearchBar
        onChangeText={setQuery}
        onSubmit={() => onShop(undefined, query.trim())}
        placeholder="Search for the items"
        value={query}
      />

      <View style={styles.hero}>
        <View style={styles.heroOfferRow}>
          <Text style={styles.heroEyebrow}>EXCLUSIVE OFFER</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>UP TO 31% OFF</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>
          Everything you need for wellness in one place.
        </Text>
        <Text style={styles.heroText}>
          Discover trusted brands, everyday essentials and exclusive deals.
        </Text>
        <View style={styles.heroBottom}>
          <Pressable
            accessibilityRole="button"
            testID="home-shop-now"
            onPress={() => onShop()}
            style={({ pressed }) => [
              styles.heroButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.heroButtonText}>Shop Now</Text>
            <View style={styles.heroArrowWrap}>
              <Icon name="arrow-up-right" size={18} color={COLORS.teal} />
            </View>
          </Pressable>
          <View style={styles.heroVisual}>
            <View style={styles.heroCircle} />
            <Image
              source={require('../assets/vitamin-c.png')}
              resizeMode="contain"
              style={styles.heroImage}
            />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.benefits}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {benefits.map(item => (
          <View key={item.title} style={styles.benefitCard}>
            <View style={styles.benefitIconWrap}>
              <Icon name={item.icon} size={20} color={COLORS.tealDark} />
            </View>
            <Text style={styles.benefitTitle}>{item.title}</Text>
            <Text style={styles.benefitText}>{item.text}</Text>
          </View>
        ))}
      </ScrollView>

      <SectionHeading
        action="View All"
        onAction={() => onShop()}
        subtitle="Find your daily essentials"
        title="Shop by Category"
      />
      <ScrollView
        contentContainerStyle={styles.categoryList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.slice(1).map(category => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Shop ${category.label}`}
            testID={`home-category-${category.id}`}
            key={category.id}
            onPress={() => onShop(category.id)}
            style={({ pressed }) => [
              styles.category,
              pressed && styles.pressed,
            ]}
          >
            <View
              style={[styles.categoryIcon, { backgroundColor: category.tint }]}
            >
              <Icon
                name={categoryIcons[category.id] ?? 'shop'}
                size={27}
                color={COLORS.tealDark}
              />
            </View>
            <Text numberOfLines={2} style={styles.categoryLabel}>
              {category.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionHeading
        action="View All"
        onAction={() => onShop(undefined, undefined, 'discount')}
        subtitle="Limited-time offers on wellness favorites"
        title="Daily Discount You'll Love"
      />
      <ScrollView
        contentContainerStyle={styles.productList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {[...products]
          .sort((a, b) => b.discount - a.discount)
          .slice(0, 6)
          .map(product => (
            <ProductCard
              key={product.id}
              liked={wishlistIds.includes(product.id)}
              onAdd={() => onAdd(product.id)}
              onOpen={() => onOpenProduct(product.id)}
              onToggleLike={() => onToggleLike(product.id)}
              product={product}
            />
          ))}
      </ScrollView>

      <View style={styles.dealBanner}>
        <Text style={styles.dealEyebrow}>LIMITED TIME OFFER</Text>
        <Text style={styles.dealTitle}>Hot Deals This Week</Text>
        <Text style={styles.dealText}>
          Save more on vitamins, skincare and health essentials.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onShop(undefined, undefined, 'discount')}
          style={styles.dealButton}
        >
          <Text style={styles.dealButtonText}>Explore Deals</Text>
          <Icon name="arrow-right" color="#4E3E00" size={15} />
        </Pressable>
        <Image
          source={require('../assets/vitamin-c-2.png')}
          resizeMode="contain"
          style={styles.dealImage}
        />
      </View>

      <SectionHeading
        action="Meet Sellers"
        onAction={onSellers}
        subtitle="Curated stores, quality checked"
        title="Trusted Marketplace"
      />
      <View style={styles.sellerPreview}>
        {sellers.slice(0, 3).map((seller, index) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Meet ${seller.name}`}
            onPress={onSellers}
            key={seller.name}
            style={styles.sellerMini}
          >
            <View
              style={[
                styles.sellerAvatar,
                index === 1 && styles.sellerAvatarYellow,
              ]}
            >
              <Text style={styles.sellerAvatarText}>
                {seller.name.charAt(0)}
              </Text>
            </View>
            <Text numberOfLines={1} style={styles.sellerName}>
              {seller.name}
            </Text>
            <View style={styles.sellerRatingRow}>
              <Icon name="star" filled size={10} color={COLORS.orange} />
              <Text style={styles.sellerRating}>
                {seller.rating.toFixed(1)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function SectionHeading({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${action}: ${title}`}
        style={styles.sectionAction}
        onPress={onAction}
      >
        <Text style={styles.viewAll}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 34,
    backgroundColor: COLORS.white,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  pressed: { opacity: 0.72 },
  promo: {
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.teal,
  },
  promoText: { color: COLORS.white, fontSize: 11, fontWeight: '700' },
  promoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.yellow,
  },
  promoBadgeText: { color: '#604900', fontSize: 9, fontWeight: '900' },
  header: {
    height: 72,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { width: 112, height: 38 },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.yellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  hero: {
    marginHorizontal: 16,
    marginTop: 5,
    padding: 23,
    paddingBottom: 15,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: COLORS.tealDark,
  },
  heroOfferRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 9,
    zIndex: 2,
  },
  heroEyebrow: {
    color: COLORS.white,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '900',
  },
  heroBadge: {
    backgroundColor: COLORS.yellow,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  heroBadgeText: { color: '#594500', fontSize: 9, fontWeight: '900' },
  heroTitle: {
    marginTop: 19,
    color: COLORS.white,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.6,
    fontWeight: '900',
    zIndex: 2,
  },
  heroText: {
    marginTop: 14,
    color: '#D7EBE9',
    fontSize: 13,
    lineHeight: 20,
    zIndex: 2,
  },
  heroButton: {
    alignSelf: 'flex-start',
    height: 48,
    paddingLeft: 18,
    paddingRight: 7,
    borderRadius: 25,
    backgroundColor: COLORS.teal,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    zIndex: 2,
  },
  heroButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  heroArrowWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between',
  },
  heroVisual: {
    width: 125,
    height: 170,
    flexShrink: 1,
  },
  heroCircle: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 100,
    right: -10,
    bottom: 15,
    backgroundColor: '#0A6E72',
  },
  heroImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    right: 0,
    bottom: 0,
  },
  benefits: { paddingHorizontal: 16, paddingVertical: 26, gap: 11 },
  benefitCard: {
    width: 145,
    minHeight: 130,
    padding: 15,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  benefitIconWrap: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: '#FFF8DA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },
  benefitTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  benefitText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },
  sectionHeading: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sectionCopy: { flex: 1, paddingRight: 10 },
  sectionAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 21,
    lineHeight: 27,
    fontWeight: '900',
  },
  sectionSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  viewAll: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 4,
  },
  categoryList: { paddingHorizontal: 16, paddingBottom: 30, gap: 15 },
  category: { width: 76, alignItems: 'center' },
  categoryIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    minHeight: 32,
    marginTop: 8,
    color: COLORS.ink,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '700',
  },
  productList: { paddingHorizontal: 16, paddingBottom: 30, gap: 13 },
  dealBanner: {
    minHeight: 225,
    marginHorizontal: 16,
    marginBottom: 30,
    padding: 23,
    borderRadius: 23,
    overflow: 'hidden',
    backgroundColor: COLORS.tealDark,
  },
  dealEyebrow: {
    color: COLORS.yellow,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: '900',
  },
  dealTitle: {
    width: '65%',
    color: COLORS.white,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    marginTop: 9,
  },
  dealText: {
    width: '64%',
    color: '#CFE3E1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  dealButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    alignSelf: 'flex-start',
    marginTop: 15,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: COLORS.yellow,
  },
  dealButtonText: { color: '#4E3E00', fontSize: 11, fontWeight: '900' },
  dealImage: {
    position: 'absolute',
    width: 110,
    height: 165,
    right: 5,
    bottom: 8,
  },
  sellerPreview: {
    marginHorizontal: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sellerMini: {
    flex: 1,
    minWidth: 80,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    alignItems: 'center',
  },
  sellerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  sellerAvatarYellow: { backgroundColor: '#FFF4CF' },
  sellerAvatarText: { color: COLORS.tealDark, fontSize: 18, fontWeight: '900' },
  sellerName: {
    color: COLORS.ink,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 8,
  },
  sellerRating: {
    color: COLORS.orange,
    fontSize: 9,
    fontWeight: '800',
  },
  sellerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
});
