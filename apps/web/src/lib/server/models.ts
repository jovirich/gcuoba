import mongoose, {
  Schema,
  model,
  type InferSchemaType,
  type Model,
  type Types,
} from 'mongoose';

const USER_STATUSES = ['pending', 'active', 'suspended'] as const;
const PRIVACY_LEVELS = ['public', 'public_to_members', 'private'] as const;
const BRANCH_MEMBERSHIP_STATUSES = ['requested', 'approved', 'rejected', 'ended'] as const;
const ROLE_SCOPES = ['global', 'branch', 'class'] as const;
const NOTIFICATION_TYPES = ['info', 'success', 'warning', 'action_required'] as const;
const NOTIFICATION_EMAIL_JOB_STATUSES = ['pending', 'sent', 'failed'] as const;
const AUDIT_SCOPE_TYPES = ['global', 'branch', 'class', 'private'] as const;
const DOCUMENT_SCOPE_TYPES = ['private', 'global', 'branch', 'class'] as const;
const DOCUMENT_VISIBILITIES = ['private', 'scope', 'public'] as const;
const EVENT_PARTICIPATION_STATUSES = ['interested', 'attending', 'not_attending'] as const;

const UserSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerifiedAt: { type: Date, default: null },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: null },
    alumniNumber: { type: String, trim: true, unique: true, sparse: true },
    status: { type: String, enum: USER_STATUSES, default: 'pending' },
  },
  { collection: 'users', timestamps: true },
);

const ProfileSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    title: { type: String, default: null },
    firstName: { type: String, required: true },
    middleName: { type: String, default: null },
    lastName: { type: String, required: true },
    dobDay: { type: Number, min: 1, max: 31, default: null },
    dobMonth: { type: Number, min: 1, max: 12, default: null },
    dobYear: { type: Number, min: 1900, max: 2100, default: null },
    sex: { type: String, default: null },
    stateOfOrigin: { type: String, default: null },
    lgaOfOrigin: { type: String, default: null },
    resHouseNo: { type: String, default: null },
    resStreet: { type: String, default: null },
    resArea: { type: String, default: null },
    resCity: { type: String, default: null },
    resCountry: { type: String, default: null },
    occupation: { type: String, default: null },
    photoUrl: { type: String, default: null },
    houseId: { type: String, default: null },
    privacyLevel: { type: String, enum: PRIVACY_LEVELS, default: 'public_to_members' },
  },
  { collection: 'profiles', timestamps: true },
);

const BranchSchema = new Schema(
  {
    name: { type: String, required: true },
    country: { type: String, default: null },
  },
  { collection: 'branches', timestamps: true },
);

const ClassSchema = new Schema(
  {
    label: { type: String, required: true },
    entryYear: { type: Number, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { collection: 'classes', timestamps: true },
);

const HouseSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    motto: { type: String, default: null },
  },
  { collection: 'houses', timestamps: true },
);

const CountrySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    isoCode: { type: String, uppercase: true, maxlength: 3, default: null },
  },
  { collection: 'countries', timestamps: true },
);

const EventSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: null },
    scopeType: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scopeId: { type: String, default: null },
    location: { type: String, default: null },
    startAt: { type: Date, required: true },
    endAt: { type: Date, default: null },
    status: { type: String, enum: ['draft', 'published', 'cancelled'], default: 'draft' },
  },
  { collection: 'events', timestamps: true },
);
EventSchema.index({ status: 1, startAt: 1, createdAt: -1 });
EventSchema.index({ scopeType: 1, scopeId: 1, status: 1, startAt: 1, createdAt: -1 });

const EventParticipationSchema = new Schema(
  {
    eventId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    status: { type: String, enum: EVENT_PARTICIPATION_STATUSES, default: 'interested' },
    contributionAmount: { type: Number, default: 0 },
    contributionCurrency: { type: String, default: 'NGN' },
    contributionNote: { type: String, default: null },
    contributedAt: { type: Date, default: null },
  },
  { collection: 'event_participations', timestamps: true },
);
EventParticipationSchema.index({ eventId: 1, userId: 1 }, { unique: true });
EventParticipationSchema.index({ eventId: 1, status: 1, contributedAt: -1, createdAt: -1 });

const AnnouncementSchema = new Schema(
  {
    title: { type: String, required: true },
    body: { type: String, required: true },
    scopeType: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scopeId: { type: String, default: null },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    publishedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'announcements', timestamps: true },
);
AnnouncementSchema.index({ status: 1, publishedAt: -1, createdAt: -1 });
AnnouncementSchema.index({ scopeType: 1, scopeId: 1, status: 1, publishedAt: -1, createdAt: -1 });

const NotificationSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'info' },
    readAt: { type: Date, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { collection: 'notifications', timestamps: true },
);
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

const NotificationEmailJobSchema = new Schema(
  {
    notificationId: { type: String, default: null },
    userId: { type: String, required: true, index: true },
    toEmail: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    status: { type: String, enum: NOTIFICATION_EMAIL_JOB_STATUSES, default: 'pending' },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    sentAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null },
  },
  { collection: 'notification_email_jobs', timestamps: true },
);
NotificationEmailJobSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
NotificationEmailJobSchema.index({ userId: 1, createdAt: -1 });

const AuditLogSchema = new Schema(
  {
    actorUserId: { type: String, required: true, index: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, default: null },
    scopeType: { type: String, enum: AUDIT_SCOPE_TYPES, default: null },
    scopeId: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: null },
  },
  { collection: 'audit_logs', timestamps: true },
);
AuditLogSchema.index({ createdAt: -1, action: 1 });
AuditLogSchema.index({ actorUserId: 1, createdAt: -1 });
AuditLogSchema.index({ scopeType: 1, scopeId: 1, createdAt: -1 });

const DocumentRecordSchema = new Schema(
  {
    ownerUserId: { type: String, required: true, index: true },
    scopeType: { type: String, enum: DOCUMENT_SCOPE_TYPES, required: true },
    scopeId: { type: String, default: null },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    storagePath: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    visibility: { type: String, enum: DOCUMENT_VISIBILITIES, default: 'private' },
  },
  { collection: 'document_records', timestamps: true },
);
DocumentRecordSchema.index({ ownerUserId: 1, createdAt: -1 });
DocumentRecordSchema.index({ scopeType: 1, scopeId: 1, visibility: 1, createdAt: -1 });

const DuesSchemeSchema = new Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    frequency: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual', 'one_off'],
      default: 'annual',
    },
    one_off_year: { type: Number, min: 2000, max: 2100, default: null },
    scope_type: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scope_id: { type: String, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { collection: 'duesschemes', timestamps: true },
);

const DuesInvoiceSchema = new Schema(
  {
    schemeId: { type: Schema.Types.ObjectId, ref: 'DuesScheme', required: true },
    userId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    periodStart: { type: Date, default: null },
    periodEnd: { type: Date, default: null },
    status: {
      type: String,
      enum: ['unpaid', 'part_paid', 'paid'],
      default: 'unpaid',
    },
    paidAmount: { type: Number, default: 0 },
  },
  { collection: 'duesinvoices', timestamps: true },
);
DuesInvoiceSchema.index({ userId: 1, status: 1, periodStart: -1, createdAt: -1 });
DuesInvoiceSchema.index({ createdAt: -1 });
DuesInvoiceSchema.index({ schemeId: 1, userId: 1, periodStart: 1 });

const PaymentSchema = new Schema(
  {
    payerUserId: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    channel: { type: String, required: true },
    reference: { type: String, default: null },
    scopeType: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scopeId: { type: String, default: null },
    notes: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed'], default: 'completed' },
    paidAt: { type: Date, default: null },
    applications: {
      type: [
        {
          invoiceId: { type: Schema.Types.ObjectId, ref: 'DuesInvoice' },
          amount: { type: Number },
        },
      ],
      default: [],
    },
  },
  { collection: 'payments', timestamps: true },
);
PaymentSchema.index({ payerUserId: 1, paidAt: -1, createdAt: -1 });
PaymentSchema.index({ paidAt: -1, createdAt: -1 });
PaymentSchema.index({ 'applications.invoiceId': 1 });

const ProjectSchema = new Schema(
  {
    name: { type: String, required: true },
    scope_type: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scope_id: { type: String, default: null },
    budget: { type: Number, default: 0 },
    actual_spend: { type: Number, default: 0 },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
    status: { type: String, enum: ['planning', 'active', 'completed'], default: 'planning' },
    owner_id: { type: String, default: null },
  },
  { collection: 'projects', timestamps: true },
);
ProjectSchema.index({ scope_type: 1, scope_id: 1, createdAt: -1 });
ProjectSchema.index({ status: 1, createdAt: -1 });

