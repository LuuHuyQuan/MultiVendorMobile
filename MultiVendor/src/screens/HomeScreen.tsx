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
  { icon: 'truck', title: 'Miễn phí vận chuyển', text: 'Đơn hàng từ $35' },
  { icon: 'heart', title: 'Sản phẩm yêu thích', text: 'Lưu lại sản phẩm bạn thích' },
  { icon: 'package', title: 'Đơn hàng của bạn', text: 'Quản lý dễ dàng tại một nơi' },
  { icon: 'credit-card', title: 'Thanh toán đơn giản', text: 'Hỗ trợ thanh toán khi nhận hàng' },
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
        <Text style={styles.promoText}>Thiết yếu cho cuộc sống khỏe</Text>
        <View style={styles.promoBadge}>
          <Text style={styles.promoBadgeText}>GIẢM TỚI 31%</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Xem các cửa hàng"
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
          accessibilityLabel={`${cartCount} sản phẩm trong giỏ`}
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
        placeholder="Tìm sản phẩm bạn cần"
        value={query}
      />

      <View style={styles.hero}>
        <View style={styles.heroOfferRow}>
          <Text style={styles.heroEyebrow}>ƯU ĐÃI ĐỘC QUYỀN</Text>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>GIẢM TỚI 31%</Text>
          </View>
        </View>
        <Text style={styles.heroTitle}>
          Chăm sóc sức khỏe mỗi ngày, gọn trong một nơi.
        </Text>
        <Text style={styles.heroText}>
          Khám phá thương hiệu đáng tin cậy, sản phẩm thiết yếu và ưu đãi riêng cho bạn.
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
            <Text style={styles.heroButtonText}>Mua ngay</Text>
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
        action="Xem tất cả"
        onAction={() => onShop()}
        subtitle="Tìm sản phẩm phù hợp cho mỗi ngày"
        title="Mua theo danh mục"
      />
      <ScrollView
        contentContainerStyle={styles.categoryList}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.slice(1).map(category => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem danh mục ${category.label}`}
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
        action="Xem tất cả"
        onAction={() => onShop(undefined, undefined, 'discount')}
        subtitle="Ưu đãi có hạn cho những sản phẩm được yêu thích"
        title="Giảm giá mỗi ngày"
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
        <Text style={styles.dealEyebrow}>ƯU ĐÃI CÓ HẠN</Text>
        <Text style={styles.dealTitle}>Giá tốt trong tuần</Text>
        <Text style={styles.dealText}>
          Tiết kiệm hơn cho vitamin, chăm sóc da và sản phẩm thiết yếu.
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onShop(undefined, undefined, 'discount')}
          style={styles.dealButton}
        >
          <Text style={styles.dealButtonText}>Khám phá ưu đãi</Text>
          <Icon name="arrow-right" color="#4E3E00" size={15} />
        </Pressable>
        <Image
          source={require('../assets/vitamin-c-2.png')}
          resizeMode="contain"
          style={styles.dealImage}
        />
      </View>

      <SectionHeading
        action="Xem cửa hàng"
        onAction={onSellers}
        subtitle="Cửa hàng được chọn lọc, chất lượng được kiểm tra"
        title="Gian hàng tin cậy"
      />
      <View style={styles.sellerPreview}>
        {sellers.slice(0, 3).map((seller, index) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem ${seller.name}`}
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
  promoText: { color: COLORS.white, fontSize: 12, fontWeight: '700' },
  promoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: COLORS.yellow,
  },
  promoBadgeText: { color: '#604900', fontSize: 10, fontWeight: '900' },
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
  heroBadgeText: { color: '#594500', fontSize: 10, fontWeight: '900' },
  heroTitle: {
    marginTop: 19,
    color: COLORS.white,
    fontSize: 31,
    lineHeight: 39,
    letterSpacing: -0.6,
    fontWeight: '900',
    zIndex: 2,
  },
  heroText: {
    marginTop: 14,
    color: '#D7EBE9',
    fontSize: 14,
    lineHeight: 21,
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
  heroButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
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
  benefitTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  benefitText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
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
    fontSize: 22,
    lineHeight: 29,
    fontWeight: '900',
  },
  sectionSubtitle: { color: COLORS.muted, fontSize: 13, marginTop: 3 },
  viewAll: {
    color: COLORS.teal,
    fontSize: 13,
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
    fontSize: 12,
    lineHeight: 17,
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
    fontSize: 10,
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
    fontSize: 13,
    lineHeight: 19,
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
  dealButtonText: { color: '#4E3E00', fontSize: 13, fontWeight: '900' },
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
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
  },
  sellerRating: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '800',
  },
  sellerRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
});
