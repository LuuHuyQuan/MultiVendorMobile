import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { notificationsApi, type MyNotification } from '../api/notifications';
import { Icon } from '../components/Icon';
import { ScreenHeader, sharedStyles } from '../components/SellzyUI';
import { COLORS } from '../theme';

export default function NotificationsScreen({ topInset, onBack }: { topInset: number; onBack: () => void }) {
  const [items, setItems] = useState<MyNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refresh = async () => {
    try {
      const page = await notificationsApi.list();
      setItems(page.items);
      setUnread(page.unread);
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể tải thông báo.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh().catch(() => undefined); }, []);
  const read = async (item: MyNotification) => {
    if (item.isRead) return;
    try {
      await notificationsApi.read(item.id);
      setItems(current => current.map(entry => entry.id === item.id ? { ...entry, isRead: true } : entry));
      setUnread(current => Math.max(0, current - 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đánh dấu đã đọc.');
    }
  };
  const readAll = async () => {
    try {
      await notificationsApi.readAll();
      setItems(current => current.map(item => ({ ...item, isRead: true })));
      setUnread(0);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể đánh dấu đã đọc.');
    }
  };
  const remove = async (item: MyNotification) => {
    try {
      await notificationsApi.delete(item.id);
      setItems(current => current.filter(entry => entry.id !== item.id));
      if (!item.isRead) setUnread(current => Math.max(0, current - 1));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Không thể xóa thông báo.');
    }
  };
  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader canGoBack onBack={onBack} title="Thông báo" subtitle={unread ? `${unread} thông báo chưa đọc` : 'Thông tin từ cửa hàng'} />
      <ScrollView contentContainerStyle={styles.content}>
        {unread > 0 ? <Pressable accessibilityRole="button" onPress={() => { readAll().catch(() => undefined); }} style={styles.readAll}><Text style={styles.readAllText}>Đánh dấu tất cả đã đọc</Text></Pressable> : null}
        {error ? <View style={styles.error}><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" onPress={() => { refresh().catch(() => undefined); }}><Text style={styles.retry}>Thử lại</Text></Pressable></View> : null}
        {loading ? <ActivityIndicator color={COLORS.teal} /> : null}
        {!loading && !items.length ? <Text style={styles.empty}>Bạn chưa có thông báo nào.</Text> : null}
        {items.map(item => (
          <View key={item.id} style={[styles.card, !item.isRead && styles.unread]}>
            <Pressable accessibilityRole="button" onPress={() => { read(item).catch(() => undefined); }} style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('vi-VN')}</Text>
              {!item.isRead ? <Text style={styles.hint}>Chạm để đánh dấu đã đọc</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Xóa thông báo ${item.title}`} onPress={() => { remove(item).catch(() => undefined); }} style={styles.delete}><Icon name="trash" color={COLORS.red} size={18} /></Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  readAll: { alignSelf: 'flex-end', paddingVertical: 10, marginBottom: 8 },
  readAllText: { color: COLORS.teal, fontWeight: '800' },
  error: { padding: 14, backgroundColor: '#FDECEF', borderRadius: 12, marginBottom: 12 },
  errorText: { color: COLORS.red },
  retry: { color: COLORS.teal, fontWeight: '800', marginTop: 8 },
  empty: { color: COLORS.muted, textAlign: 'center', padding: 40 },
  card: { flexDirection: 'row', backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, marginBottom: 10 },
  unread: { borderColor: COLORS.teal, backgroundColor: COLORS.tealSoft },
  cardBody: { flex: 1, padding: 14 },
  title: { color: COLORS.ink, fontWeight: '800', fontSize: 14 },
  message: { color: COLORS.ink, marginTop: 5, lineHeight: 20 },
  date: { color: COLORS.muted, marginTop: 7, fontSize: 11 },
  hint: { color: COLORS.teal, marginTop: 7, fontSize: 11 },
  delete: { padding: 14, justifyContent: 'center' },
});
