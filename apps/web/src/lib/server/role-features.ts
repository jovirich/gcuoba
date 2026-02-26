export const ROLE_FEATURE_MODULES: Record<string, string> = {
  members: 'Members',
  dues: 'Dues',
  reports: 'Reports',
  events: 'Events',
  announcements: 'Announcements',
  files: 'Files',
  welfare: 'Welfare',
  projects: 'Projects',
  expenses: 'Expenses',
  payments: 'Payments',
  roles: 'Roles',
  global_invoicing: 'Global Invoicing',
};

export const ROLE_FEATURE_FALLBACK_PERMISSIONS: Record<string, string[]> = {
  dues: ['chairman', 'financial_secretary'],
  members: ['chairman', 'secretary', 'financial_secretary'],
  reports: ['chairman', 'financial_secretary', 'secretary'],
  events: ['chairman', 'secretary'],
  announcements: ['chairman', 'secretary'],
  files: ['chairman', 'secretary'],
  welfare: ['chairman', 'secretary'],
  projects: ['financial_secretary', 'treasurer', 'chairman'],
  roles: ['chairman', 'secretary'],
  payments: ['financial_secretary', 'treasurer', 'chairman'],
  expenses: ['financial_secretary', 'treasurer', 'chairman'],
};

export function normalizeRoleCode(roleCode?: string | null): string | null {
  if (!roleCode) {
    return null;
  }
  const normalized = roleCode.replace(/_(global|branch|class)(_\d+)?$/, '');
  return normalized || null;
}

