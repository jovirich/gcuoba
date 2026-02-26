const { createHash } = require('crypto');
const { existsSync } = require('fs');
const { resolve } = require('path');
const dotenv = require('dotenv');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), 'apps/api/.env'),
    resolve(process.cwd(), '../.env'),
    resolve(__dirname, '../../../.env'),
    resolve(__dirname, '../../../../.env'),
    resolve(__dirname, '../../../../../.env'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      dotenv.config({ path: p, override: false });
    }
  }
}

const s = (v) => {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t.length ? t : null;
};

const n = (v, fallback = 0) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
};

const d = (v) => {
  if (!v) return undefined;
  const t = v instanceof Date ? v : new Date(v);
  return Number.isNaN(t.getTime()) ? undefined : t;
};

const oid = (scope, key) => {
  const hex = createHash('md5').update(`${scope}:${String(key)}`).digest('hex').slice(0, 24);
  return new mongoose.Types.ObjectId(hex);
};

const scopeId = (type, rawId, branchMap, classMap) => {
  const id = n(rawId, NaN);
  if (!Number.isFinite(id)) return null;
  if (type === 'branch') return branchMap.get(id) || null;
  if (type === 'class') return classMap.get(id) || null;
  return null;
};

const notifKind = (sourceType, payload) => {
  if (sourceType.includes('Rejected')) return 'warning';
  if (sourceType.includes('Approved') || sourceType.includes('Received')) return 'success';
  if (sourceType.includes('Request') || sourceType.includes('Pending') || sourceType.includes('Submitted')) return 'action_required';
  if (payload && payload.type === 'dues_invoice') return 'action_required';
  return 'info';
};

