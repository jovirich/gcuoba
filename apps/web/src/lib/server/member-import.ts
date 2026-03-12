import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { ApiError } from './api-error';
import type { AdminMemberAccessScope } from './admin-members';
import { assignAlumniNumberForClassMembership } from './alumni-number';
import { ensureCurrentYearDuesInvoices } from './finance';
import {
  BranchMembershipModel,
  BranchModel,
  ClassMembershipModel,
  ClassModel,
  HouseModel,
  ProfileModel,
  UserModel,
} from './models';
import { createNotificationForUser, runNotificationEmailWorkerOnce } from './notifications';

type ImportMode = 'preview' | 'commit';
type RowAction = 'create' | 'update' | 'skip';
type RowStatus = 'valid' | 'error';

type ParsedCsvRow = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  title?: string;
  phone?: string;
  email?: string;
  classId?: string;
  classYear?: number;
  classLabel?: string;
  branchId?: string;
  branchName?: string;
  houseId?: string;
  houseName?: string;
  dobDay?: number;
  dobMonth?: number;
  dobYear?: number;
  status?: 'pending' | 'active' | 'suspended';
  note?: string;
};

type NormalizedRow = {
  rowNumber: number;
  firstName: string;
  lastName: string;
  middleName: string | null;
  title: string | null;
  phone: string | null;
  email: string;
  classId: string;
  branchId: string | null;
  houseId: string | null;
  dobDay: number | null;
  dobMonth: number | null;
  dobYear: number | null;
  status: 'pending' | 'active' | 'suspended';
  note: string | null;
  warnings: string[];
  classLabel?: string;
  branchLabel?: string;
  houseLabel?: string;
};

type RowResult = {
  rowNumber: number;
  action: RowAction;
  status: RowStatus;
  memberName: string;
  email: string;
  phone: string | null;
  classLabel: string;
  branchLabel: string | null;
  warnings: string[];
  errors: string[];
  userId?: string;
};

export type BulkMemberImportResult = {
  mode: ImportMode;
  summary: {
    totalRows: number;
    validRows: number;
    failedRows: number;
    created: number;
    updated: number;
    skipped: number;
  };
  rows: RowResult[];
};

type ExecuteBulkMemberImportInput = {
  actorUserId: string;
  scope: AdminMemberAccessScope;
  csvText: string;
  mode: ImportMode;
  defaultPassword: string;
  sendWelcomeEmail: boolean;
  targetClassId?: string | null;
  targetBranchId?: string | null;
  rowNumbers?: number[] | null;
};

type ClassRef = { id: string; label: string; entryYear: number };
type BranchRef = { id: string; name: string };
type HouseRef = { id: string; name: string };
type ExistingUserLite = {
  _id: Types.ObjectId;
  email: string;
  phone?: string | null;
  status: 'pending' | 'active' | 'suspended';
  claimStatus?: 'unclaimed' | 'claimed';
};

const TITLE_ALLOWLIST = new Set(['mr', 'mrs', 'ms', 'dr', 'prof', 'chief']);

