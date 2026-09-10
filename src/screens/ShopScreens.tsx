import React, { useMemo, useState } from 'react';
import {
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  ProductCard,
  ScreenHeader,
  SearchBar,
  sharedStyles,
} from '../components/SellzyUI';
import { categories, products } from '../data/catalog';
import { COLORS, money } from '../theme';
import { Product, SortMode } from '../types';
import { Icon } from '../components/Icon';
import { AccountDialog } from './AccountForms';

const sorts: { id: SortMode; label: string }[] = [
  { id: 'popular', label: 'Top rated' },
  { id: 'price', label: 'Price: Low to high' },
  { id: 'price-desc', label: 'Price: High to low' },
  { id: 'discount', label: 'Biggest discount' },
];

type CommonProps = {
  topInset: number;
  cartCount: number;
  wishlistIds: string[];
  onBack: () => void;
  onCart: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string, quantity?: number) => void;
  onToggleLike: (id: string) => void;
};

type ShopProps = CommonProps & {
  initialCategory?: string;
  initialQuery?: string;
  initialStore?: string;
  initialSort?: SortMode;
  canGoBack?: boolean;
  onFiltersChange?: (filters: {
    category: string;
    query: string;
    sort: SortMode;
  }) => void;
};

export function ShopScreen({
  topInset,
  cartCount,
  wishlistIds,
  initialCategory,
  initialQuery,
  initialStore,
  initialSort,
  canGoBack = true,
  onFiltersChange,
  onBack,
  onCart,
  onOpenProduct,
  onAdd,
  onToggleLike,
}: ShopProps) {
  const [query, setQuery] = useState(initialQuery ?? '');
  const [category, setCategory] = useState(initialCategory ?? 'All');
  const [sortMode, setSortMode] = useState<SortMode>(initialSort ?? 'popular');
  const [showSort, setShowSort] = useState(false);
  const { width } = useWindowDimensions();
  const columns = width >= 750 ? 4 : width >= 550 ? 3 : width < 340 ? 1 : 2;
  const updateFilters = (next: {
    category?: string;
    query?: string;
    sort?: SortMode;
  }) => {
    const filters = { category, query, sort: sortMode, ...next };
    setCategory(filters.category);
    setQuery(filters.query);
    setSortMode(filters.sort);
    onFiltersChange?.(filters);
  };

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = products.filter(product => {
      const matchesCategory =
        category === 'All' || product.category === category;
      const matchesQuery =
        !normalized ||
        `${product.name} ${product.store} ${product.category}`
          .toLowerCase()
          .includes(normalized);
      return (
        matchesCategory &&
        matchesQuery &&
        (!initialStore || product.store === initialStore)
      );
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'price') return a.price - b.price;
      if (sortMode === 'price-desc') return b.price - a.price;
      if (sortMode === 'discount') return b.discount - a.discount;
      return b.rating - a.rating;
    });
  }, [category, query, sortMode, initialStore]);

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack={canGoBack}
        cartCount={cartCount}
        onBack={onBack}
        onCart={onCart}
        subtitle={`${visibleProducts.length} products available`}
        title={initialStore ?? 'Shop'}
      />
      <SearchBar
        onChangeText={text => updateFilters({ query: text })}
        onSubmit={Keyboard.dismiss}
        value={query}
      />
      <ScrollView
        style={styles.categoryScroller}
        contentContainerStyle={styles.filterRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {categories.map(item => {
          const active = item.id === category;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Category ${item.label}`}
              onPress={() => updateFilters({ category: item.id })}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text
                style={[styles.filterText, active && styles.filterTextActive]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <View style={styles.resultRow}>
        <View style={styles.resultCopy}>
          <Text style={styles.resultTitle}>
            {category === 'All' ? 'All Products' : category}
          </Text>
          <Text style={styles.resultSubtitle}>
            {visibleProducts.length} items found
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Change product sort"
          accessibilityRole="button"
          onPress={() => {
            Keyboard.dismiss();
            setShowSort(true);
          }}
          style={styles.sortButton}
        >
          <Text style={styles.sortLabel}>
            {sorts.find(item => item.id === sortMode)?.label}
          </Text>
          <Icon name="sort" size={18} color={COLORS.teal} />
        </Pressable>
      </View>
      <ScrollView
        style={styles.productScroller}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
      >
        {visibleProducts.length ? (
          <View style={styles.gridInner}>
            {visibleProducts.map(product => (
              <View
                key={product.id}
                style={[styles.gridCell, { width: `${100 / columns}%` }]}
              >
                <ProductCard
                  compact
                  liked={wishlistIds.includes(product.id)}
                  onAdd={() => onAdd(product.id)}
                  onOpen={() => onOpenProduct(product.id)}
                  onToggleLike={() => onToggleLike(product.id)}
                  product={product}
                />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noResults}>
            <Icon name="search" size={45} color={COLORS.teal} />
            <Text style={styles.noResultsTitle}>No products found</Text>
            <Text style={styles.noResultsText}>
              Try another keyword or category.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateFilters({ category: 'All', query: '' })}
              style={styles.resetButton}
            >
              <Text style={styles.resetLabel}>Clear filters</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {showSort ? (
        <AccountDialog title="Sort products" onClose={() => setShowSort(false)}>
          {sorts.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: sortMode === item.id }}
              onPress={() => {
                updateFilters({ sort: item.id });
                setShowSort(false);
              }}
              style={styles.sortOption}
            >
              <Text style={styles.sortOptionLabel}>{item.label}</Text>
              {sortMode === item.id ? (
                <Icon name="check" color={COLORS.teal} />
              ) : null}
            </Pressable>
          ))}
        </AccountDialog>
      ) : null}
    </View>
  );
}

type DetailsProps = CommonProps & {
  product: Product;
  onBuyNow: () => void;
};

export function ProductDetailsScreen({
  product,
  topInset,
  cartCount,
  wishlistIds,
  onBack,
  onCart,
  onAdd,
  onToggleLike,
  onOpenProduct,
  onBuyNow,
}: DetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const liked = wishlistIds.includes(product.id);
  const related = products
    .filter(
      item => item.id !== product.id && item.category === product.category,
    )
    .slice(0, 4);

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        cartCount={cartCount}
        onBack={onBack}
        onCart={onCart}
        subtitle={product.store}
        title="Product Details"
      />
      <ScrollView
        contentContainerStyle={styles.detailsContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsImageWrap}>
          <Image
            source={product.image}
            resizeMode="contain"
            style={styles.detailsImage}
          />
          <View style={styles.detailsDiscount}>
            <Text style={styles.detailsDiscountText}>
              SAVE {product.discount}%
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              liked ? 'Remove from wishlist' : 'Save to wishlist'
            }
            accessibilityState={{ selected: liked }}
            onPress={() => onToggleLike(product.id)}
            style={styles.detailsLike}
          >
            <Icon
              name="heart"
              filled={liked}
              color={liked ? COLORS.red : COLORS.ink}
            />
          </Pressable>
        </View>

        <View style={styles.detailsBody}>
          <Text style={styles.detailsStore}>{product.store}</Text>
          <Text style={styles.detailsName}>{product.name}</Text>
          <View style={styles.detailsRatingRow}>
            <Text style={styles.detailsStars}>★★★★★</Text>
            <Text style={styles.detailsRating}>
              {product.rating} · {product.reviews} reviews
            </Text>
          </View>
          <View style={styles.detailsPriceRow}>
            <Text style={styles.detailsPrice}>{money(product.price)}</Text>
            <Text style={styles.detailsOldPrice}>
              {money(product.oldPrice)}
            </Text>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>{product.stock} in stock</Text>
            </View>
          </View>

          <View style={styles.divider} />
          <Text style={styles.detailsSectionTitle}>About this product</Text>
          <Text style={styles.description}>{product.description}</Text>
          <View style={styles.benefitList}>
            {product.benefits.map(benefit => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={styles.checkCircle}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.benefitLabel}>{benefit}</Text>
              </View>
            ))}
          </View>

          <View style={styles.purchaseRow}>
            <View style={styles.quantityPicker}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Decrease quantity"
                disabled={quantity <= 1}
                onPress={() => setQuantity(value => Math.max(1, value - 1))}
                style={styles.quantityButton}
              >
                <Icon
                  name="minus"
                  size={18}
                  color={quantity <= 1 ? COLORS.muted : COLORS.teal}
                />
              </Pressable>
              <Text style={styles.quantityValue}>{quantity}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Increase quantity"
                disabled={quantity >= product.stock}
                onPress={() =>
                  setQuantity(value => Math.min(product.stock, value + 1))
                }
                style={styles.quantityButton}
              >
                <Icon name="plus" size={18} color={COLORS.teal} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              testID="details-add"
              onPress={() => onAdd(product.id, quantity)}
              style={styles.addLarge}
            >
              <Text style={styles.addLargeText}>Add to Cart</Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onAdd(product.id, quantity);
              onBuyNow();
            }}
            style={styles.buyNow}
          >
            <Text style={styles.buyNowText}>Buy Now →</Text>
          </Pressable>

          {related.length ? (
            <>
              <Text style={styles.relatedTitle}>You may also like</Text>
              <ScrollView
                contentContainerStyle={styles.relatedList}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {related.map(item => (
                  <ProductCard
                    key={item.id}
                    liked={wishlistIds.includes(item.id)}
                    onAdd={() => onAdd(item.id)}
                    onOpen={() => onOpenProduct(item.id)}
                    onToggleLike={() => onToggleLike(item.id)}
                    product={item}
                  />
                ))}
              </ScrollView>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  categoryScroller: { flexGrow: 0, flexShrink: 0, height: 52 },
  productScroller: { flex: 1 },
  resultCopy: { flex: 1, paddingRight: 8 },
  sortOption: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  sortOptionLabel: { fontSize: 15, color: COLORS.ink, fontWeight: '700' },
  resetButton: {
    minHeight: 44,
    paddingHorizontal: 24,
    marginTop: 18,
    borderRadius: 24,
    backgroundColor: COLORS.teal,
    justifyContent: 'center',
  },
  resetLabel: { color: COLORS.white, fontWeight: '800' },
  filterRow: { paddingHorizontal: 16, paddingBottom: 8, gap: 8 },
  filterChip: {
    height: 44,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  filterChipActive: { borderColor: COLORS.teal, backgroundColor: COLORS.teal },
  filterText: { color: COLORS.muted, fontSize: 11, fontWeight: '700' },
  filterTextActive: { color: COLORS.white },
  resultRow: {
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultTitle: { color: COLORS.ink, fontSize: 20, fontWeight: '900' },
  resultSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  sortButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sortLabel: { color: COLORS.ink, fontSize: 10, fontWeight: '800' },
  sortIcon: { color: COLORS.teal, fontSize: 14, fontWeight: '900' },
  grid: { paddingHorizontal: 11, paddingBottom: 28 },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { width: '50%', padding: 5 },
  noResults: { paddingVertical: 80, alignItems: 'center' },
  noResultsIcon: { color: COLORS.teal, fontSize: 45 },
  noResultsTitle: {
    color: COLORS.ink,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 15,
  },
  noResultsText: { color: COLORS.muted, fontSize: 13, marginTop: 5 },
  detailsContent: { paddingBottom: 32 },
  detailsImageWrap: {
    height: 365,
    margin: 16,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  detailsImage: { width: '88%', height: '82%' },
  detailsDiscount: {
    position: 'absolute',
    top: 15,
    left: 15,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 7,
    backgroundColor: COLORS.red,
  },
  detailsDiscountText: { color: COLORS.white, fontSize: 9, fontWeight: '900' },
  detailsLike: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  detailsLikeIcon: { color: COLORS.ink, fontSize: 27 },
  liked: { color: COLORS.red },
  imageDots: { position: 'absolute', bottom: 15, flexDirection: 'row', gap: 6 },
  imageDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#C9D1CF',
  },
  imageDotActive: { width: 24, backgroundColor: COLORS.teal },
  detailsBody: { paddingHorizontal: 16 },
  detailsStore: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  detailsName: {
    color: COLORS.ink,
    fontSize: 25,
    lineHeight: 32,
    fontWeight: '900',
    marginTop: 7,
  },
  detailsRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  detailsStars: { color: COLORS.yellow, fontSize: 15, letterSpacing: 1 },
  detailsRating: { color: COLORS.muted, fontSize: 11, marginLeft: 8 },
  detailsPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  detailsPrice: { color: COLORS.ink, fontSize: 25, fontWeight: '900' },
  detailsOldPrice: {
    color: '#9CA4A7',
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  stockBadge: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E8F7EE',
  },
  stockText: { color: COLORS.success, fontSize: 9, fontWeight: '900' },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 22 },
  detailsSectionTitle: { color: COLORS.ink, fontSize: 17, fontWeight: '900' },
  description: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },
  benefitList: { marginTop: 15, gap: 10 },
  benefitRow: { flexDirection: 'row', alignItems: 'center' },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  checkText: { color: COLORS.teal, fontSize: 11, fontWeight: '900' },
  benefitLabel: {
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 9,
  },
  purchaseRow: { flexDirection: 'row', marginTop: 24, gap: 10 },
  quantityPicker: {
    width: 126,
    height: 52,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  quantityButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: { color: COLORS.teal, fontSize: 20, fontWeight: '800' },
  quantityValue: { color: COLORS.ink, fontSize: 15, fontWeight: '900' },
  addLarge: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  addLargeText: { color: COLORS.white, fontSize: 14, fontWeight: '900' },
  buyNow: {
    height: 52,
    marginTop: 10,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyNowText: { color: COLORS.teal, fontSize: 14, fontWeight: '900' },
  relatedTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 30,
    marginBottom: 15,
  },
  relatedList: { gap: 12, paddingBottom: 5 },
});
