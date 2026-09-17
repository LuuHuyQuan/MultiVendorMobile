import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AuthTokenResponse, StoredAuthSession } from './types';

const AUTH_SESSION_KEY = '@sellzy/auth-session/v1';
const EXPIRATION_SKEW_MS = 30_000;

let cachedSession: StoredAuthSession | null | undefined;
let sessionRead: Promise<StoredAuthSession | null> | null = null;
let storageWrites: Promise<void> = Promise.resolve();

const isStoredAuthSession = (value: unknown): value is StoredAuthSession => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const session = value as Partial<StoredAuthSession>;

  return (
    typeof session.tokenType === 'string' &&
    typeof session.accessToken === 'string' &&
    session.accessToken.length > 0 &&
    typeof session.refreshToken === 'string' &&
    session.refreshToken.length > 0 &&
    typeof session.expiresAt === 'number' &&
    Number.isFinite(session.expiresAt)
  );
};

const enqueueStorageWrite = (operation: () => Promise<void>): Promise<void> => {
  storageWrites = storageWrites.catch(() => undefined).then(operation);
  return storageWrites;
};

const readSessionFromStorage = async (): Promise<StoredAuthSession | null> => {
  const serializedSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!serializedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(serializedSession) as unknown;

    if (isStoredAuthSession(parsedSession)) {
      return parsedSession;
    }
  } catch {
    // The invalid value is removed below.
  }

  await enqueueStorageWrite(() => AsyncStorage.removeItem(AUTH_SESSION_KEY));
  return null;
};

export const getStoredSession = async (): Promise<StoredAuthSession | null> => {
  if (cachedSession !== undefined) {
    return cachedSession;
  }

  if (!sessionRead) {
    const currentRead = readSessionFromStorage();
    sessionRead = currentRead;

    const finishRead = () => {
      if (sessionRead === currentRead) {
        sessionRead = null;
      }
    };

    currentRead.then(finishRead, finishRead);
  }

  const storedSession = await sessionRead;

  if (cachedSession === undefined) {
    cachedSession = storedSession;
  }

  return cachedSession;
};

export const storeAuthTokens = async (
  tokens: AuthTokenResponse,
): Promise<StoredAuthSession> => {
  const session: StoredAuthSession = {
    tokenType: tokens.tokenType || 'Bearer',
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresAt: Date.now() + Math.max(0, tokens.expiresIn) * 1000,
  };

  cachedSession = session;
  await enqueueStorageWrite(() =>
    AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session)),
  );

  return session;
};

export const clearSession = async (): Promise<void> => {
  cachedSession = null;
  await enqueueStorageWrite(() => AsyncStorage.removeItem(AUTH_SESSION_KEY));
};

export const hasStoredSession = async (): Promise<boolean> =>
  Boolean((await getStoredSession())?.refreshToken);

export const isAccessTokenExpiring = (
  session: StoredAuthSession,
  clockSkewMs = EXPIRATION_SKEW_MS,
): boolean => session.expiresAt <= Date.now() + clockSkewMs;
