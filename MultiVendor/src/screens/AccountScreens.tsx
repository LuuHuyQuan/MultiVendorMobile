import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type {
  CustomerOrderDetail,
  CustomerReturnLineRequest,
} from '../api/customerOrders';
import { customerSupportApi, type Faq, type SupportTicket, type SupportTicketDetail } from '../api/customerSupport';
import { accountApi } from '../api/account';

import {
  AccountProfile,
  AuthSession,
} from '../accountTypes';
import {
  EmptyState,
  ProductCard,
  ScreenHeader,
  sharedStyles,
} from '../components/SellzyUI';
import { Icon, IconName } from '../components/Icon';
import { products, sellers } from '../data/catalog';
import { COLORS, money } from '../theme';
import type { Order, Product } from '../types';
import {
  AccountAction,
  AccountDialog,
  AccountField,
  AccountNotice,
} from './AccountForms';

const sellerColors = [
  '#E7F7F5',
  '#FFF5D2',
  '#EAF1FF',
  '#EAF8E9',
  '#F1EAFE',
  '#FFECEA',
];

function getCatalogueSellers(catalogProducts: Product[]) {
  const grouped = new Map<string, Product[]>();
  catalogProducts.forEach(product => {
    const listed = grouped.get(product.store) ?? [];
    listed.push(product);
    grouped.set(product.store, listed);
  });
  return [...grouped].map(([name, storeProducts], index) => {
    const listedSeller = sellers.find(seller => seller.name === name);
    const rating =
      storeProducts.reduce((total, product) => total + product.rating, 0) /
      storeProducts.length;
    return {
      name,
      color: listedSeller?.color ?? sellerColors[index % sellerColors.length],
      productCount: storeProducts.length,
      rating,
    };
  });
}

type OrdersProps = {
  topInset: number;
  orders: Order[];
  synced?: boolean;
  loading?: boolean;
  loadError?: string;
  catalogProducts?: Product[];
  cartCount: number;
  onCart: () => void;
  onShop: () => void;
  onOpenProduct: (id: string) => void;
  onReorder: (order: Order) => void;
  onReorderServer: (order: Order, detail: CustomerOrderDetail) => void;
  onRefresh: () => void;
  onLoadDetail: (id: number) => Promise<CustomerOrderDetail>;
  onCancelOrder: (id: number, reason: string) => Promise<void>;
  onRequestReturn: (
    id: number,
    reason: string,
    lines: CustomerReturnLineRequest[],
  ) => Promise<void>;
};

const orderStatusLabel = (name?: string) => {
  switch (name?.toLowerCase()) {
    case 'pending': return 'Chờ xác nhận';
    case 'confirmed': return 'Đã xác nhận';
    case 'processing': return 'Đang chuẩn bị';
    case 'packed': return 'Đã đóng gói';
    case 'shipped':
    case 'in_transit': return 'Đang giao';
    case 'delivered': return 'Đã giao';
    case 'cancelled': return 'Đã hủy';
    case 'returned': return 'Đã trả hàng';
    default: return name || 'Đang xử lý';
  }
};