const HEADER_ALIASES: Record<keyof Omit<ParsedCsvRow, 'rowNumber'>, string[]> = {
  firstName: ['firstname', 'first_name', 'first'],
  lastName: ['lastname', 'last_name', 'surname', 'familyname'],
  middleName: ['middlename', 'middle_name'],
  title: ['title'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber'],
  email: ['email', 'emailaddress'],
  classId: ['classid'],
  classYear: ['classyear', 'entryyear'],
  classLabel: ['classlabel', 'classname', 'class_name'],
  branchId: ['branchid'],
  branchName: ['branch', 'branchname', 'branch_name'],
  houseId: ['houseid'],
  houseName: ['house', 'housename', 'house_name'],
  dobDay: ['dobday', 'birthday', 'dayofbirth'],
  dobMonth: ['dobmonth', 'birthmonth', 'monthofbirth'],
  dobYear: ['dobyear', 'birthyear', 'yearofbirth'],
  status: ['status', 'memberstatus'],
  note: ['note', 'remarks', 'comment'],
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function requiredString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value: string | undefined) {
  return value?.trim().toLowerCase() || '';
}

function expandScientificNotation(value: string): string | null {
  const match = value.trim().match(/^([+-]?\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/);
  if (!match) {
    return null;
  }
  const integerPart = match[1]?.replace('+', '') ?? '';
  const fractionPart = match[2] ?? '';
  const exponent = Number(match[3] ?? '');
  if (!Number.isInteger(exponent)) {
    return null;
  }

  const sign = integerPart.startsWith('-') ? '-' : '';
  const integerDigits = integerPart.replace('-', '');
  const digits = `${integerDigits}${fractionPart}`.replace(/^0+/, '') || '0';
  const decimalIndex = integerDigits.length + exponent;

  if (decimalIndex <= 0) {
    return `${sign}0`;
  }
  if (decimalIndex >= digits.length) {
    return `${sign}${digits}${'0'.repeat(decimalIndex - digits.length)}`;
  }
  return `${sign}${digits.slice(0, decimalIndex)}${digits.slice(decimalIndex)}`;
}

function normalizePhone(value: string | undefined) {
  const trimmed = value?.trim() || '';
  if (!trimmed) {
    return '';
  }
  const scientific = expandScientificNotation(trimmed);
  const source = scientific ?? trimmed;
  const keepLeadingPlus = source.startsWith('+');
  const digits = source.replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return keepLeadingPlus ? `+${digits}` : digits;
}

function normalizePhoneInput(value: string | undefined): {
  phone: string;
  warnings: string[];
  errors: string[];
} {
  const raw = value?.trim() || '';
  if (!raw) {
    return { phone: '', warnings: [], errors: [] };
  }

  const warnings: string[] = [];
  const errors: string[] = [];
  const scientific = expandScientificNotation(raw);
  if (scientific) {
    warnings.push('Phone converted from Excel scientific notation; verify digits.');
  }

  const normalized = normalizePhone(raw);
  if (!normalized) {
    return { phone: '', warnings, errors: ['Phone is invalid.'] };
  }

  const digits = normalized.startsWith('+') ? normalized.slice(1) : normalized;
  let canonical = normalized;
  if (!normalized.startsWith('+')) {
    if (digits.startsWith('234') && digits.length === 13) {
      canonical = `+${digits}`;
    } else if (digits.startsWith('0') && digits.length === 11) {
      canonical = `+234${digits.slice(1)}`;
    } else if (digits.length >= 10 && digits.length <= 15) {
      canonical = `+${digits}`;
    }
  }

  const canonicalDigits = canonical.startsWith('+') ? canonical.slice(1) : canonical;
  if (canonicalDigits.length < 10 || canonicalDigits.length > 15) {
    errors.push('Phone length is invalid. Use full number format.');
  }
  if (scientific && /0{4,}$/.test(canonicalDigits)) {
    warnings.push('Phone ends with many zeros after conversion; Excel may have truncated original digits.');
  }

  return { phone: canonical, warnings, errors };
}

function parseOptionalInt(value?: string) {
  if (!value || value.trim().length === 0) {
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return undefined;
  }
  return parsed;
}

function parseStatus(value?: string): 'pending' | 'active' | 'suspended' | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === 'pending' || normalized === 'active' || normalized === 'suspended') {
    return normalized;
  }
  return undefined;
}

function isCsvFilename(name: string) {
  return name.toLowerCase().endsWith('.csv') || name.toLowerCase().endsWith('.txt');
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && ch === ',') {
      row.push(current.trim());
      current = '';
      continue;
    }

    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current.trim());
      current = '';
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += ch;
  }

  row.push(current.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function resolveHeaderIndex(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader);
  const indexByKey = new Map<string, number>();
  normalizedHeaders.forEach((header, index) => {
    if (!indexByKey.has(header)) {
      indexByKey.set(header, index);
    }
  });

  const mapping = {} as Record<keyof Omit<ParsedCsvRow, 'rowNumber'>, number | undefined>;
  (Object.keys(HEADER_ALIASES) as Array<keyof Omit<ParsedCsvRow, 'rowNumber'>>).forEach((key) => {
    const aliases = HEADER_ALIASES[key];
    mapping[key] = aliases.map((alias) => indexByKey.get(normalizeHeader(alias))).find((value) => value !== undefined);
  });
  return mapping;
}

