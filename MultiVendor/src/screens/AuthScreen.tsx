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
      ? 'Khong the dang nhap. Vui long thu lai.'
      : 'Khong the tao tai khoan. Vui long thu lai.';

  if (!(error instanceof Error)) return fallback;

  const message = error.message.trim();
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('offline') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return 'Kiem tra ket noi internet roi thu lai.';
  }

  if (
    mode === 'login' &&
    (lowerMessage.includes('unauthorized') ||
      lowerMessage.includes('credential') ||
      lowerMessage.includes('401'))
  ) {
    return 'Email hoac mat khau chua chinh xac.';
  }

  if (
    mode === 'register' &&
    (lowerMessage.includes('already') ||
      lowerMessage.includes('exists') ||
      lowerMessage.includes('conflict') ||
      lowerMessage.includes('409'))
  ) {
    return 'Email nay da duoc dang ky.';
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
    setShowPassword(false);
  };

  const validate = () => {
    const nextErrors: FieldErrors = {};
    const cleanName = fullName.trim().replace(/\s+/g, ' ');
    const cleanEmail = email.trim().toLowerCase();

    if (mode === 'register') {
      if (!cleanName) {
        nextErrors.fullName = 'Vui long nhap ho va ten.';
      } else if (cleanName.length < 2) {
        nextErrors.fullName = 'Ho ten can co it nhat 2 ky tu.';
      }
    }

    if (!cleanEmail) {
      nextErrors.email = 'Vui long nhap dia chi email.';
    } else if (!emailPattern.test(cleanEmail)) {
      nextErrors.email = 'Nhap dia chi email hop le.';
    }

    if (!password) {
      nextErrors.password = 'Vui long nhap mat khau.';
    } else if (mode === 'register' && password.length < 8) {
      nextErrors.password = 'Mat khau can co it nhat 8 ky tu.';
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

  const title = mode === 'login' ? 'Chao mung tro lai' : 'Tao tai khoan Sellzy';
  const subtitle =
    mode === 'login'
      ? 'Dang nhap de quan ly thong tin mua sam cua ban.'
      : 'Tao tai khoan de mua sam thuan tien hon.';

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
                accessibilityHint="Tiep tuc mua sam ma khong can dang nhap"
                accessibilityLabel="Quay lai"
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
                  ? 'RAT VUI KHI GAP LAI'
                  : 'MUA SAM THEO CACH CUA BAN'}
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
                label="Dang nhap"
                onPress={() => changeMode('login')}
                testID="auth-mode-login"
              />
              <ModeButton
                active={mode === 'register'}
                disabled={loading}
                label="Dang ky"
                onPress={() => changeMode('register')}
                testID="auth-mode-register"
              />
            </View>

            <Text style={styles.formTitle}>
              {mode === 'login' ? 'Dang nhap tai khoan' : 'Tao tai khoan'}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === 'login'
                ? 'Nhap thong tin ben duoi de tiep tuc.'
                : 'Chi can vai thong tin la ban co the bat dau.'}
            </Text>

            {mode === 'register' ? (
              <AuthField
                autoCapitalize="words"
                autoComplete="name"
                editable={!loading}
                error={errors.fullName}
                icon="user"
                label="Ho va ten"
                onChangeText={value => {
                  setFullName(value);
                  clearFieldError('fullName');
                }}
                onSubmitEditing={() => emailInput.current?.focus()}
                placeholder="Nhap ho va ten"
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
              label="Dia chi email"
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
              label="Mat khau"
              onChangeText={value => {
                setPassword(value);
                clearFieldError('password');
              }}
              onSubmitEditing={submit}
              placeholder={
                mode === 'register' ? 'It nhat 8 ky tu' : 'Nhap mat khau'
              }
              returnKeyType="done"
              secureTextEntry={!showPassword}
              testID="auth-password"
              textContentType={mode === 'login' ? 'password' : 'newPassword'}
              value={password}
            >
              <Pressable
                accessibilityLabel={
                  showPassword ? 'An mat khau' : 'Hien mat khau'
                }
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setShowPassword(current => !current)}
                style={styles.passwordAction}
              >
                <Text style={styles.passwordActionText}>
                  {showPassword ? 'An' : 'Hien'}
                </Text>
              </Pressable>
            </AuthField>

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
                    {mode === 'login' ? 'Dang nhap' : 'Tao tai khoan'}
                  </Text>
                  <Icon color={COLORS.white} name="arrow-right" size={18} />
                </>
              )}
            </Pressable>

            <View style={styles.guestDividerRow}>
              <View style={styles.guestDivider} />
              <Text style={styles.guestDividerText}>KHONG CAN TAI KHOAN</Text>
              <View style={styles.guestDivider} />
            </View>

            <Pressable
              accessibilityHint="Quay ve Sellzy va mua sam khong can tai khoan"
              accessibilityRole="button"
              onPress={onBack}
              style={({ pressed }) => [
                styles.guestButton,
                pressed && styles.pressed,
              ]}
              testID="auth-continue-guest"
            >
              <Text style={styles.guestButtonText}>Tiep tuc voi tu cach khach</Text>
              <Icon color={COLORS.teal} name="chevron-right" size={17} />
            </Pressable>

            <Text style={styles.guestNote}>
              Ban van co the xem, luu yeu thich va mua sam ma khong can dang
              nhap.
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