export function OrdersScreen({
  topInset,
  orders,
  synced = false,
  loading = false,
  loadError,
  catalogProducts = products,
  cartCount,
  onCart,
  onShop,
  onOpenProduct,
  onReorder,
  onReorderServer,
  onRefresh,
  onLoadDetail,
  onCancelOrder,
  onRequestReturn,
}: OrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const hasPlacedOrders = orders.some(order => order.simulated === false);
  const hasDemoOrders = orders.some(order => order.simulated !== false);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle={synced ? 'Lịch sử đơn hàng từ cửa hàng' : 'Đơn hàng đã lưu trên thiết bị'}
        title="Đơn hàng của tôi"
      />
      {loading && !orders.length ? (
        <View style={styles.orderLoading}>
          <ActivityIndicator color={COLORS.teal} />
          <Text style={styles.orderLoadingText}>Đang tải lịch sử đơn hàng…</Text>
        </View>
      ) : loadError && !orders.length ? (
        <View style={styles.orderLoading}>
          <Text style={styles.orderErrorText}>Không thể tải đơn hàng: {loadError}</Text>
          <AccountAction label="Thử lại" onPress={onRefresh} />
        </View>
      ) : !orders.length ? (
        <EmptyState
          actionLabel="Khám phá sản phẩm"
          icon="▣"
          message="Đặt một đơn hàng để xem tại đây."
          onAction={onShop}
          title="Chưa có đơn hàng"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {loadError ? (
            <Pressable onPress={onRefresh} style={styles.orderError}>
              <Text style={styles.orderErrorText}>
                Không thể đồng bộ đơn hàng: {loadError} Nhấn để thử lại.
              </Text>
            </Pressable>
          ) : null}
          {loading ? (
            <Text style={styles.orderLoadingText}>Đang cập nhật từ cửa hàng…</Text>
          ) : null}
          <View style={styles.infoBanner}>
            <View style={styles.infoIcon}>
              <Icon color={COLORS.white} name="info" size={16} />
            </View>
            <Text style={styles.infoText}>
              {hasPlacedOrders && synced
                ? 'Đơn hàng và trạng thái được đồng bộ từ cửa hàng. Mở chi tiết để xem hàng hóa, vận chuyển và các thao tác được hỗ trợ.'
                : hasPlacedOrders
                ? 'Đang hiển thị bản tóm tắt đã lưu trên thiết bị. Trạng thái có thể chưa được cập nhật.'
                : 'Đơn hàng mẫu được lưu trên thiết bị này. Mở chi tiết để xem sản phẩm và thông tin giao hàng; chưa có thanh toán hoặc vận chuyển thực tế.'}
              {hasPlacedOrders && hasDemoOrders
                ? ' Các đơn hàng mẫu trong danh sách không được gửi tới cửa hàng.'
                : null}
            </Text>
          </View>
          {orders.map(order => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderTop}>
                <View>
                  <Text style={styles.orderLabel}>ĐƠN HÀNG {order.id}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    order.statusName === 'delivered' && styles.statusDelivered,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      order.statusName === 'delivered' &&
                        styles.statusDeliveredText,
                    ]}
                  >
                    {order.simulated !== false
                      ? 'Đã lưu trên thiết bị'
                      : order.statusName
                      ? orderStatusLabel(order.statusName)
                      : order.status === 'Processing'
                      ? 'Đang xử lý'
                      : order.status === 'Shipped'
                      ? 'Đang giao'
                      : 'Đã giao'}
                  </Text>
                </View>
              </View>
              {order.productIds.length ? <View style={styles.orderProducts}>
                {order.productIds.slice(0, 4).map(id => {
                  const product =
                    catalogProducts.find(item => item.id === id) ??
                    (order.simulated !== false
                      ? products.find(item => item.id === id)
                      : undefined);
                  return product ? (
                    <Pressable
                      accessibilityLabel={`Xem ${product.name}`}
                      accessibilityRole="button"
                      key={id}
                      onPress={() => onOpenProduct(id)}
                      style={styles.orderProductImageWrap}
                    >
                      <Image
                        source={product.image}
                        resizeMode="contain"
                        style={styles.orderProductImage}
                      />
                    </Pressable>
                  ) : (
                    <View
                      accessibilityLabel="Sản phẩm không còn trong danh mục"
                      key={id}
                      style={styles.orderProductImageWrap}
                    >
                      <Icon color={COLORS.muted} name="shop" size={20} />
                    </View>
                  );
                })}
              </View> : null}
              <View style={styles.orderBottom}>
                <View>
                  <Text style={styles.orderItems}>
                    {order.itemCount} sản phẩm
                  </Text>
                  <Text style={styles.orderTotal}>{money(order.total)}</Text>
                </View>
                <View style={styles.orderActions}>
                  <Pressable
                    accessibilityLabel={`Xem chi tiết đơn hàng ${order.id}`}
                    accessibilityRole="button"
                    onPress={() => setSelectedOrder(order)}
                    style={styles.detailsButton}
                  >
                    <Text style={styles.reorderText}>Chi tiết</Text>
                  </Pressable>
                  {!order.serverId ? <Pressable
                    accessibilityLabel={`Mua lại đơn hàng ${order.id}`}
                    accessibilityRole="button"
                    onPress={() => onReorder(order)}
                    style={styles.reorderButton}
                  >
                    <Text style={styles.reorderText}>Mua lại</Text>
                  </Pressable> : null}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
      {selectedOrder ? (
        <OrderDetails
          key={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onLoadDetail={onLoadDetail}
          onCancelOrder={onCancelOrder}
          onRequestReturn={onRequestReturn}
          onReorder={detail => {
            if (detail) onReorderServer(selectedOrder, detail);
            else onReorder(selectedOrder);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
        />
      ) : null}
    </View>
  );
}

function OrderDetails({
  order,
  onClose,
  onReorder,
  onLoadDetail,
  onCancelOrder,
  onRequestReturn,
}: {
  order: Order;
  onClose: () => void;
  onReorder: (detail?: CustomerOrderDetail) => void;
  onLoadDetail: (id: number) => Promise<CustomerOrderDetail>;
  onCancelOrder: (id: number, reason: string) => Promise<void>;
  onRequestReturn: (
    id: number,
    reason: string,
    lines: CustomerReturnLineRequest[],
  ) => Promise<void>;
}) {
  if (order.serverId) {
    return (
      <ServerOrderDetails
        order={order}
        onClose={onClose}
        onReorder={onReorder}
        onLoadDetail={onLoadDetail}
        onCancelOrder={onCancelOrder}
        onRequestReturn={onRequestReturn}
      />
    );
  }
  return (
    <AccountDialog onClose={onClose} subtitle={order.date} title={order.id}>
      <AccountNotice>
        {order.simulated === false
          ? 'Đơn đã được gửi tới cửa hàng. Đây là bản tóm tắt lưu trên thiết bị; trạng thái và lịch sử giao hàng chưa được đồng bộ tự động.'
          : 'Đây là đơn hàng mẫu được lưu trên thiết bị. Ứng dụng chưa kết nối thanh toán, đặt giao hàng hoặc theo dõi trực tiếp.'}
      </AccountNotice>
      {order.lines?.length ? (
        order.lines.map(line => (
          <View key={line.productId} style={styles.detailLine}>
            <View style={styles.detailLineCopy}>
              <Text style={styles.detailLineName}>{line.name}</Text>
              <Text style={styles.detailLineMeta}>
                {line.quantity} × {money(line.price)}
              </Text>
            </View>
            <Text style={styles.detailLinePrice}>
              {money((Math.round(line.price * 100) * line.quantity) / 100)}
            </Text>
          </View>
        ))
      ) : (
        <AccountNotice>
          Đơn hàng cũ này có {order.itemCount} sản phẩm. Giá và số lượng từng
          sản phẩm chưa được lưu.
        </AccountNotice>
      )}
      <View style={styles.detailSummary}>
        {order.subtotal !== undefined ? (
          <SummaryLine label="Tạm tính" value={money(order.subtotal)} />
        ) : null}
        {order.discount ? (
          <SummaryLine
            label={order.coupon ? `Giảm giá · ${order.coupon}` : 'Giảm giá'}
            value={`−${money(order.discount)}`}
          />
        ) : null}
        {order.shipping !== undefined ? (
          <SummaryLine
            label="Giao hàng"
            value={order.shipping === 0 ? 'Miễn phí' : money(order.shipping)}
          />
        ) : null}
        {order.tax ? <SummaryLine label="Thuế" value={money(order.tax)} /> : null}
        <SummaryLine label="Tổng đơn hàng" value={money(order.total)} />
      </View>
      {order.delivery ? (
        <View style={styles.deliveryCard}>
          <Text style={styles.detailSectionTitle}>Thông tin giao hàng</Text>
          <Text style={styles.deliveryName}>{order.delivery.fullName}</Text>
          <Text style={styles.deliveryText}>{order.delivery.phone}</Text>
          <Text style={styles.deliveryText}>
            {order.delivery.address}
            {order.delivery.district ? `, ${order.delivery.district}` : ''}, {order.delivery.city}
          </Text>
          <Text style={styles.deliveryPayment}>
            {order.delivery.payment === 'cash'
              ? order.simulated === false
                ? 'Thanh toán khi nhận hàng'
                : 'Thanh toán khi nhận hàng · lựa chọn mẫu'
              : order.simulated === false
                ? 'Thanh toán bằng thẻ'
                : 'Thẻ · thanh toán mô phỏng'}
          </Text>
        </View>
      ) : null}
      <Text style={styles.formHelp}>
        Mua lại sử dụng giá và tồn kho hiện tại. Đơn hàng đã lưu của bạn không
        thay đổi.
      </Text>
      <AccountAction label="Thêm sản phẩm vào giỏ" onPress={() => onReorder()} />
    </AccountDialog>
  );
}

const formatOrderDate = (value: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
};

const parseShippingAddress = (value: string) => {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return null;
    const address = parsed as Record<string, unknown>;
    const field = (name: string) =>
      typeof address[name] === 'string' ? (address[name] as string) : '';
    return {
      name: field('recipientName'),
      phone: field('phone'),
      text: [field('addressLine'), field('ward'), field('district'), field('province')]
        .filter(Boolean).join(', '),
    };
  } catch {
    return null;
  }
};

function ServerOrderDetails({
  order,
  onClose,
  onReorder,
  onLoadDetail,
  onCancelOrder,
  onRequestReturn,
}: {
  order: Order;
  onClose: () => void;
  onReorder: (detail: CustomerOrderDetail) => void;
  onLoadDetail: (id: number) => Promise<CustomerOrderDetail>;
  onCancelOrder: (id: number, reason: string) => Promise<void>;
  onRequestReturn: (
    id: number,
    reason: string,
    lines: CustomerReturnLineRequest[],
  ) => Promise<void>;
}) {
  const id = order.serverId!;
  const [detail, setDetail] = useState<CustomerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [action, setAction] = useState<'cancel' | 'return' | null>(null);
  const [reason, setReason] = useState('');
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    onLoadDetail(id).then(result => {
      if (active) setDetail(result);
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Không tải được chi tiết đơn hàng.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, onLoadDetail, refresh]);

  const canCancel = (
    detail?.order.statusName === 'pending' ||
    detail?.order.statusName === 'confirmed'
  ) && detail.sellerOrders.every(seller =>
    seller.statusName === 'pending' || seller.statusName === 'confirmed');
  const eligibleReturns = detail?.items.flatMap(item => {
    const shipment = detail.sellerOrders.find(seller => seller.id === item.sellerOrderId);
    if (shipment?.statusName !== 'delivered' || !shipment.deliveredAt) return [];
    const deliveredAt = new Date(shipment.deliveredAt).getTime();
    if (!Number.isFinite(deliveredAt) ||
      Date.now() - deliveredAt > detail.returnWindowDays * 24 * 60 * 60 * 1000) return [];
    const requested = detail.returnItems.reduce((total, returned) => {
      if (returned.orderItemId !== item.id) return total;
      const parent = detail.returns.find(request => request.id === returned.returnRequestId);
      return parent && parent.statusName !== 'rejected' && parent.statusName !== 'cancelled'
        ? total + returned.quantity : total;
    }, 0);
    const remaining = item.quantity - requested;
    return remaining > 0 ? [{ item, remaining }] : [];
  }) ?? [];
  const shipping = detail ? parseShippingAddress(detail.order.shippingAddressJson) : null;

  const submitAction = async () => {
    if (!detail || submitting) return;
    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setError('Vui lòng nhập lý do ít nhất 3 ký tự.');
      return;
    }
    const selected = eligibleReturns.flatMap(({ item, remaining }) => {
      const quantity = Math.min(remaining, quantities[item.id] ?? 0);
      return quantity > 0 ? [{ orderItemId: item.id, quantity }] : [];
    });
    if (action === 'return' && !selected.length) {
      setError('Vui lòng chọn số lượng hàng cần trả.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      if (action === 'cancel') {
        await onCancelOrder(id, trimmed);
        setNotice('Đã hủy đơn hàng.');
      } else if (action === 'return') {
        await onRequestReturn(id, trimmed, selected);
        setNotice('Đã gửi yêu cầu trả hàng.');
      }
      setAction(null);
      setReason('');
      setQuantities({});
      setRefresh(value => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể gửi yêu cầu.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccountDialog onClose={onClose} subtitle={order.date} title={order.id}>
      {loading ? (
        <View style={styles.orderLoading}>
          <ActivityIndicator color={COLORS.teal} />
          <Text style={styles.orderLoadingText}>Đang tải chi tiết đơn hàng…</Text>
        </View>
      ) : null}
      {error ? (
        <Pressable
          disabled={!!detail}
          onPress={() => setRefresh(value => value + 1)}
          style={styles.orderError}
        >
          <Text style={styles.orderErrorText}>{error}</Text>
          {!detail ? <Text style={styles.orderErrorText}>Nhấn để thử lại.</Text> : null}
        </Pressable>
      ) : null}
      {notice ? <AccountNotice>{notice}</AccountNotice> : null}
      {!detail && !loading && order.lines?.length ? (
        <>
          <AccountNotice>
            Đây là bản tóm tắt lưu trên thiết bị. Hãy thử tải lại để xem trạng thái mới nhất.
          </AccountNotice>
          {order.lines.map(line => (
            <View key={line.productId} style={styles.detailLine}>
              <View style={styles.detailLineCopy}>
                <Text style={styles.detailLineName}>{line.name}</Text>
                <Text style={styles.detailLineMeta}>
                  {line.quantity} × {money(line.price)}
                </Text>
              </View>
              <Text style={styles.detailLinePrice}>
                {money(line.price * line.quantity)}
              </Text>
            </View>
          ))}
          <View style={styles.detailSummary}>
            <SummaryLine label="Tổng đơn hàng" value={money(order.total)} />
          </View>
        </>
      ) : null}
      {detail ? (
        <>
          <AccountNotice>
            Trạng thái: {orderStatusLabel(detail.order.statusName)} · Thanh toán: {
              detail.order.paymentStatus === 'paid' ? 'Đã thanh toán' :
              detail.order.paymentStatus === 'refunded' ? 'Đã hoàn tiền' : 'Chưa thanh toán'
            }
          </AccountNotice>
          {detail.items.map(item => (
            <View key={item.id} style={styles.detailLine}>
              <View style={styles.detailLineCopy}>
                <Text style={styles.detailLineName}>
                  {item.productName}{item.variantName && !/^(default|mặc định)$/i.test(item.variantName)
                    ? ` · ${item.variantName}` : ''}
                </Text>
                <Text style={styles.detailLineMeta}>
                  {item.quantity} × {money(item.unitPrice / 1000)}
                </Text>
              </View>
              <Text style={styles.detailLinePrice}>{money(item.lineTotal / 1000)}</Text>
            </View>
          ))}
          <View style={styles.detailSummary}>
            <SummaryLine label="Tạm tính" value={money(detail.order.subtotal / 1000)} />
            {detail.order.discountTotal > 0 ? (
              <SummaryLine label="Giảm giá" value={`−${money(detail.order.discountTotal / 1000)}`} />
            ) : null}
            <SummaryLine label="Giao hàng" value={money(detail.order.shippingTotal / 1000)} />
            {detail.order.taxTotal > 0 ? (
              <SummaryLine label="Thuế" value={money(detail.order.taxTotal / 1000)} />
            ) : null}
            <SummaryLine label="Tổng đơn hàng" value={money(detail.order.grandTotal / 1000)} />
          </View>
          {shipping ? (
            <View style={styles.deliveryCard}>
              <Text style={styles.detailSectionTitle}>Thông tin giao hàng</Text>
              <Text style={styles.deliveryName}>{shipping.name}</Text>
              <Text style={styles.deliveryText}>{shipping.phone}</Text>
              <Text style={styles.deliveryText}>{shipping.text}</Text>
              <Text style={styles.deliveryPayment}>
                {order.paymentMethod?.toLowerCase() === 'wallet'
                  ? 'Thanh toán bằng ví' : 'Thanh toán khi nhận hàng'}
              </Text>
            </View>
          ) : null}
          {detail.sellerOrders.length ? (
            <View style={styles.deliveryCard}>
              <Text style={styles.detailSectionTitle}>Vận chuyển theo cửa hàng</Text>
              {detail.sellerOrders.map(seller => (
                <View key={seller.id} style={styles.shipmentBlock}>
                  <Text style={styles.detailLineName}>{seller.storeName} · {orderStatusLabel(seller.statusName)}</Text>
                  {seller.trackingNumber ? (
                    <Text style={styles.deliveryText}>
                      {seller.shippingProvider ? `${seller.shippingProvider} · ` : ''}{seller.trackingNumber}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}
          {detail.history.length ? (
            <View style={styles.deliveryCard}>
              <Text style={styles.detailSectionTitle}>Lịch sử trạng thái</Text>
              {detail.history.map(entry => (
                <Text key={entry.id} style={styles.deliveryText}>
                  {formatOrderDate(entry.changedAt)} · {orderStatusLabel(entry.newStatus)}
                  {entry.note ? ` · ${entry.note}` : ''}
                </Text>
              ))}
            </View>
          ) : null}
          {detail.returns.length ? (
            <View style={styles.deliveryCard}>
              <Text style={styles.detailSectionTitle}>Yêu cầu trả hàng</Text>
              {detail.returns.map(item => (
                <Text key={item.id} style={styles.deliveryText}>
                  {item.returnNumber} · {item.statusName} · {formatOrderDate(item.requestedAt)}
                </Text>
              ))}
            </View>
          ) : null}
          <Text style={styles.formHelp}>Mua lại sẽ dùng giá và tồn kho hiện tại.</Text>
          <AccountAction label="Thêm sản phẩm vào giỏ" onPress={() => onReorder(detail)} />
          {canCancel ? (
            <AccountAction label="Yêu cầu hủy đơn" onPress={() => { setAction('cancel'); setError(''); }} />
          ) : null}
          {eligibleReturns.length ? (
            <AccountAction label="Yêu cầu trả hàng" onPress={() => { setAction('return'); setError(''); }} />
          ) : null}
          {action ? (
            <View style={styles.orderActionForm}>
              <Text style={styles.detailSectionTitle}>
                {action === 'cancel' ? 'Xác nhận hủy đơn' : 'Chọn hàng cần trả'}
              </Text>
              {action === 'return' ? eligibleReturns.map(({ item, remaining }) => (
                <View key={item.id} style={styles.returnItem}>
                  <Text style={styles.detailLineName}>{item.productName} · Còn {remaining}</Text>
                  <View style={styles.quantityRow}>
                    <Pressable
                      accessibilityLabel={`Giảm số lượng trả ${item.productName}`}
                      onPress={() => setQuantities(current => ({
                        ...current, [item.id]: Math.max(0, (current[item.id] ?? 0) - 1),
                      }))}
                      style={styles.quantityButton}
                    ><Text style={styles.quantityText}>−</Text></Pressable>
                    <Text style={styles.quantityValue}>{quantities[item.id] ?? 0}</Text>
                    <Pressable
                      accessibilityLabel={`Tăng số lượng trả ${item.productName}`}
                      onPress={() => setQuantities(current => ({
                        ...current, [item.id]: Math.min(remaining, (current[item.id] ?? 0) + 1),
                      }))}
                      style={styles.quantityButton}
                    ><Text style={styles.quantityText}>+</Text></Pressable>
                  </View>
                </View>
              )) : null}
              <AccountField
                label="Lý do"
                maxLength={action === 'cancel' ? 500 : 1000}
                multiline
                onChangeText={setReason}
                placeholder="Nhập lý do ít nhất 3 ký tự"
                value={reason}
              />
              <AccountAction
                label={submitting ? 'Đang gửi…' : action === 'cancel' ? 'Xác nhận hủy' : 'Gửi yêu cầu trả hàng'}
                onPress={submitAction}
              />
              <Pressable onPress={() => { setAction(null); setError(''); }} style={styles.orderDismiss}>
                <Text style={styles.orderDismissText}>Đóng biểu mẫu</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}
    </AccountDialog>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryLine}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

type WishlistProps = {
  topInset: number;
  ids: string[];
  catalogProducts?: Product[];
  cartCount: number;
  onCart: () => void;
  onShop: () => void;
  onOpenProduct: (id: string) => void;
  onAdd: (id: string) => void;
  onToggleLike: (id: string) => void;
};

export function WishlistScreen({
  topInset,
  ids,
  catalogProducts = products,
  cartCount,
  onCart,
  onShop,
  onOpenProduct,
  onAdd,
  onToggleLike,
}: WishlistProps) {
  const { width } = useWindowDimensions();
  const columns = width >= 750 ? 4 : width >= 550 ? 3 : width < 360 ? 1 : 2;
  const likedProducts = catalogProducts.filter(product => ids.includes(product.id));
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle={`${likedProducts.length} sản phẩm đã lưu`}
        title="Sản phẩm yêu thích"
      />
      {!likedProducts.length ? (
        <EmptyState
          actionLabel="Khám phá sản phẩm"
          icon="♡"
          message="Lưu những sản phẩm bạn yêu thích, chúng sẽ luôn ở đây chờ bạn."
          onAction={onShop}
          title="Danh sách yêu thích đang trống"
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.wishlistGrid}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.gridInner}>
            {likedProducts.map(product => (
              <View
                key={product.id}
                style={[styles.gridCell, { width: `${100 / columns}%` }]}
              >
                <ProductCard
                  compact
                  liked
                  onAdd={() => onAdd(product.id)}
                  onOpen={() => onOpenProduct(product.id)}
                  onToggleLike={() => onToggleLike(product.id)}
                  product={product}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

type AccountProps = {
  topInset: number;
  cartCount: number;
  wishlistCount: number;
  orderCount: number;
  auth: AuthSession;
  profile: AccountProfile;
  onAuth: () => void;
  onLogout: () => void;
  onSaveProfile: (profile: AccountProfile, mode: ProfileEditor) => Promise<void>;
  onCart: () => void;
  onOrders: () => void;
  onWishlist: () => void;
  onSellers: () => void;
  onSellerPortal: () => void;
  onHelp: () => void;
  onWallet: () => void;
  onNotifications: () => void;
};

export function AccountScreen({
  topInset,
  cartCount,
  wishlistCount,
  orderCount,
  auth,
  profile,
  onAuth,
  onLogout,
  onSaveProfile,
  onCart,
  onOrders,
  onWishlist,
  onSellers,
  onSellerPortal,
  onHelp,
  onWallet,
  onNotifications,
}: AccountProps) {
  const [editor, setEditor] = useState<ProfileEditor | null>(null);
  const [showLogout, setShowLogout] = useState(false);
  const [passwordEditor, setPasswordEditor] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const savePassword = async () => {
    if (passwordSaving) return;
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới cần có ít nhất 8 ký tự.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError('');
    try {
      await accountApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordSaved(true);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : 'Không thể đổi mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  };
  const initials = auth.isLoggedIn && profile.name.trim()
    ? profile.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase()
    : auth.isLoggedIn
      ? 'S'
      : 'K';
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        cartCount={cartCount}
        onCart={onCart}
        subtitle="Thông tin mua sắm của bạn"
        title="Tài khoản của tôi"
      />
      <ScrollView
        contentContainerStyle={styles.accountContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>
              {auth.isLoggedIn
                ? profile.name || 'Khách hàng Sellzy'
                : 'Khách mua sắm'}
            </Text>
            <Text style={styles.profileEmail}>
              {auth.isLoggedIn
                ? auth.email
                : 'Xem sản phẩm tự do — đăng nhập để đặt hàng'}
            </Text>
            <View style={styles.memberBadge}>
              <Text style={styles.memberText}>
                {auth.isLoggedIn ? 'ĐÃ ĐĂNG NHẬP' : 'CHẾ ĐỘ KHÁCH'}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityLabel={
              auth.isLoggedIn ? 'Chỉnh sửa hồ sơ' : 'Đăng nhập'
            }
            accessibilityRole="button"
            onPress={() => (auth.isLoggedIn ? setEditor('profile') : onAuth())}
            style={styles.editButton}
            testID="account-auth-button"
          >
            <Text style={styles.editText}>
              {auth.isLoggedIn ? 'Sửa' : 'Đăng nhập'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.accountStats}>
          <AccountStat label="Đơn hàng" value={String(orderCount)} />
          <View style={styles.statDivider} />
          <AccountStat label="Yêu thích" value={String(wishlistCount)} />
          <View style={styles.statDivider} />
          <AccountStat label="Giỏ hàng" value={String(cartCount)} />
        </View>

        <Text style={styles.menuSection}>MUA SẮM</Text>
        <MenuItem
          icon="orders"
          label="Đơn hàng của tôi"
          onPress={onOrders}
          subtitle="Xem tóm tắt đã lưu hoặc mua lại"
        />
        <MenuItem
          icon="heart"
          label="Sản phẩm yêu thích"
          onPress={onWishlist}
          subtitle="Sản phẩm bạn đã lưu"
        />
        <MenuItem
          icon="pin"
          label="Địa chỉ giao hàng"
          onPress={() => setEditor('address')}
          subtitle={
            profile.address
              ? [profile.address, profile.district, profile.city]
                  .filter(Boolean)
                  .join(', ')
              : 'Lưu địa chỉ giao hàng mặc định'
          }
        />
        <MenuItem
          icon="credit-card"
          label="Phương thức thanh toán"
          onPress={() => setEditor('payment')}
          subtitle={
            profile.payment === 'wallet' && auth.isLoggedIn
              ? 'Ưu tiên thanh toán bằng ví'
              : !auth.isLoggedIn && profile.payment === 'card'
                ? 'Ưu tiên thanh toán thẻ mẫu'
                : 'Ưu tiên thanh toán khi nhận hàng'
          }
        />
        <MenuItem
          icon="wallet"
          label="Ví cá nhân"
          onPress={onWallet}
          subtitle={
            auth.isLoggedIn
              ? 'Số dư, ngân hàng, nạp và rút tiền'
              : 'Đăng nhập để mở ví'
          }
        />
        <MenuItem
          icon="mail"
          label="Thông báo"
          onPress={onNotifications}
          subtitle={auth.isLoggedIn ? 'Xem cập nhật đơn hàng và tài khoản' : 'Đăng nhập để xem thông báo'}
        />

        <Text style={styles.menuSection}>CỬA HÀNG</Text>
        <MenuItem
          icon="shop"
          label="Các cửa hàng"
          onPress={onSellers}
          subtitle="Xem sản phẩm theo từng cửa hàng"
        />
        {auth.isLoggedIn ? (
          <MenuItem
            icon="shop"
            label="Kênh người bán"
            onPress={onSellerPortal}
            subtitle="Sản phẩm và đơn hàng của cửa hàng bạn"
          />
        ) : null}
        <MenuItem
          icon="headset"
          label="Trợ giúp & hỗ trợ"
          onPress={onHelp}
          subtitle="Giải đáp về việc mua sắm trong ứng dụng"
        />
        <MenuItem
          icon="activity"
          label="Tùy chọn"
          onPress={() => setEditor('preferences')}
          subtitle="Cài đặt mua sắm và thông báo"
        />
        {auth.isLoggedIn ? (
          <MenuItem
            icon="shield"
            label="Đổi mật khẩu"
            onPress={() => setPasswordEditor(true)}
            subtitle="Bảo vệ tài khoản của bạn"
          />
        ) : null}

        {auth.isLoggedIn ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowLogout(true)}
            style={styles.signOutButton}
            testID="account-logout"
          >
            <Icon color={COLORS.red} name="logout" size={16} />
            <Text style={styles.signOutText}>Đăng xuất</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onAuth}
            style={styles.loginButton}
            testID="account-login"
          >
            <Text style={styles.loginButtonText}>Đăng nhập tài khoản</Text>
          </Pressable>
        )}
        <Text style={styles.profileNote}>
          {auth.isLoggedIn
            ? 'Phiên đăng nhập được dùng với dịch vụ Sellzy. Mật khẩu của bạn không được lưu trên thiết bị.'
            : 'Bạn có thể xem sản phẩm và chuẩn bị giỏ hàng. Đăng nhập để đặt hàng trực tuyến.'}
        </Text>
        <Text style={styles.version}>Sellzy Mobile · Phiên bản 1.0.0</Text>
      </ScrollView>
      {editor ? (
        <ProfileForm
          mode={editor}
          liveCatalog={auth.isLoggedIn}
          onClose={() => setEditor(null)}
          onSave={nextProfile => onSaveProfile(nextProfile, editor)}
          profile={profile}
        />
      ) : null}
      {showLogout ? (
        <AccountDialog onClose={() => setShowLogout(false)} title="Đăng xuất?">
          <AccountNotice>
            Dữ liệu mua sắm của tài khoản này vẫn được giữ trên thiết bị và sẽ
            xuất hiện khi bạn đăng nhập lại bằng cùng email.
          </AccountNotice>
          <AccountAction
            label="Có, đăng xuất"
            onPress={() => {
              onLogout();
              setShowLogout(false);
            }}
            testID="logout-confirm"
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowLogout(false)}
            style={styles.continueGuestButton}
          >
            <Text style={styles.continueGuestText}>Tiếp tục đăng nhập</Text>
          </Pressable>
        </AccountDialog>
      ) : null}
      {passwordEditor ? (
        <AccountDialog title="Đổi mật khẩu" onClose={() => setPasswordEditor(false)}>
          {passwordSaved ? (
            <>
              <AccountNotice>Đã đổi mật khẩu. Vui lòng đăng xuất rồi đăng nhập lại bằng mật khẩu mới.</AccountNotice>
              <AccountAction label="Đăng xuất" onPress={() => { setPasswordEditor(false); onLogout(); }} />
            </>
          ) : (
            <>
              <AccountField label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
              <AccountField label="Mật khẩu mới" value={newPassword} onChangeText={setNewPassword} secureTextEntry />
              {passwordError ? <Text style={styles.orderErrorText}>{passwordError}</Text> : null}
              <AccountAction label={passwordSaving ? 'Đang lưu...' : 'Đổi mật khẩu'} onPress={() => { savePassword().catch(() => undefined); }} />
            </>
          )}
        </AccountDialog>
      ) : null}
    </View>
  );
}

export type ProfileEditor = 'profile' | 'address' | 'payment' | 'preferences';

const editorTitles: Record<ProfileEditor, string> = {
  profile: 'Chỉnh sửa hồ sơ',
  address: 'Địa chỉ giao hàng',
  payment: 'Ưu tiên thanh toán',
  preferences: 'Tùy chọn',
};

function ProfileForm({
  mode,
  profile,
  liveCatalog,
  onSave,
  onClose,
}: {
  mode: ProfileEditor;
  profile: AccountProfile;
  liveCatalog: boolean;
  onSave: (profile: AccountProfile) => Promise<void>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AccountProfile>(() => ({
    ...profile,
    recipientName: profile.recipientName || profile.name,
    recipientPhone: profile.recipientPhone || profile.phone,
    payment: liveCatalog && profile.payment === 'card' ? 'cash' : profile.payment,
  }));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState<
    Partial<Record<keyof AccountProfile, string>>
  >({});
  const update = <K extends keyof AccountProfile>(
    key: K,
    value: AccountProfile[K],
  ) => {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  };
  const save = async () => {
    if (saving) return;
    const cleaned = {
      ...draft,
      name: draft.name.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      recipientName: draft.recipientName.trim(),
      recipientPhone: draft.recipientPhone.trim(),
      address: draft.address.trim(),
      district: draft.district?.trim() ?? '',
      city: draft.city.trim(),
    };
    const nextErrors: typeof errors = {};
    if (mode === 'profile') {
      if (cleaned.name.length < 2) {
        nextErrors.name = 'Vui lòng nhập tên có ít nhất 2 ký tự.';
      }
      if (cleaned.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) {
        nextErrors.email = 'Nhập email hợp lệ hoặc để trống.';
      }
      if (cleaned.phone && !/^\+?[\d\s().-]{7,20}$/.test(cleaned.phone)) {
        nextErrors.phone = 'Nhập số điện thoại hợp lệ hoặc để trống.';
      }
    }
    if (mode === 'address') {
      const hasAddress = Boolean(
        cleaned.address || cleaned.district || cleaned.city,
      );
      if (hasAddress && cleaned.address.length < 5) {
        nextErrors.address = 'Vui lòng nhập địa chỉ có ít nhất 5 ký tự.';
      }
      if (hasAddress && cleaned.district.length < 2) {
        nextErrors.district = 'Vui lòng nhập quận/huyện.';
      }
      if (hasAddress && cleaned.city.length < 2) {
        nextErrors.city = 'Vui lòng nhập tỉnh/thành phố.';
      }
      if (hasAddress && cleaned.recipientName.length < 2) {
        nextErrors.recipientName = 'Vui lòng nhập tên người nhận.';
      }
      if (hasAddress && !/^\+?[\d\s().-]{7,20}$/.test(cleaned.recipientPhone)) {
        nextErrors.recipientPhone = 'Vui lòng nhập số điện thoại người nhận.';
      }
    }
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) {
      setSaving(true);
      setSaveError('');
      try {
        await onSave(cleaned);
        onClose();
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'Không thể lưu thay đổi.');
      } finally {
        setSaving(false);
      }
    }
  };
  return (
    <AccountDialog onClose={onClose} title={editorTitles[mode]}>
      {mode === 'profile' ? (
        <>
          <AccountNotice>
            {liveCatalog
              ? 'Họ tên và số điện thoại được đồng bộ với tài khoản của bạn. Email đăng nhập không thể đổi tại đây.'
              : 'Thông tin được lưu trên thiết bị để thanh toán nhanh hơn.'}
          </AccountNotice>
          <AccountField
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
            label="Họ và tên"
            maxLength={80}
            onChangeText={value => update('name', value)}
            placeholder="Nhập họ và tên"
            value={draft.name}
          />
          {!liveCatalog ? <AccountField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            keyboardType="email-address"
            label="Địa chỉ email (không bắt buộc)"
            maxLength={150}
            onChangeText={value => update('email', value)}
            placeholder="you@example.com"
            value={draft.email}
          /> : null}
          <AccountField
            autoComplete="tel"
            error={errors.phone}
            keyboardType="phone-pad"
            label="Số điện thoại (không bắt buộc)"
            maxLength={20}
            onChangeText={value => update('phone', value)}
            placeholder="Nhập số điện thoại"
            value={draft.phone}
          />
        </>
      ) : null}
      {mode === 'address' ? (
        <>
          <AccountNotice>
            Địa chỉ mặc định sẽ được điền khi thanh toán. Bạn có thể xem lại
            hoặc thay đổi trước khi lưu đơn hàng. Để trống cả hai trường để xóa
            địa chỉ đã lưu.
          </AccountNotice>
          <AccountField
            autoCapitalize="words"
            error={errors.recipientName}
            label="Tên người nhận"
            maxLength={150}
            onChangeText={value => update('recipientName', value)}
            placeholder="Họ tên người nhận"
            value={draft.recipientName}
          />
          <AccountField
            error={errors.recipientPhone}
            keyboardType="phone-pad"
            label="Số điện thoại người nhận"
            maxLength={30}
            onChangeText={value => update('recipientPhone', value)}
            placeholder="Số điện thoại liên hệ"
            value={draft.recipientPhone}
          />
          <AccountField
            autoComplete="street-address"
            error={errors.address}
            label="Địa chỉ"
            maxLength={240}
            multiline
            onChangeText={value => update('address', value)}
            placeholder="Số nhà, tên đường, căn hộ"
            value={draft.address}
          />
          <AccountField
            autoCapitalize="words"
            error={errors.district}
            label="Quận / Huyện"
            maxLength={100}
            onChangeText={value => update('district', value)}
            placeholder="Nhập quận hoặc huyện"
            value={draft.district ?? ''}
          />
          <AccountField
            autoCapitalize="words"
            error={errors.city}
            label="Tỉnh / Thành phố"
            maxLength={100}
            onChangeText={value => update('city', value)}
            placeholder="Nhập tỉnh hoặc thành phố"
            value={draft.city}
          />
        </>
      ) : null}
      {mode === 'payment' ? (
        <>
          <AccountNotice>
            {liveCatalog
              ? 'Chọn thanh toán khi nhận hàng hoặc dùng số dư ví Sellzy.'
              : 'Chọn phương thức mặc định cho đơn hàng mẫu. Ứng dụng không thu thập thông tin thẻ và không thực hiện giao dịch thật.'}
          </AccountNotice>
          <PaymentOption
            description="Được lưu làm phương thức ưu tiên."
            label="Thanh toán khi nhận hàng"
            onPress={() => update('payment', 'cash')}
            selected={draft.payment === 'cash'}
          />
          {liveCatalog ? (
            <PaymentOption
              description="Thanh toán bằng số dư ví Sellzy khi đặt hàng."
              label="Ví Sellzy"
              onPress={() => update('payment', 'wallet')}
              selected={draft.payment === 'wallet'}
            />
          ) : null}
          {!liveCatalog ? (
            <PaymentOption
              description="Thanh toán thẻ mô phỏng, không phát sinh giao dịch."
              label="Thẻ · chỉ dùng để minh họa"
              onPress={() => update('payment', 'card')}
              selected={draft.payment === 'card'}
            />
          ) : null}
        </>
      ) : null}
      {mode === 'preferences' ? (
        <>
          <View style={styles.preferenceRow}>
            <View style={styles.preferenceCopy}>
              <Text style={styles.menuLabel}>Thông báo mua sắm</Text>
              <Text style={styles.formHelp}>
                Lưu tùy chọn của bạn. Phiên bản này chưa kết nối thông báo đẩy.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Tùy chọn thông báo mua sắm"
              onValueChange={value => update('notifications', value)}
              trackColor={{ false: COLORS.border, true: COLORS.teal }}
              value={draft.notifications}
            />
          </View>
          <View style={styles.detailSummary}>
            <SummaryLine label="Ngôn ngữ" value="Tiếng Việt" />
            <SummaryLine label="Tiền tệ" value="VND (₫)" />
          </View>
          <Text style={styles.formHelp}>
            Danh mục hiển thị bằng tiếng Việt và dùng đơn vị Việt Nam đồng.
          </Text>
        </>
      ) : null}
      {saveError ? <Text style={styles.formHelp}>{saveError}</Text> : null}
      <AccountAction label={saving ? 'Đang lưu...' : 'Lưu thay đổi'} onPress={() => { save().catch(() => undefined); }} />
    </AccountDialog>
  );
}

function PaymentOption({
  selected,
  label,
  description,
  onPress,
}: {
  selected: boolean;
  label: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.paymentOption, selected && styles.paymentSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.preferenceCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.formHelp}>{description}</Text>
      </View>
    </Pressable>
  );
}

function AccountStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: IconName;
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}
    >
      <View style={styles.menuIconWrap}>
        <Icon color={COLORS.teal} name={icon} size={20} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Icon color={COLORS.muted} name="chevron-right" size={20} />
    </Pressable>
  );
}

export function SellersScreen({
  topInset,
  cartCount,
  catalogProducts = products,
  catalogVendors,
  onBack,
  onCart,
  onShop,
  onSellerOnboarding,
}: {
  topInset: number;
  cartCount: number;
  catalogProducts?: Product[];
  catalogVendors?: { name: string; rating: number; productCount: number }[];
  onBack: () => void;
  onCart: () => void;
  onShop: (store: string) => void;
  onSellerOnboarding: () => void;
}) {
  const catalogueSellers = catalogVendors
    ? catalogVendors.map((vendor, index) => ({
        ...vendor,
        color: sellerColors[index % sellerColors.length],
      }))
    : getCatalogueSellers(catalogProducts);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        cartCount={cartCount}
        onBack={onBack}
        onCart={onCart}
        subtitle="Khám phá các cửa hàng trong danh mục"
        title="Các cửa hàng"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sellerHero}>
          <Text style={styles.sellerHeroEyebrow}>BÁN HÀNG CÙNG SELLZY</Text>
          <Text style={styles.sellerHeroTitle}>
            Sản phẩm thiết yếu cho cuộc sống khỏe, gói gọn một nơi.
          </Text>
          <Text style={styles.sellerHeroText}>
            Khám phá sản phẩm của từng cửa hàng và tìm lựa chọn phù hợp cho mỗi
            ngày.
          </Text>
        </View>
        {catalogueSellers.map(seller => (
          <View key={seller.name} style={styles.sellerCard}>
            <View
              style={[styles.sellerLogo, { backgroundColor: seller.color }]}
            >
              <Text style={styles.sellerLogoText}>{seller.name.charAt(0)}</Text>
            </View>
            <View style={styles.sellerCopy}>
              <Text style={styles.sellerName}>{seller.name}</Text>
              <Text style={styles.sellerMeta}>
                {seller.productCount} sản phẩm đang có
              </Text>
              <Text style={styles.verified}>
                Đánh giá danh mục {seller.rating.toFixed(1)} / 5
              </Text>
            </View>
            <Pressable
              accessibilityLabel={`Xem cửa hàng ${seller.name}`}
              accessibilityRole="button"
              onPress={() => onShop(seller.name)}
              style={styles.visitButton}
            >
              <Text style={styles.visitText}>Xem</Text>
            </Pressable>
          </View>
        ))}
        <View style={styles.vendorCallout}>
          <Text style={styles.vendorCalloutTitle}>
            Phát triển cửa hàng cùng Sellzy
          </Text>
          <Text style={styles.vendorCalloutText}>
            Gửi hồ sơ mở cửa hàng, theo dõi xét duyệt và bắt đầu bán hàng khi
            tài khoản được duyệt.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={onSellerOnboarding}
            style={styles.vendorButton}
          >
            <Text style={styles.vendorButtonText}>Trở thành nhà bán hàng</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

export function HelpScreen({
  topInset,
  onBack,
  liveCatalog = false,
  authEmail = '',
  profile,
}: {
  topInset: number;
  onBack: () => void;
  liveCatalog?: boolean;
  authEmail?: string;
  profile?: AccountProfile;
}) {
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(0);
  const [faqs, setFaqs] = useState<Faq[] | null>(null);
  const [faqError, setFaqError] = useState('');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketDetail, setTicketDetail] = useState<SupportTicketDetail | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [contactName, setContactName] = useState(profile?.name ?? '');
  const [contactEmail, setContactEmail] = useState(authEmail || profile?.email || '');
  const [replyMessage, setReplyMessage] = useState('');
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [sending, setSending] = useState(false);
  useEffect(() => {
    let active = true;
    customerSupportApi.getFaqs().then(items => {
      if (active) setFaqs(items);
    }).catch(() => {
      if (active) setFaqError('Chưa tải được câu hỏi từ cửa hàng.');
    });
    if (authEmail) {
      customerSupportApi.getTickets().then(page => {
        if (active) setTickets(page.items);
      }).catch(() => undefined);
    }
    return () => { active = false; };
  }, [authEmail]);
  const sendSupport = async () => {
    if (sending) return;
    if (subject.trim().length < 3 || message.trim().length < 5) {
      setSendError('Vui lòng nhập chủ đề và nội dung yêu cầu.');
      return;
    }
    if (!authEmail && (contactName.trim().length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))) {
      setSendError('Vui lòng nhập họ tên và email hợp lệ.');
      return;
    }
    setSending(true);
    setSendError('');
    try {
      const created = authEmail
        ? await customerSupportApi.createTicket(subject.trim(), message.trim())
        : await customerSupportApi.contact({
            name: contactName.trim(),
            email: contactEmail.trim(),
            phone: profile?.phone || null,
            subject: subject.trim(),
            message: message.trim(),
          });
      setSubject('');
      setMessage('');
      setSendSuccess(`Đã gửi yêu cầu ${created.ticketNumber}.`);
      if (authEmail) {
        const page = await customerSupportApi.getTickets();
        setTickets(page.items);
      }
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Không thể gửi yêu cầu hỗ trợ.');
    } finally {
      setSending(false);
    }
  };
  const openTicket = async (id: number) => {
    setSendError('');
    try {
      setTicketDetail(await customerSupportApi.getTicketDetail(id));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Không thể tải yêu cầu hỗ trợ.');
    }
  };
  const sendReply = async () => {
    if (!ticketDetail || !replyMessage.trim() || sending) return;
    setSending(true);
    setSendError('');
    try {
      await customerSupportApi.reply(ticketDetail.ticket.id, replyMessage.trim());
      setReplyMessage('');
      setTicketDetail(await customerSupportApi.getTicketDetail(ticketDetail.ticket.id));
    } catch (error) {
      setSendError(error instanceof Error ? error.message : 'Không thể gửi câu trả lời.');
    } finally {
      setSending(false);
    }
  };
  const fallbackQuestions = [
    [
      'Tôi xem đơn hàng ở đâu?',
      liveCatalog
        ? 'Mở Đơn hàng của tôi và chạm Chi tiết để xem trạng thái đơn được cập nhật từ cửa hàng.'
        : 'Mở Đơn hàng của tôi và chạm Chi tiết để xem sản phẩm, tổng tiền cùng thông tin giao hàng đã lưu khi thanh toán. Đơn hàng được lưu trên thiết bị; phiên bản này chưa đặt giao hàng hoặc theo dõi trực tiếp.',
    ],
    [
      'Thanh toán có tạo đơn hàng thật không?',
      liveCatalog
        ? 'Có. Sau khi đăng nhập, đơn hàng được gửi đến cửa hàng. Ứng dụng kiểm tra lại giỏ hàng và tổng tiền trước khi đặt.'
        : 'Chưa. Hãy kết nối lại với cửa hàng và đăng nhập để đặt hàng trực tuyến.',
    ],
    [
      'Ứng dụng hỗ trợ phương thức thanh toán nào?',
      liveCatalog
        ? 'Bạn có thể thanh toán khi nhận hàng hoặc dùng số dư ví Sellzy.'
        : 'Khi kết nối cửa hàng, bạn có thể thanh toán khi nhận hàng hoặc bằng ví Sellzy.',
    ],
    [
      'Tôi dùng mã ưu đãi như thế nào?',
      liveCatalog
        ? 'Nhập mã giảm giá trong giỏ hàng. Điều kiện và mức giảm sẽ được cửa hàng kiểm tra trước khi đặt đơn.'
        : 'Kết nối lại với cửa hàng để kiểm tra mã giảm giá và báo giá thật.',
    ],
    [
      'Giỏ hàng và danh sách yêu thích có được lưu không?',
      liveCatalog
        ? 'Khi đăng nhập, giỏ hàng, yêu thích, hồ sơ và đơn hàng được đồng bộ với tài khoản. Một số tùy chọn giao diện vẫn được lưu trên thiết bị.'
        : 'Khi mất kết nối, dữ liệu mẫu trên thiết bị không thể dùng để đặt đơn hàng thật.',
    ],
    [
      'Chức năng mua lại hoạt động thế nào?',
      'Chạm Mua lại trong Đơn hàng của tôi để thêm sản phẩm đã lưu vào giỏ hàng. Việc mua lại dùng giá và tồn kho hiện tại; ưu đãi của đơn cũ không tự động được áp dụng lại.',
    ],
    [
      'Làm sao để trở thành nhà bán hàng?',
      'Mở Các cửa hàng rồi chạm Trở thành nhà bán hàng. Sau khi đăng nhập, nhập thông tin cửa hàng cùng liên kết giấy tờ xác minh và gửi hồ sơ để xét duyệt.',
    ],
  ];
  const questions = faqs === null
    ? fallbackQuestions
    : faqs.map(item => [item.question, item.answer]);
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle="Hướng dẫn nhanh khi mua sắm với Sellzy"
        title="Trợ giúp & hỗ trợ"
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.helpHero}>
          <View style={styles.helpHeroIcon}>
            <Icon color={COLORS.tealDark} name="headset" size={25} />
          </View>
          <Text style={styles.helpHeroTitle}>Chúng tôi có thể giúp gì?</Text>
          <Text style={styles.helpHeroText}>
            Tìm câu trả lời về sản phẩm, thanh toán và thông tin đã lưu.
          </Text>
        </View>
        <Text style={styles.faqHeading}>Câu hỏi thường gặp</Text>
        {faqError ? <Text style={styles.formHelp}>{faqError}</Text> : null}
        {faqs?.length === 0 ? <Text style={styles.formHelp}>Chưa có câu hỏi thường gặp.</Text> : null}
        {questions.map(([question, answer], index) => (
          <View key={question} style={styles.faqCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: expandedQuestion === index }}
              onPress={() =>
                setExpandedQuestion(expandedQuestion === index ? null : index)
              }
              style={styles.faqToggle}
            >
              <Text style={styles.faqQuestion}>{question}</Text>
              <Icon
                color={COLORS.teal}
                name={expandedQuestion === index ? 'minus' : 'plus'}
                size={19}
              />
            </Pressable>
            {expandedQuestion === index ? (
              <Text style={styles.faqAnswer}>{answer}</Text>
            ) : null}
          </View>
        ))}
        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Liên hệ hỗ trợ</Text>
          {!authEmail ? (
            <>
              <AccountField label="Họ tên" value={contactName} onChangeText={setContactName} />
              <AccountField label="Email" value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" />
            </>
          ) : null}
          <AccountField label="Chủ đề" value={subject} onChangeText={setSubject} maxLength={255} />
          <AccountField label="Nội dung" value={message} onChangeText={setMessage} maxLength={10000} multiline />
          {sendError ? <Text style={styles.orderErrorText}>{sendError}</Text> : null}
          {sendSuccess ? <Text style={styles.contactText}>{sendSuccess}</Text> : null}
          <AccountAction label={sending ? 'Đang gửi...' : 'Gửi yêu cầu'} onPress={() => { sendSupport().catch(() => undefined); }} />
        </View>
        {authEmail && tickets.length ? (
          <>
            <Text style={styles.faqHeading}>Yêu cầu của tôi</Text>
            {tickets.map(ticket => (
              <Pressable key={ticket.id} accessibilityRole="button" style={styles.faqCard} onPress={() => { openTicket(ticket.id).catch(() => undefined); }}>
                <Text style={styles.faqQuestion}>{ticket.subject}</Text>
                <Text style={styles.formHelp}>{ticket.ticketNumber} · {ticket.statusName}</Text>
              </Pressable>
            ))}
          </>
        ) : null}
      </ScrollView>
      {ticketDetail ? (
        <AccountDialog title={ticketDetail.ticket.subject} onClose={() => setTicketDetail(null)}>
          <AccountNotice>{ticketDetail.ticket.ticketNumber} · {ticketDetail.ticket.statusName}</AccountNotice>
          <Text style={styles.contactText}>{ticketDetail.ticket.description}</Text>
          {ticketDetail.replies.map(reply => (
            <View key={reply.id} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{reply.senderName}</Text>
              <Text style={styles.faqAnswer}>{reply.messageText}</Text>
            </View>
          ))}
          {ticketDetail.ticket.statusName !== 'closed' ? (
            <>
              <AccountField label="Trả lời" value={replyMessage} onChangeText={setReplyMessage} multiline />
              {sendError ? <Text style={styles.orderErrorText}>{sendError}</Text> : null}
              <AccountAction label={sending ? 'Đang gửi...' : 'Gửi trả lời'} onPress={() => { sendReply().catch(() => undefined); }} />
            </>
          ) : null}
        </AccountDialog>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  content: { padding: 16, paddingBottom: 30 },
  orderLoading: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  orderLoadingText: {
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  orderError: {
    padding: 14,
    marginBottom: 14,
    borderRadius: 12,
    backgroundColor: '#FDECEF',
  },
  orderErrorText: {
    color: COLORS.red,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  shipmentBlock: {
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  orderActionForm: {
    marginTop: 16,
    padding: 15,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
  },
  returnItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  quantityButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.teal,
  },
  quantityText: { color: COLORS.teal, fontSize: 20, fontWeight: '800' },
  quantityValue: { minWidth: 22, textAlign: 'center', color: COLORS.ink },
  orderDismiss: { padding: 12, alignItems: 'center' },
  orderDismissText: { color: COLORS.muted, fontSize: 12, fontWeight: '700' },
  infoBanner: {
    padding: 13,
    marginBottom: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  infoIcon: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  infoText: {
    flex: 1,
    color: COLORS.tealDark,
    fontSize: 12,
    lineHeight: 18,
    marginLeft: 10,
  },
  orderCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 19,
    backgroundColor: COLORS.white,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderLabel: { color: COLORS.ink, fontSize: 12, fontWeight: '900' },
  orderDate: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF4D2',
  },
  statusDelivered: { backgroundColor: '#E7F7EE' },
  statusText: { color: '#8B6A00', fontSize: 11, fontWeight: '900' },
  statusDeliveredText: { color: COLORS.success },
  orderProducts: { flexDirection: 'row', gap: 8, marginVertical: 15 },
  orderProductImageWrap: {
    width: 61,
    height: 61,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  orderProductImage: { width: '90%', height: '90%' },
  orderBottom: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 8,
    marginLeft: 12,
  },
  orderItems: { color: COLORS.muted, fontSize: 12 },
  orderTotal: {
    color: COLORS.ink,
    fontSize: 17,
    fontWeight: '900',
    marginTop: 3,
  },
  reorderButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  reorderText: { color: COLORS.teal, fontSize: 11, fontWeight: '900' },
  detailLine: {
    minHeight: 61,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailLineCopy: { flex: 1, paddingRight: 12 },
  detailLineName: {
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  detailLineMeta: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  detailLinePrice: { color: COLORS.ink, fontSize: 13, fontWeight: '900' },
  detailSummary: {
    padding: 15,
    marginTop: 17,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
  },
  summaryLine: {
    minHeight: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: { flex: 1, color: COLORS.muted, fontSize: 11 },
  summaryValue: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  deliveryCard: {
    padding: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
  },
  detailSectionTitle: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8,
  },
  deliveryName: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  deliveryText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },
  deliveryPayment: {
    alignSelf: 'flex-start',
    color: COLORS.tealDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 9,
  },
  formHelp: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 12,
  },
  wishlistGrid: { paddingHorizontal: 11, paddingBottom: 28 },
  gridInner: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: { padding: 5 },
  accountContent: { padding: 16, paddingBottom: 30 },
  profileCard: {
    padding: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.tealDark,
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  avatarText: { color: COLORS.tealDark, fontSize: 20, fontWeight: '900' },
  profileCopy: { flex: 1, paddingHorizontal: 13 },
  profileName: { color: COLORS.white, fontSize: 16, fontWeight: '900' },
  profileEmail: { color: '#CAE1DF', fontSize: 12, marginTop: 4 },
  memberBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: COLORS.yellow,
  },
  memberText: {
    color: '#5E4900',
    fontSize: 10,
    letterSpacing: 0.6,
    fontWeight: '900',
  },
  editButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#5E9996',
    borderRadius: 15,
  },
  editText: { color: COLORS.white, fontSize: 12, fontWeight: '800' },
  accountStats: {
    minHeight: 83,
    marginTop: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { color: COLORS.ink, fontSize: 19, fontWeight: '900' },
  statLabel: { color: COLORS.muted, fontSize: 11, marginTop: 4 },
  statDivider: { width: 1, height: 34, backgroundColor: COLORS.border },
  menuSection: {
    color: COLORS.muted,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 9,
  },
  menuItem: {
    minHeight: 67,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  menuIcon: { color: COLORS.teal, fontSize: 16, fontWeight: '900' },
  menuCopy: { flex: 1, paddingHorizontal: 12 },
  menuLabel: { color: COLORS.ink, fontSize: 13, fontWeight: '800' },
  menuSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
  },
  menuArrow: { color: COLORS.muted, fontSize: 25 },
  signOutButton: {
    height: 49,
    marginTop: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#FFF0F3',
  },
  signOutText: { color: COLORS.red, fontSize: 12, fontWeight: '900' },
  loginButton: {
    height: 49,
    marginTop: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  loginButtonText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  continueGuestButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  continueGuestText: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  profileNote: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
  },
  preferenceRow: {
    minHeight: 72,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  preferenceCopy: { flex: 1 },
  paymentOption: {
    minHeight: 72,
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
  },
  paymentSelected: {
    borderColor: COLORS.teal,
    backgroundColor: COLORS.tealSoft,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.teal },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.teal,
  },
  version: {
    color: '#A0A8AA',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 14,
  },
  sellerHero: {
    padding: 23,
    marginBottom: 18,
    borderRadius: 21,
    backgroundColor: COLORS.tealDark,
  },
  sellerHeroEyebrow: {
    color: COLORS.yellow,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: '900',
  },
  sellerHeroTitle: {
    color: COLORS.white,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    marginTop: 9,
  },
  sellerHeroText: {
    color: '#CDE2E0',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  sellerCard: {
    padding: 14,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sellerLogo: {
    width: 57,
    height: 57,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerLogoText: { color: COLORS.tealDark, fontSize: 21, fontWeight: '900' },
  sellerCopy: { flex: 1, paddingHorizontal: 12 },
  sellerName: { color: COLORS.ink, fontSize: 14, fontWeight: '900' },
  sellerMeta: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 4,
  },
  verified: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
  },
  visitButton: {
    minHeight: 44,
    paddingHorizontal: 13,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.teal,
  },
  visitText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
  vendorCallout: {
    padding: 21,
    marginTop: 8,
    borderRadius: 20,
    backgroundColor: '#FFF7DB',
  },
  vendorCalloutTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900' },
  vendorCalloutText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  vendorButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginTop: 14,
    borderRadius: 19,
    backgroundColor: COLORS.yellow,
  },
  vendorButtonText: { color: '#554200', fontSize: 13, fontWeight: '900' },
  helpHero: {
    padding: 25,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: COLORS.tealDark,
  },
  helpHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  helpHeroTitle: {
    color: COLORS.white,
    fontSize: 23,
    fontWeight: '900',
    marginTop: 13,
  },
  helpHeroText: {
    color: '#CDE2E0',
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
  faqHeading: {
    color: COLORS.ink,
    fontSize: 19,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 12,
  },
  faqCard: {
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
  },
  faqToggle: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  faqQuestion: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '900',
  },
  faqAnswer: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 7,
  },
  contactCard: {
    padding: 19,
    marginTop: 8,
    borderRadius: 18,
    backgroundColor: COLORS.tealSoft,
  },
  contactTitle: { color: COLORS.tealDark, fontSize: 16, fontWeight: '900' },
  contactText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 7,
  },
  contactHours: { color: COLORS.muted, fontSize: 12, marginTop: 4 },
});