function parseRows(csvText: string): ParsedCsvRow[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) {
    throw new ApiError(400, 'CSV file must include a header row and at least one data row.', 'BadRequest');
  }
  const header = rows[0];
  const index = resolveHeaderIndex(header);
  if (index.firstName === undefined || index.lastName === undefined) {
    throw new ApiError(400, 'CSV must include First Name and Last Name columns.', 'BadRequest');
  }

  const parsed: ParsedCsvRow[] = [];
  for (let i = 1; i < rows.length; i += 1) {
    const raw = rows[i];
    const rowNumber = i + 1;
    const firstName = requiredString(raw[index.firstName] ?? '');
    const lastName = requiredString(raw[index.lastName] ?? '');
    if (!firstName && !lastName && raw.every((cell) => !requiredString(cell))) {
      continue;
    }
    parsed.push({
      rowNumber,
      firstName,
      lastName,
      middleName: requiredString(raw[index.middleName ?? -1] ?? '') || undefined,
      title: requiredString(raw[index.title ?? -1] ?? '') || undefined,
      phone: requiredString(raw[index.phone ?? -1] ?? '') || undefined,
      email: requiredString(raw[index.email ?? -1] ?? '') || undefined,
      classId: requiredString(raw[index.classId ?? -1] ?? '') || undefined,
      classYear: parseOptionalInt(raw[index.classYear ?? -1]),
      classLabel: requiredString(raw[index.classLabel ?? -1] ?? '') || undefined,
      branchId: requiredString(raw[index.branchId ?? -1] ?? '') || undefined,
      branchName: requiredString(raw[index.branchName ?? -1] ?? '') || undefined,
      houseId: requiredString(raw[index.houseId ?? -1] ?? '') || undefined,
      houseName: requiredString(raw[index.houseName ?? -1] ?? '') || undefined,
      dobDay: parseOptionalInt(raw[index.dobDay ?? -1]),
      dobMonth: parseOptionalInt(raw[index.dobMonth ?? -1]),
      dobYear: parseOptionalInt(raw[index.dobYear ?? -1]),
      status: parseStatus(raw[index.status ?? -1]),
      note: requiredString(raw[index.note ?? -1] ?? '') || undefined,
    });
  }

  if (parsed.length === 0) {
    throw new ApiError(400, 'No valid data rows were found in the CSV.', 'BadRequest');
  }
  return parsed;
}

function createPlaceholderEmail(base: string, usedEmails: Set<string>) {
  let counter = 0;
  while (counter < 5000) {
    const suffix = counter === 0 ? '' : `+${counter}`;
    const candidate = `${base}${suffix}@placeholder.gcuoba.local`;
    if (!usedEmails.has(candidate)) {
      usedEmails.add(candidate);
      return candidate;
    }
    counter += 1;
  }
  throw new ApiError(500, 'Unable to allocate placeholder email.', 'InternalServerError');
}

function createPlaceholderPhone(usedPhones: Set<string>) {
  let counter = 1;
  while (counter < 10_000_000) {
    const candidate = `+234999${counter.toString().padStart(7, '0')}`;
    if (!usedPhones.has(candidate)) {
      usedPhones.add(candidate);
      return candidate;
    }
    counter += 1;
  }
  throw new ApiError(500, 'Unable to allocate placeholder phone number.', 'InternalServerError');
}

function sanitizeEmailLocalPart(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]/g, '');
  return normalized || `member${Date.now()}`;
}

function normalizeNameToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function classMemberNameKey(classId: string, firstName: string, lastName: string) {
  return `${classId}|${normalizeNameToken(firstName)}|${normalizeNameToken(lastName)}`;
}

function ensureScopeSupported(scope: AdminMemberAccessScope) {
  if (scope.kind === 'branch') {
    throw new ApiError(
      403,
      'Bulk member import is not available in branch scope yet. Use class or global scope.',
      'Forbidden',
    );
  }
  if (scope.kind === 'managed') {
    throw new ApiError(
      400,
      'Select a specific class scope before importing members.',
      'BadRequest',
    );
  }
}

function normalizeDefaultPassword(input: string) {
  const value = input.trim();
  if (value.length < 8) {
    throw new ApiError(400, 'Default password must be at least 8 characters.', 'BadRequest');
  }
  return value;
}

function isPlaceholderEmail(email: string) {
  return email.endsWith('@placeholder.gcuoba.local');
}

async function loadReferenceData() {
  const [classes, branches, houses] = await Promise.all([
    ClassModel.find().select('_id label entryYear').lean<Array<{ _id: Types.ObjectId; label: string; entryYear: number }>>().exec(),
    BranchModel.find().select('_id name').lean<Array<{ _id: Types.ObjectId; name: string }>>().exec(),
    HouseModel.find().select('_id name').lean<Array<{ _id: Types.ObjectId; name: string }>>().exec(),
  ]);

  const classRefs: ClassRef[] = classes.map((entry) => ({
    id: entry._id.toString(),
    label: entry.label,
    entryYear: entry.entryYear,
  }));
  const branchRefs: BranchRef[] = branches.map((entry) => ({
    id: entry._id.toString(),
    name: entry.name,
  }));
  const houseRefs: HouseRef[] = houses.map((entry) => ({
    id: entry._id.toString(),
    name: entry.name,
  }));

  return { classRefs, branchRefs, houseRefs };
}

