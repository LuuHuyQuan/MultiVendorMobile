import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, IconName } from '../components/Icon';
import { isApiError } from '../api/errors';
import { forgotPassword } from '../api/auth';
import { COLORS } from '../theme';

export type AuthMode = 'login' | 'register';

export type AuthScreenProps = {
  onBack: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (
    fullName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  initialMode?: AuthMode;
};

type FieldName = 'fullName' | 'email' | 'password';
type FieldErrors = Partial<Record<FieldName, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getFriendlyError(error: unknown, mode: AuthMode) {
  const fallback =
    mode === 'login'
      ? 'Không thể đăng nhập. Vui lòng thử lại.'
      : 'Không thể tạo tài khoản. Vui lòng thử lại.';

  if (isApiError(error)) {
    if (error.status === 429) {
      return 'Bạn đã thử quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.';
    }
    if (mode === 'login' && (error.status === 400 || error.status === 401)) {
      return 'Email hoặc mật khẩu chưa chính xác.';
    }
    if (mode === 'register' && error.status === 409) {
      return 'Email này đã được đăng ký.';
    }
    if (error.validationErrors) {
      const firstMessage = Object.values(error.validationErrors)
        .flat()
        .find(message => message.trim());
      if (firstMessage) return firstMessage;
    }
    if (error.status >= 500) {
      return 'Dịch vụ đang gặp sự cố. Vui lòng thử lại sau.';
    }
  }

  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('offline') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return 'Không kết nối được máy chủ. Vui lòng tải lại trang rồi thử lại.';
  }

  if (
    mode === 'login' &&
    (lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('credential') ||
      lowerMessage.includes('401'))
  ) {
    return 'Email hoặc mật khẩu chưa chính xác.';
  }

  if (
    mode === 'register' &&
    (lowerMessage.includes('already') ||
      lowerMessage.includes('exists') ||
      lowerMessage.includes('conflict') ||
      lowerMessage.includes('409'))
  ) {
    return 'Email này đã được đăng ký.';
  }

  return fallback;
}

