import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../components/Icon';
import { ScreenHeader } from '../components/SellzyUI';
import { COLORS } from '../theme';
import walletApi from '../walletApi';
import type {
  LinkedBankAccount,
  LinkBankRequest,
  WalletStatus,
  WalletTransaction,
  WalletTransactionStatus,
  WalletTransactionType,
} from '../walletTypes';
import type { WalletSummary } from '../walletTypes';

export type WalletScreenProps = {
  onBack: () => void;
  onRequireLogin?: () => void;
};

type LoadMode = 'initial' | 'refresh' | 'silent';
type MoneyMode = WalletTransactionType;

type BankDraft = {
  bankCode: string;
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
};

const emptyBankDraft: BankDraft = {
  bankCode: '',
  bankName: '',
  accountHolderName: '',
  accountNumber: '',
};

const quickAmounts = [100_000, 500_000, 1_000_000];

const walletStatusLabels: Record<WalletStatus, string> = {
  active: 'Đang hoạt động',
  frozen: 'Tạm khóa',
  closed: 'Đã đóng',
};

const transactionStatusLabels: Record<WalletTransactionStatus, string> = {
  pending: 'Đang chờ',
  completed: 'Thành công',
  failed: 'Không thành công',
};

function formatMoney(value: number, currency = 'VND') {
  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'VND' ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toLocaleString('vi-VN')} ${currency}`;
  }
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function sortBanks(accounts: LinkedBankAccount[]) {
  return [...accounts].sort(
    (left, right) =>
      Number(right.isDefault) - Number(left.isDefault) || left.id - right.id,
  );
}

function makeIdempotencyKey() {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `wallet-${Date.now().toString(36)}-${randomPart}`;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  const status =
    candidate.status ?? candidate.statusCode ?? candidate.response?.status;
  return typeof status === 'number' ? status : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (error && typeof error === 'object') {
    const candidate = error as {
      message?: unknown;
      response?: { data?: { message?: unknown } };
    };
    const message = candidate.response?.data?.message ?? candidate.message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function runAsync(task: Promise<unknown>) {
  task.catch(() => undefined);
}

function SectionHeading({
  icon,
  title,
  subtitle,
}: {
  icon: 'activity' | 'credit-card' | 'plus' | 'arrow-up-right';
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.sectionIcon}>
        <Icon name={icon} color={COLORS.teal} size={19} />
      </View>
      <View style={styles.sectionHeadingCopy}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

function MessageBanner({
  kind,
  children,
}: {
  kind: 'error' | 'success' | 'warning';
  children: React.ReactNode;
}) {
  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.message,
        kind === 'error' && styles.messageError,
        kind === 'success' && styles.messageSuccess,
        kind === 'warning' && styles.messageWarning,
      ]}
    >
      <Icon
        name={kind === 'error' ? 'info' : kind === 'success' ? 'check' : 'shield'}
        color={
          kind === 'error'
            ? COLORS.red
            : kind === 'success'
              ? COLORS.success
              : '#8B6A00'
        }
        size={18}
      />
      <Text
        style={[
          styles.messageText,
          kind === 'error' && styles.messageErrorText,
          kind === 'success' && styles.messageSuccessText,
          kind === 'warning' && styles.messageWarningText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function FormField({
  label,
  required,
  ...props
}: TextInputProps & { label: string; required?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#96A09F"
        selectionColor={COLORS.teal}
        style={styles.input}
        {...props}
      />
    </View>
  );
}

function LoadingCard({ label }: { label: string }) {
  return (
    <View style={styles.loadingCard}>
      <ActivityIndicator color={COLORS.teal} size="small" />
      <Text style={styles.loadingLabel}>{label}</Text>
    </View>
  );
}

export default function WalletScreen({
  onBack,
  onRequireLogin,
}: WalletScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isWide = width >= 840;
  const mountedRef = useRef(true);
  const loadSequenceRef = useRef(0);
  const loginRequestedRef = useRef(false);
  const pendingMoneyRequestRef = useRef<{
    signature: string;
    key: string;
  } | null>(null);

  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [banks, setBanks] = useState<LinkedBankAccount[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [coreError, setCoreError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const [moneyMode, setMoneyMode] = useState<MoneyMode>('top_up');
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(0);
  const [moneySubmitting, setMoneySubmitting] = useState(false);

  const [showBankForm, setShowBankForm] = useState(false);
  const [bankDraft, setBankDraft] = useState<BankDraft>(emptyBankDraft);
  const [bankFormError, setBankFormError] = useState('');
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [busyBankId, setBusyBankId] = useState<number | null>(null);

  const reportRequestError = useCallback(
    (error: unknown, fallback: string) => {
      if (
        getErrorStatus(error) === 401 &&
        onRequireLogin &&
        !loginRequestedRef.current
      ) {
        loginRequestedRef.current = true;
        onRequireLogin();
      }
      return getErrorMessage(error, fallback);
    },
    [onRequireLogin],
  );

  const loadAll = useCallback(
    async (mode: LoadMode = 'refresh') => {
      const sequence = ++loadSequenceRef.current;
      if (mode === 'initial') {
        setLoading(true);
        setHistoryLoading(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      }
      setCoreError('');
      setHistoryError('');

      const [walletResult, bankResult, historyResult] =
        await Promise.allSettled([
          walletApi.getWallet(),
          walletApi.getBanks(),
          walletApi.getTransactions(),
        ]);

      if (mountedRef.current && sequence === loadSequenceRef.current) {
        const coreErrors: string[] = [];
        if (walletResult.status === 'fulfilled') {
          setWallet(walletResult.value);
        } else {
          coreErrors.push(
            reportRequestError(walletResult.reason, 'Không thể tải số dư ví.'),
          );
        }

        if (bankResult.status === 'fulfilled') {
          setBanks(sortBanks(bankResult.value));
        } else {
          coreErrors.push(
            reportRequestError(
              bankResult.reason,
              'Không thể tải ngân hàng liên kết.',
            ),
          );
        }

        if (historyResult.status === 'fulfilled') {
          setTransactions(historyResult.value);
        } else {
          setHistoryError(
            reportRequestError(
              historyResult.reason,
              'Không thể tải lịch sử giao dịch.',
            ),
          );
        }

        setCoreError([...new Set(coreErrors)].join('\n'));
      }

      if (mountedRef.current) {
        if (mode === 'initial') {
          setLoading(false);
          setHistoryLoading(false);
        } else if (mode === 'refresh') {
          setRefreshing(false);
        }
      }
    },
    [reportRequestError],
  );

  useEffect(() => {
    mountedRef.current = true;
    runAsync(loadAll('initial'));
    return () => {
      mountedRef.current = false;
    };
  }, [loadAll]);

  useEffect(() => {
    if (!banks.length) {
      setSelectedBankId(0);
      return;
    }
    setSelectedBankId(current => {
      if (banks.some(bank => bank.id === current)) return current;
      return banks.find(bank => bank.isDefault)?.id ?? banks[0].id;
    });
  }, [banks]);

  const selectedBank = useMemo(
    () => banks.find(bank => bank.id === selectedBankId),
    [banks, selectedBankId],
  );

  const clearActionMessages = () => {
    setActionError('');
    setNotice('');
  };

  const handleMoneyModeChange = (mode: MoneyMode) => {
    setMoneyMode(mode);
    setActionError('');
    setNotice('');
  };

  const handleMoneySubmit = async () => {
    clearActionMessages();
    const normalizedAmount = amount.trim().replace(',', '.');
    const value = Number(normalizedAmount);
    const hundredths = value * 100;
    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      value > 1_000_000_000 ||
      Math.abs(Math.round(hundredths) - hundredths) > 0.000_001
    ) {
      setActionError(
        'Số tiền phải lớn hơn 0, tối đa 1 tỷ VND và có tối đa 2 chữ số thập phân.',
      );
      return;
    }
    if (!wallet || wallet.statusName !== 'active') {
      setActionError('Ví hiện không hoạt động nên chưa thể tạo giao dịch.');
      return;
    }
    if (!selectedBank) {
      setActionError('Vui lòng liên kết và chọn một tài khoản ngân hàng.');
      return;
    }
    if (moneyMode === 'withdrawal' && !selectedBank.isVerified) {
      setActionError('Ngân hàng nhận tiền chưa được xác minh.');
      return;
    }

    const signature = `${moneyMode}:${value}:${selectedBank.id}`;
    const key =
      pendingMoneyRequestRef.current?.signature === signature
        ? pendingMoneyRequestRef.current.key
        : makeIdempotencyKey();
    pendingMoneyRequestRef.current = { signature, key };
    setMoneySubmitting(true);
    try {
      const request = {
        amount: value,
        bankAccountId: selectedBank.id,
        idempotencyKey: key,
      };
      const created =
        moneyMode === 'top_up'
          ? await walletApi.requestTopUp(request)
          : await walletApi.requestWithdrawal(request);
      pendingMoneyRequestRef.current = null;
      setAmount('');
      setTransactions(current => [
        created,
        ...current.filter(entry => entry.id !== created.id),
      ]);
      setNotice(
        moneyMode === 'top_up'
          ? 'Đã tạo yêu cầu nạp tiền. Số dư sẽ tăng sau khi khoản nạp được xác nhận.'
          : 'Đã tạo yêu cầu rút tiền. Khoản tiền này được tạm giữ trong lúc xử lý.',
      );
      await loadAll('silent');
    } catch (error: unknown) {
      setActionError(
        reportRequestError(error, 'Không thể tạo yêu cầu. Vui lòng thử lại.'),
      );
    } finally {
      if (mountedRef.current) setMoneySubmitting(false);
    }
  };

  const validateBankDraft = (): LinkBankRequest | null => {
    const request: LinkBankRequest = {
      bankCode: bankDraft.bankCode.trim().toUpperCase(),
      bankName: bankDraft.bankName.trim(),
      accountHolderName: bankDraft.accountHolderName.trim().toUpperCase(),
      accountNumber: bankDraft.accountNumber.replace(/\s+/g, ''),
    };
    if (!/^[A-Z0-9_-]{2,30}$/.test(request.bankCode)) {
      setBankFormError(
        'Mã ngân hàng gồm 2–30 chữ cái, chữ số, dấu gạch ngang hoặc gạch dưới.',
      );
      return null;
    }
    if (request.bankName.length < 2 || request.bankName.length > 150) {
      setBankFormError('Tên ngân hàng phải có từ 2 đến 150 ký tự.');
      return null;
    }
    if (
      request.accountHolderName.length < 2 ||
      request.accountHolderName.length > 180
    ) {
      setBankFormError('Tên chủ tài khoản phải có từ 2 đến 180 ký tự.');
      return null;
    }
    if (!/^\d{6,30}$/.test(request.accountNumber)) {
      setBankFormError('Số tài khoản phải gồm từ 6 đến 30 chữ số.');
      return null;
    }
    return request;
  };

  const handleLinkBank = async () => {
    setBankFormError('');
    clearActionMessages();
    const request = validateBankDraft();
    if (!request) return;
    setBankSubmitting(true);
    try {
      const linked = await walletApi.linkBank(request);
      setBanks(current =>
        sortBanks([
          linked,
          ...current
            .filter(bank => bank.id !== linked.id)
            .map(bank =>
              linked.isDefault ? { ...bank, isDefault: false } : bank,
            ),
        ]),
      );
      setSelectedBankId(linked.id);
      setBankDraft(emptyBankDraft);
      setShowBankForm(false);
      setNotice(
        'Đã liên kết ngân hàng. Tài khoản cần được xác minh trước khi rút tiền.',
      );
    } catch (error: unknown) {
      setBankFormError(
        reportRequestError(
          error,
          'Không thể liên kết ngân hàng. Vui lòng kiểm tra thông tin.',
        ),
      );
    } finally {
      if (mountedRef.current) setBankSubmitting(false);
    }
  };

  const handleSetDefault = async (bank: LinkedBankAccount) => {
    clearActionMessages();
    setBusyBankId(bank.id);
    try {
      const updated = await walletApi.setDefaultBank(bank.id);
      setBanks(current =>
        sortBanks(
          current.map(account => ({
            ...account,
            ...(account.id === updated.id ? updated : null),
            isDefault: account.id === updated.id,
          })),
        ),
      );
      setSelectedBankId(updated.id);
      setNotice('Đã đổi ngân hàng mặc định.');
    } catch (error: unknown) {
      setActionError(
        reportRequestError(error, 'Không thể đổi ngân hàng mặc định.'),
      );
    } finally {
      if (mountedRef.current) setBusyBankId(null);
    }
  };

  const unlinkBank = async (bank: LinkedBankAccount) => {
    clearActionMessages();
    setBusyBankId(bank.id);
    try {
      await walletApi.unlinkBank(bank.id);
      setBanks(current => current.filter(account => account.id !== bank.id));
      if (selectedBankId === bank.id) setSelectedBankId(0);
      setNotice('Đã hủy liên kết ngân hàng.');
      await loadAll('silent');
    } catch (error: unknown) {
      setActionError(
        reportRequestError(error, 'Không thể hủy liên kết ngân hàng.'),
      );
    } finally {
      if (mountedRef.current) setBusyBankId(null);
    }
  };

  const confirmUnlinkBank = (bank: LinkedBankAccount) => {
    Alert.alert(
      'Hủy liên kết ngân hàng?',
      `${bank.bankName} · ${bank.accountNumberMasked} sẽ bị xóa khỏi ví của bạn.`,
      [
        { text: 'Giữ lại', style: 'cancel' },
        {
          text: 'Hủy liên kết',
          style: 'destructive',
          onPress: () => runAsync(unlinkBank(bank)),
        },
      ],
    );
  };

  const retryHistory = async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const result = await walletApi.getTransactions();
      if (mountedRef.current) setTransactions(result);
    } catch (error: unknown) {
      if (mountedRef.current) {
        setHistoryError(
          reportRequestError(error, 'Không thể tải lịch sử giao dịch.'),
        );
      }
    } finally {
      if (mountedRef.current) setHistoryLoading(false);
    }
  };

  const updateBankDraft = (field: keyof BankDraft, value: string) => {
    setBankFormError('');
    setBankDraft(current => ({ ...current, [field]: value }));
  };

  const renderWalletSummary = () => {
    if (!wallet) return null;
    const statusLabel = walletStatusLabels[wallet.statusName] ?? wallet.statusName;
    return (
      <View style={[styles.walletCard, isWide && styles.walletCardWide]}>
        <View style={styles.walletDecorationLarge} />
        <View style={styles.walletDecorationSmall} />
        <View style={styles.walletTopRow}>
          <View style={styles.walletIdentity}>
            <View style={styles.walletIconWrap}>
              <Icon name="credit-card" color={COLORS.tealDark} size={19} />
            </View>
            <Text style={styles.walletLabel}>VÍ CÁ NHÂN</Text>
          </View>
          <View style={styles.currencyBadge}>
            <Text style={styles.currencyText}>{wallet.currency}</Text>
          </View>
        </View>
        <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          style={styles.balanceValue}
        >
          {formatMoney(wallet.availableBalance, wallet.currency)}
        </Text>
        <View style={styles.walletDivider} />
        <View style={styles.walletMetaRow}>
          <View style={styles.walletMetaBlock}>
            <Text style={styles.walletMetaLabel}>Đang tạm giữ để rút</Text>
            <Text style={styles.walletMetaValue}>
              {formatMoney(wallet.reservedBalance, wallet.currency)}
            </Text>
          </View>
          <View style={styles.walletStatus}>
            <View
              style={[
                styles.walletStatusDot,
                wallet.statusName !== 'active' && styles.walletStatusDotInactive,
              ]}
            />
            <Text style={styles.walletStatusText}>{statusLabel}</Text>
          </View>
        </View>
        <Text style={styles.walletUpdated}>
          Cập nhật {formatDateTime(wallet.updatedAt)}
        </Text>
      </View>
    );
  };

  const renderMoneyCard = () => {
    const walletInactive = !wallet || wallet.statusName !== 'active';
    return (
      <View style={[styles.card, isWide && styles.moneyCardWide]}>
        <SectionHeading
          icon="arrow-up-right"
          title="Nạp hoặc rút tiền"
          subtitle="Yêu cầu được ghi nhận và xử lý an toàn"
        />
        <View style={styles.segmentedControl}>
          {(['top_up', 'withdrawal'] as const).map(mode => {
            const selected = moneyMode === mode;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={mode}
                onPress={() => handleMoneyModeChange(mode)}
                style={({ pressed }) => [
                  styles.segment,
                  selected && styles.segmentSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Icon
                  name={mode === 'top_up' ? 'plus' : 'arrow-up-right'}
                  color={selected ? COLORS.teal : COLORS.muted}
                  size={16}
                />
                <Text
                  style={[
                    styles.segmentText,
                    selected && styles.segmentTextSelected,
                  ]}
                >
                  {mode === 'top_up' ? 'Nạp tiền' : 'Rút tiền'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <FormField
          label="Số tiền (VND)"
          onChangeText={value => {
            setAmount(value.replace(/[^0-9.,]/g, ''));
            setActionError('');
          }}
          keyboardType="decimal-pad"
          maxLength={16}
          placeholder="Ví dụ: 100000"
          required
          value={amount}
        />
        <View style={styles.quickAmountRow}>
          {quickAmounts.map(value => (
            <Pressable
              accessibilityRole="button"
              key={value}
              onPress={() => {
                setAmount(String(value));
                setActionError('');
              }}
              style={({ pressed }) => [
                styles.quickAmount,
                amount === String(value) && styles.quickAmountSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.quickAmountText,
                  amount === String(value) && styles.quickAmountTextSelected,
                ]}
              >
                {formatMoney(value).replace(/\s?₫/, '')}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Ngân hàng liên kết</Text>
        {banks.length ? (
          <View style={styles.bankSelector}>
            {banks.map(bank => {
              const selected = bank.id === selectedBankId;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={bank.id}
                  onPress={() => {
                    setSelectedBankId(bank.id);
                    setActionError('');
                  }}
                  style={({ pressed }) => [
                    styles.bankOption,
                    selected && styles.bankOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <View
                    style={[styles.radio, selected && styles.radioSelected]}
                  >
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.bankOptionCopy}>
                    <Text numberOfLines={1} style={styles.bankOptionName}>
                      {bank.bankName}
                    </Text>
                    <Text style={styles.bankOptionNumber}>
                      {bank.accountNumberMasked}
                      {bank.isVerified ? ' · Đã xác minh' : ' · Chưa xác minh'}
                    </Text>
                  </View>
                  {bank.isDefault ? (
                    <View style={styles.miniDefaultBadge}>
                      <Text style={styles.miniDefaultText}>Mặc định</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.noBankBox}>
            <Text style={styles.noBankText}>
              Chưa có ngân hàng. Hãy liên kết một tài khoản bên dưới.
            </Text>
          </View>
        )}

        {moneyMode === 'withdrawal' && selectedBank && !selectedBank.isVerified ? (
          <MessageBanner kind="warning">
            Tài khoản này cần được xác minh trước khi nhận tiền rút.
          </MessageBanner>
        ) : null}
        {walletInactive ? (
          <MessageBanner kind="warning">
            Ví không ở trạng thái hoạt động. Tạm thời chưa thể nạp hoặc rút.
          </MessageBanner>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{
            disabled:
              moneySubmitting || walletInactive || banks.length === 0,
          }}
          disabled={moneySubmitting || walletInactive || banks.length === 0}
          onPress={() => runAsync(handleMoneySubmit())}
          style={({ pressed }) => [
            styles.primaryButton,
            (moneySubmitting || walletInactive || banks.length === 0) &&
              styles.buttonDisabled,
            pressed && styles.pressed,
          ]}
          testID="wallet-money-submit"
        >
          {moneySubmitting ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Icon
              name={moneyMode === 'top_up' ? 'plus' : 'arrow-up-right'}
              color={COLORS.white}
              size={18}
            />
          )}
          <Text style={styles.primaryButtonText}>
            {moneySubmitting
              ? 'Đang gửi yêu cầu...'
              : moneyMode === 'top_up'
                ? 'Tạo yêu cầu nạp'
                : 'Tạo yêu cầu rút'}
          </Text>
        </Pressable>
        <Text style={styles.helperText}>
          Nạp tiền chỉ cộng vào ví sau khi đối soát. Rút tiền chỉ thực hiện qua
          ngân hàng đã xác minh.
        </Text>
      </View>
    );
  };

  const renderHistory = () => (
    <View style={[styles.card, styles.historyCard]}>
      <View style={styles.sectionHeadingWithAction}>
        <SectionHeading
          icon="activity"
          title="Lịch sử nạp/rút"
          subtitle="50 giao dịch gần nhất"
        />
        <Pressable
          accessibilityLabel="Làm mới lịch sử giao dịch"
          accessibilityRole="button"
          disabled={historyLoading}
          onPress={() => runAsync(retryHistory())}
          style={({ pressed }) => [
            styles.iconButton,
            pressed && styles.pressed,
          ]}
        >
          {historyLoading ? (
            <ActivityIndicator color={COLORS.teal} size="small" />
          ) : (
            <Icon name="refresh" color={COLORS.teal} size={19} />
          )}
        </Pressable>
      </View>

      {historyLoading ? (
        <LoadingCard label="Đang tải lịch sử giao dịch..." />
      ) : historyError ? (
        <View style={styles.inlineState}>
          <View style={styles.inlineStateIconError}>
            <Icon name="info" color={COLORS.red} size={25} />
          </View>
          <Text style={styles.inlineStateTitle}>Chưa tải được lịch sử</Text>
          <Text style={styles.inlineStateText}>{historyError}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => runAsync(retryHistory())}
            style={({ pressed }) => [
              styles.outlineButton,
              pressed && styles.pressed,
            ]}
          >
            <Icon name="refresh" color={COLORS.teal} size={17} />
            <Text style={styles.outlineButtonText}>Thử lại</Text>
          </Pressable>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.inlineState}>
          <View style={styles.inlineStateIcon}>
            <Icon name="activity" color={COLORS.teal} size={27} />
          </View>
          <Text style={styles.inlineStateTitle}>Chưa có giao dịch</Text>
          <Text style={styles.inlineStateText}>
            Các yêu cầu nạp và rút tiền sẽ xuất hiện tại đây.
          </Text>
        </View>
      ) : (
        <View style={styles.transactionList}>
          {transactions.map((transaction, index) => {
            const isTopUp = transaction.transactionType === 'top_up';
            return (
              <View
                key={transaction.id}
                style={[
                  styles.transactionRow,
                  index < transactions.length - 1 && styles.transactionDivider,
                ]}
              >
                <View
                  style={[
                    styles.transactionIcon,
                    !isTopUp && styles.transactionIconWithdrawal,
                  ]}
                >
                  <Icon
                    name={isTopUp ? 'plus' : 'arrow-up-right'}
                    color={isTopUp ? COLORS.success : '#A36500'}
                    size={19}
                  />
                </View>
                <View style={styles.transactionCopy}>
                  <Text style={styles.transactionTitle}>
                    {isTopUp ? 'Nạp tiền' : 'Rút tiền'}
                  </Text>
                  <Text style={styles.transactionMeta}>
                    {formatDateTime(transaction.createdAt)} · #{transaction.id}
                  </Text>
                  {transaction.description ? (
                    <Text numberOfLines={2} style={styles.transactionDescription}>
                      {transaction.description}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.transactionAmountBlock}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.transactionAmount,
                      isTopUp && styles.transactionAmountPositive,
                    ]}
                  >
                    {isTopUp ? '+' : '−'}
                    {formatMoney(transaction.amount, wallet?.currency)}
                  </Text>
                  <View
                    style={[
                      styles.transactionStatus,
                      transaction.statusName === 'completed' &&
                        styles.transactionStatusComplete,
                      transaction.statusName === 'failed' &&
                        styles.transactionStatusFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.transactionStatusText,
                        transaction.statusName === 'completed' &&
                          styles.transactionStatusCompleteText,
                        transaction.statusName === 'failed' &&
                          styles.transactionStatusFailedText,
                      ]}
                    >
                      {transactionStatusLabels[transaction.statusName] ??
                        transaction.statusName}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderBanks = () => (
    <View style={styles.card}>
      <SectionHeading
        icon="credit-card"
        title="Ngân hàng liên kết"
        subtitle={`${banks.length} tài khoản đang liên kết`}
      />
      {banks.length === 0 ? (
        <View style={styles.compactEmptyState}>
          <Icon name="credit-card" color={COLORS.teal} size={27} />
          <Text style={styles.compactEmptyTitle}>Chưa có ngân hàng</Text>
          <Text style={styles.compactEmptyText}>
            Liên kết tài khoản để nạp và rút tiền.
          </Text>
        </View>
      ) : (
        <View style={styles.linkedBankList}>
          {banks.map(bank => {
            const busy = busyBankId === bank.id;
            return (
              <View key={bank.id} style={styles.linkedBankCard}>
                <View style={styles.linkedBankTop}>
                  <View style={styles.bankLogo}>
                    <Text style={styles.bankLogoText}>
                      {bank.bankCode.slice(0, 3).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.linkedBankCopy}>
                    <View style={styles.bankNameRow}>
                      <Text numberOfLines={1} style={styles.linkedBankName}>
                        {bank.bankName}
                      </Text>
                      {bank.isDefault ? (
                        <View style={styles.defaultBadge}>
                          <Text style={styles.defaultBadgeText}>Mặc định</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.linkedBankNumber}>
                      {bank.accountNumberMasked}
                    </Text>
                    <Text numberOfLines={1} style={styles.linkedBankHolder}>
                      {bank.accountHolderName}
                    </Text>
                  </View>
                </View>
                <View style={styles.verifiedRow}>
                  <Icon
                    name={bank.isVerified ? 'check' : 'info'}
                    color={bank.isVerified ? COLORS.success : '#A36500'}
                    size={14}
                  />
                  <Text
                    style={[
                      styles.verifiedText,
                      !bank.isVerified && styles.unverifiedText,
                    ]}
                  >
                    {bank.isVerified ? 'Đã xác minh' : 'Chờ xác minh'}
                  </Text>
                </View>
                <View style={styles.bankActions}>
                  {!bank.isDefault ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyBankId !== null}
                      onPress={() => runAsync(handleSetDefault(bank))}
                      style={({ pressed }) => [
                        styles.bankAction,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.bankActionText}>
                        {busy ? 'Đang xử lý...' : 'Đặt mặc định'}
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    accessibilityRole="button"
                    disabled={busyBankId !== null}
                    onPress={() => confirmUnlinkBank(bank)}
                    style={({ pressed }) => [
                      styles.bankAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.bankActionDanger}>
                      {busy ? 'Đang xử lý...' : 'Hủy liên kết'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );

  const renderAddBank = () => (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showBankForm }}
        onPress={() => {
          setShowBankForm(current => !current);
          setBankFormError('');
        }}
        style={({ pressed }) => [
          styles.addBankToggle,
          pressed && styles.pressed,
        ]}
      >
        <SectionHeading
          icon="plus"
          title="Thêm ngân hàng"
          subtitle="Thông tin tài khoản chính chủ"
        />
        <View style={styles.addBankToggleIcon}>
          <Icon
            name={showBankForm ? 'minus' : 'plus'}
            color={COLORS.teal}
            size={19}
          />
        </View>
      </Pressable>

      {showBankForm ? (
        <View style={styles.bankForm}>
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            label="Mã ngân hàng"
            maxLength={30}
            onChangeText={value => updateBankDraft('bankCode', value)}
            placeholder="VCB"
            required
            value={bankDraft.bankCode}
          />
          <FormField
            label="Tên ngân hàng"
            maxLength={150}
            onChangeText={value => updateBankDraft('bankName', value)}
            placeholder="Vietcombank"
            required
            value={bankDraft.bankName}
          />
          <FormField
            autoCapitalize="characters"
            autoCorrect={false}
            label="Tên chủ tài khoản"
            maxLength={180}
            onChangeText={value => updateBankDraft('accountHolderName', value)}
            placeholder="NGUYEN VAN A"
            required
            value={bankDraft.accountHolderName}
          />
          <FormField
            autoComplete="off"
            keyboardType="number-pad"
            label="Số tài khoản"
            maxLength={30}
            onChangeText={value =>
              updateBankDraft('accountNumber', value.replace(/\D/g, ''))
            }
            placeholder="Nhập số tài khoản"
            required
            secureTextEntry={false}
            value={bankDraft.accountNumber}
          />
          {bankFormError ? (
            <MessageBanner kind="error">{bankFormError}</MessageBanner>
          ) : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: bankSubmitting }}
            disabled={bankSubmitting}
            onPress={() => runAsync(handleLinkBank())}
            style={({ pressed }) => [
              styles.outlineSubmitButton,
              bankSubmitting && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
            testID="wallet-link-bank"
          >
            {bankSubmitting ? (
              <ActivityIndicator color={COLORS.teal} size="small" />
            ) : (
              <Icon name="plus" color={COLORS.teal} size={18} />
            )}
            <Text style={styles.outlineSubmitText}>
              {bankSubmitting ? 'Đang liên kết...' : 'Liên kết ngân hàng'}
            </Text>
          </Pressable>
          <View style={styles.securityNote}>
            <Icon name="shield" color={COLORS.teal} size={17} />
            <Text style={styles.securityNoteText}>
              Hệ thống chỉ hiển thị số tài khoản đã che bớt. Quản trị viên sẽ
              thực hiện bước xác minh.
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <ScreenHeader
        canGoBack
        onBack={onBack}
        subtitle="Số dư, ngân hàng và lịch sử giao dịch"
        title="Ví của bạn"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            colors={[COLORS.teal]}
            onRefresh={() => runAsync(loadAll('refresh'))}
            refreshing={refreshing}
            tintColor={COLORS.teal}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.pageHeading}>
          <View style={styles.pageHeadingCopy}>
            <Text style={styles.eyebrow}>TÀI KHOẢN SELLZY</Text>
            <Text accessibilityRole="header" style={styles.pageTitle}>
              Quản lý dòng tiền của bạn
            </Text>
            <Text style={styles.pageSubtitle}>
              Một ví cá nhân, nhiều ngân hàng liên kết và toàn bộ lịch sử nạp
              rút.
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Làm mới ví"
            accessibilityRole="button"
            accessibilityState={{ disabled: refreshing || loading }}
            disabled={refreshing || loading}
            onPress={() => runAsync(loadAll('refresh'))}
            style={({ pressed }) => [
              styles.refreshButton,
              (refreshing || loading) && styles.buttonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {refreshing ? (
              <ActivityIndicator color={COLORS.teal} size="small" />
            ) : (
              <Icon name="refresh" color={COLORS.teal} size={18} />
            )}
            <Text style={styles.refreshButtonText}>Làm mới</Text>
          </Pressable>
        </View>

        {coreError ? <MessageBanner kind="error">{coreError}</MessageBanner> : null}
        {actionError ? (
          <MessageBanner kind="error">{actionError}</MessageBanner>
        ) : null}
        {notice ? <MessageBanner kind="success">{notice}</MessageBanner> : null}

        {loading && !wallet ? (
          <View style={styles.initialStateCard}>
            <ActivityIndicator color={COLORS.teal} size="large" />
            <Text style={styles.initialStateTitle}>Đang tải ví của bạn...</Text>
            <Text style={styles.initialStateText}>
              Đang đồng bộ số dư, ngân hàng và lịch sử giao dịch.
            </Text>
          </View>
        ) : !wallet ? (
          <View style={styles.initialStateCard}>
            <View style={styles.initialErrorIcon}>
              <Icon name="info" color={COLORS.red} size={31} />
            </View>
            <Text style={styles.initialStateTitle}>Không thể mở ví</Text>
            <Text style={styles.initialStateText}>
              {coreError || 'Vui lòng kiểm tra kết nối rồi thử lại.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => runAsync(loadAll('initial'))}
              style={({ pressed }) => [
                styles.primaryRetryButton,
                pressed && styles.pressed,
              ]}
            >
              <Icon name="refresh" color={COLORS.white} size={18} />
              <Text style={styles.primaryRetryText}>Tải lại ví</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.responsiveRow,
                isWide && styles.responsiveRowWide,
              ]}
            >
              {renderWalletSummary()}
              {renderMoneyCard()}
            </View>
            <View
              style={[
                styles.responsiveRow,
                styles.lowerRow,
                isWide && styles.responsiveRowWide,
              ]}
            >
              <View style={[styles.historyColumn, isWide && styles.historyColumnWide]}>
                {renderHistory()}
              </View>
              <View style={[styles.bankColumn, isWide && styles.bankColumnWide]}>
                {renderBanks()}
                {renderAddBank()}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.surface },
  content: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingTop: 22,
  },
  pressed: { opacity: 0.72 },
  buttonDisabled: { opacity: 0.5 },
  pageHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 20,
  },
  pageHeadingCopy: { flex: 1 },
  eyebrow: {
    color: COLORS.teal,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1.4,
    fontWeight: '900',
  },
  pageTitle: {
    color: COLORS.ink,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    marginTop: 5,
  },
  pageSubtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    maxWidth: 590,
  },
  refreshButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: COLORS.white,
  },
  refreshButtonText: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  responsiveRow: { gap: 16 },
  responsiveRowWide: { flexDirection: 'row', alignItems: 'flex-start' },
  lowerRow: { marginTop: 16 },
  walletCard: {
    minHeight: 320,
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.tealDark,
    boxShadow: '0px 12px 22px rgba(7, 93, 99, 0.20)',
    elevation: 5,
  },
  walletCardWide: { flex: 1.12, minWidth: 0 },
  walletDecorationLarge: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -90,
    top: -85,
    backgroundColor: '#0E797B',
  },
  walletDecorationSmall: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    right: 65,
    bottom: -75,
    backgroundColor: '#0A6B6F',
  },
  walletTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  walletIdentity: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  walletIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  walletLabel: {
    color: '#D2E9E7',
    fontSize: 11,
    letterSpacing: 1.2,
    fontWeight: '900',
  },
  currencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#FFFFFF20',
  },
  currencyText: { color: COLORS.white, fontSize: 11, fontWeight: '900' },
  balanceLabel: { color: '#BFDAD7', fontSize: 12, marginTop: 38 },
  balanceValue: {
    color: COLORS.white,
    fontSize: 37,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -1.1,
    marginTop: 3,
  },
  walletDivider: { height: 1, backgroundColor: '#FFFFFF2C', marginTop: 30 },
  walletMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 17,
  },
  walletMetaBlock: { flex: 1 },
  walletMetaLabel: { color: '#BFDAD7', fontSize: 10 },
  walletMetaValue: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  walletStatus: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF18',
  },
  walletStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#74E6A6',
  },
  walletStatusDotInactive: { backgroundColor: COLORS.yellow },
  walletStatusText: { color: COLORS.white, fontSize: 9, fontWeight: '800' },
  walletUpdated: { color: '#9EC5C1', fontSize: 9, marginTop: 15 },
  card: {
    padding: 19,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    boxShadow: '0px 5px 12px rgba(23, 66, 62, 0.05)',
    elevation: 2,
  },
  moneyCardWide: { flex: 1, minWidth: 0 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  sectionHeadingCopy: { flex: 1, paddingLeft: 10 },
  sectionTitle: { color: COLORS.ink, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  sectionSubtitle: { color: COLORS.muted, fontSize: 9, lineHeight: 14, marginTop: 2 },
  sectionHeadingWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  segmentedControl: {
    minHeight: 48,
    padding: 4,
    marginTop: 19,
    marginBottom: 18,
    borderRadius: 14,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  segmentSelected: {
    backgroundColor: COLORS.white,
    boxShadow: '0px 2px 5px rgba(23, 66, 62, 0.09)',
    elevation: 1,
  },
  segmentText: { color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  segmentTextSelected: { color: COLORS.teal },
  field: { marginBottom: 14 },
  fieldLabel: {
    color: COLORS.ink,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '800',
    marginBottom: 7,
  },
  required: { color: COLORS.red },
  input: {
    minHeight: 51,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    color: COLORS.ink,
    backgroundColor: COLORS.surface,
    fontSize: 14,
  },
  quickAmountRow: { flexDirection: 'row', gap: 7, marginTop: -5, marginBottom: 18 },
  quickAmount: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  quickAmountSelected: { borderColor: COLORS.teal, backgroundColor: COLORS.tealSoft },
  quickAmountText: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  quickAmountTextSelected: { color: COLORS.tealDark },
  bankSelector: { gap: 8, marginBottom: 14 },
  bankOption: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  bankOptionSelected: { borderColor: COLORS.teal, backgroundColor: COLORS.tealSoft },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#A7B0AF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.teal },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: COLORS.teal },
  bankOptionCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  bankOptionName: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  bankOptionNumber: { color: COLORS.muted, fontSize: 9, marginTop: 3 },
  miniDefaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: COLORS.white,
  },
  miniDefaultText: { color: COLORS.teal, fontSize: 7, fontWeight: '900' },
  noBankBox: {
    padding: 14,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    marginBottom: 14,
  },
  noBankText: { color: COLORS.muted, fontSize: 11, lineHeight: 17 },
  primaryButton: {
    minHeight: 52,
    marginTop: 4,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.teal,
  },
  primaryButtonText: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
  helperText: { color: COLORS.muted, fontSize: 9, lineHeight: 15, marginTop: 11 },
  message: {
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 13,
    borderWidth: 1,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  messageError: { borderColor: '#FFD6DE', backgroundColor: '#FFF1F4' },
  messageSuccess: { borderColor: '#CDEDDC', backgroundColor: '#EDFAF3' },
  messageWarning: { borderColor: '#F4DFA9', backgroundColor: '#FFF8E4' },
  messageText: { flex: 1, fontSize: 11, lineHeight: 17 },
  messageErrorText: { color: '#A9193E' },
  messageSuccessText: { color: '#237A4E' },
  messageWarningText: { color: '#765B00' },
  historyColumn: { minWidth: 0 },
  historyColumnWide: { flex: 1.26 },
  bankColumn: { minWidth: 0, gap: 16 },
  bankColumnWide: { flex: 0.84 },
  historyCard: { minHeight: 310 },
  loadingCard: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: { color: COLORS.muted, fontSize: 12 },
  inlineState: {
    minHeight: 210,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineStateIcon: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  inlineStateIconError: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F3',
  },
  inlineStateTitle: { color: COLORS.ink, fontSize: 15, fontWeight: '900', marginTop: 12 },
  inlineStateText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 5,
  },
  outlineButton: {
    minHeight: 44,
    paddingHorizontal: 17,
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  outlineButtonText: { color: COLORS.teal, fontSize: 11, fontWeight: '900' },
  transactionList: { marginTop: 14 },
  transactionRow: {
    minHeight: 79,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transactionDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  transactionIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF8F0',
  },
  transactionIconWithdrawal: { backgroundColor: '#FFF4DB' },
  transactionCopy: { flex: 1, minWidth: 0, paddingHorizontal: 10 },
  transactionTitle: { color: COLORS.ink, fontSize: 12, fontWeight: '900' },
  transactionMeta: { color: COLORS.muted, fontSize: 8, marginTop: 4 },
  transactionDescription: { color: COLORS.muted, fontSize: 8, lineHeight: 12, marginTop: 3 },
  transactionAmountBlock: { alignItems: 'flex-end', maxWidth: '42%' },
  transactionAmount: { color: COLORS.ink, fontSize: 12, fontWeight: '900' },
  transactionAmountPositive: { color: COLORS.success },
  transactionStatus: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    marginTop: 5,
    backgroundColor: '#FFF4DB',
  },
  transactionStatusComplete: { backgroundColor: '#EAF8F0' },
  transactionStatusFailed: { backgroundColor: '#FFF0F3' },
  transactionStatusText: { color: '#936000', fontSize: 7, fontWeight: '900' },
  transactionStatusCompleteText: { color: COLORS.success },
  transactionStatusFailedText: { color: COLORS.red },
  compactEmptyState: {
    minHeight: 145,
    marginTop: 12,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  compactEmptyTitle: { color: COLORS.ink, fontSize: 13, fontWeight: '900', marginTop: 9 },
  compactEmptyText: { color: COLORS.muted, fontSize: 10, textAlign: 'center', marginTop: 4 },
  linkedBankList: { gap: 10, marginTop: 15 },
  linkedBankCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.white,
  },
  linkedBankTop: { flexDirection: 'row', alignItems: 'flex-start' },
  bankLogo: {
    width: 43,
    height: 43,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tealSoft,
  },
  bankLogoText: { color: COLORS.tealDark, fontSize: 9, fontWeight: '900' },
  linkedBankCopy: { flex: 1, minWidth: 0, paddingLeft: 11 },
  bankNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  linkedBankName: { flexShrink: 1, color: COLORS.ink, fontSize: 12, fontWeight: '900' },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9,
    backgroundColor: COLORS.tealSoft,
  },
  defaultBadgeText: { color: COLORS.teal, fontSize: 7, fontWeight: '900' },
  linkedBankNumber: { color: COLORS.ink, fontSize: 11, fontWeight: '700', marginTop: 5 },
  linkedBankHolder: { color: COLORS.muted, fontSize: 8, marginTop: 3 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 11 },
  verifiedText: { color: COLORS.success, fontSize: 9, fontWeight: '800' },
  unverifiedText: { color: '#946000' },
  bankActions: {
    minHeight: 44,
    paddingTop: 8,
    marginTop: 5,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  bankAction: { minHeight: 44, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  bankActionText: { color: COLORS.teal, fontSize: 9, fontWeight: '900' },
  bankActionDanger: { color: COLORS.red, fontSize: 9, fontWeight: '900' },
  addBankToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  addBankToggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  bankForm: { marginTop: 18 },
  outlineSubmitButton: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.teal,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
  },
  outlineSubmitText: { color: COLORS.teal, fontSize: 12, fontWeight: '900' },
  securityNote: {
    padding: 12,
    marginTop: 13,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.tealSoft,
  },
  securityNoteText: { flex: 1, color: COLORS.tealDark, fontSize: 9, lineHeight: 15 },
  initialStateCard: {
    minHeight: 330,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  initialErrorIcon: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0F3',
  },
  initialStateTitle: { color: COLORS.ink, fontSize: 18, fontWeight: '900', marginTop: 17 },
  initialStateText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 7,
    maxWidth: 430,
  },
  primaryRetryButton: {
    minHeight: 48,
    paddingHorizontal: 20,
    marginTop: 19,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.teal,
  },
  primaryRetryText: { color: COLORS.white, fontSize: 12, fontWeight: '900' },
});