function findClassId(
  row: ParsedCsvRow,
  scope: AdminMemberAccessScope,
  refs: ClassRef[],
  forcedClassId?: string | null,
) {
  if (scope.kind === 'class') {
    return scope.classId;
  }
  if (forcedClassId) {
    return forcedClassId;
  }
  if (row.classId) {
    return row.classId;
  }
  if (row.classYear) {
    const foundByYear = refs.find((entry) => entry.entryYear === row.classYear);
    if (foundByYear) {
      return foundByYear.id;
    }
  }
  if (row.classLabel) {
    const query = row.classLabel.trim().toLowerCase();
    const foundByLabel = refs.find((entry) => entry.label.trim().toLowerCase() === query);
    if (foundByLabel) {
      return foundByLabel.id;
    }
  }
  return null;
}

function findBranchId(
  row: ParsedCsvRow,
  scope: AdminMemberAccessScope,
  refs: BranchRef[],
  forcedBranchId?: string | null,
) {
  if (scope.kind === 'class') {
    return null;
  }
  if (forcedBranchId) {
    return forcedBranchId;
  }
  if (row.branchId) {
    return row.branchId;
  }
  if (row.branchName) {
    const query = row.branchName.trim().toLowerCase();
    const found = refs.find((entry) => entry.name.trim().toLowerCase() === query);
    if (found) {
      return found.id;
    }
  }
  return null;
}

function findHouseId(row: ParsedCsvRow, refs: HouseRef[]) {
  if (row.houseId) {
    return row.houseId;
  }
  if (row.houseName) {
    const query = row.houseName.trim().toLowerCase();
    const found = refs.find((entry) => entry.name.trim().toLowerCase() === query);
    if (found) {
      return found.id;
    }
  }
  return null;
}

async function findExistingUsers(rows: ParsedCsvRow[]) {
  const emails = rows
    .map((row) => normalizeEmail(row.email))
    .filter(Boolean);
  const phones = rows
    .map((row) => normalizePhone(row.phone))
    .filter(Boolean);
  const query: Array<Record<string, unknown>> = [];
  if (emails.length > 0) {
    query.push({ email: { $in: emails } });
  }
  if (phones.length > 0) {
    query.push({ phone: { $in: phones } });
  }
  if (query.length === 0) {
    return [];
  }
  return UserModel.find({ $or: query })
    .select('_id name email phone status claimStatus')
    .lean<
      Array<{
        _id: Types.ObjectId;
        name: string;
        email: string;
        phone?: string | null;
        status: 'pending' | 'active' | 'suspended';
        claimStatus?: 'unclaimed' | 'claimed';
      }>
    >()
    .exec();
}

async function findExistingUsersByClassAndName(
  classIds: string[],
): Promise<{
  users: ExistingUserLite[];
  byClassAndName: Map<string, ExistingUserLite[]>;
}> {
  const scopedClassIds = [...new Set(classIds.filter(Boolean))];
  if (scopedClassIds.length === 0) {
    return { users: [], byClassAndName: new Map() };
  }

  const memberships = await ClassMembershipModel.find({ classId: { $in: scopedClassIds } })
    .select('userId classId')
    .lean<Array<{ userId: string; classId: string }>>()
    .exec();
  if (memberships.length === 0) {
    return { users: [], byClassAndName: new Map() };
  }

  const userIds = [...new Set(memberships.map((entry) => entry.userId).filter((id) => Types.ObjectId.isValid(id)))];
  if (userIds.length === 0) {
    return { users: [], byClassAndName: new Map() };
  }

  const [profiles, users] = await Promise.all([
    ProfileModel.find({ userId: { $in: userIds } })
      .select('userId firstName lastName')
      .lean<Array<{ userId: string; firstName: string; lastName: string }>>()
      .exec(),
    UserModel.find({ _id: { $in: userIds } })
      .select('_id email phone status claimStatus')
      .lean<ExistingUserLite[]>()
      .exec(),
  ]);

  const profileByUserId = new Map(
    profiles
      .filter((entry) => entry.firstName?.trim() && entry.lastName?.trim())
      .map((entry) => [entry.userId, entry]),
  );
  const userById = new Map(users.map((entry) => [entry._id.toString(), entry]));

  const byClassAndName = new Map<string, ExistingUserLite[]>();
  for (const membership of memberships) {
    const profile = profileByUserId.get(membership.userId);
    const user = userById.get(membership.userId);
    if (!profile || !user) {
      continue;
    }
    const key = classMemberNameKey(membership.classId, profile.firstName, profile.lastName);
    const list = byClassAndName.get(key) ?? [];
    list.push(user);
    byClassAndName.set(key, list);
  }

  return { users, byClassAndName };
}