export function AuthScreen({
  onBack,
  onLogin,
  onRegister,
  initialMode = 'login',
}: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 370;
  const horizontalPadding = compact ? 16 : width >= 720 ? 32 : 22;
  const emailInput = useRef<TextInput>(null);
  const passwordInput = useRef<TextInput>(null);

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [requestError, setRequestError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState('');

  const recover = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!emailPattern.test(cleanEmail)) {
      setErrors(current => ({ ...current, email: 'Nhập email hợp lệ để khôi phục mật khẩu.' }));
      return;
    }
    if (recovering) return;
    setRecovering(true);
    setRequestError('');
    setRecoveryNotice('');
    try {
      setRecoveryNotice(await forgotPassword(cleanEmail));
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Không thể gửi yêu cầu khôi phục mật khẩu.');
    } finally {
      setRecovering(false);
    }
  };

  const clearFieldError = (field: FieldName) => {
    setErrors(current => {
      if (!current[field]) return current;
      return { ...current, [field]: undefined };
    });
    if (requestError) setRequestError('');
  };

  const changeMode = (nextMode: AuthMode) => {
    if (loading || nextMode === mode) return;
    setMode(nextMode);
    setErrors({});
    setRequestError('');
    setPassword('');
    setShowPassword(false);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'register') {
      if (!cleanName) {
        nextErrors.fullName = 'Vui lòng nhập họ và tên.';
      } else if (cleanName.length < 2) {
        nextErrors.fullName = 'Họ tên cần có ít nhất 2 ký tự.';
      }
    }

    if (!cleanEmail) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!emailPattern.test(cleanEmail)) {
      nextErrors.email = 'Nhập địa chỉ email hợp lệ.';
    }

    if (!password) {
      nextErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (mode === 'register' && password.length < 8) {
      nextErrors.password = 'Mật khẩu cần có ít nhất 8 ký tự.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async () => {
    if (loading || !validate()) return;

    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();
    setRequestError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        await onLogin(cleanEmail, password);
      } else {
        await onRegister(cleanName, cleanEmail, password);
      }
    } catch (error) {
      setRequestError(getFriendlyError(error, mode));
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản Sellzy';
  const subtitle =
    mode === 'login'
      ? 'Đăng nhập để quản lý thông tin mua sắm của bạn.'
      : 'Tạo tài khoản để mua sắm thuận tiện hơn.';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 18) + 18 },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.hero,
            compact && styles.heroCompact,
            { paddingTop: Math.max(insets.top, 12) },
          ]}
        >
          <View pointerEvents="none" style={styles.heroOrbLarge} />
          <View pointerEvents="none" style={styles.heroOrbSmall} />
          <View
            style={[styles.heroInner, { paddingHorizontal: horizontalPadding }]}
          >
            <View style={styles.heroTopRow}>
              <Pressable
                accessibilityHint="Tiếp tục mua sắm mà không cần đăng nhập"
                accessibilityLabel="Quay lại"
                accessibilityRole="button"
                hitSlop={8}
                onPress={onBack}
                style={({ pressed }) => [
                  styles.backButton,
                  pressed && styles.pressed,
                ]}
                testID="auth-back"
              >
                <Icon color={COLORS.white} name="back" size={21} />
              </Pressable>
              <View style={styles.brand}>
                <View style={styles.brandMark}>
                  <Text style={styles.brandMarkText}>S</Text>
                </View>
                <Text style={styles.brandName}>Sellzy</Text>
              </View>
              <View style={styles.topSpacer} />
            </View>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>
                {mode === 'login'
                  ? 'RẤT VUI KHI GẶP LẠI'
                  : 'MUA SẮM THEO CÁCH CỦA BẠN'}
              </Text>
              <Text accessibilityRole="header" style={styles.heroTitle}>
                {title}
              </Text>
              <Text style={styles.heroSubtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>

        <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.formCard}>
            <View accessibilityRole="tablist" style={styles.modeSwitch}>
              <ModeButton
                active={mode === 'login'}
                disabled={loading}
                label="Đăng nhập"
                onPress={() => changeMode('login')}
                testID="auth-mode-login"
              />
              <ModeButton
                active={mode === 'register'}
                disabled={loading}
                label="Đăng ký"
                onPress={() => changeMode('register')}
                testID="auth-mode-register"
              />
            </View>

            <Text style={styles.formTitle}>
              {mode === 'login' ? 'Đăng nhập tài khoản' : 'Tạo tài khoản'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'login'
                ? 'Nhập thông tin bên dưới để tiếp tục.'
                : 'Chỉ cần vài thông tin là bạn có thể bắt đầu.'}
            </Text>

            {mode === 'register' ? (
              <AuthField
                autoCapitalize="words"
                autoComplete="name"
                editable={!loading}
                error={errors.fullName}
                icon="user"
                label="Họ và tên"
                onChangeText={value => {
                  setFullName(value);
                  clearFieldError('fullName');
                }}
                onSubmitEditing={() => emailInput.current?.focus()}
                placeholder="Nhập họ và tên"
                returnKeyType="next"
                testID="auth-full-name"
                textContentType="name"
                value={fullName}
              />
            ) : null}

            <AuthField
              autoCapitalize="none"
              autoComplete="email"
              editable={!loading}
              error={errors.email}
              icon="mail"
              inputRef={emailInput}
              keyboardType="email-address"
              label="Địa chỉ email"
              onChangeText={value => {
                setEmail(value);
                clearFieldError('email');
              }}
              onSubmitEditing={() => passwordInput.current?.focus()}
              placeholder="you@example.com"
              returnKeyType="next"
              testID="auth-email"
              textContentType="emailAddress"
              value={email}
            />

            <AuthField
              autoCapitalize="none"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              editable={!loading}
              error={errors.password}
              icon="shield"
              inputRef={passwordInput}
              label="Mật khẩu"
              onChangeText={value => {
                setPassword(value);
                clearFieldError('password');
              }}
              onSubmitEditing={submit}
              placeholder={
                mode === 'register' ? 'Ít nhất 8 ký tự' : 'Nhập mật khẩu'
              }
              returnKeyType="done"
              secureTextEntry={!showPassword}
              testID="auth-password"
              textContentType={mode === 'login' ? 'password' : 'newPassword'}
              value={password}
            >
              <Pressable
                accessibilityLabel={
                  showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                }
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setShowPassword(current => !current)}
                style={styles.passwordAction}
              >
                <Text style={styles.passwordActionText}>
                  {showPassword ? 'Ẩn' : 'Hiện'}
                </Text>
              </Pressable>
            </AuthField>

            {mode === 'login' ? (
              <Pressable accessibilityRole="button" onPress={() => { recover().catch(() => undefined); }} style={styles.recoverButton}>
                <Text style={styles.recoverText}>{recovering ? 'Đang gửi...' : 'Quên mật khẩu?'}</Text>
              </Pressable>
            ) : null}
            {recoveryNotice ? <Text style={styles.recoveryNotice}>{recoveryNotice}</Text> : null}

            {requestError ? (
              <View
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={styles.requestError}
              >
                <Icon color={COLORS.red} name="info" size={18} />
                <Text style={styles.requestErrorText}>{requestError}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ busy: loading, disabled: loading }}
              disabled={loading}
              onPress={submit}
              style={({ pressed }) => [
                styles.submitButton,
                pressed && !loading && styles.submitButtonPressed,
                loading && styles.submitButtonDisabled,
              ]}
              testID="auth-submit"
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Text style={styles.submitText}>
                    {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                  </Text>
                  <Icon color={COLORS.white} name="arrow-right" size={18} />
                </>
              )}
            </Pressable>

            <View style={styles.guestDividerRow}>
              <View style={styles.guestDivider} />
              <Text style={styles.guestDividerText}>KHÔNG CẦN TÀI KHOẢN</Text>
              <View style={styles.guestDivider} />
            </View>

            <Pressable
              accessibilityHint="Quay về Sellzy và mua sắm không cần tài khoản"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                styles.guestButton,
                pressed && styles.pressed,
              ]}
              testID="auth-continue-guest"
            >
              <Text style={styles.guestButtonText}>
                Tiếp tục với tư cách khách
              </Text>
              <Icon color={COLORS.teal} name="chevron-right" size={17} />
            </Pressable>

            <Text style={styles.guestNote}>
              Bạn có thể xem sản phẩm, lưu yêu thích và chuẩn bị giỏ hàng.
              Đăng nhập để đặt hàng.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ModeButtonProps = {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  testID: string;
};

