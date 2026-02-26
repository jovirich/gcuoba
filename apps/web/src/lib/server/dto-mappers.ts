import type {
  BranchDTO,
  BranchMembershipDTO,
  ClassMembershipDTO,
  ClassSetDTO,
  CountryDTO,
  DocumentRecordDTO,
  EventParticipationDTO,
  HouseDTO,
  AnnouncementDTO,
  AuditLogDTO,
  EventDTO,
  NotificationDTO,
  NotificationEmailJobDTO,
  ProfileDTO,
  RoleAssignmentDTO,
  RoleDTO,
  RoleFeatureDTO,
  UserDTO,
} from '@gcuoba/types';
import type {
  BranchDoc,
  BranchMembershipDoc,
  EventDoc,
  EventParticipationDoc,
  AnnouncementDoc,
  AuditLogDoc,
  ClassDoc,
  ClassMembershipDoc,
  CountryDoc,
  DocumentRecordDoc,
  HouseDoc,
  NotificationDoc,
  NotificationEmailJobDoc,
  ProfileDoc,
  RoleAssignmentDoc,
  RoleDoc,
  RoleFeatureDoc,
  UserDoc,
} from './models';

export function toUserDto(doc: UserDoc): UserDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email.toLowerCase(),
    phone: doc.phone ?? null,
    status: doc.status,
  };
}

export function toProfileDto(doc: ProfileDoc): ProfileDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title ?? undefined,
    firstName: doc.firstName,
    middleName: doc.middleName ?? null,
    lastName: doc.lastName,
    dobDay: doc.dobDay ?? null,
    dobMonth: doc.dobMonth ?? null,
    dobYear: doc.dobYear ?? null,
    sex: doc.sex ?? null,
    stateOfOrigin: doc.stateOfOrigin ?? null,
    lgaOfOrigin: doc.lgaOfOrigin ?? null,
    residence: {
      houseNo: doc.resHouseNo ?? null,
      street: doc.resStreet ?? null,
      area: doc.resArea ?? null,
      city: doc.resCity ?? null,
      country: doc.resCountry ?? null,
    },
    occupation: doc.occupation ?? null,
    photoUrl: doc.photoUrl ?? null,
    houseId: doc.houseId ?? null,
    privacyLevel: doc.privacyLevel ?? 'public_to_members',
  };
}

export function toBranchMembershipDto(doc: BranchMembershipDoc): BranchMembershipDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    branchId: doc.branchId,
    status: doc.status,
    requestedAt: doc.requestedAt?.toISOString(),
    approvedBy: doc.approvedBy ?? null,
    approvedAt: doc.approvedAt?.toISOString() ?? null,
    endedAt: doc.endedAt?.toISOString() ?? null,
    note: doc.note ?? null,
  };
}

export function toClassMembershipDto(doc: ClassMembershipDoc): ClassMembershipDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    classId: doc.classId,
    joinedAt: doc.joinedAt?.toISOString(),
  };
}

export function toClassDto(doc: ClassDoc): ClassSetDTO {
  return {
    id: doc._id.toString(),
    label: doc.label,
    entryYear: doc.entryYear,
    status: doc.status,
  };
}

export function toBranchDto(doc: BranchDoc): BranchDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    country: doc.country ?? undefined,
  };
}

export function toHouseDto(doc: HouseDoc): HouseDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    motto: doc.motto ?? null,
  };
}

export function toCountryDto(doc: CountryDoc): CountryDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    isoCode: doc.isoCode ?? null,
  };
}

export function toDocumentRecordDto(doc: DocumentRecordDoc): DocumentRecordDTO {
  const uploadedAt = (doc as DocumentRecordDoc & { createdAt?: Date }).createdAt?.toISOString();
  return {
    id: doc._id.toString(),
    ownerUserId: doc.ownerUserId,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    visibility: doc.visibility,
    uploadedAt: uploadedAt ?? new Date().toISOString(),
  };
}

