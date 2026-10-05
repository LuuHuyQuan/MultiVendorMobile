import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import {
  customerShoppingApi,
  type ProductReviewsPage,
} from '../api/customerShopping';
import {
  ProductCard,
  ScreenHeader,
  SearchBar,
  sharedStyles,
} from '../components/SellzyUI';
import { categories, products } from '../data/catalog';
import type { LiveCategory } from '../data/liveCatalog';
import { CategoryImage } from '../components/CategoryImage';
import { COLORS, money } from '../theme';
import { Product, SortMode } from '../types';
import { Icon } from '../components/Icon';
import { AccountDialog } from './AccountForms';

const sorts: { id: SortMode; label: string }[] = [
  { id: 'popular', label: 'Đánh giá cao' },
  { id: 'price', label: 'Giá: thấp đến cao' },
  { id: 'price-desc', label: 'Giá: cao đến thấp' },
  { id: 'discount', label: 'Giảm giá nhiều nhất' },
];

const searchable = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN');

type CommonProps = {
  topInset: number;
  cartCount: number;
  wishlistIds: string[];
  catalogProducts?: Product[];
  onBack: () => void;
  onCart: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string, quantity?: number, variantId?: number) => void;
  onToggleLike: (id: string) => void;
};

type ShopProps = CommonProps & {
  initialCategory?: string;
  initialQuery?: string;
  initialStore?: string;
  initialSort?: SortMode;
  catalogCategories?: LiveCategory[];
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
  catalogProducts = products,
  catalogCategories = categories,
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
    const normalized = searchable(query.trim());
    const filtered = catalogProducts.filter(product => {
      const matchesCategory =
        category === 'All' || product.category === category;
      const matchesQuery =
        !normalized ||
        searchable(
          `${product.name} ${product.store} ${product.category} ${
            catalogCategories.find(item => item.id === product.category)
              ?.label ?? ''
          }`,
        ).includes(normalized);
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
  }, [
    catalogCategories,
    catalogProducts,
    category,
    query,
    sortMode,
    initialStore,
  ]);
  const categoryLabel =
    catalogCategories.find(item => item.id === category)?.label ?? category;

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack={canGoBack}
        cartCount={cartCount}
        onBack={onBack}
        onCart={onCart}
        subtitle={`${visibleProducts.length} sản phẩm đang có`}
        title={initialStore ?? 'Cửa hàng'}
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
        {catalogCategories.map(item => {
          const active = item.id === category;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Danh mục ${item.label}`}
              onPress={() => updateFilters({ category: item.id })}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              {item.id !== 'All' ? (
                <View style={styles.filterImageWrap}>
                  <CategoryImage source={item.image} iconSize={17} />
                </View>
              ) : null}
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
            {category === 'All' ? 'Tất cả sản phẩm' : categoryLabel}
          </Text>
          <Text style={styles.resultSubtitle}>
            {visibleProducts.length} sản phẩm tìm thấy
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Đổi cách sắp xếp sản phẩm"
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
            <Text style={styles.noResultsTitle}>Không tìm thấy sản phẩm</Text>
            <Text style={styles.noResultsText}>
              Hãy thử từ khóa hoặc danh mục khác.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => updateFilters({ category: 'All', query: '' })}
              style={styles.resetButton}
            >
              <Text style={styles.resetLabel}>Xóa bộ lọc</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
      {showSort ? (
        <AccountDialog
          title="Sắp xếp sản phẩm"
          onClose={() => setShowSort(false)}
        >
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
  isLoggedIn?: boolean;
  onBuyNow: (id: string, quantity: number, variantId?: number) => void;
};

const reviewStars = (rating: number) => {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return `${'★'.repeat(filled)}${'☆'.repeat(5 - filled)}`;
};

const reviewDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('vi-VN');
};

const reviewErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Không thể tải đánh giá. Vui lòng thử lại.';

export function ProductDetailsScreen({
  product,
  isLoggedIn = false,
  topInset,
  cartCount,
  wishlistIds,
  catalogProducts = products,
  onBack,
  onCart,
  onAdd,
  onToggleLike,
  onOpenProduct,
  onBuyNow,
}: DetailsProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null,
  );
  const [reviewData, setReviewData] = useState<ProductReviewsPage | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewLoadingMore, setReviewLoadingMore] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewNotice, setReviewNotice] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewReload, setReviewReload] = useState(0);
  const reviewGeneration = useRef(0);
  const moreController = useRef<AbortController | null>(null);
  const isLiveProduct = product.variantId !== undefined && /^[1-9]\d*$/.test(product.id);
  const reviewProductId = isLiveProduct ? Number(product.id) : null;

  useEffect(() => {
    if (reviewProductId === null) return;
    const generation = ++reviewGeneration.current;
    const controller = new AbortController();
    moreController.current?.abort();
    setReviewData(null);
    setReviewError('');
    setReviewNotice('');
    setReviewLoading(true);
    setReviewLoadingMore(false);
    customerShoppingApi.getProductReviews(
      reviewProductId, 1, 10, controller.signal, isLoggedIn,
    ).then(page => {
      if (generation !== reviewGeneration.current) return;
      setReviewData(page);
      setReviewRating(page.mine?.rating ?? 5);
      setReviewTitle(page.mine?.title ?? '');
      setReviewComment(page.mine?.comment ?? '');
    }).catch(error => {
      if (generation !== reviewGeneration.current || controller.signal.aborted) return;
      setReviewError(reviewErrorMessage(error));
    }).finally(() => {
      if (generation === reviewGeneration.current) setReviewLoading(false);
    });
    return () => {
      reviewGeneration.current += 1;
      controller.abort();
      moreController.current?.abort();
    };
  }, [reviewProductId, isLoggedIn, reviewReload]);

  const loadMoreReviews = async () => {
    if (
      reviewProductId === null ||
      !reviewData ||
      reviewLoadingMore ||
      reviewData.items.length >= reviewData.total
    ) return;
    const generation = reviewGeneration.current;
    const controller = new AbortController();
    moreController.current = controller;
    setReviewLoadingMore(true);
    setReviewError('');
    try {
      const next = await customerShoppingApi.getProductReviews(
        reviewProductId, reviewData.page + 1, 10, controller.signal, isLoggedIn,
      );
      if (generation !== reviewGeneration.current) return;
      setReviewData(current => current && current.page < next.page
        ? { ...next, items: [...current.items, ...next.items] }
        : current);
    } catch (error) {
      if (!controller.signal.aborted && generation === reviewGeneration.current) {
        setReviewError(reviewErrorMessage(error));
      }
    } finally {
      if (generation === reviewGeneration.current) setReviewLoadingMore(false);
    }
  };

  const submitReview = async () => {
    if (
      reviewProductId === null ||
      !isLoggedIn ||
      !reviewData?.canReview ||
      reviewSubmitting
    ) return;
    const generation = reviewGeneration.current;
    moreController.current?.abort();
    setReviewSubmitting(true);
    setReviewError('');
    setReviewNotice('');
    try {
      const message = await customerShoppingApi.saveProductReview(reviewProductId, {
        rating: reviewRating,
        title: reviewTitle.trim() || null,
        comment: reviewComment.trim() || null,
      });
      if (generation !== reviewGeneration.current) return;
      setReviewNotice(message || 'Đã lưu đánh giá của bạn.');
      const updated = await customerShoppingApi.getProductReviews(
        reviewProductId, 1, 10, undefined, isLoggedIn,
      );
      if (generation === reviewGeneration.current) setReviewData(updated);
    } catch (error) {
      if (generation === reviewGeneration.current) setReviewError(reviewErrorMessage(error));
    } finally {
      if (generation === reviewGeneration.current) setReviewSubmitting(false);
    }
  };
  const variants = product.variants ?? [];
  const selectedVariant =
    variants.find(item => item.id === selectedVariantId) ??
    variants.find(item => item.stock > 0) ??
    variants[0];
  const currentStock = selectedVariant?.stock ?? product.stock;
  const basePrice = selectedVariant?.price ?? product.price;
  const currentPrice =
    (selectedVariant?.priceTiers ?? product.priceTiers)
      ?.filter(tier => tier.minQuantity <= quantity)
      .sort((a, b) => b.minQuantity - a.minQuantity)[0]?.price ?? basePrice;
  const isAvailable = currentStock > 0;
  const liked = wishlistIds.includes(product.id);
  const related = catalogProducts
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
        title="Chi tiết sản phẩm"
      />
      <ScrollView
        contentContainerStyle={styles.detailsContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.detailsImageWrap}>
          <Image
            source={product.image}
            resizeMode="contain"
            style={styles.detailsImage}
          />
          {product.discount > 0 &&
          product.oldPrice > product.price &&
          !selectedVariant ? (
            <View style={styles.detailsDiscount}>
              <Text style={styles.detailsDiscountText}>
                GIẢM {product.discount}%
              </Text>
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              liked ? 'Bỏ khỏi yêu thích' : 'Lưu vào yêu thích'
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
            <Text style={styles.detailsStars}>
              {reviewStars(reviewData?.average ?? product.rating)}
            </Text>
            <Text style={styles.detailsRating}>
              {(reviewData?.average ?? product.rating).toFixed(1)} ·{' '}
              {reviewData?.total ?? product.reviews} lượt đánh giá
            </Text>
          </View>
          <View style={styles.detailsPriceRow}>
            <Text style={styles.detailsPrice}>{money(currentPrice)}</Text>
            {!selectedVariant && product.oldPrice > product.price ? (
              <Text style={styles.detailsOldPrice}>
                {money(product.oldPrice)}
              </Text>
            ) : null}
            <View
              style={[
                styles.stockBadge,
                !isAvailable && styles.stockBadgeEmpty,
              ]}
            >
              <Text
                style={[
                  styles.stockText,
                  !isAvailable && styles.stockTextEmpty,
                ]}
              >
                {isAvailable ? `Còn ${currentStock} sản phẩm` : 'Hết hàng'}
              </Text>
            </View>
          </View>

          {variants.length ? (
            <View style={styles.variantSection}>
              <Text style={styles.variantTitle}>Phân loại sản phẩm</Text>
              <View style={styles.variantList}>
                {variants.map(variant => {
                  const active = selectedVariant?.id === variant.id;
                  return (
                    <Pressable
                      key={variant.id}
                      accessibilityRole="radio"
                      accessibilityLabel={`${variant.name}, ${money(
                        variant.price,
                      )}${variant.stock ? '' : ', hết hàng'}`}
                      accessibilityState={{
                        checked: active,
                        disabled: variant.stock <= 0,
                      }}
                      disabled={variant.stock <= 0}
                      onPress={() => {
                        setSelectedVariantId(variant.id);
                        setQuantity(1);
                      }}
                      style={[
                        styles.variantChip,
                        active && styles.variantChipActive,
                        variant.stock <= 0 && styles.variantChipDisabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.variantChipText,
                          active && styles.variantChipTextActive,
                        ]}
                      >
                        {variant.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.divider} />
          <Text style={styles.detailsSectionTitle}>Thông tin sản phẩm</Text>
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
                accessibilityLabel="Giảm số lượng"
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
                accessibilityLabel="Tăng số lượng"
                disabled={!isAvailable || quantity >= currentStock}
                onPress={() =>
                  setQuantity(value => Math.min(currentStock, value + 1))
                }
                style={styles.quantityButton}
              >
                <Icon name="plus" size={18} color={COLORS.teal} />
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="button"
              testID="details-add"
              disabled={!isAvailable}
              accessibilityState={{ disabled: !isAvailable }}
              onPress={() => onAdd(product.id, quantity, selectedVariant?.id)}
              style={[styles.addLarge, !isAvailable && styles.purchaseDisabled]}
            >
              <Text style={styles.addLargeText}>
                {isAvailable ? 'Thêm vào giỏ' : 'Hết hàng'}
              </Text>
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            disabled={!isAvailable}
            accessibilityState={{ disabled: !isAvailable }}
            onPress={() => {
              onBuyNow(product.id, quantity, selectedVariant?.id);
            }}
            style={[styles.buyNow, !isAvailable && styles.purchaseDisabled]}
          >
            <Text style={styles.buyNowText}>Mua ngay →</Text>
          </Pressable>

          {isLiveProduct ? (
            <View style={styles.reviewsSection}>
              <Text style={styles.detailsSectionTitle}>Đánh giá từ người mua</Text>
              {reviewLoading ? (
                <ActivityIndicator
                  accessibilityLabel="Đang tải đánh giá"
                  color={COLORS.teal}
                  style={styles.reviewsLoader}
                />
              ) : null}
              {reviewError ? (
                <View style={styles.reviewMessage}>
                  <Text accessibilityLiveRegion="polite" style={styles.reviewError}>
                    {reviewError}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setReviewReload(value => value + 1)}
                    style={styles.reviewRetry}
                  >
                    <Text style={styles.reviewRetryText}>Tải lại đánh giá</Text>
                  </Pressable>
                </View>
              ) : null}
              {reviewNotice ? (
                <Text accessibilityLiveRegion="polite" style={styles.reviewNotice}>
                  {reviewNotice}
                </Text>
              ) : null}
              {reviewData ? (
                <>
                  <Text style={styles.reviewsSummary}>
                    {reviewData.total > 0
                      ? `${reviewData.average.toFixed(1)}/5 · ${reviewData.total} đánh giá đã duyệt`
                      : 'Chưa có đánh giá nào cho sản phẩm này.'}
                  </Text>
                  {reviewData.items.map(review => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewCardHeader}>
                        <Text style={styles.reviewAuthor}>{review.author}</Text>
                        <Text style={styles.reviewDate}>{reviewDate(review.createdAt)}</Text>
                      </View>
                      <Text style={styles.reviewStars}>{reviewStars(review.rating)}</Text>
                      {review.verifiedPurchase ? (
                        <Text style={styles.verifiedReview}>Đã mua và nhận hàng</Text>
                      ) : null}
                      {review.title ? (
                        <Text style={styles.reviewTitle}>{review.title}</Text>
                      ) : null}
                      {review.comment ? (
                        <Text style={styles.reviewComment}>{review.comment}</Text>
                      ) : null}
                    </View>
                  ))}
                  {reviewData.items.length < reviewData.total ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={reviewLoadingMore}
                      onPress={loadMoreReviews}
                      style={styles.reviewMore}
                    >
                      <Text style={styles.reviewMoreText}>
                        {reviewLoadingMore ? 'Đang tải...' : 'Xem thêm đánh giá'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <View style={styles.reviewForm}>
                    <Text style={styles.reviewFormTitle}>
                      {reviewData.mine ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá'}
                    </Text>
                    {!isLoggedIn ? (
                      <Text style={styles.reviewHelp}>
                        Đăng nhập để đánh giá sản phẩm sau khi đơn hàng đã được giao.
                      </Text>
                    ) : !reviewData.canReview ? (
                      <Text style={styles.reviewHelp}>
                        Bạn có thể đánh giá sau khi đã mua và nhận sản phẩm này.
                      </Text>
                    ) : (
                      <>
                        <View style={styles.reviewRatingPicker}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Pressable
                              key={star}
                              accessibilityLabel={`${star} sao`}
                              accessibilityRole="button"
                              accessibilityState={{ selected: reviewRating === star }}
                              onPress={() => setReviewRating(star)}
                              style={styles.reviewStarButton}
                            >
                              <Text style={styles.reviewStarText}>
                                {star <= reviewRating ? '★' : '☆'}
                              </Text>
                            </Pressable>
                          ))}
                        </View>
                        <TextInput
                          accessibilityLabel="Tiêu đề đánh giá"
                          maxLength={180}
                          onChangeText={setReviewTitle}
                          placeholder="Tiêu đề (không bắt buộc)"
                          placeholderTextColor={COLORS.muted}
                          style={styles.reviewInput}
                          value={reviewTitle}
                        />
                        <TextInput
                          accessibilityLabel="Nội dung đánh giá"
                          maxLength={2000}
                          multiline
                          onChangeText={setReviewComment}
                          placeholder="Chia sẻ trải nghiệm của bạn (không bắt buộc)"
                          placeholderTextColor={COLORS.muted}
                          style={[styles.reviewInput, styles.reviewCommentInput]}
                          textAlignVertical="top"
                          value={reviewComment}
                        />
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ disabled: reviewSubmitting }}
                          disabled={reviewSubmitting}
                          onPress={submitReview}
                          style={[
                            styles.reviewSubmit,
                            reviewSubmitting && styles.purchaseDisabled,
                          ]}
                        >
                          <Text style={styles.reviewSubmitText}>
                            {reviewSubmitting ? 'Đang lưu...' : 'Gửi đánh giá'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                </>
              ) : null}
            </View>
          ) : null}

          {related.length ? (
            <>
              <Text style={styles.relatedTitle}>Có thể bạn cũng thích</Text>
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
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  filterImageWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  filterChipActive: { borderColor: COLORS.teal, backgroundColor: COLORS.teal },
  filterText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
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
  resultSubtitle: { color: COLORS.muted, fontSize: 12, marginTop: 3 },
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
  sortLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
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
  noResultsText: { color: COLORS.muted, fontSize: 14, marginTop: 5 },
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
  detailsDiscountText: { color: COLORS.white, fontSize: 10, fontWeight: '900' },
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
  detailsStore: { color: COLORS.teal, fontSize: 13, fontWeight: '800' },
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
  detailsRating: { color: COLORS.muted, fontSize: 12, marginLeft: 8 },
  detailsPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
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
  stockText: { color: COLORS.success, fontSize: 11, fontWeight: '900' },
  stockBadgeEmpty: { backgroundColor: '#FDE9ED' },
  stockTextEmpty: { color: COLORS.red },
  variantSection: { marginTop: 20 },
  variantTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  variantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  variantChip: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  variantChipActive: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  variantChipDisabled: { opacity: 0.45 },
  variantChipText: { color: COLORS.ink, fontSize: 12, fontWeight: '700' },
  variantChipTextActive: { color: COLORS.teal, fontWeight: '900' },
  purchaseDisabled: { opacity: 0.5 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 22 },
  detailsSectionTitle: { color: COLORS.ink, fontSize: 19, fontWeight: '900' },
  description: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 22,
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
    fontSize: 13,
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
  quantityValue: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
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
  reviewsSection: {
    marginTop: 30,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  reviewsLoader: { marginTop: 20 },
  reviewsSummary: { color: COLORS.muted, fontSize: 13, marginTop: 8 },
  reviewMessage: { marginTop: 12, gap: 8 },
  reviewError: { color: COLORS.red, fontSize: 13, lineHeight: 19 },
  reviewNotice: {
    color: COLORS.success,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
  },
  reviewRetry: { alignSelf: 'flex-start', paddingVertical: 7 },
  reviewRetryText: { color: COLORS.teal, fontWeight: '800' },
  reviewCard: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingVertical: 16,
  },
  reviewCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  reviewAuthor: { flex: 1, color: COLORS.ink, fontWeight: '800', fontSize: 14 },
  reviewDate: { color: COLORS.muted, fontSize: 11 },
  reviewStars: { color: COLORS.yellow, fontSize: 15, marginTop: 7 },
  verifiedReview: { color: COLORS.success, fontSize: 11, marginTop: 5 },
  reviewTitle: { color: COLORS.ink, fontSize: 14, fontWeight: '800', marginTop: 8 },
  reviewComment: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 5 },
  reviewMore: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 8,
  },
  reviewMoreText: { color: COLORS.teal, fontWeight: '800', fontSize: 13 },
  reviewForm: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  reviewFormTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '900' },
  reviewHelp: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginTop: 8 },
  reviewRatingPicker: { flexDirection: 'row', gap: 4, marginTop: 12 },
  reviewStarButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewStarText: { color: COLORS.yellow, fontSize: 29 },
  reviewInput: {
    minHeight: 46,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    color: COLORS.ink,
    fontSize: 13,
  },
  reviewCommentInput: { minHeight: 96 },
  reviewSubmit: {
    minHeight: 46,
    marginTop: 14,
    borderRadius: 23,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewSubmitText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
});