function normalizeRows(
  rows: ParsedCsvRow[],
  scope: AdminMemberAccessScope,
  refs: { classRefs: ClassRef[]; branchRefs: BranchRef[]; houseRefs: HouseRef[] },
  existingUsers: ExistingUserLite[],
  existingUsersByClassAndName: Map<string, ExistingUserLite[]>,
  forcedClassId?: string | null,
  forcedBranchId?: string | null,
) {
  const results: Array<{
    normalized: NormalizedRow | null;
    action: RowAction;
    errors: string[];
  }> = [];

  const usedEmails = new Set(existingUsers.map((user) => user.email.toLowerCase()));
  const usedPhones = new Set(
    existingUsers
      .map((user) => normalizePhone(user.phone ?? undefined))
      .filter(Boolean),
  );
  const userByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user]));
  const userByPhone = new Map(
    existingUsers
      .filter((user) => user.phone)
      .map((user) => [normalizePhone(user.phone as string), user]),
  );
  const seenEmailsInFile = new Map<string, number>();
  const seenPhonesInFile = new Map<string, number>();
  const seenClassNameInFile = new Map<string, number>();

  rows.forEach((row) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    const firstName = requiredString(row.firstName);
    const lastName = requiredString(row.lastName);
    if (!firstName) {
      errors.push('First name is required.');
    }
    if (!lastName) {
      errors.push('Last name is required.');
    }

    const classId = findClassId(row, scope, refs.classRefs, forcedClassId);
    if (!classId) {
      errors.push('Class could not be resolved. Provide classId, classYear, or classLabel.');
    }
    const classRef = classId ? refs.classRefs.find((entry) => entry.id === classId) : null;
    if (!classRef) {
      errors.push('Resolved class does not exist.');
    }
    if (scope.kind === 'class' && classId && classId !== scope.classId) {
      errors.push('Class scope can only import members into its own class.');
    }
    if (classId && firstName && lastName) {
      const classNameKey = classMemberNameKey(classId, firstName, lastName);
      const firstClassNameRow = seenClassNameInFile.get(classNameKey);
      if (firstClassNameRow !== undefined) {
        errors.push(`Duplicate class/name pair in this CSV (already used on row ${firstClassNameRow}).`);
      } else {
        seenClassNameInFile.set(classNameKey, row.rowNumber);
      }
    }

    const nameMatches = classId
      ? existingUsersByClassAndName.get(classMemberNameKey(classId, firstName, lastName)) ?? []
      : [];
    const matchedByName = nameMatches.length === 1 ? nameMatches[0] : undefined;
    if (nameMatches.length > 1) {
      errors.push('Multiple existing members in this class share this name. Provide phone or email to disambiguate.');
    }

    const requestedPhoneInfo = normalizePhoneInput(row.phone);
    const requestedPhone = requestedPhoneInfo.phone;
    warnings.push(...requestedPhoneInfo.warnings);
    errors.push(...requestedPhoneInfo.errors);
    const requestedEmail = normalizeEmail(row.email);
    let finalEmail = requestedEmail;
    if (!requestedEmail) {
      if (requestedPhone) {
        const digits = requestedPhone.replace(/\D/g, '');
        const local = sanitizeEmailLocalPart(digits || `${firstName}${lastName}`);
        finalEmail = createPlaceholderEmail(local, usedEmails);
        warnings.push('Email not supplied; generated a placeholder email.');
      } else {
        const local = sanitizeEmailLocalPart(`${firstName}${lastName}${row.rowNumber}`);
        finalEmail = createPlaceholderEmail(local, usedEmails);
        warnings.push('Email and phone not supplied; generated a placeholder email.');
      }
    }
    if (!finalEmail.includes('@')) {
      errors.push('Email is invalid.');
    }
    const emailKey = finalEmail.toLowerCase();
    const firstEmailRow = seenEmailsInFile.get(emailKey);
    if (firstEmailRow !== undefined) {
      errors.push(`Duplicate email in this CSV (already used on row ${firstEmailRow}).`);
    } else {
      seenEmailsInFile.set(emailKey, row.rowNumber);
    }

    const matchedByEmail = userByEmail.get(emailKey);
    const retainedPhone = normalizePhone(matchedByEmail?.phone ?? matchedByName?.phone ?? undefined);
    let finalPhone = requestedPhone || retainedPhone;
    if (!requestedPhone) {
      if (retainedPhone) {
        warnings.push('Phone not supplied; retained existing phone.');
      } else {
        finalPhone = createPlaceholderPhone(usedPhones);
        warnings.push('Phone not supplied; generated a placeholder phone number.');
      }
    }
    if (finalPhone) {
      usedPhones.add(finalPhone);
      const firstPhoneRow = seenPhonesInFile.get(finalPhone);
      if (firstPhoneRow !== undefined) {
        errors.push(`Duplicate phone in this CSV (already used on row ${firstPhoneRow}).`);
      } else {
        seenPhonesInFile.set(finalPhone, row.rowNumber);
      }
    }

    const matchedByPhone = finalPhone ? userByPhone.get(finalPhone) : undefined;
    if (matchedByEmail && matchedByPhone && matchedByEmail._id.toString() !== matchedByPhone._id.toString()) {
      errors.push('Email and phone match different existing members.');
    }
    if (matchedByEmail && matchedByName && matchedByEmail._id.toString() !== matchedByName._id.toString()) {
      errors.push('Email and class-name match different existing members.');
    }
    if (matchedByPhone && matchedByName && matchedByPhone._id.toString() !== matchedByName._id.toString()) {
      errors.push('Phone and class-name match different existing members.');
    }

    const existingUser = matchedByEmail ?? matchedByPhone ?? matchedByName ?? null;
    if (existingUser) {
      warnings.push('Existing registered member detected; this row will update the current profile.');
    }
    if (existingUser && !matchedByEmail && !matchedByPhone && matchedByName) {
      warnings.push('Matched existing member by class and name; row will update existing record.');
    }
    if (!existingUser && !requestedEmail) {
      userByEmail.set(finalEmail.toLowerCase(), {
        _id: new Types.ObjectId(),
        email: finalEmail,
        phone: finalPhone,
        status: 'pending',
        claimStatus: 'unclaimed',
      });
      if (finalPhone) {
        userByPhone.set(finalPhone, {
          _id: new Types.ObjectId(),
          email: finalEmail,
          phone: finalPhone,
          status: 'pending',
          claimStatus: 'unclaimed',
        });
      }
    }

    const branchId = findBranchId(row, scope, refs.branchRefs, forcedBranchId);
    if (scope.kind === 'class' && (row.branchId || row.branchName || forcedBranchId)) {
      warnings.push('Branch assignment ignored in class scope.');
    }
    const branchRef = branchId ? refs.branchRefs.find((entry) => entry.id === branchId) : null;
    if (branchId && !branchRef) {
      errors.push('Resolved branch does not exist.');
    }

    const houseId = findHouseId(row, refs.houseRefs);
    const houseRef = houseId ? refs.houseRefs.find((entry) => entry.id === houseId) : null;
    if (houseId && !houseRef) {
      errors.push('Resolved house does not exist.');
    }

    const dobDay = row.dobDay ?? null;
    const dobMonth = row.dobMonth ?? null;
    const dobYear = row.dobYear ?? null;
    if (dobDay !== null && (dobDay < 1 || dobDay > 31)) {
      errors.push('DOB day must be between 1 and 31.');
    }
    if (dobMonth !== null && (dobMonth < 1 || dobMonth > 12)) {
      errors.push('DOB month must be between 1 and 12.');
    }
    if (dobYear !== null && (dobYear < 1900 || dobYear > 2100)) {
      errors.push('DOB year must be between 1900 and 2100.');
    }

    let title = row.title?.trim().toLowerCase() || '';
    if (!title) {
      title = 'mr';
    } else if (!TITLE_ALLOWLIST.has(title)) {
      warnings.push('Unknown title provided; defaulted to "mr".');
      title = 'mr';
    }

    const normalized: NormalizedRow | null =
      errors.length > 0 || !classRef
        ? null
        : {
            rowNumber: row.rowNumber,
            firstName,
            lastName,
            middleName: row.middleName?.trim() || null,
            title,
            phone: finalPhone,
            email: finalEmail,
            classId: classRef.id,
            classLabel: `${classRef.entryYear} - ${classRef.label}`,
            branchId: scope.kind === 'class' ? null : (branchRef?.id ?? null),
            branchLabel: branchRef?.name ?? null,
            houseId: houseRef?.id ?? null,
            houseLabel: houseRef?.name ?? null,
            dobDay,
            dobMonth,
            dobYear,
            status: row.status ?? 'active',
            note: row.note?.trim() || null,
            warnings,
          };

    const action: RowAction = normalized ? (existingUser ? 'update' : 'create') : 'skip';
    results.push({ normalized, action, errors });
  });

  return results;
}