export function toRoleDto(doc: RoleDoc): RoleDTO {
  return {
    id: doc._id.toString(),
    code: doc.code,
    name: doc.name,
    scope: doc.scope,
  };
}

export function toRoleFeatureDto(doc: RoleFeatureDoc): RoleFeatureDTO {
  return {
    id: doc._id.toString(),
    roleId: doc.roleId.toString(),
    moduleKey: doc.moduleKey,
    allowed: Boolean(doc.allowed),
  };
}

export function toRoleAssignmentDto(doc: RoleAssignmentDoc): RoleAssignmentDTO {
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    roleId: doc.roleId?.toString(),
    roleCode: doc.roleCode,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? null,
    startDate: doc.startDate?.toISOString(),
    endDate: doc.endDate?.toISOString() ?? null,
  };
}

export function toEventDto(doc: EventDoc, extras?: Partial<EventDTO>): EventDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? undefined,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? undefined,
    location: doc.location ?? undefined,
    startAt: doc.startAt?.toISOString(),
    endAt: doc.endAt?.toISOString(),
    status: doc.status,
    ...extras,
  };
}

export function toEventParticipationDto(doc: EventParticipationDoc): EventParticipationDTO {
  return {
    id: doc._id.toString(),
    eventId: doc.eventId,
    userId: doc.userId,
    status: doc.status,
    contributionAmount: Number(doc.contributionAmount ?? 0),
    contributionCurrency: doc.contributionCurrency ?? 'NGN',
    contributionNote: doc.contributionNote ?? null,
    contributedAt: doc.contributedAt?.toISOString() ?? null,
  };
}

export function toAnnouncementDto(doc: AnnouncementDoc): AnnouncementDTO {
  return {
    id: doc._id.toString(),
    title: doc.title,
    body: doc.body,
    scopeType: doc.scopeType,
    scopeId: doc.scopeId ?? undefined,
    publishedAt: doc.publishedAt?.toISOString(),
    status: doc.status ?? 'draft',
  };
}

export function toNotificationDto(doc: NotificationDoc): NotificationDTO {
  const createdAt = (doc as NotificationDoc & { createdAt?: Date }).createdAt?.toISOString();
  return {
    id: doc._id.toString(),
    userId: doc.userId,
    title: doc.title,
    message: doc.message,
    type: doc.type ?? 'info',
    read: Boolean(doc.readAt),
    createdAt: createdAt ?? new Date().toISOString(),
    readAt: doc.readAt?.toISOString() ?? null,
    metadata: doc.metadata ?? null,
  };
}

export function toNotificationEmailJobDto(doc: NotificationEmailJobDoc): NotificationEmailJobDTO {
  const createdAt = (doc as NotificationEmailJobDoc & { createdAt?: Date }).createdAt?.toISOString();
  return {
    id: doc._id.toString(),
    notificationId: doc.notificationId ?? null,
    userId: doc.userId,
    toEmail: doc.toEmail,
    subject: doc.subject,
    body: doc.body,
    status: doc.status,
    attempts: doc.attempts ?? 0,
    lastError: doc.lastError ?? null,
    createdAt: createdAt ?? new Date().toISOString(),
    sentAt: doc.sentAt?.toISOString() ?? null,
    nextAttemptAt: doc.nextAttemptAt?.toISOString() ?? null,
  };
}

export function toAuditLogDto(doc: AuditLogDoc): AuditLogDTO {
  const createdAt = (doc as AuditLogDoc & { createdAt?: Date }).createdAt?.toISOString();
  return {
    id: doc._id.toString(),
    actorUserId: doc.actorUserId,
    action: doc.action,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId ?? null,
    scopeType: doc.scopeType ?? null,
    scopeId: doc.scopeId ?? null,
    metadata: doc.metadata ?? null,
    createdAt: createdAt ?? new Date().toISOString(),
  };
}