const ExpenseSchema = new Schema(
  {
    scope_type: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scope_id: { type: String, default: null },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project', default: null },
    title: { type: String, required: true },
    description: { type: String, default: null },
    notes: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approval_stage: {
      type: String,
      enum: ['pending', 'finance_approved', 'approved', 'rejected'],
      default: 'pending',
    },
    submitted_by: { type: String, default: null },
    approved_by: { type: String, default: null },
    approved_at: { type: Date, default: null },
    first_approved_by: { type: String, default: null },
    first_approved_at: { type: Date, default: null },
    second_approved_by: { type: String, default: null },
    second_approved_at: { type: Date, default: null },
    rejected_by: { type: String, default: null },
    rejected_at: { type: Date, default: null },
  },
  { collection: 'expenses', timestamps: true },
);
ExpenseSchema.index({ scope_type: 1, scope_id: 1, createdAt: -1 });
ExpenseSchema.index({ approval_stage: 1, createdAt: -1 });
ExpenseSchema.index({ project_id: 1, createdAt: -1 });

const PaymentReceiptSchema = new Schema(
  {
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
    receiptNo: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'payment_receipts', timestamps: false },
);

const FinanceReportSnapshotSchema = new Schema(
  {
    period: { type: String, required: true },
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    scopeType: { type: String, enum: ROLE_SCOPES, required: true },
    scopeId: { type: String, default: null },
    totalsByCurrency: { type: Schema.Types.Mixed, default: {} },
    rowCount: { type: Number, default: 0 },
    generatedAt: { type: Date, default: () => new Date() },
  },
  { collection: 'finance_report_snapshots', timestamps: false },
);
FinanceReportSnapshotSchema.index({ period: 1, scopeType: 1, scopeId: 1 }, { unique: true });
FinanceReportSnapshotSchema.index({ generatedAt: -1, period: -1 });

const WelfareCaseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    categoryId: { type: String, required: true },
    scopeType: { type: String, enum: ROLE_SCOPES, required: true },
    scopeId: { type: String, default: null },
    targetAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    totalRaised: { type: Number, default: 0 },
    totalDisbursed: { type: Number, default: 0 },
    beneficiaryName: { type: String, default: null },
    beneficiaryUserId: { type: String, default: null },
  },
  { collection: 'welfare_cases', timestamps: true },
);
WelfareCaseSchema.index({ status: 1, scopeType: 1, scopeId: 1, createdAt: -1 });

const WelfareCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    scope_type: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scope_id: { type: String, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { collection: 'welfare_categories', timestamps: true },
);

const WelfareContributionSchema = new Schema(
  {
    caseId: { type: String, required: true },
    userId: { type: String, default: null },
    contributorName: { type: String, required: true },
    contributorEmail: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    notes: { type: String, default: null },
    paidAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
  },
  { collection: 'welfare_contributions', timestamps: true },
);
WelfareContributionSchema.index({ caseId: 1, paidAt: -1, createdAt: -1 });
WelfareContributionSchema.index({ userId: 1, paidAt: -1, createdAt: -1 });
WelfareContributionSchema.index({ status: 1, caseId: 1, createdAt: -1 });

const WelfarePayoutSchema = new Schema(
  {
    caseId: { type: String, required: true },
    beneficiaryUserId: { type: String, default: null },
    amount: { type: Number, required: true },
    grossAmount: { type: Number, default: null },
    totalDeductions: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    channel: { type: String, required: true },
    reference: { type: String, default: null },
    notes: { type: String, default: null },
    deductions: {
      type: [
        {
          type: { type: String, enum: ['standard_percentage', 'dues_invoice', 'liability', 'custom'], required: true },
          label: { type: String, required: true },
          amount: { type: Number, required: true },
          percentage: { type: Number, default: null },
          invoiceId: { type: Schema.Types.ObjectId, ref: 'DuesInvoice', default: null },
        },
      ],
      default: [],
    },
    disbursedAt: { type: Date, default: null },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewNote: { type: String, default: null },
  },
  { collection: 'welfare_payouts', timestamps: true },
);
WelfarePayoutSchema.index({ status: 1, caseId: 1, createdAt: -1 });

const BranchMembershipSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    branchId: { type: String, required: true, index: true },
    status: { type: String, enum: BRANCH_MEMBERSHIP_STATUSES, default: 'requested' },
    requestedAt: { type: Date, default: null },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    note: { type: String, default: null },
  },
  { collection: 'user_branch_memberships', timestamps: true },
);
BranchMembershipSchema.index({ userId: 1, branchId: 1 }, { unique: true });

