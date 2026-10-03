import React, { useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Product } from '../types';
import { FREE_SHIPPING_THRESHOLD } from '../commerce';
import { COLORS, money } from '../theme';
import { Icon, type IconName } from './Icon';
import { ProductCard } from './SellzyUI';

type Props = {
  products: Product[];
  liveCatalog?: boolean;
  wishlistIds: string[];
  onOpenProduct: (id: string) => void;
  onAdd: (id: string) => void;
  onToggleLike: (id: string) => void;
};

const features: {
  icon: IconName;
  title: string;
  description: string;
  liveTitle: string;
  liveDescription: string;
}[] = [
  {
    icon: 'truck',
    title: 'Free Shipping',
    description: `Available on orders from ${money(FREE_SHIPPING_THRESHOLD)}`,
    liveTitle: 'Delivery Options',
    liveDescription: 'See delivery choices and costs before placing your order',
  },
  {
    icon: 'headset',
    title: 'Customer Support',
    description: 'Find help with your shopping and orders',
    liveTitle: 'Customer Support',
    liveDescription: 'Find help with your shopping and orders',
  },
  {
    icon: 'refresh',
    title: 'Return Requests',
    description: 'Request a return from an eligible order',
    liveTitle: 'Return Requests',
    liveDescription: 'Request a return from an eligible order',
  },
  {
    icon: 'credit-card',
    title: 'Payment Options',
    description: 'Choose an available method at checkout',
    liveTitle: 'Cash on Delivery',
    liveDescription: 'Pay for your order when it arrives',
  },
];

export function CartPromotions({
  products,
  liveCatalog = false,
  wishlistIds,
  onOpenProduct,
  onAdd,
  onToggleLike,
}: Props) {
  const { width: windowWidth } = useWindowDimensions();
  const desktop = windowWidth >= 1100;
  const columns = desktop ? 4 : windowWidth >= 650 ? 2 : 1;
  const cardGap = desktop ? 24 : 16;
  const sidePadding = desktop ? 48 : 20;
  const [panelWidth, setPanelWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const cardWidth = Math.max(
    0,
    ((panelWidth || Math.min(windowWidth, 1760)) -
      sidePadding * 2 -
      cardGap * (columns - 1)) /
      columns,
  );

  const scrollProducts = (direction: -1 | 1) => {
    const nextX = Math.max(0, scrollX + direction * 260);
    scrollRef.current?.scrollTo({ x: nextX, animated: true });
    setScrollX(nextX);
  };

  return (
    <View style={styles.wrapper}>
      <View
        onLayout={event => setPanelWidth(event.nativeEvent.layout.width)}
        style={styles.qualityPanel}
      >
        <View style={[styles.intro, desktop && styles.introDesktop]}>
          <Text style={styles.title}>Quality is our priority</Text>
          <Text style={styles.subtitle}>
            Because you deserve nothing less than the best.
          </Text>
        </View>

        <View
          style={[
            styles.featureGrid,
            desktop && styles.featureGridDesktop,
            {
              gap: cardGap,
              paddingHorizontal: sidePadding,
            },
          ]}
        >
          {features.map(feature => (
            <View
              key={feature.title}
              style={[
                styles.featureCard,
                desktop && styles.featureCardDesktop,
                { width: cardWidth },
              ]}
            >
              <View style={styles.featureIcon}>
                <Icon name={feature.icon} color={COLORS.ink} size={28} />
              </View>
              <Text style={styles.featureTitle}>
                {liveCatalog ? feature.liveTitle : feature.title}
              </Text>
              <Text style={styles.featureDescription}>
                {liveCatalog
                  ? feature.liveDescription
                  : feature.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {products.length > 0 ? (
        <View style={styles.productsSection}>
          <View style={styles.productsHeading}>
            <Text style={styles.productsTitle}>New Branded Products</Text>
            <View style={styles.carouselControls}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous branded products"
                onPress={() => scrollProducts(-1)}
                style={({ pressed }) => [
                  styles.carouselArrow,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="back" size={18} color={COLORS.ink} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next branded products"
                onPress={() => scrollProducts(1)}
                style={({ pressed }) => [
                  styles.carouselArrow,
                  pressed && styles.pressed,
                ]}
              >
                <Icon name="chevron-right" size={18} color={COLORS.ink} />
              </Pressable>
            </View>
          </View>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={32}
            onScroll={event => setScrollX(event.nativeEvent.contentOffset.x)}
            contentContainerStyle={styles.productList}
          >
            {products.slice(0, 12).map(product => (
              <ProductCard
                key={product.id}
                product={product}
                liked={wishlistIds.includes(product.id)}
                onOpen={() => onOpenProduct(product.id)}
                onAdd={() => onAdd(product.id)}
                onToggleLike={() => onToggleLike(product.id)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    maxWidth: 1760,
    alignSelf: 'center',
    paddingBottom: 42,
  },
  qualityPanel: {
    width: '100%',
    borderRadius: 46,
    overflow: 'hidden',
    backgroundColor: '#A5E6E3',
  },
  intro: {
    width: '94%',
    minHeight: 105,
    paddingHorizontal: 18,
    paddingTop: 2,
    paddingBottom: 24,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 90,
    borderBottomRightRadius: 90,
    backgroundColor: COLORS.white,
  },
  introDesktop: { width: '42%' },
  title: {
    color: COLORS.ink,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitle: {
    color: '#41566B',
    fontSize: 15,
    lineHeight: 21,
    marginTop: 12,
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 28,
    paddingBottom: 24,
  },
  featureGridDesktop: { marginTop: 68, paddingBottom: 48 },
  featureCard: {
    minHeight: 170,
    borderRadius: 15,
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  featureCardDesktop: { minHeight: 196 },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF6C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTitle: {
    color: COLORS.ink,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 16,
  },
  featureDescription: {
    color: '#41566B',
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    marginTop: 5,
  },
  productsSection: { marginTop: 66 },
  productsHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 48,
    marginBottom: 38,
  },
  productsTitle: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
  },
  carouselControls: { flexDirection: 'row', gap: 22 },
  carouselArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6F7',
  },
  pressed: { opacity: 0.7 },
  productList: { paddingHorizontal: 48, paddingBottom: 30, gap: 24 },
});
