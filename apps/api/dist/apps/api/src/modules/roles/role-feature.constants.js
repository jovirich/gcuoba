"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_FEATURE_FALLBACK_PERMISSIONS = exports.ROLE_FEATURE_MODULES = void 0;
exports.ROLE_FEATURE_MODULES = {
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
exports.ROLE_FEATURE_FALLBACK_PERMISSIONS = {
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
//# sourceMappingURL=role-feature.constants.js.map