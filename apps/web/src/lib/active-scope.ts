export type ActiveScopeOption = {
  id: string;
  label: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string | null;
};

const STORAGE_KEY = 'gcuoba:active-scope';

export function readActiveScope(): ActiveScopeOption | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = window.sessionStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as ActiveScopeOption;
  } catch {
    return null;
  }
}

export function writeActiveScope(option: ActiveScopeOption) {
  if (typeof window === 'undefined') {
    return;
  }
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(option));
}
