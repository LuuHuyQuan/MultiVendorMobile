import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ApiError } from '../api/errors';
import {
  sellerOnboardingApi,
  type SellerOnboardingStatus,
  type SubmitSellerApplication,
} from '../api/sellerOnboarding';
import { ScreenHeader, sharedStyles } from '../components/SellzyUI';
import { COLORS } from '../theme';
import { AccountField } from './AccountForms';

type Props = {
  topInset: number;
  isLoggedIn: boolean;
  initialBusinessName?: string;
  onBack: () => void;
  onLogin: () => void;
  onSellerPortal: () => void;
};

type Form = {
  businessName: string;
  businessType: string;
  taxNumber: string;
  identityNumber: string;
  documents: { documentType: string; documentUrl: string }[];
};

const blankDocument = () => ({ documentType: 'Giấy tờ xác minh', documentUrl: '' });

const isWebUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const errorMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'Không thể kết nối dịch vụ. Vui lòng thử lại.';

const statusLabel: Record<string, string> = {
  pending: 'Đang chờ duyệt',
  approved: 'Đã duyệt',
  rejected: 'Cần bổ sung hồ sơ',
  cancelled: 'Đã hủy',
};

export default function SellerOnboardingScreen({
  topInset,
  isLoggedIn,
  initialBusinessName = '',
  onBack,
  onLogin,
  onSellerPortal,
}: Props) {
  const [status, setStatus] = useState<SellerOnboardingStatus | null>(null);
  const [form, setForm] = useState<Form>({
    businessName: initialBusinessName,
    businessType: '',
    taxNumber: '',
    identityNumber: '',
    documents: [blankDocument()],
  });
  const [loading, setLoading] = useState(isLoggedIn);
  const [saving, setSaving] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    if (!isLoggedIn) {
      setStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    setSessionExpired(false);
    try {
      const next = await sellerOnboardingApi.getMine();
      setStatus(next);
      if (next.application?.statusName === 'rejected' || next.application?.statusName === 'cancelled') {
        setForm(current => ({
          businessName: current.businessName || next.application?.businessName || '',
          businessType: current.businessType || next.application?.businessType || '',
          taxNumber: current.taxNumber || next.application?.taxNumber || '',
          identityNumber: current.identityNumber || next.application?.identityNumber || '',
          documents: current.documents.some(item => item.documentUrl.trim())
            ? current.documents
            : next.documents.length
            ? next.documents.map(item => ({ documentType: item.documentType, documentUrl: item.documentUrl }))
            : [blankDocument()],
        }));
      }
    } catch (cause) {
      setStatus(null);
      setSessionExpired(cause instanceof ApiError && cause.status === 401);
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [isLoggedIn]);

  useEffect(() => { refresh(); }, [refresh]);

  const setField = (field: Exclude<keyof Form, 'documents'>, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  };

  const setDocument = (index: number, field: 'documentType' | 'documentUrl', value: string) => {
    setForm(current => ({
      ...current,
      documents: current.documents.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setError('');
  };

  const submit = async () => {
    if (saving) return;
    const request: SubmitSellerApplication = {
      businessName: form.businessName.trim(),
      businessType: form.businessType.trim() || null,
      taxNumber: form.taxNumber.trim() || null,
      identityNumber: form.identityNumber.trim() || null,
      documents: form.documents.map(item => ({
        documentType: item.documentType.trim(),
        documentUrl: item.documentUrl.trim(),
      })),
    };
    if (request.businessName.length < 2 || request.businessName.length > 160) {
      setError('Tên cửa hàng cần từ 2 đến 160 ký tự.');
      return;
    }
    if (!request.taxNumber && !request.identityNumber) {
      setError('Vui lòng nhập mã số thuế hoặc số giấy tờ định danh.');
      return;
    }
    if (request.documents.length < 1 || request.documents.length > 10 ||
      request.documents.some(item => !item.documentType || !isWebUrl(item.documentUrl))) {
      setError('Cần ít nhất một giấy tờ xác minh với đường dẫn HTTP hoặc HTTPS hợp lệ.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await sellerOnboardingApi.submit(request);
      setNotice('Đã gửi hồ sơ đăng ký nhà bán hàng.');
      await refresh();
    } catch (cause) {
      setSessionExpired(cause instanceof ApiError && cause.status === 401);
      setError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const requiresLogin = !isLoggedIn || sessionExpired;
  const canSubmit = isLoggedIn && !sessionExpired && !loading && status !== null && !status.store &&
    status?.application?.statusName !== 'pending' &&
    status?.application?.statusName !== 'approved';

  return (
    <View style={[sharedStyles.screen, { paddingTop: topInset }]}>
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle="Gửi hồ sơ và theo dõi xét duyệt"
        title="Trở thành nhà bán hàng"
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {notice ? <Text accessibilityLiveRegion="polite" style={styles.notice}>{notice}</Text> : null}
        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={COLORS.teal} style={styles.loader} /> : null}
        {requiresLogin ? (
          <View style={styles.card}>
            <Text style={styles.title}>Đăng nhập để gửi hồ sơ</Text>
            <Text style={styles.body}>Hồ sơ và trạng thái xét duyệt được gắn với tài khoản của bạn.</Text>
            <Action label="Đăng nhập" onPress={onLogin} />
          </View>
        ) : null}
        {!loading && !requiresLogin && error && !status ? (
          <Action label="Thử tải lại" onPress={refresh} />
        ) : null}
        {!requiresLogin && status?.store ? (
          <View style={styles.card}>
            <Text style={styles.title}>{status.store.name}</Text>
            <Text style={styles.body}>Trạng thái cửa hàng: {status.store.statusName === 'active' ? 'Đang hoạt động' : status.store.statusName}.</Text>
            {status.store.statusName === 'active' ? (
              <Action label="Mở kênh người bán" onPress={onSellerPortal} />
            ) : (
              <Text style={styles.body}>Vui lòng liên hệ hỗ trợ nếu cần mở lại cửa hàng.</Text>
            )}
          </View>
        ) : null}
        {!requiresLogin && status?.application && !status.store ? (
          <View style={styles.card}>
            <Text style={styles.title}>{status.application.businessName}</Text>
            <Text style={styles.body}>Hồ sơ: {statusLabel[status.application.statusName] ?? status.application.statusName}.</Text>
            {status.application.statusName === 'pending' ? (
              <Text style={styles.body}>Hồ sơ đã gửi và đang chờ xét duyệt. Bạn có thể quay lại đây để kiểm tra.</Text>
            ) : null}
            {status.application.rejectionReason ? (
              <Text style={styles.rejection}>Lý do: {status.application.rejectionReason}</Text>
            ) : null}
            {status.application.statusName === 'approved' ? (
              <Text style={styles.body}>Hồ sơ đã được duyệt. Đăng nhập lại nếu kênh người bán chưa hiển thị.</Text>
            ) : null}
            <Action label="Cập nhật trạng thái" onPress={refresh} secondary />
          </View>
        ) : null}
        {canSubmit ? (
          <View style={styles.card}>
            <Text style={styles.title}>{status?.application?.statusName === 'rejected' ? 'Gửi lại hồ sơ' : 'Thông tin cửa hàng'}</Text>
            <Text style={styles.body}>Cung cấp tên cửa hàng, mã số thuế hoặc giấy tờ định danh và ít nhất một liên kết giấy tờ xác minh.</Text>
            <AccountField label="Tên cửa hàng" maxLength={160} value={form.businessName}
              onChangeText={value => setField('businessName', value)} placeholder="Tên cửa hàng" />
            <AccountField label="Loại hình kinh doanh (không bắt buộc)" maxLength={100} value={form.businessType}
              onChangeText={value => setField('businessType', value)} placeholder="Ví dụ: Hộ kinh doanh" />
            <AccountField label="Mã số thuế" maxLength={80} value={form.taxNumber}
              onChangeText={value => setField('taxNumber', value)} placeholder="Nhập nếu có" />
            <AccountField label="Số giấy tờ định danh" maxLength={80} value={form.identityNumber}
              onChangeText={value => setField('identityNumber', value)} placeholder="Nhập nếu không có mã số thuế" />
            <Text style={styles.sectionTitle}>Giấy tờ xác minh</Text>
            <Text style={styles.body}>Dán liên kết web đến giấy tờ để người xét duyệt có thể mở. Hệ thống hiện chưa hỗ trợ tải tệp lên ở bước này.</Text>
            {form.documents.map((item, index) => (
              <View key={index} style={styles.document}>
                <AccountField label={`Loại giấy tờ ${index + 1}`} maxLength={50} value={item.documentType}
                  onChangeText={value => setDocument(index, 'documentType', value)} placeholder="Ví dụ: Giấy phép kinh doanh" />
                <AccountField label="Liên kết giấy tờ" autoCapitalize="none" keyboardType="url" maxLength={1000}
                  value={item.documentUrl} onChangeText={value => setDocument(index, 'documentUrl', value)} placeholder="https://..." />
                {form.documents.length > 1 ? (
                  <Action label="Xóa giấy tờ này" secondary onPress={() =>
                    setForm(current => ({ ...current, documents: current.documents.filter((_, itemIndex) => itemIndex !== index) }))
                  } />
                ) : null}
              </View>
            ))}
            {form.documents.length < 10 ? (
              <Action label="Thêm giấy tờ" secondary onPress={() =>
                setForm(current => ({ ...current, documents: [...current.documents, blankDocument()] }))
              } />
            ) : null}
            <Action label={saving ? 'Đang gửi...' : 'Gửi hồ sơ'} disabled={saving} onPress={submit} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Action({ label, onPress, disabled, secondary }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled} onPress={onPress} style={[styles.action, secondary && styles.secondary, disabled && styles.disabled]}>
      <Text style={[styles.actionText, secondary && styles.secondaryText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36 },
  loader: { marginTop: 35 },
  card: { padding: 18, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1,
    borderColor: COLORS.border, marginBottom: 16 },
  title: { color: COLORS.ink, fontWeight: '800', fontSize: 18, marginBottom: 8 },
  sectionTitle: { color: COLORS.ink, fontWeight: '800', fontSize: 15, marginTop: 10, marginBottom: 6 },
  body: { color: COLORS.muted, fontSize: 13, lineHeight: 20, marginBottom: 14 },
  document: { padding: 12, borderRadius: 14, backgroundColor: COLORS.surface, marginBottom: 12 },
  action: { minHeight: 46, borderRadius: 24, backgroundColor: COLORS.teal, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondary: { backgroundColor: COLORS.tealSoft },
  disabled: { opacity: 0.5 },
  actionText: { color: COLORS.white, fontWeight: '800', fontSize: 13 },
  secondaryText: { color: COLORS.tealDark },
  notice: { color: COLORS.tealDark, backgroundColor: COLORS.tealSoft, borderRadius: 12,
    padding: 12, marginBottom: 14 },
  error: { color: COLORS.red, backgroundColor: '#FFF0EE', borderRadius: 12,
    padding: 12, marginBottom: 14 },
  rejection: { color: COLORS.red, fontSize: 13, lineHeight: 20, marginBottom: 10 },
});
