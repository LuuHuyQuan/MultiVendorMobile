import React, {useMemo, useState} from 'react';
import {
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

const COLORS = {
  teal: '#078B81',
  darkTeal: '#075D63',
  yellow: '#FFC928',
  red: '#D91F52',
  ink: '#20272D',
  muted: '#7A8389',
  border: '#E7EBEA',
  surface: '#F6F8F7',
  white: '#FFFFFF',
};

const LOGO = 'https://sellzy-html.vercel.app/assets/images/logo.png';
const SCREEN_WIDTH = Dimensions.get('window').width;
const PRODUCT_CARD_WIDTH = Math.min(268, SCREEN_WIDTH - 52);

type Product = {
  id: string;
  name: string;
  image: string;
  price: string;
  oldPrice: string;
  discount: string;
  reviews: number;
  store: string;
};

type Category = {
  id: string;
  label: string;
  image: string;
  tint: string;
};

const categories: Category[] = [
  {
    id: 'personal-care',
    label: 'Personal Care',
    image: 'https://sellzy-html.vercel.app/assets/images/hand-sanitizer-1.png',
    tint: '#E6F7F4',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    image: 'https://sellzy-html.vercel.app/assets/images/vitamin-c.png',
    tint: '#FFF7DC',
  },
  {
    id: 'wellness',
    label: 'Wellness',
    image: 'https://sellzy-html.vercel.app/assets/images/aooca.png',
    tint: '#F2ECFF',
  },
  {
    id: 'devices',
    label: 'Devices',
    image: 'https://sellzy-html.vercel.app/assets/images/temperature-gun-2.png',
    tint: '#E9F2FF',
  },
  {
    id: 'skincare',
    label: 'Skincare',
    image: 'https://sellzy-html.vercel.app/assets/images/combat.png',
    tint: '#FFEFEF',
  },
];

const products: Product[] = [
  {
    id: 'vitamin-c',
    name: 'VitaLife Vitamin C 1000mg Immunity Support',
    image: 'https://sellzy-html.vercel.app/assets/images/vitamin-c.png',
    price: '$27.49',
    oldPrice: '$39.99',
    discount: '15% OFF',
    reviews: 189,
    store: 'VitaLife Store',
  },
  {
    id: 'kids-vitamins',
    name: "Renzo's Vitamins for Kids — Bright & Healthy",
    image: 'https://sellzy-html.vercel.app/assets/images/vitamin-c-2.png',
    price: '$18.90',
    oldPrice: '$24.99',
    discount: '10% OFF',
    reviews: 124,
    store: 'Family Health',
  },
  {
    id: 'apple-juice',
    name: 'Organic Apple Juice Daily Wellness Pack',
    image: 'https://sellzy-html.vercel.app/assets/images/apple-juice.png',
    price: '$12.40',
    oldPrice: '$16.50',
    discount: '12% OFF',
    reviews: 98,
    store: 'Natural Choice',
  },
  {
    id: 'temperature-gun',
    name: 'Digital Infrared Thermometer — Instant Read',
    image: 'https://sellzy-html.vercel.app/assets/images/temperature-gun-2.png',
    price: '$34.20',
    oldPrice: '$42.00',
    discount: '18% OFF',
    reviews: 211,
    store: 'Care Devices',
  },
];

const features = [
  {icon: '↗', title: 'Free Shipping', subtitle: 'On every order'},
  {icon: '24/7', title: '24x7 Support', subtitle: 'Always here to help'},
  {icon: '↺', title: '30 Days Return', subtitle: 'Shop with confidence'},
  {icon: '✓', title: 'Secure Payment', subtitle: 'Safe & protected'},
];

type ProductCardProps = {
  product: Product;
  liked: boolean;
  onAdd: () => void;
  onToggleLiked: () => void;
};

function ProductCard({product, liked, onAdd, onToggleLiked}: ProductCardProps) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productImageWrap}>
        <Image
          accessibilityLabel={product.name}
          source={{uri: product.image}}
          style={styles.productImage}
          resizeMode="contain"
        />
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>{product.discount}</Text>
        </View>
        <Pressable
          accessibilityLabel={liked ? 'Remove from wishlist' : 'Add to wishlist'}
          accessibilityRole="button"
          onPress={onToggleLiked}
          style={({pressed}) => [styles.floatingHeart, pressed && styles.pressed]}>
          <Text style={[styles.heartText, liked && styles.heartTextActive]}>
            {liked ? '♥' : '♡'}
          </Text>
        </Pressable>
      </View>

      <Text style={styles.storeLabel}>{product.store}</Text>
      <Text numberOfLines={2} style={styles.productName}>
        {product.name}
      </Text>
      <View style={styles.ratingRow}>
        <Text style={styles.stars}>★★★★★</Text>
        <Text style={styles.reviewText}>({product.reviews})</Text>
      </View>
      <View style={styles.priceRow}>
        <Text style={styles.price}>{product.price}</Text>
        <Text style={styles.oldPrice}>{product.oldPrice}</Text>
      </View>
      <Pressable
        accessibilityLabel={`Add ${product.name} to cart`}
        accessibilityRole="button"
        onPress={onAdd}
        style={({pressed}) => [styles.addButton, pressed && styles.addButtonPressed]}>
        <Text style={styles.addButtonIcon}>＋</Text>
        <Text style={styles.addButtonText}>Add to Cart</Text>
      </Pressable>
    </View>
  );
}

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [likedIds, setLikedIds] = useState<string[]>([]);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return products;
    }

    return products.filter(product =>
      `${product.name} ${product.store}`.toLowerCase().includes(normalizedQuery),
    );
  }, [query]);

  const toggleLiked = (productId: string) => {
    setLikedIds(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId],
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.promoBar,
            {minHeight: 42 + insets.top, paddingTop: insets.top},
          ]}>
          <Text style={styles.promoSpark}>✣</Text>
          <Text style={styles.promoText}>Fashion Category</Text>
          <View style={styles.promoBadge}>
            <Text style={styles.promoBadgeText}>25% OFF</Text>
          </View>
          <Text style={styles.promoText}>Today</Text>
        </View>

        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Open menu"
            accessibilityRole="button"
            style={({pressed}) => [styles.circleButton, pressed && styles.pressed]}>
            <Text style={styles.menuIcon}>☰</Text>
          </Pressable>

          <Image
            accessibilityLabel="Sellzy"
            source={{uri: LOGO}}
            style={styles.logo}
            resizeMode="contain"
          />

          <Pressable
            accessibilityLabel={`${cartCount} items in cart`}
            accessibilityRole="button"
            style={({pressed}) => [styles.cartButton, pressed && styles.pressed]}>
            <Text style={styles.cartIcon}>⌑</Text>
            {cartCount > 0 && (
              <View style={styles.cartCountBubble}>
                <Text style={styles.cartCountText}>{cartCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            accessibilityLabel="Search products"
            onChangeText={setQuery}
            placeholder="Search for the Items"
            placeholderTextColor="#9AA2A7"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Text style={styles.searchIcon}>⌕</Text>
        </View>

        <View style={styles.hero}>
          <View style={styles.offerRow}>
            <Text style={styles.offerLabel}>Exclusive offer</Text>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>25% OFF</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>
            Everything you need for wellness in one place.
          </Text>
          <Text style={styles.heroSubtitle}>
            Discover your favorite brands, latest trends, and exclusive
            discounts in one place.
          </Text>
          <Pressable
            accessibilityRole="button"
            style={({pressed}) => [styles.heroButton, pressed && styles.heroButtonPressed]}>
            <Text style={styles.heroButtonText}>Shop Now</Text>
            <View style={styles.heroArrowCircle}>
              <Text style={styles.heroArrow}>↗</Text>
            </View>
          </Pressable>
          <View style={styles.heroDots}>
            <View style={[styles.heroDot, styles.heroDotActive]} />
            <View style={styles.heroDot} />
            <View style={styles.heroDot} />
            <View style={styles.heroDot} />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.featureList}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {features.map(feature => (
            <View key={feature.title} style={styles.featureCard}>
              <View style={styles.featureIconCircle}>
                <Text style={styles.featureIcon}>{feature.icon}</Text>
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <Text style={styles.sectionSubtitle}>Find your daily essentials</Text>
          </View>
          <Pressable accessibilityRole="button">
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.categoryList}
          horizontal
          showsHorizontalScrollIndicator={false}>
          {categories.map(category => (
            <Pressable
              accessibilityRole="button"
              key={category.id}
              style={({pressed}) => [styles.categoryItem, pressed && styles.pressed]}>
              <View style={[styles.categoryImageWrap, {backgroundColor: category.tint}]}>
                <Image
                  accessibilityLabel={category.label}
                  source={{uri: category.image}}
                  style={styles.categoryImage}
                  resizeMode="contain"
                />
              </View>
              <Text numberOfLines={2} style={styles.categoryLabel}>
                {category.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <View style={styles.discountHeadingWrap}>
            <Text style={styles.sectionTitle}>Daily Discount You'll Love</Text>
            <Text style={styles.sectionSubtitle}>
              Limited-time offers on wellness favorites
            </Text>
          </View>
          <Pressable accessibilityRole="button">
            <Text style={styles.viewAll}>View All</Text>
          </Pressable>
        </View>

        {filteredProducts.length > 0 ? (
          <ScrollView
            contentContainerStyle={styles.productList}
            horizontal
            showsHorizontalScrollIndicator={false}>
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                liked={likedIds.includes(product.id)}
                onAdd={() => setCartCount(count => count + 1)}
                onToggleLiked={() => toggleLiked(product.id)}
                product={product}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No products found</Text>
            <Text style={styles.emptyStateText}>
              Try another product or store name.
            </Text>
          </View>
        )}

        <View style={styles.dealBanner}>
          <View style={styles.dealContent}>
            <Text style={styles.dealEyebrow}>LIMITED TIME OFFER</Text>
            <Text style={styles.dealTitle}>Hot Deals This Week</Text>
            <Text style={styles.dealText}>
              Save more on vitamins, skincare and everyday health essentials.
            </Text>
            <Pressable
              accessibilityRole="button"
              style={({pressed}) => [styles.dealButton, pressed && styles.pressed]}>
              <Text style={styles.dealButtonText}>Explore Deals  →</Text>
            </Pressable>
          </View>
          <Image
            accessibilityLabel="Vitamin C product"
            source={{uri: 'https://sellzy-html.vercel.app/assets/images/vitamin-c.png'}}
            style={styles.dealImage}
            resizeMode="contain"
          />
        </View>
      </ScrollView>

      <View style={[styles.bottomNav, {paddingBottom: Math.max(insets.bottom, 8)}]}>
        <Pressable accessibilityRole="button" style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navIconActive]}>⌂</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.navItem}>
          <Text style={styles.navIcon}>▣</Text>
          <Text style={styles.navLabel}>My Order</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.navItem}>
          <Text style={styles.navIcon}>♡</Text>
          <Text style={styles.navLabel}>Wishlist</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.navItem}>
          <Text style={styles.navIcon}>○</Text>
          <Text style={styles.navLabel}>My Account</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: COLORS.white},
  scrollContent: {paddingBottom: 28},
  promoBar: {
    minHeight: 42,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    backgroundColor: COLORS.teal,
    gap: 8,
  },
  promoSpark: {color: COLORS.white, fontSize: 16},
  promoText: {color: COLORS.white, fontSize: 12, fontWeight: '600'},
  promoBadge: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  promoBadgeText: {color: '#715600', fontSize: 10, fontWeight: '800'},
  header: {
    height: 78,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  menuIcon: {color: COLORS.ink, fontSize: 22, lineHeight: 26},
  logo: {width: 118, height: 40},
  cartButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  cartIcon: {
    color: COLORS.ink,
    fontSize: 25,
    transform: [{rotate: '12deg'}],
  },
  cartCountBubble: {
    position: 'absolute',
    right: -3,
    top: -3,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  cartCountText: {color: COLORS.white, fontSize: 10, fontWeight: '800'},
  pressed: {opacity: 0.72},
  searchWrap: {
    height: 52,
    marginHorizontal: 16,
    marginBottom: 22,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#DDE2E0',
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 18,
    paddingRight: 14,
  },
  searchInput: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 15,
    paddingVertical: 0,
  },
  searchIcon: {
    color: '#829098',
    fontSize: 29,
    lineHeight: 32,
    transform: [{rotate: '-20deg'}],
  },
  hero: {
    minHeight: 450,
    marginHorizontal: 16,
    paddingHorizontal: 30,
    paddingTop: 72,
    paddingBottom: 24,
    borderRadius: 26,
    backgroundColor: COLORS.darkTeal,
    overflow: 'hidden',
  },
  offerRow: {flexDirection: 'row', alignItems: 'center', gap: 9},
  offerLabel: {color: COLORS.white, fontSize: 14, fontWeight: '700'},
  heroBadge: {
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.yellow,
  },
  heroBadgeText: {color: '#5D4800', fontSize: 10, fontWeight: '800'},
  heroTitle: {
    marginTop: 18,
    color: COLORS.white,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.7,
    fontWeight: '800',
  },
  heroSubtitle: {
    marginTop: 16,
    color: '#E7F4F2',
    fontSize: 15,
    lineHeight: 23,
    fontWeight: '500',
  },
  heroButton: {
    alignSelf: 'flex-start',
    marginTop: 25,
    height: 48,
    paddingLeft: 20,
    paddingRight: 7,
    borderRadius: 25,
    backgroundColor: '#0B9E91',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroButtonPressed: {transform: [{scale: 0.98}]},
  heroButtonText: {color: COLORS.white, fontSize: 14, fontWeight: '800'},
  heroArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroArrow: {color: COLORS.teal, fontSize: 17, fontWeight: '700'},
  heroDots: {
    position: 'absolute',
    bottom: 18,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 13,
  },
  heroDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#D8E6E5',
  },
  heroDotActive: {width: 74, backgroundColor: '#0A948A'},
  featureList: {paddingHorizontal: 16, paddingVertical: 28, gap: 12},
  featureCard: {
    width: 156,
    minHeight: 142,
    padding: 17,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  featureIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF9DE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 13,
  },
  featureIcon: {color: '#6D6A57', fontSize: 15, fontWeight: '800'},
  featureTitle: {color: COLORS.ink, fontSize: 14, fontWeight: '800'},
  featureSubtitle: {
    color: COLORS.muted,
    marginTop: 5,
    fontSize: 12,
    lineHeight: 17,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 17,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  discountHeadingWrap: {flex: 1},
  sectionTitle: {
    color: COLORS.ink,
    fontSize: 21,
    lineHeight: 27,
    letterSpacing: -0.3,
    fontWeight: '800',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  viewAll: {color: COLORS.teal, fontSize: 13, fontWeight: '800', paddingVertical: 4},
  categoryList: {paddingHorizontal: 16, paddingBottom: 34, gap: 14},
  categoryItem: {width: 82, alignItems: 'center'},
  categoryImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryImage: {width: 58, height: 58},
  categoryLabel: {
    marginTop: 9,
    minHeight: 34,
    color: COLORS.ink,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  productList: {paddingHorizontal: 16, paddingBottom: 34, gap: 14},
  productCard: {
    width: PRODUCT_CARD_WIDTH,
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
    shadowColor: '#0B403C',
    shadowOffset: {width: 0, height: 7},
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  productImageWrap: {
    height: 220,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#F5F7F6',
  },
  productImage: {width: '92%', height: '92%'},
  discountBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    borderRadius: 4,
    backgroundColor: COLORS.red,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  discountText: {color: COLORS.white, fontSize: 10, fontWeight: '800'},
  floatingHeart: {
    position: 'absolute',
    right: 10,
    top: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    shadowColor: '#1D3030',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  heartText: {color: COLORS.ink, fontSize: 22, lineHeight: 26},
  heartTextActive: {color: COLORS.red},
  storeLabel: {marginTop: 14, color: COLORS.teal, fontSize: 11, fontWeight: '700'},
  productName: {
    minHeight: 44,
    marginTop: 5,
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '800',
  },
  ratingRow: {marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 5},
  stars: {color: COLORS.yellow, letterSpacing: 1, fontSize: 13},
  reviewText: {color: COLORS.muted, fontSize: 11},
  priceRow: {marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8},
  price: {color: COLORS.ink, fontSize: 17, fontWeight: '900'},
  oldPrice: {color: '#9CA3A7', fontSize: 12, textDecorationLine: 'line-through'},
  addButton: {
    height: 46,
    borderRadius: 24,
    marginTop: 14,
    backgroundColor: COLORS.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addButtonPressed: {backgroundColor: COLORS.darkTeal},
  addButtonIcon: {color: COLORS.white, fontSize: 19, fontWeight: '500'},
  addButtonText: {color: COLORS.white, fontSize: 14, fontWeight: '800'},
  emptyState: {
    marginHorizontal: 16,
    marginBottom: 34,
    padding: 28,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  emptyStateTitle: {color: COLORS.ink, fontSize: 16, fontWeight: '800'},
  emptyStateText: {color: COLORS.muted, fontSize: 13, marginTop: 5},
  dealBanner: {
    minHeight: 235,
    marginHorizontal: 16,
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.darkTeal,
    flexDirection: 'row',
  },
  dealContent: {width: '67%', zIndex: 2},
  dealEyebrow: {color: COLORS.yellow, fontSize: 10, letterSpacing: 1, fontWeight: '900'},
  dealTitle: {
    marginTop: 8,
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 29,
    fontWeight: '900',
  },
  dealText: {marginTop: 9, color: '#CDE2E0', fontSize: 12, lineHeight: 18},
  dealButton: {
    alignSelf: 'flex-start',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 20,
    backgroundColor: COLORS.yellow,
  },
  dealButtonText: {color: '#4A3B00', fontSize: 12, fontWeight: '900'},
  dealImage: {
    position: 'absolute',
    width: 155,
    height: 190,
    right: -38,
    bottom: -13,
    opacity: 0.92,
  },
  bottomNav: {
    minHeight: 72,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    shadowColor: '#1B3331',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 10,
  },
  navItem: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  navIcon: {color: COLORS.ink, fontSize: 24, lineHeight: 27},
  navIconActive: {color: COLORS.teal},
  navLabel: {marginTop: 2, color: COLORS.ink, fontSize: 11, fontWeight: '500'},
  navLabelActive: {color: COLORS.teal, fontWeight: '800'},
});

export default HomeScreen;