const ClassMembershipSchema = new Schema(
  {
    userId: { type: String, required: true, unique: true },
    classId: { type: String, required: true },
    joinedAt: { type: Date, default: null },
    updatedAt: { type: Date, default: null },
  },
  {
    collection: 'user_class_membership',
    timestamps: { createdAt: 'joinedAt', updatedAt: 'updatedAt' },
  },
);

const PasswordResetTokenSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    collection: 'password_reset_tokens',
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
);
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RoleSchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    scope: { type: String, enum: ROLE_SCOPES, default: 'global' },
  },
  { collection: 'roles', timestamps: true },
);

const RoleFeatureSchema = new Schema(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
    moduleKey: { type: String, required: true, trim: true, index: true },
    allowed: { type: Boolean, default: true },
  },
  {
    collection: 'role_features',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);
RoleFeatureSchema.index({ roleId: 1, moduleKey: 1 }, { unique: true });

const RoleAssignmentSchema = new Schema(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role' },
    userId: { type: String, required: true },
    roleCode: { type: String, required: true },
    scopeType: { type: String, enum: ROLE_SCOPES, default: 'global' },
    scopeId: { type: String, default: null },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  {
    collection: 'role_assignments',
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
);

export type UserDoc = InferSchemaType<typeof UserSchema> & { _id: Types.ObjectId };
export type ProfileDoc = InferSchemaType<typeof ProfileSchema> & { _id: Types.ObjectId };
export type BranchDoc = InferSchemaType<typeof BranchSchema> & { _id: Types.ObjectId };
export type ClassDoc = InferSchemaType<typeof ClassSchema> & { _id: Types.ObjectId };
export type HouseDoc = InferSchemaType<typeof HouseSchema> & { _id: Types.ObjectId };
export type CountryDoc = InferSchemaType<typeof CountrySchema> & { _id: Types.ObjectId };
export type EventDoc = InferSchemaType<typeof EventSchema> & { _id: Types.ObjectId };
export type EventParticipationDoc = InferSchemaType<typeof EventParticipationSchema> & { _id: Types.ObjectId };
export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema> & { _id: Types.ObjectId };
export type NotificationDoc = InferSchemaType<typeof NotificationSchema> & { _id: Types.ObjectId };
export type NotificationEmailJobDoc = InferSchemaType<typeof NotificationEmailJobSchema> & {
  _id: Types.ObjectId;
};
export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema> & { _id: Types.ObjectId };
export type DocumentRecordDoc = InferSchemaType<typeof DocumentRecordSchema> & { _id: Types.ObjectId };
export type DuesSchemeDoc = InferSchemaType<typeof DuesSchemeSchema> & { _id: Types.ObjectId };
export type DuesInvoiceDoc = InferSchemaType<typeof DuesInvoiceSchema> & { _id: Types.ObjectId };
export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & { _id: Types.ObjectId };
export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & { _id: Types.ObjectId };
export type ExpenseDoc = InferSchemaType<typeof ExpenseSchema> & { _id: Types.ObjectId };
export type PaymentReceiptDoc = InferSchemaType<typeof PaymentReceiptSchema> & { _id: Types.ObjectId };
export type FinanceReportSnapshotDoc = InferSchemaType<typeof FinanceReportSnapshotSchema> & {
  _id: Types.ObjectId;
};
export type WelfareCaseDoc = InferSchemaType<typeof WelfareCaseSchema> & { _id: Types.ObjectId };
export type WelfareCategoryDoc = InferSchemaType<typeof WelfareCategorySchema> & { _id: Types.ObjectId };
export type WelfareContributionDoc = InferSchemaType<typeof WelfareContributionSchema> & {
  _id: Types.ObjectId;
};
export type WelfarePayoutDoc = InferSchemaType<typeof WelfarePayoutSchema> & { _id: Types.ObjectId };
export type BranchMembershipDoc = InferSchemaType<typeof BranchMembershipSchema> & { _id: Types.ObjectId };
export type ClassMembershipDoc = InferSchemaType<typeof ClassMembershipSchema> & { _id: Types.ObjectId };
export type PasswordResetTokenDoc = InferSchemaType<typeof PasswordResetTokenSchema> & {
  _id: Types.ObjectId;
};
export type RoleDoc = InferSchemaType<typeof RoleSchema> & { _id: Types.ObjectId };
export type RoleFeatureDoc = InferSchemaType<typeof RoleFeatureSchema> & { _id: Types.ObjectId };
export type RoleAssignmentDoc = InferSchemaType<typeof RoleAssignmentSchema> & { _id: Types.ObjectId };

function getModel<T>(name: string, schema: Schema, collection: string): Model<T> {
  return (mongoose.models[name] as Model<T> | undefined) ?? model<T>(name, schema, collection);
}

export const UserModel = getModel<UserDoc>('User', UserSchema, 'users');
export const ProfileModel = getModel<ProfileDoc>('Profile', ProfileSchema, 'profiles');
export const BranchModel = getModel<BranchDoc>('Branch', BranchSchema, 'branches');
export const ClassModel = getModel<ClassDoc>('ClassSet', ClassSchema, 'classes');
export const HouseModel = getModel<HouseDoc>('House', HouseSchema, 'houses');
export const CountryModel = getModel<CountryDoc>('Country', CountrySchema, 'countries');
export const EventModel = getModel<EventDoc>('DashboardEvent', EventSchema, 'events');
export const EventParticipationModel = getModel<EventParticipationDoc>(
  'EventParticipation',
  EventParticipationSchema,
  'event_participations',
);
export const AnnouncementModel = getModel<AnnouncementDoc>(
  'Announcement',
  AnnouncementSchema,
  'announcements',
);
export const NotificationModel = getModel<NotificationDoc>(
  'Notification',
  NotificationSchema,
  'notifications',
);
export const NotificationEmailJobModel = getModel<NotificationEmailJobDoc>(
  'NotificationEmailJob',
  NotificationEmailJobSchema,
  'notification_email_jobs',
);
export const AuditLogModel = getModel<AuditLogDoc>('AuditLog', AuditLogSchema, 'audit_logs');
export const DocumentRecordModel = getModel<DocumentRecordDoc>(
  'DocumentRecord',
  DocumentRecordSchema,
  'document_records',
);
export const DuesSchemeModel = getModel<DuesSchemeDoc>('DuesScheme', DuesSchemeSchema, 'duesschemes');
export const DuesInvoiceModel = getModel<DuesInvoiceDoc>('DuesInvoice', DuesInvoiceSchema, 'duesinvoices');
export const PaymentModel = getModel<PaymentDoc>('Payment', PaymentSchema, 'payments');
export const ProjectModel = getModel<ProjectDoc>('Project', ProjectSchema, 'projects');
export const ExpenseModel = getModel<ExpenseDoc>('Expense', ExpenseSchema, 'expenses');
export const PaymentReceiptModel = getModel<PaymentReceiptDoc>(
  'PaymentReceipt',
  PaymentReceiptSchema,
  'payment_receipts',
);
export const FinanceReportSnapshotModel = getModel<FinanceReportSnapshotDoc>(
  'FinanceReportSnapshot',
  FinanceReportSnapshotSchema,
  'finance_report_snapshots',
);
export const WelfareCaseModel = getModel<WelfareCaseDoc>('WelfareCase', WelfareCaseSchema, 'welfare_cases');
export const WelfareCategoryModel = getModel<WelfareCategoryDoc>(
  'WelfareCategory',
  WelfareCategorySchema,
  'welfare_categories',
);
export const WelfareContributionModel = getModel<WelfareContributionDoc>(
  'WelfareContribution',
  WelfareContributionSchema,
  'welfare_contributions',
);
export const WelfarePayoutModel = getModel<WelfarePayoutDoc>(
  'WelfarePayout',
  WelfarePayoutSchema,
  'welfare_payouts',
);
export const BranchMembershipModel = getModel<BranchMembershipDoc>(
  'BranchMembership',
  BranchMembershipSchema,
  'user_branch_memberships',
);
export const ClassMembershipModel = getModel<ClassMembershipDoc>(
  'ClassMembership',
  ClassMembershipSchema,
  'user_class_membership',
);
export const PasswordResetTokenModel = getModel<PasswordResetTokenDoc>(
  'PasswordResetToken',
  PasswordResetTokenSchema,
  'password_reset_tokens',
);
export const RoleModel = getModel<RoleDoc>('Role', RoleSchema, 'roles');
export const RoleFeatureModel = getModel<RoleFeatureDoc>(
  'RoleFeature',
  RoleFeatureSchema,
  'role_features',
);
export const RoleAssignmentModel = getModel<RoleAssignmentDoc>(
  'RoleAssignment',
  RoleAssignmentSchema,
  'role_assignments',
);
