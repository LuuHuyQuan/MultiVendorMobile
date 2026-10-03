import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  sellerPortalApi,
  type CreateSellerProductRequest,
  type SellerDashboard,
  type SellerOrder,
} from '../api/sellerPortal';
import { ApiError } from '../api/errors';
import { ScreenHeader, sharedStyles } from '../components/SellzyUI';
import { COLORS, money } from '../theme';

type Props = { topInset: number; onBack: () => void };
type Tab = 'overview' | 'products' | 'orders';

const orderLabel: Record<string, string> = {
  pending: 'Chờ duyệt',
  confirmed: 'Đã xác nhận',
  processing: 'Đang chuẩn bị',
  shipped: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

const emptyForm = {
  categoryId: 0,
  name: '',
  slug: '',
  sku: '',
  variantName: 'Mặc định',
  price: '',
  compareAtPrice: '',
  quantity: '0',
  lowStockThreshold: '0',
  shortDescription: '',
  description: '',
  imageUrl: '',
};
type ProductForm = typeof emptyForm;

const slugify = (value: string) =>
  value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function messageFor(error: unknown) {
  return error instanceof ApiError || error instanceof Error
    ? error.message
    : 'Không thể kết nối cửa hàng. Vui lòng thử lại.';
}

export default function SellerPortalScreen({ topInset, onBack }: Props) {
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<Tab>('overview');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [tracking, setTracking] = useState<Record<number, { provider: string; number: string }>>({});
  const [busyOrder, setBusyOrder] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const next = await sellerPortalApi.getDashboard();
      setDashboard(next);
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.status === 404
          ? 'Tài khoản chưa có cửa hàng đang hoạt động. Bạn có thể gửi hồ sơ trong mục Các cửa hàng.'
          : messageFor(cause),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateForm = (key: keyof ProductForm, value: string | number) =>
    setForm(current => ({ ...current, [key]: value }));

  const submitProduct = async () => {
    const price = Number(form.price);
    const compareAtPrice = form.compareAtPrice.trim()
      ? Number(form.compareAtPrice)
      : null;
    const quantity = Number(form.quantity);
    const lowStockThreshold = Number(form.lowStockThreshold);
    const imageUrl = form.imageUrl.trim();
    if (
      !form.categoryId || !form.name.trim() || !form.slug.trim() ||
      !form.sku.trim() || !form.variantName.trim() ||
      !Number.isFinite(price) || price <= 0 ||
      (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice < price)) ||
      !Number.isSafeInteger(quantity) || quantity < 0 ||
      !Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0
    ) {
      setError('Vui lòng nhập đủ thông tin sản phẩm, giá và tồn kho hợp lệ.');
      return;
    }
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      setError('Ảnh sản phẩm cần là liên kết HTTP hoặc HTTPS.');
      return;
    }
    const request: CreateSellerProductRequest = {
      categoryId: form.categoryId,
      name: form.name.trim(),
      slug: form.slug.trim().toLowerCase(),
      sku: form.sku.trim().toUpperCase(),
      variantName: form.variantName.trim(),
      price,
      compareAtPrice,
      quantity,
      lowStockThreshold,
      shortDescription: form.shortDescription.trim() || null,
      description: form.description.trim() || null,
      allowsQuantityPricing: false,
      imageUrls: imageUrl ? [imageUrl] : [],
    };
    setSaving(true);
    setError('');
    try {
      await sellerPortalApi.createProduct(request);
      setNotice('Đã gửi sản phẩm để duyệt.');
      setShowForm(false);
      setForm(emptyForm);
      await refresh();
      setTab('products');
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setSaving(false);
    }
  };

  const resubmit = async (id: number) => {
    setError('');
    try {
      await sellerPortalApi.resubmitProduct(id);
      setNotice('Đã gửi lại sản phẩm để duyệt.');
      await refresh();
    } catch (cause) {
      setError(messageFor(cause));
    }
  };

  const advanceOrder = async (order: SellerOrder) => {
    const next = order.statusName === 'confirmed'
      ? 'processing'
      : order.statusName === 'processing'
      ? 'shipped'
      : order.statusName === 'shipped'
      ? 'delivered'
      : null;
    if (!next) return;
    const shipment = tracking[order.id];
    if (
      next === 'shipped' &&
      (!shipment?.provider.trim() || !shipment.number.trim())
    ) {
      setError('Vui lòng nhập đơn vị vận chuyển và mã vận đơn.');
      return;
    }
    setBusyOrder(order.id);
    setError('');
    try {
      await sellerPortalApi.updateOrderStatus(order.id, {
        status: next,
        ...(next === 'shipped'
          ? {
              shippingProvider: shipment.provider.trim(),
              trackingNumber: shipment.number.trim(),
            }
          : {}),
      });
      setNotice('Đã cập nhật trạng thái đơn hàng.');
      await refresh();
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusyOrder(null);
    }
  };

  const updateTracking = (id: number, key: 'provider' | 'number', value: string) =>
    setTracking(current => ({
      ...current,
      [id]: {
        provider: current[id]?.provider ?? '',
        number: current[id]?.number ?? '',
        [key]: value,
      },
    }));

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader canGoBack onBack={onBack} title="Kênh người bán" subtitle={dashboard?.storeName} />
      {loading && !dashboard ? (
        <View style={styles.center}><ActivityIndicator color={COLORS.teal} /></View>
      ) : null}
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
      {!dashboard && !loading ? (
        <View style={styles.center}>
          <Action label="Thử tải lại" onPress={refresh} />
        </View>
      ) : null}
      {dashboard ? (
        <>
          <View style={styles.tabs}>
            {([
              ['overview', 'Tổng quan'],
              ['products', 'Sản phẩm'],
              ['orders', 'Đơn hàng'],
            ] as const).map(([id, label]) => (
              <Pressable
                key={id}
                accessibilityRole="tab"
                accessibilityState={{ selected: tab === id }}
                onPress={() => { setTab(id); setError(''); }}
                style={[styles.tab, tab === id && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === id && styles.tabTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {tab === 'overview' ? (
              <>
                <Text style={styles.title}>{dashboard.storeName}</Text>
                <View style={styles.summaryGrid}>
                  <Metric label="Sản phẩm" value={dashboard.summary.totalProducts} />
                  <Metric label="Chờ duyệt" value={dashboard.summary.pendingProducts} />
                  <Metric label="Đang bán" value={dashboard.summary.activeProducts} />
                  <Metric label="Đơn cần xử lý" value={dashboard.summary.pendingOrders} />
                </View>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>Doanh thu đơn đã xác nhận</Text>
                  <Text style={styles.money}>{money(dashboard.summary.confirmedRevenue / 1000)}</Text>
                </View>
                <Action label="Làm mới dữ liệu" onPress={refresh} />
              </>
            ) : null}
            {tab === 'products' ? (
              <>
                <Action label={showForm ? 'Đóng biểu mẫu' : 'Thêm sản phẩm'} onPress={() => { setShowForm(value => !value); setError(''); }} />
                {showForm ? (
                  <View style={styles.card}>
                    <Text style={styles.title}>Gửi sản phẩm mới</Text>
                    <Text style={styles.hint}>Sản phẩm sẽ chờ duyệt trước khi xuất hiện trong cửa hàng.</Text>
                    <Text style={styles.cardLabel}>Danh mục</Text>
                    <View style={styles.categoryRow}>
                      {dashboard.categories.map(category => (
                        <Pressable key={category.id} accessibilityRole="radio" accessibilityState={{ checked: form.categoryId === category.id }} onPress={() => updateForm('categoryId', category.id)} style={[styles.category, form.categoryId === category.id && styles.categoryActive]}>
                          <Text style={styles.categoryText}>{category.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Field label="Tên sản phẩm" value={form.name} onChangeText={value => {
                      setForm(current => ({
                        ...current,
                        name: value,
                        slug:
                          !current.slug || current.slug === slugify(current.name)
                            ? slugify(value)
                            : current.slug,
                      }));
                    }} />
                    <Field label="Đường dẫn sản phẩm" value={form.slug} onChangeText={value => updateForm('slug', value)} autoCapitalize="none" />
                    <Field label="Mã SKU" value={form.sku} onChangeText={value => updateForm('sku', value)} autoCapitalize="characters" />
                    <Field label="Tên phân loại" value={form.variantName} onChangeText={value => updateForm('variantName', value)} />
                    <Field label="Giá bán (₫)" value={form.price} onChangeText={value => updateForm('price', value)} keyboardType="decimal-pad" />
                    <Field label="Giá gốc (₫, nếu có)" value={form.compareAtPrice} onChangeText={value => updateForm('compareAtPrice', value)} keyboardType="decimal-pad" />
                    <Field label="Số lượng tồn" value={form.quantity} onChangeText={value => updateForm('quantity', value)} keyboardType="number-pad" />
                    <Field label="Ngưỡng sắp hết hàng" value={form.lowStockThreshold} onChangeText={value => updateForm('lowStockThreshold', value)} keyboardType="number-pad" />
                    <Field label="Mô tả ngắn" value={form.shortDescription} onChangeText={value => updateForm('shortDescription', value)} />
                    <Field label="Mô tả chi tiết" value={form.description} onChangeText={value => updateForm('description', value)} multiline />
                    <Field label="Liên kết ảnh (nếu có)" value={form.imageUrl} onChangeText={value => updateForm('imageUrl', value)} autoCapitalize="none" />
                    <Action label={saving ? 'Đang gửi…' : 'Gửi duyệt sản phẩm'} onPress={submitProduct} disabled={saving} />
                  </View>
                ) : null}
                {dashboard.products.length ? dashboard.products.map(product => (
                  <View key={product.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{product.name}</Text>
                    <Text style={styles.meta}>{product.categoryName} · {product.sku}</Text>
                    <Text style={styles.meta}>{product.statusLabel} · Còn {Math.max(0, product.availableQuantity)}</Text>
                    <Text style={styles.money}>{money(product.price / 1000)}</Text>
                    {product.statusName === 'archived' ? (
                      <Action label="Gửi duyệt lại" onPress={() => resubmit(product.id)} />
                    ) : null}
                  </View>
                )) : <Text style={styles.hint}>Chưa có sản phẩm.</Text>}
              </>
            ) : null}
            {tab === 'orders' ? (
              dashboard.orders.length ? dashboard.orders.map(order => {
                const nextLabel = order.statusName === 'confirmed'
                  ? 'Bắt đầu chuẩn bị'
                  : order.statusName === 'processing'
                  ? 'Bàn giao vận chuyển'
                  : order.statusName === 'shipped'
                  ? 'Đánh dấu đã giao'
                  : '';
                return (
                  <View key={order.id} style={styles.card}>
                    <Text style={styles.cardTitle}>{order.orderNumber}</Text>
                    <Text style={styles.meta}>{order.customerName} · {order.itemCount} sản phẩm</Text>
                    <Text style={styles.meta}>{orderLabel[order.statusName] ?? order.statusName}</Text>
                    <Text style={styles.money}>{money(order.total / 1000)}</Text>
                    {order.trackingNumber ? <Text style={styles.meta}>{order.shippingProvider}: {order.trackingNumber}</Text> : null}
                    {order.statusName === 'processing' ? (
                      <>
                        <Field label="Đơn vị vận chuyển" value={tracking[order.id]?.provider ?? ''} onChangeText={value => updateTracking(order.id, 'provider', value)} />
                        <Field label="Mã vận đơn" value={tracking[order.id]?.number ?? ''} onChangeText={value => updateTracking(order.id, 'number', value)} />
                      </>
                    ) : null}
                    {nextLabel ? <Action label={busyOrder === order.id ? 'Đang cập nhật…' : nextLabel} onPress={() => advanceOrder(order)} disabled={busyOrder !== null} /> : null}
                  </View>
                );
              }) : <Text style={styles.hint}>Chưa có đơn hàng.</Text>
            ) : null}
          </ScrollView>
        </>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.meta}>{label}</Text></View>;
}

function Action({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.action, disabled && styles.actionDisabled]}><Text style={styles.actionText}>{label}</Text></Pressable>;
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return <View style={styles.fieldWrap}><Text style={styles.cardLabel}>{label}</Text><TextInput accessibilityLabel={label} placeholderTextColor={COLORS.muted} style={styles.input} {...props} /></View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  content: { padding: 18, gap: 12, paddingBottom: 40 },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: COLORS.border },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 3, borderColor: COLORS.teal },
  tabText: { color: COLORS.muted, fontWeight: '700' },
  tabTextActive: { color: COLORS.teal },
  title: { fontSize: 21, fontWeight: '800', color: COLORS.ink },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '47%', backgroundColor: COLORS.surface, borderRadius: 14, padding: 14 },
  metricValue: { color: COLORS.teal, fontSize: 23, fontWeight: '800' },
  card: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 15, padding: 16, gap: 8 },
  cardTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '700' },
  cardLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  meta: { color: COLORS.muted, fontSize: 13 },
  money: { color: COLORS.teal, fontSize: 17, fontWeight: '800' },
  hint: { color: COLORS.muted, lineHeight: 19 },
  action: { backgroundColor: COLORS.teal, borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 4 },
  actionDisabled: { opacity: 0.5 },
  actionText: { color: COLORS.white, fontWeight: '700' },
  fieldWrap: { gap: 5 },
  input: { borderWidth: 1, borderColor: COLORS.border, color: COLORS.ink, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, minHeight: 43 },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  category: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 8 },
  categoryActive: { borderColor: COLORS.teal, backgroundColor: COLORS.tealSoft },
  categoryText: { color: COLORS.ink, fontSize: 12 },
  error: { color: COLORS.red, paddingHorizontal: 18, paddingVertical: 8, fontSize: 13 },
  notice: { color: COLORS.success, paddingHorizontal: 18, paddingVertical: 8, fontSize: 13 },
});