const notifText = (sourceType, payload) => {
  const simple = (sourceType.split('\\').pop() || 'Notification')
    .replace(/Notification$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  const type = notifKind(sourceType, payload);
  if (payload && payload.type === 'dues_invoice') {
    const scheme = s(payload.scheme) || 'Dues invoice';
    const amount = s(payload.amount) || '';
    const currency = s(payload.currency) || '';
    const status = s(payload.status) || '';
    const parts = [amount, currency, status].filter(Boolean).join(' ');
    return {
      title: `Invoice posted: ${scheme}`,
      message: parts ? `A dues invoice was created (${parts}).` : 'A new dues invoice has been posted.',
      type,
    };
  }
  const message = s(payload && payload.message) || (payload ? JSON.stringify(payload).slice(0, 300) : '') || `You have a new ${simple.toLowerCase()} update.`;
  return { title: simple || 'Notification', message, type };
};

const parseJson = (raw) => {
  if (typeof raw !== 'string') return null;
  try {
    const p = JSON.parse(raw);
    return p && typeof p === 'object' ? p : null;
  } catch {
    return null;
  }
};

const normalizeLegacyBcrypt = (hash) => {
  const value = s(hash) || '';
  if (value.startsWith('$2y$')) {
    return `$2b$${value.slice(4)}`;
  }
  return value;
};

async function rows(conn, table) {
  const [r] = await conn.query(`SELECT * FROM \`${table}\``);
  return r;
}

async function hasTable(conn, table) {
  const [r] = await conn.query('SHOW TABLES LIKE ?', [table]);
  return r.length > 0;
}

async function main() {
  loadEnv();
  const dryRun = process.argv.includes('--dry-run');
  const noReset = process.argv.includes('--no-reset');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) throw new Error('MONGODB_URI is required');

  const mysqlHost = process.env.MYSQL_HOST || process.env.DB_HOST || '127.0.0.1';
  const mysqlPort = n(process.env.MYSQL_PORT || process.env.DB_PORT || 3306);
  const mysqlUser = process.env.MYSQL_USER || process.env.DB_USERNAME || 'root';
  const mysqlPass = process.env.MYSQL_PASSWORD ?? process.env.DB_PASSWORD ?? '';
  const mysqlDb = process.env.MYSQL_DATABASE || process.env.DB_DATABASE || 'gcuoba_portal';

  console.log(`MySQL: ${mysqlUser}@${mysqlHost}:${mysqlPort}/${mysqlDb}`);
  console.log(`Mongo: ${mongoUri}`);
  console.log(`Mode: ${dryRun ? 'dry-run' : 'write'}${noReset ? ' (no-reset)' : ''}`);

  const conn = await mysql.createConnection({ host: mysqlHost, port: mysqlPort, user: mysqlUser, password: mysqlPass, database: mysqlDb });
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 15000 });

  const db = mongoose.connection.db;
  const targets = [
    'users','profiles','countries','branches','classes','houses','roles','role_features','role_assignments','user_class_membership','user_branch_memberships',
    'announcements','events','duesschemes','duesinvoices','payments','payment_receipts','projects','expenses','welfare_categories','welfare_cases',
    'welfare_contributions','welfare_payouts','notifications','audit_logs'
  ];

  if (!dryRun && !noReset) {
    for (const c of targets) {
      await db.collection(c).deleteMany({});
    }
    console.log('Cleared target Mongo collections.');
  }

  const summary = {};
  const mark = (table, mysqlCount, mongoCount, skipped = 0) => {
    summary[table] = { mysql_rows: mysqlCount, mongo_docs: mongoCount, skipped };
  };
  const write = async (collection, docs) => {
    if (!dryRun && docs.length) {
      await db.collection(collection).insertMany(docs, { ordered: false });
    }
  };

  const countryRows = await rows(conn, 'countries');
  const countryMap = new Map(countryRows.map((r) => [n(r.id), s(r.name) || 'Unknown']));
  const countries = countryRows.map((r) => {
    const sourceId = n(r.id);
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    return {
      _id: oid('countries', sourceId),
      name: s(r.name) || `Country ${sourceId}`,
      isoCode: s(r.iso_code)?.toUpperCase() || null,
      createdAt,
      updatedAt,
    };
  });
  await write('countries', countries);
  mark('countries', countryRows.length, countries.length);

  const userRows = await rows(conn, 'users');
  const userMap = new Map();
  const userNameMap = new Map();
  const userEmailMap = new Map();
  const users = userRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('users', sourceId);
    userMap.set(sourceId, _id.toString());
    userNameMap.set(sourceId, s(r.name) || `User ${sourceId}`);
    userEmailMap.set(sourceId, s(r.email) || '');
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    const status = s(r.status);
    return {
      _id,
      name: s(r.name) || s(r.email) || `User ${sourceId}`,
      email: (s(r.email) || `user${sourceId}@unknown.local`).toLowerCase(),
      emailVerifiedAt: d(r.email_verified_at) || null,
      passwordHash: normalizeLegacyBcrypt(r.password_hash),
      phone: s(r.phone),
      status: status === 'active' || status === 'suspended' ? status : 'pending',
      createdAt,
      updatedAt,
    };
  });
  await write('users', users);
  mark('users', userRows.length, users.length);
  const branchRows = await rows(conn, 'branches');
  const branchMap = new Map();
  const branches = branchRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('branches', sourceId);
    branchMap.set(sourceId, _id.toString());
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    return {
      _id,
      name: s(r.name) || `Branch ${sourceId}`,
      country: countryMap.get(n(r.country_id, NaN)) || s(r.city) || undefined,
      createdAt,
      updatedAt,
    };
  });
  await write('branches', branches);
  mark('branches', branchRows.length, branches.length);

  const classRows = await rows(conn, 'classes');
  const classMap = new Map();
  const classes = classRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('classes', sourceId);
    classMap.set(sourceId, _id.toString());
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    return {
      _id,
      label: s(r.label) || `Class ${n(r.entry_year)}`,
      entryYear: n(r.entry_year),
      status: s(r.status) === 'inactive' ? 'inactive' : 'active',
      createdAt,
      updatedAt,
    };
  });
  await write('classes', classes);
  mark('classes', classRows.length, classes.length);

  const houseRows = await rows(conn, 'houses');
  const houseMap = new Map();
  const houses = houseRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('houses', sourceId);
    houseMap.set(sourceId, _id.toString());
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    return { _id, name: s(r.name) || `House ${sourceId}`, motto: null, createdAt, updatedAt };
  });
  await write('houses', houses);
  mark('houses', houseRows.length, houses.length);

  const roleRows = await rows(conn, 'roles');
  const roleMap = new Map();
  const roleCodeMap = new Map();
  const usedRoleCodes = new Set();
  const roles = roleRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('roles', sourceId);
    roleMap.set(sourceId, _id);
    const scope = s(r.scope);
    const scopeValue = scope === 'branch' || scope === 'class' ? scope : 'global';
    const baseCode = s(r.code) || `role_${sourceId}`;
    let code = baseCode;
    if (usedRoleCodes.has(code)) {
      code = `${baseCode}_${scopeValue}`;
    }
    let dedupeIdx = 2;
    while (usedRoleCodes.has(code)) {
      code = `${baseCode}_${scopeValue}_${dedupeIdx}`;
      dedupeIdx += 1;
    }
    usedRoleCodes.add(code);
    roleCodeMap.set(sourceId, code);
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    return {
      _id,
      code,
      name: s(r.name) || code,
      scope: scopeValue,
      createdAt,
      updatedAt,
    };
  });
  await write('roles', roles);
  mark('roles', roleRows.length, roles.length);

  const hasRoleFeatures = await hasTable(conn, 'role_features');
  const roleFeatureRows = hasRoleFeatures ? await rows(conn, 'role_features') : [];
  let skippedRoleFeatures = 0;
  const roleFeatures = roleFeatureRows.map((r) => {
    const roleId = roleMap.get(n(r.role_id));
    if (!roleId) {
      skippedRoleFeatures += 1;
      return null;
    }
    const moduleKey = s(r.module_key);
    if (!moduleKey) {
      skippedRoleFeatures += 1;
      return null;
    }
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    return {
      _id: oid('role_features', n(r.id)),
      roleId,
      moduleKey,
      allowed: r.allowed === null || r.allowed === undefined ? true : Boolean(Number(r.allowed)),
      createdAt,
      updatedAt,
    };
  }).filter(Boolean);
  await write('role_features', roleFeatures);
  mark('role_features', roleFeatureRows.length, roleFeatures.length, skippedRoleFeatures);

  const roleAssignRows = await rows(conn, 'role_assignments');
  let skippedRoleAssign = 0;
  const roleAssignments = roleAssignRows.map((r) => {
    const userId = userMap.get(n(r.user_id));
    const roleId = roleMap.get(n(r.role_id));
    if (!userId || !roleId) {
      skippedRoleAssign += 1;
      return null;
    }
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('role_assignments', n(r.id)),
      userId,
      roleId,
      roleCode: roleCodeMap.get(n(r.role_id)) || `role_${n(r.role_id)}`,
      scopeType,
      scopeId: scopeId(scopeType, r.scope_id, branchMap, classMap),
      startDate: d(r.start_date),
      endDate: d(r.end_date),
      createdAt,
      updatedAt: createdAt,
    };
  }).filter(Boolean);
  await write('role_assignments', roleAssignments);
  mark('role_assignments', roleAssignRows.length, roleAssignments.length, skippedRoleAssign);

  const classMembershipRows = await rows(conn, 'user_class_membership');
  let skippedClassMemberships = 0;
  const classMemberships = classMembershipRows.map((r) => {
    const su = n(r.user_id);
    const sc = n(r.class_id);
    const userId = userMap.get(su);
    const classId = classMap.get(sc);
    if (!userId || !classId) {
      skippedClassMemberships += 1;
      return null;
    }
    const joinedAt = d(r.joined_at) || new Date();
    return {
      _id: oid('user_class_membership', `${su}:${sc}`),
      userId,
      classId,
      joinedAt,
      updatedAt: d(r.updated_at) || joinedAt,
    };
  }).filter(Boolean);
  await write('user_class_membership', classMemberships);
  mark('user_class_membership', classMembershipRows.length, classMemberships.length, skippedClassMemberships);

  const branchMembershipRows = await rows(conn, 'user_branch_memberships');
  let skippedBranchMemberships = 0;
  const branchMemberships = branchMembershipRows.map((r) => {
    const su = n(r.user_id);
    const sb = n(r.branch_id);
    const userId = userMap.get(su);
    const branchId = branchMap.get(sb);
    if (!userId || !branchId) {
      skippedBranchMemberships += 1;
      return null;
    }
    const requestedAt = d(r.requested_at) || new Date();
    const endedAt = d(r.ended_at);
    const statusRaw = s(r.status);
    const status = endedAt && statusRaw === 'approved' ? 'ended' : (statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'requested');
    return {
      _id: oid('user_branch_memberships', `${su}:${sb}`),
      userId,
      branchId,
      status,
      requestedAt,
      approvedBy: userMap.get(n(r.approved_by, NaN)) || null,
      approvedAt: d(r.approved_at) || null,
      endedAt: endedAt || null,
      note: s(r.note),
      createdAt: requestedAt,
      updatedAt: d(r.updated_at) || requestedAt,
    };
  }).filter(Boolean);
  await write('user_branch_memberships', branchMemberships);
  mark('user_branch_memberships', branchMembershipRows.length, branchMemberships.length, skippedBranchMemberships);

  const profileRows = await rows(conn, 'profiles');
  let skippedProfiles = 0;
  const profiles = profileRows.map((r) => {
    const userId = userMap.get(n(r.user_id));
    if (!userId) {
      skippedProfiles += 1;
      return null;
    }
    const createdAt = d(r.created_at) || new Date();
    const updatedAt = d(r.updated_at) || createdAt;
    const privacyLevel = s(r.privacy_level) === 'restricted' ? 'private' : (s(r.privacy_level) === 'public' ? 'public' : 'public_to_members');
    return {
      _id: oid('profiles', n(r.id)),
      userId,
      title: s(r.title),
      firstName: s(r.first_name) || '',
      middleName: s(r.middle_name),
      lastName: s(r.last_name) || '',
      dobDay: r.dob_day === null ? null : n(r.dob_day),
      dobMonth: r.dob_month === null ? null : n(r.dob_month),
      dobYear: r.dob_year === null ? null : n(r.dob_year),
      sex: s(r.sex),
      stateOfOrigin: s(r.state_of_origin),
      lgaOfOrigin: s(r.lga_of_origin),
      resHouseNo: s(r.res_house_no),
      resStreet: s(r.res_street),
      resArea: s(r.res_area),
      resCity: s(r.res_city),
      resCountry: s(r.res_country),
      occupation: s(r.occupation),
      photoUrl: s(r.photo_url),
      houseId: houseMap.get(n(r.house_id, NaN)) || null,
      privacyLevel,
      createdAt,
      updatedAt,
    };
  }).filter(Boolean);
  await write('profiles', profiles);
  mark('profiles', profileRows.length, profiles.length, skippedProfiles);

  const schemeRows = await rows(conn, 'dues_schemes');
  const schemeMap = new Map();
  const schemes = schemeRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('dues_schemes', sourceId);
    schemeMap.set(sourceId, _id);
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const createdAt = d(r.created_at) || new Date();
    const f = s(r.frequency);
    return {
      _id,
      title: s(r.title) || '',
      amount: n(r.amount),
      currency: s(r.currency) || 'NGN',
      frequency: (f === 'monthly' || f === 'quarterly' || f === 'annual' || f === 'one_off') ? f : 'annual',
      scope_type: scopeType,
      scope_id: scopeId(scopeType, r.scope_id, branchMap, classMap),
      status: s(r.status) === 'inactive' ? 'inactive' : 'active',
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('duesschemes', schemes);
  mark('dues_schemes', schemeRows.length, schemes.length);

  const invoiceRows = await rows(conn, 'dues_invoices');
  const invoiceMap = new Map();
  let skippedInvoices = 0;
  const invoices = invoiceRows.map((r) => {
    const schemeId = schemeMap.get(n(r.scheme_id));
    const userId = userMap.get(n(r.user_id));
    if (!schemeId || !userId) {
      skippedInvoices += 1;
      return null;
    }
    const sourceId = n(r.id);
    const _id = oid('dues_invoices', sourceId);
    invoiceMap.set(sourceId, _id);
    const amount = n(r.amount);
    const statusRaw = s(r.status);
    const status = statusRaw === 'paid' || statusRaw === 'waived' ? 'paid' : (statusRaw === 'part_paid' ? 'part_paid' : 'unpaid');
    return {
      _id,
      schemeId,
      userId,
      amount,
      currency: s(r.currency) || 'NGN',
      periodStart: d(r.period_start),
      periodEnd: d(r.period_end),
      status,
      paidAmount: status === 'paid' ? amount : (status === 'part_paid' ? amount / 2 : 0),
      createdAt: d(r.created_at) || new Date(),
      updatedAt: d(r.updated_at) || d(r.created_at) || new Date(),
    };
  }).filter(Boolean);
  await write('duesinvoices', invoices);
  mark('dues_invoices', invoiceRows.length, invoices.length, skippedInvoices);

  const hasInvoicePayments = await hasTable(conn, 'invoice_payments');
  const invoicePaymentRows = hasInvoicePayments ? await rows(conn, 'invoice_payments') : [];
  const applicationsByPayment = new Map();
  for (const r of invoicePaymentRows) {
    const paymentId = n(r.payment_id, NaN);
    const invoiceId = invoiceMap.get(n(r.invoice_id, NaN));
    if (!Number.isFinite(paymentId) || !invoiceId) continue;
    const current = applicationsByPayment.get(paymentId) || [];
    current.push({ invoiceId, amount: n(r.amount) });
    applicationsByPayment.set(paymentId, current);
  }

  const paymentRows = await rows(conn, 'payments');
  const paymentMap = new Map();
  let skippedPayments = 0;
  const payments = paymentRows.map((r) => {
    const sourceId = n(r.id);
    const payerUserId = userMap.get(n(r.payer_user_id));
    if (!payerUserId) {
      skippedPayments += 1;
      return null;
    }
    const _id = oid('payments', sourceId);
    paymentMap.set(sourceId, _id);
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    return {
      _id,
      payerUserId,
      amount: n(r.amount),
      currency: s(r.currency) || 'NGN',
      channel: s(r.channel) || 'manual',
      reference: s(r.reference),
      scopeType,
      scopeId: scopeId(scopeType, r.scope_id, branchMap, classMap),
      notes: s(r.notes),
      status: s(r.status) === 'success' ? 'completed' : 'pending',
      paidAt: d(r.paid_at),
      applications: applicationsByPayment.get(sourceId) || [],
      createdAt: d(r.created_at) || new Date(),
      updatedAt: d(r.created_at) || new Date(),
    };
  }).filter(Boolean);
  await write('payments', payments);
  mark('payments', paymentRows.length, payments.length, skippedPayments);

  const receiptRows = await rows(conn, 'payment_receipts');
  let skippedReceipts = 0;
  const receipts = receiptRows.map((r) => {
    const paymentId = paymentMap.get(n(r.payment_id));
    if (!paymentId) {
      skippedReceipts += 1;
      return null;
    }
    return {
      _id: oid('payment_receipts', n(r.id)),
      paymentId,
      receiptNo: s(r.receipt_no) || `RC-${r.id}`,
      issuedAt: d(r.issued_at) || new Date(),
    };
  }).filter(Boolean);
  await write('payment_receipts', receipts);
  mark('payment_receipts', receiptRows.length, receipts.length, skippedReceipts);

  const hasProjects = await hasTable(conn, 'projects');
  const projectRows = hasProjects ? await rows(conn, 'projects') : [];
  const projectMap = new Map();
  const projects = projectRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('projects', sourceId);
    projectMap.set(sourceId, _id);
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const statusRaw = s(r.status);
    const status = statusRaw === 'active' || statusRaw === 'completed' ? statusRaw : 'planning';
    const createdAt = d(r.created_at) || new Date();
    return {
      _id,
      name: s(r.name) || `Project ${sourceId}`,
      scope_type: scopeType,
      scope_id: scopeId(scopeType, r.scope_id, branchMap, classMap),
      budget: n(r.budget, 0),
      actual_spend: n(r.actual_spend, 0),
      start_date: d(r.start_date),
      end_date: d(r.end_date),
      status,
      owner_id: userMap.get(n(r.owner_id, NaN)) || null,
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('projects', projects);
  mark('projects', projectRows.length, projects.length);

  const hasExpenses = await hasTable(conn, 'expenses');
  const expenseRows = hasExpenses ? await rows(conn, 'expenses') : [];
  const expenses = expenseRows.map((r) => {
    const sourceId = n(r.id);
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const approvalRaw = s(r.approval_stage);
    const statusRaw = s(r.status);
    const approvalStage =
      approvalRaw === 'finance_approved' || approvalRaw === 'approved' || approvalRaw === 'rejected'
        ? approvalRaw
        : 'pending';
    let status = statusRaw === 'approved' || statusRaw === 'rejected' ? statusRaw : 'pending';
    if (approvalStage === 'approved') status = 'approved';
    if (approvalStage === 'rejected') status = 'rejected';
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('expenses', sourceId),
      scope_type: scopeType,
      scope_id: scopeId(scopeType, r.scope_id, branchMap, classMap),
      project_id: projectMap.get(n(r.project_id, NaN)) || null,
      title: s(r.title) || `Expense ${sourceId}`,
      description: s(r.description),
      notes: s(r.notes),
      amount: n(r.amount, 0),
      currency: s(r.currency) || 'NGN',
      status,
      approval_stage: approvalStage,
      submitted_by: userMap.get(n(r.submitted_by, NaN)) || null,
      approved_by: userMap.get(n(r.approved_by, NaN)) || null,
      approved_at: d(r.approved_at) || null,
      first_approved_by: userMap.get(n(r.first_approved_by, NaN)) || null,
      first_approved_at: d(r.first_approved_at) || null,
      second_approved_by: userMap.get(n(r.second_approved_by, NaN)) || null,
      second_approved_at: d(r.second_approved_at) || null,
      rejected_by: userMap.get(n(r.rejected_by, NaN)) || null,
      rejected_at: d(r.rejected_at) || null,
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('expenses', expenses);
  mark('expenses', expenseRows.length, expenses.length);

  const welfareCategoryRows = await rows(conn, 'welfare_categories');
  const welfareCategoryMap = new Map();
  const welfareCategoryByName = new Map();
  const welfareCategories = welfareCategoryRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('welfare_categories', sourceId);
    const name = s(r.name) || `Category ${sourceId}`;
    welfareCategoryMap.set(sourceId, _id.toString());
    welfareCategoryByName.set(name.toLowerCase(), _id.toString());
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const createdAt = d(r.created_at) || new Date();
    return {
      _id,
      name,
      scope_type: scopeType,
      scope_id: scopeId(scopeType, r.scope_id, branchMap, classMap),
      status: s(r.status) === 'inactive' ? 'inactive' : 'active',
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('welfare_categories', welfareCategories);
  mark('welfare_categories', welfareCategoryRows.length, welfareCategories.length);

  const welfareCaseRows = await rows(conn, 'welfare_cases');
  const welfareCaseMap = new Map();
  const welfareCases = welfareCaseRows.map((r) => {
    const sourceId = n(r.id);
    const _id = oid('welfare_cases', sourceId);
    welfareCaseMap.set(sourceId, _id.toString());
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const categoryId = welfareCategoryMap.get(n(r.category_id, NaN)) || welfareCategoryByName.get((s(r.category) || '').toLowerCase()) || (welfareCategories[0] ? welfareCategories[0]._id.toString() : 'uncategorized');
    const createdAt = d(r.created_at) || new Date();
    const status = s(r.status) === 'closed' ? 'closed' : 'open';
    return {
      _id,
      title: s(r.title) || '',
      description: s(r.description) || '',
      categoryId,
      scopeType,
      scopeId: scopeId(scopeType, r.scope_id, branchMap, classMap),
      targetAmount: n(r.target_amount),
      currency: s(r.currency) || 'NGN',
      status,
      totalRaised: n(r.total_raised),
      totalDisbursed: n(r.total_disbursed ?? r.disbursed_amount),
      beneficiaryName: s(r.beneficiary_name),
      beneficiaryUserId: userMap.get(n(r.beneficiary_user_id, NaN)) || undefined,
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('welfare_cases', welfareCases);
  mark('welfare_cases', welfareCaseRows.length, welfareCases.length);

  const welfareContributionRows = await rows(conn, 'welfare_contributions');
  let skippedWelfareContributions = 0;
  const welfareContributions = welfareContributionRows.map((r) => {
    const caseId = welfareCaseMap.get(n(r.welfare_case_id));
    if (!caseId) {
      skippedWelfareContributions += 1;
      return null;
    }
    const sourceUserId = n(r.user_id, NaN);
    const paidAt = d(r.contributed_at) || new Date();
    return {
      _id: oid('welfare_contributions', n(r.id)),
      caseId,
      userId: userMap.get(sourceUserId) || null,
      contributorName: userNameMap.get(sourceUserId) || `User ${sourceUserId}`,
      contributorEmail: userEmailMap.get(sourceUserId) || null,
      amount: n(r.amount),
      currency: s(r.currency) || 'NGN',
      notes: null,
      paidAt,
      status: 'approved',
      reviewedBy: null,
      reviewedAt: null,
      reviewNote: null,
      createdAt: paidAt,
      updatedAt: d(r.updated_at) || paidAt,
    };
  }).filter(Boolean);
  await write('welfare_contributions', welfareContributions);
  mark('welfare_contributions', welfareContributionRows.length, welfareContributions.length, skippedWelfareContributions);

  const welfarePayoutRows = await rows(conn, 'welfare_payouts');
  let skippedWelfarePayouts = 0;
  const welfarePayouts = welfarePayoutRows.map((r) => {
    const caseId = welfareCaseMap.get(n(r.welfare_case_id));
    if (!caseId) {
      skippedWelfarePayouts += 1;
      return null;
    }
    const processedAt = d(r.processed_at);
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('welfare_payouts', n(r.id)),
      caseId,
      beneficiaryUserId: null,
      amount: n(r.amount),
      currency: s(r.currency) || 'NGN',
      channel: s(r.channel) || 'transfer',
      reference: s(r.reference),
      notes: s(r.notes),
      disbursedAt: processedAt || undefined,
      status: processedAt ? 'approved' : 'pending',
      reviewedBy: userMap.get(n(r.processed_by, NaN)) || null,
      reviewedAt: processedAt || null,
      reviewNote: null,
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  }).filter(Boolean);
  await write('welfare_payouts', welfarePayouts);
  mark('welfare_payouts', welfarePayoutRows.length, welfarePayouts.length, skippedWelfarePayouts);

  const announcementRows = await rows(conn, 'announcements');
  const announcements = announcementRows.map((r) => {
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('announcements', n(r.id)),
      title: s(r.title) || '',
      body: s(r.body) || '',
      scopeType,
      scopeId: scopeId(scopeType, r.scope_id, branchMap, classMap),
      status: s(r.status) === 'published' ? 'published' : 'draft',
      publishedAt: d(r.published_at) || createdAt,
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('announcements', announcements);
  mark('announcements', announcementRows.length, announcements.length);

  const eventRows = await rows(conn, 'events');
  const events = eventRows.map((r) => {
    const st = s(r.scope_type);
    const scopeType = st === 'branch' || st === 'class' ? st : 'global';
    const statusRaw = s(r.status);
    const status = statusRaw === 'draft' ? 'draft' : (statusRaw === 'cancelled' ? 'cancelled' : 'published');
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('events', n(r.id)),
      title: s(r.title) || '',
      description: s(r.description),
      scopeType,
      scopeId: scopeId(scopeType, r.scope_id, branchMap, classMap),
      location: s(r.location_text),
      startAt: d(r.start_datetime) || createdAt,
      endAt: d(r.end_datetime),
      status,
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  });
  await write('events', events);
  mark('events', eventRows.length, events.length);

  const notificationRows = await rows(conn, 'notifications');
  let skippedNotifications = 0;
  const notifications = notificationRows.map((r) => {
    const userId = userMap.get(n(r.notifiable_id, NaN));
    if (!userId) {
      skippedNotifications += 1;
      return null;
    }
    const sourceType = s(r.type) || 'Notification';
    const payload = parseJson(r.data);
    const text = notifText(sourceType, payload);
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('notifications', s(r.id) || createdAt.toISOString()),
      userId,
      title: text.title,
      message: text.message,
      type: text.type,
      readAt: d(r.read_at) || null,
      metadata: {
        sourceType,
        sourceData: payload || s(r.data),
        legacyNotificationId: s(r.id),
      },
      createdAt,
      updatedAt: d(r.updated_at) || createdAt,
    };
  }).filter(Boolean);
  await write('notifications', notifications);
  mark('notifications', notificationRows.length, notifications.length, skippedNotifications);

  const auditRows = await rows(conn, 'audit_logs');
  const auditLogs = auditRows.map((r) => {
    let metadata = null;
    const metadataRaw = s(r.metadata_json);
    if (metadataRaw) {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch {
        metadata = { raw: metadataRaw };
      }
    }
    if (s(r.ip_address)) metadata = { ...(metadata || {}), ipAddress: r.ip_address };
    if (s(r.user_agent)) metadata = { ...(metadata || {}), userAgent: r.user_agent };
    const createdAt = d(r.created_at) || new Date();
    return {
      _id: oid('audit_logs', n(r.id)),
      actorUserId: userMap.get(n(r.actor_user_id, NaN)) || 'system',
      action: s(r.action) || 'legacy.action',
      resourceType: s(r.entity_type) || 'legacy',
      resourceId: s(r.entity_id),
      scopeType: null,
      scopeId: null,
      metadata,
      createdAt,
      updatedAt: createdAt,
    };
  });
  await write('audit_logs', auditLogs);
  mark('audit_logs', auditRows.length, auditLogs.length);

  console.log('\nMigration summary:');
  console.table(Object.entries(summary).map(([table, stats]) => ({ table, ...stats })));

  await conn.end();
  await mongoose.connection.close();
}

main()
  .then(() => {
    console.log('MySQL -> Mongo migration completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
