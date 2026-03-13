import type { UserDTO } from '@gcuoba/types';
import * as SecureStore from 'expo-secure-store';

const SESSION_STORAGE_KEY = 'gcuoba.mobile.session';

export type MobileSession = {
  token: string;
  user: UserDTO;
};

export async function loadStoredSession(): Promise<MobileSession | null> {
  const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as MobileSession;
    if (!parsed?.token || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: MobileSession) {
  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function clearStoredSession() {
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
