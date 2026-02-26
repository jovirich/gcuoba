export type ScopeType = 'global' | 'branch' | 'class';

export type ScopeSelection = {
  scopeType?: ScopeType;
  scopeId?: string;
};

export function normalizeScopeType(value?: string | null): ScopeType | undefined {
  if (value === 'global' || value === 'branch' || value === 'class') {
    return value;
  }
  return undefined;
}

export function resolveScopeSelection(params?: {
  scopeType?: string | null;
  scopeId?: string | null;
}): ScopeSelection {
  const scopeType = normalizeScopeType(params?.scopeType);
  const scopeId = params?.scopeId?.trim() || undefined;
  if (!scopeType) {
    return {};
  }
  if (scopeType === 'global') {
    return { scopeType };
  }
  return scopeId ? { scopeType, scopeId } : { scopeType };
}

export function buildScopeParams(selection?: ScopeSelection): URLSearchParams {
  const params = new URLSearchParams();
  if (!selection?.scopeType) {
    return params;
  }
  params.set('scopeType', selection.scopeType);
  if (selection.scopeType !== 'global' && selection.scopeId) {
    params.set('scopeId', selection.scopeId);
  }
  return params;
}

export function withScope(path: string, selection?: ScopeSelection): string {
  const query = buildScopeParams(selection).toString();
  return query ? `${path}?${query}` : path;
}