function ModeButton({
  active,
  disabled,
  label,
  onPress,
  testID,
}: ModeButtonProps) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeButton,
        active && styles.modeButtonActive,
        pressed && !active && styles.pressed,
      ]}
      testID={testID}
    >
      <Text
        style={[styles.modeButtonText, active && styles.modeButtonTextActive]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type AuthFieldProps = React.ComponentProps<typeof TextInput> & {
  children?: React.ReactNode;
  error?: string;
  icon: IconName;
  inputRef?: React.RefObject<TextInput | null>;
  label: string;
};

function AuthField({
  children,
  error,
  icon,
  inputRef,
  label,
  ...inputProps
}: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, Boolean(error) && styles.inputWrapError]}>
        <Icon color={error ? COLORS.red : COLORS.teal} name={icon} size={19} />
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor="#98A1A6"
          ref={inputRef}
          selectionColor={COLORS.teal}
          style={styles.input}
          {...inputProps}
        />
        {children}
      </View>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.fieldError}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  recoverButton: { alignSelf: 'flex-end', paddingVertical: 9 },
  recoverText: { color: COLORS.teal, fontWeight: '800' },
  recoveryNotice: { color: COLORS.tealDark, marginTop: 8, lineHeight: 20 },
  screen: { flex: 1, backgroundColor: COLORS.surface },
  scrollContent: { flexGrow: 1, backgroundColor: COLORS.surface },
  hero: {
    minHeight: 315,
    overflow: 'hidden',
    backgroundColor: COLORS.tealDark,
  },
  heroCompact: { minHeight: 300 },
  heroInner: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  heroOrbLarge: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    right: -85,
    top: -55,
    backgroundColor: '#14777A',
  },
  heroOrbSmall: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    left: -27,
    bottom: 22,
    backgroundColor: '#116A6D',
  },
  heroTopRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#FFFFFF42',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF12',
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.yellow,
  },
  brandMarkText: { color: COLORS.tealDark, fontSize: 18, fontWeight: '900' },
  brandName: { color: COLORS.white, fontSize: 19, fontWeight: '900' },
  topSpacer: { width: 44 },
  heroCopy: { marginTop: 30, maxWidth: 470 },
  eyebrow: {
    color: COLORS.yellow,
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: '900',
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '900',
    marginTop: 10,
  },
  heroSubtitle: {
    maxWidth: 380,
    color: '#CDE2E0',
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    padding: 20,
    marginTop: -47,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    boxShadow: '0px 8px 22px rgba(23, 66, 62, 0.10)',
    elevation: 4,
  },
  modeSwitch: {
    height: 48,
    padding: 4,
    borderRadius: 24,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
  },
  modeButton: {
    flex: 1,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: COLORS.white,
    boxShadow: '0px 2px 7px rgba(23, 66, 62, 0.10)',
    elevation: 2,
  },
  modeButtonText: { color: COLORS.muted, fontSize: 14, fontWeight: '800' },
  modeButtonTextActive: { color: COLORS.teal },
  formTitle: {
    color: COLORS.ink,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 22,
  },
  formSubtitle: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 18,
  },
  field: { marginBottom: 15 },
  label: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 7,
  },
  inputWrap: {
    minHeight: 52,
    paddingLeft: 14,
    paddingRight: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.surface,
  },
  inputWrapError: { borderColor: COLORS.red, backgroundColor: '#FFF8FA' },
  input: {
    flex: 1,
    minWidth: 0,
    height: 50,
    paddingVertical: 0,
    color: COLORS.ink,
    fontSize: 15,
  },
  passwordAction: {
    minWidth: 50,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordActionText: { color: COLORS.teal, fontSize: 12, fontWeight: '800' },
  fieldError: { color: COLORS.red, fontSize: 12, lineHeight: 17, marginTop: 5 },
  requestError: {
    padding: 12,
    marginBottom: 14,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    backgroundColor: '#FFF0F3',
  },
  requestErrorText: {
    flex: 1,
    color: COLORS.red,
    fontSize: 12,
    lineHeight: 18,
  },
  submitButton: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.teal,
  },
  submitButtonPressed: { backgroundColor: COLORS.tealDark },
  submitButtonDisabled: { opacity: 0.68 },
  submitText: { color: COLORS.white, fontSize: 15, fontWeight: '900' },
  guestDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 21,
  },
  guestDivider: { flex: 1, height: 1, backgroundColor: COLORS.border },
  guestDividerText: {
    color: COLORS.muted,
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '800',
  },
  guestButton: {
    minHeight: 48,
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  guestButtonText: { color: COLORS.teal, fontSize: 14, fontWeight: '900' },
  guestNote: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  pressed: { opacity: 0.72 },
});

export default AuthScreen;