async function applyNormalizedRow(
  actorUserId: string,
  row: NormalizedRow,
  action: RowAction,
  existingUser: ExistingUserLite | null,
  passwordHash: string,
  sendWelcomeEmail: boolean,
) {
  const fullName = `${row.firstName} ${row.lastName}`.trim();
  const userDoc =
    action === 'create'
      ? await UserModel.create({
          name: fullName,
          email: row.email,
          passwordHash,
          phone: row.phone,
          status: row.status,
          claimStatus: 'unclaimed',
          claimedAt: null,
        })
      : await UserModel.findByIdAndUpdate(
          existingUser?._id,
          {
            $set: {
              name: fullName,
              phone: row.phone,
              ...(isPlaceholderEmail(existingUser?.email ?? '') && !isPlaceholderEmail(row.email)
                ? { email: row.email }
                : {}),
              status: row.status,
              ...(existingUser?.status === 'pending' || existingUser?.claimStatus === 'unclaimed'
                ? { claimStatus: 'unclaimed', claimedAt: null }
                : {}),
            },
          },
          { new: true },
        ).exec();

  if (!userDoc) {
    throw new ApiError(500, 'Unable to save member row.', 'InternalServerError');
  }

  const userId = userDoc._id.toString();

  await ProfileModel.findOneAndUpdate(
    { userId },
    {
      userId,
      title: row.title,
      firstName: row.firstName,
      middleName: row.middleName,
      lastName: row.lastName,
      dobDay: row.dobDay,
      dobMonth: row.dobMonth,
      dobYear: row.dobYear,
      houseId: row.houseId,
      privacyLevel: 'public_to_members',
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();

  await ClassMembershipModel.findOneAndUpdate(
    { userId },
    {
      userId,
      classId: row.classId,
      joinedAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).exec();

  if (row.branchId) {
    const now = new Date();
    await BranchMembershipModel.findOneAndUpdate(
      { userId, branchId: row.branchId },
      {
        userId,
        branchId: row.branchId,
        status: 'approved',
        requestedAt: now,
        approvedAt: now,
        approvedBy: actorUserId,
        endedAt: null,
        note: row.note,
      },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
  }

  if (row.status === 'active') {
    await assignAlumniNumberForClassMembership(userId, row.classId);
    await ensureCurrentYearDuesInvoices({ userId, scopeType: 'class', scopeId: row.classId });
    if (row.branchId) {
      await ensureCurrentYearDuesInvoices({ userId, scopeType: 'branch', scopeId: row.branchId });
    }
  }

  if (sendWelcomeEmail) {
    await createNotificationForUser(userId, {
      title: 'Welcome to GCUOBA Portal',
      message:
        'Your membership profile has been onboarded. Sign in to complete your profile and view dues, welfare, and announcements.',
      type: 'success',
      metadata: { flow: 'bulk_member_import' },
    });
  }

  return userId;
}

export async function executeBulkMemberImport(input: ExecuteBulkMemberImportInput): Promise<BulkMemberImportResult> {
  ensureScopeSupported(input.scope);
  const defaultPassword = normalizeDefaultPassword(input.defaultPassword);

  const parsedRows = parseRows(input.csvText);
  let activeRows = parsedRows;
  if (input.rowNumbers && input.rowNumbers.length > 0) {
    const allowedNumbers = new Set(input.rowNumbers);
    const availableNumbers = new Set(parsedRows.map((row) => row.rowNumber));
    const unknownNumbers = input.rowNumbers.filter((rowNumber) => !availableNumbers.has(rowNumber));
    if (unknownNumbers.length > 0) {
      throw new ApiError(
        400,
        `Some selected rows were not found in the CSV (${unknownNumbers.join(', ')}).`,
        'BadRequest',
      );
    }
    activeRows = parsedRows.filter((row) => allowedNumbers.has(row.rowNumber));
    if (activeRows.length === 0) {
      throw new ApiError(400, 'No selected rows were found for import.', 'BadRequest');
    }
  }
  const refs = await loadReferenceData();

  if (input.targetClassId && !refs.classRefs.some((entry) => entry.id === input.targetClassId)) {
    throw new ApiError(400, 'Selected target class does not exist.', 'BadRequest');
  }
  if (input.targetBranchId && !refs.branchRefs.some((entry) => entry.id === input.targetBranchId)) {
    throw new ApiError(400, 'Selected target branch does not exist.', 'BadRequest');
  }

  const classIdsFromRows = activeRows
    .map((row) => findClassId(row, input.scope, refs.classRefs, input.targetClassId))
    .filter((value): value is string => Boolean(value));

  const [existingUsersByContact, existingByClassAndNameResult] = await Promise.all([
    findExistingUsers(activeRows),
    findExistingUsersByClassAndName(classIdsFromRows),
  ]);

  const mergedExistingById = new Map<string, ExistingUserLite>();
  [...existingUsersByContact, ...existingByClassAndNameResult.users].forEach((row) => {
    mergedExistingById.set(row._id.toString(), row);
  });
  const existingUsers = Array.from(mergedExistingById.values());

  const userByEmail = new Map(existingUsers.map((user) => [user.email.toLowerCase(), user]));
  const userByPhone = new Map(
    existingUsers
      .filter((user) => user.phone)
      .map((user) => [user.phone as string, user]),
  );

  const normalizedRows = normalizeRows(
    activeRows,
    input.scope,
    refs,
    existingUsers,
    existingByClassAndNameResult.byClassAndName,
    input.targetClassId,
    input.targetBranchId,
  );

  const rowResults: RowResult[] = [];
  let created = 0;
  let updated = 0;
  let skipped = 0;
  let validRows = 0;
  let failedRows = 0;

  const passwordHash = input.mode === 'commit' ? await bcrypt.hash(defaultPassword, 10) : '';

  for (const entry of normalizedRows) {
    const normalized = entry.normalized;
    const errors = [...entry.errors];
    const warnings = normalized?.warnings ?? [];
    if (!normalized) {
      failedRows += 1;
      skipped += 1;
      rowResults.push({
        rowNumber: entry.normalized?.rowNumber ?? activeRows[rowResults.length]?.rowNumber ?? rowResults.length + 2,
        action: 'skip',
        status: 'error',
        memberName: 'Invalid row',
        email: '',
        phone: null,
        classLabel: 'N/A',
        branchLabel: null,
        warnings,
        errors,
      });
      continue;
    }

    validRows += 1;
    const existingUser = userByEmail.get(normalized.email.toLowerCase()) ?? (normalized.phone ? userByPhone.get(normalized.phone) : null) ?? null;
    const action: RowAction = existingUser ? 'update' : entry.action;

    let userId: string | undefined;
    if (input.mode === 'commit') {
      try {
        userId = await applyNormalizedRow(
          input.actorUserId,
          normalized,
          action,
          existingUser as ExistingUserLite | null,
          passwordHash,
          input.sendWelcomeEmail,
        );
        if (action === 'create') {
          created += 1;
          const createdUser = await UserModel.findById(userId).select('_id email phone status claimStatus').lean<ExistingUserLite>().exec();
          if (createdUser) {
            userByEmail.set(createdUser.email.toLowerCase(), createdUser);
            if (createdUser.phone) {
              userByPhone.set(createdUser.phone, createdUser);
            }
          }
        } else {
          updated += 1;
        }
      } catch (error) {
        failedRows += 1;
        skipped += 1;
        errors.push(error instanceof Error ? error.message : 'Failed to apply row.');
      }
    } else if (action === 'create') {
      created += 1;
    } else if (action === 'update') {
      updated += 1;
    }

    const status: RowStatus = errors.length > 0 ? 'error' : 'valid';
    if (status === 'error' && input.mode !== 'commit') {
      failedRows += 1;
      skipped += 1;
    }

    rowResults.push({
      rowNumber: normalized.rowNumber,
      action: status === 'error' ? 'skip' : action,
      status,
      memberName: `${normalized.firstName} ${normalized.lastName}`.trim(),
      email: normalized.email,
      phone: normalized.phone,
      classLabel: normalized.classLabel ?? normalized.classId,
      branchLabel: normalized.branchLabel,
      warnings,
      errors,
      userId,
    });
  }

  if (input.mode === 'commit' && input.sendWelcomeEmail && (created + updated) > 0) {
    void runNotificationEmailWorkerOnce();
  }

  return {
    mode: input.mode,
    summary: {
      totalRows: activeRows.length,
      validRows,
      failedRows,
      created,
      updated,
      skipped,
    },
    rows: rowResults,
  };
}

export function buildMemberImportTemplateCsv() {
  const lines = [
    'First Name,Last Name,Middle Name,Title,Phone,Email,Class Year,Branch Name,House Name,DOB Day,DOB Month,DOB Year,Status,Note',
    'Ejovi,Ekakitie,,Mr,+2348012345678,,1992,Lagos Branch,Blue House,12,5,1980,active,Imported from class records',
    'Ada,Okafor,,Mrs,+2348098765432,ada.okafor@example.com,1992,,Green House,3,11,1982,pending,Awaiting document verification',
  ];
  return lines.join('\n');
}

export function validateImportFileName(fileName: string) {
  if (!isCsvFilename(fileName)) {
    throw new ApiError(
      400,
      'Only CSV files are supported for now. Save your Excel sheet as .csv and upload again.',
      'BadRequest',
    );
  }
}
