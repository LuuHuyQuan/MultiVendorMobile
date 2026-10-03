import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Icon } from './Icon';
import { COLORS, money } from '../theme';
import type { CartQuantities, Product } from '../types';

type QuickCartModalProps = {
  visible: boolean;
  cart: CartQuantities;
  catalogProducts: Product[];
  recommendations: Product[];
  onClose: () => void;
  onViewCart: () => void;
  onCheckout: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string) => void;
  onSetQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
};

const unitPrice = (product: Product, quantity: number) =>
  product.priceTiers
    ?.filter(tier => tier.minQuantity <= quantity)
    .sort((a, b) => b.minQuantity - a.minQuantity)[0]?.price ?? product.price;

export function QuickCartModal({
  visible,
  cart,
  catalogProducts,
  recommendations,
  onClose,
  onViewCart,
  onCheckout,
  onOpenProduct,
  onAdd,
  onSetQuantity,
  onRemove,
}: QuickCartModalProps) {
  const { width, height } = useWindowDimensions();
  const desktop = width >= 800;
  const lines = catalogProducts.filter(product => (cart[product.id] ?? 0) > 0);
  const count = lines.reduce((sum, product) => sum + cart[product.id], 0);
  const subtotal = lines.reduce(
    (sum, product) => sum + unitPrice(product, cart[product.id]) * cart[product.id],
    0,
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close cart"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            styles.panel,
            {
              width: desktop ? Math.min(width - 48, 1100) : width - 20,
              height: desktop ? Math.min(height - 60, 900) : height - 36,
            },
          ]}
        >
          <View style={[styles.content, !desktop && styles.mobileContent]}>
            {desktop ? (
              <View style={styles.suggestionsColumn}>
                <View style={styles.columnHeader}>
                  <Text style={styles.heading}>Similar Products</Text>
                  <Text style={styles.subheading}>You May Also Like</Text>
                </View>
                <ScrollView
                  contentContainerStyle={styles.suggestionList}
                  showsVerticalScrollIndicator
                >
                  {recommendations.length ? recommendations.map(product => (
                    <View key={product.id} style={styles.suggestionCard}>
                      <Pressable onPress={() => onOpenProduct(product.id)} style={styles.imageWrap}>
                        <Image source={product.image} style={styles.productImage} resizeMode="contain" />
                        {product.discount > 0 ? (
                          <Text style={styles.saleBadge}>Sale</Text>
                        ) : null}
                      </Pressable>
                      <View style={styles.suggestionBody}>
                        <Pressable onPress={() => onOpenProduct(product.id)}>
                          <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        </Pressable>
                        <Text style={styles.meta} numberOfLines={1}>{product.store}</Text>
                        <View style={styles.suggestionBottom}>
                          <View style={styles.pricePair}>
                            <Text style={styles.price}>{money(product.price)}</Text>
                            {product.oldPrice > product.price ? (
                              <Text style={styles.oldPrice}>{money(product.oldPrice)}</Text>
                            ) : null}
                          </View>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Add ${product.name} to cart`}
                            onPress={() => onAdd(product.id)}
                            style={styles.addButton}
                          >
                            <Icon name="cart" size={19} color={COLORS.white} />
                            <Text style={styles.addButtonText}>Add</Text>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  )) : (
                    <Text style={styles.emptyText}>No similar products available.</Text>
                  )}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.cartColumn}>
              <View style={styles.cartHeader}>
                <View>
                  <Text style={styles.heading}>Cart Products</Text>
                  <Text style={styles.subheading}>
                    {count} {count === 1 ? 'Item' : 'Items'} in Cart
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close cart"
                  onPress={onClose}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={18} />
                </Pressable>
              </View>
              <ScrollView
                contentContainerStyle={styles.cartList}
                showsVerticalScrollIndicator
              >
                {lines.length ? lines.map(product => {
                  const quantity = cart[product.id];
                  const price = unitPrice(product, quantity);
                  return (
                    <View key={product.id} style={styles.cartCard}>
                      <Pressable onPress={() => onOpenProduct(product.id)} style={styles.imageWrap}>
                        <Image source={product.image} style={styles.productImage} resizeMode="contain" />
                        {product.stock <= 0 ? (
                          <Text style={styles.saleBadge}>Out of Stock</Text>
                        ) : null}
                      </Pressable>
                      <View style={styles.cartCardBody}>
                        <View style={styles.cartCardTop}>
                          <Pressable onPress={() => onOpenProduct(product.id)} style={styles.cartTitleWrap}>
                            <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Edit ${product.name}`}
                            onPress={() => onOpenProduct(product.id)}
                            style={styles.iconButton}
                          >
                            <Icon name="edit" size={18} />
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${product.name}`}
                            onPress={() => onRemove(product.id)}
                            style={styles.iconButton}
                          >
                            <Icon name="trash" size={18} />
                          </Pressable>
                        </View>
                        <Text style={styles.meta} numberOfLines={1}>{product.store}</Text>
                        <View style={styles.cartCardBottom}>
                          <View style={styles.pricePair}>
                            <Text style={styles.price}>{money(price)}</Text>
                            {product.oldPrice > price ? (
                              <Text style={styles.oldPrice}>{money(product.oldPrice)}</Text>
                            ) : null}
                          </View>
                          <View style={styles.quantityControl}>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Decrease quantity of ${product.name}`}
                              onPress={() => onSetQuantity(product.id, quantity - 1)}
                              style={styles.quantityButton}
                            >
                              <Icon name="minus" size={16} />
                            </Pressable>
                            <Text style={styles.quantityText}>{quantity}</Text>
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`Increase quantity of ${product.name}`}
                              disabled={quantity >= product.stock}
                              onPress={() => onSetQuantity(product.id, quantity + 1)}
                              style={[styles.quantityButton, quantity >= product.stock && styles.disabled]}
                            >
                              <Icon name="plus" size={16} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                }) : (
                  <Text style={styles.emptyText}>Your cart is empty. Add a product to get started.</Text>
                )}
              </ScrollView>
              <View style={styles.footer}>
                <View style={styles.subtotalRow}>
                  <Text style={styles.subtotalLabel}>Subtotal</Text>
                  <Text style={styles.subtotalValue}>{money(subtotal)}</Text>
                </View>
                <View style={styles.footerActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={onViewCart}
                    style={[styles.footerButton, styles.viewCartButton]}
                  >
                    <Text style={styles.viewCartText}>View Cart</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!lines.length}
                    onPress={onCheckout}
                    style={[styles.footerButton, styles.checkoutButton, !lines.length && styles.disabled]}
                  >
                    <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 25, 30, 0.46)',
  },
  panel: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  content: { flex: 1, flexDirection: 'row' },
  mobileContent: { flexDirection: 'column' },
  suggestionsColumn: {
    width: '45%',
    borderRightWidth: 1,
    borderRightColor: '#DCE3E8',
  },
  cartColumn: { flex: 1, minWidth: 0 },
  columnHeader: {
    height: 98,
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#DCE3E8',
  },
  cartHeader: {
    height: 98,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#DCE3E8',
  },
  heading: { fontSize: 20, fontWeight: '700', color: COLORS.ink },
  subheading: { fontSize: 15, color: '#5E6970', marginTop: 5 },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F4F6F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionList: { padding: 24, gap: 16 },
  cartList: { padding: 24, gap: 16 },
  suggestionCard: {
    minHeight: 146,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#DCE3E8',
    borderRadius: 16,
  },
  cartCard: {
    minHeight: 150,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#DCE3E8',
    borderRadius: 16,
  },
  imageWrap: {
    width: 102,
    height: 102,
    flexShrink: 0,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: { width: '100%', height: '100%' },
  saleBadge: {
    position: 'absolute',
    left: 0,
    top: 13,
    color: COLORS.white,
    backgroundColor: '#E40035',
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionBody: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between' },
  cartCardBody: { flex: 1, alignSelf: 'stretch', justifyContent: 'space-between' },
  cartCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  cartTitleWrap: { flex: 1 },
  iconButton: { padding: 3, marginLeft: 7 },
  productName: { color: COLORS.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },
  meta: { fontSize: 13, color: '#5E6970', marginTop: 7 },
  suggestionBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  cartCardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  pricePair: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  price: { color: COLORS.ink, fontSize: 15, fontWeight: '700' },
  oldPrice: { color: '#98A5B2', fontSize: 14, textDecorationLine: 'line-through' },
  addButton: {
    height: 46,
    minWidth: 86,
    borderRadius: 23,
    backgroundColor: COLORS.teal,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
  },
  addButtonText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  quantityControl: {
    height: 45,
    borderWidth: 1,
    borderColor: '#DCE3E8',
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  quantityButton: {
    width: 21,
    height: 21,
    borderWidth: 1.5,
    borderColor: COLORS.ink,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: { minWidth: 12, textAlign: 'center', color: COLORS.ink },
  disabled: { opacity: 0.45 },
  emptyText: { color: COLORS.muted, textAlign: 'center', paddingVertical: 36 },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#DCE3E8',
    backgroundColor: COLORS.white,
  },
  subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  subtotalLabel: { fontSize: 19, color: COLORS.ink, fontWeight: '600' },
  subtotalValue: { fontSize: 19, color: COLORS.ink, fontWeight: '700' },
  footerActions: { flexDirection: 'row', gap: 14 },
  footerButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewCartButton: { borderWidth: 1, borderColor: '#DCE3E8' },
  viewCartText: { fontSize: 15, color: COLORS.ink, fontWeight: '600' },
  checkoutButton: { backgroundColor: COLORS.teal },
  checkoutText: { fontSize: 15, color: COLORS.white, fontWeight: '700', textAlign: 'center' },
});
