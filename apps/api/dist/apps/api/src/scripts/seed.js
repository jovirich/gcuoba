"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = require("mongoose");
const dues_scheme_schema_1 = require("../modules/finance/schemas/dues-scheme.schema");
const dues_invoice_schema_1 = require("../modules/finance/schemas/dues-invoice.schema");
const welfare_case_schema_1 = require("../modules/welfare/schemas/welfare-case.schema");
const welfare_contribution_schema_1 = require("../modules/welfare/schemas/welfare-contribution.schema");
const welfare_payout_schema_1 = require("../modules/welfare/schemas/welfare-payout.schema");
const payment_schema_1 = require("../modules/finance/schemas/payment.schema");
const payment_receipt_schema_1 = require("../modules/finance/schemas/payment-receipt.schema");
const user_schema_1 = require("../modules/users/schemas/user.schema");
const branch_schema_1 = require("../modules/branches/schemas/branch.schema");
const class_set_schema_1 = require("../modules/classes/schemas/class-set.schema");
const branch_membership_schema_1 = require("../modules/memberships/schemas/branch-membership.schema");
const class_membership_schema_1 = require("../modules/memberships/schemas/class-membership.schema");
const role_schema_1 = require("../modules/roles/schemas/role.schema");
const role_assignment_schema_1 = require("../modules/role-assignments/schemas/role-assignment.schema");
const announcement_schema_1 = require("../modules/dashboard/schemas/announcement.schema");
const event_schema_1 = require("../modules/dashboard/schemas/event.schema");
const house_schema_1 = require("../modules/houses/house.schema");
async function run() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('MONGODB_URI not set');
    }
    await (0, mongoose_1.connect)(uri);
    const schemeModel = mongoose_1.connection.model('DuesScheme', dues_scheme_schema_1.DuesSchemeSchema);
    const invoiceModel = mongoose_1.connection.model('DuesInvoice', dues_invoice_schema_1.DuesInvoiceSchema);
    const welfareCaseModel = mongoose_1.connection.model('WelfareCase', welfare_case_schema_1.WelfareCaseSchema);
    const welfareContributionModel = mongoose_1.connection.model('WelfareContribution', welfare_contribution_schema_1.WelfareContributionSchema);
    const welfarePayoutModel = mongoose_1.connection.model('WelfarePayout', welfare_payout_schema_1.WelfarePayoutSchema);
    const userModel = mongoose_1.connection.model('User', user_schema_1.UserSchema);
    const branchModel = mongoose_1.connection.model('Branch', branch_schema_1.BranchSchema);
    const classModel = mongoose_1.connection.model('ClassSet', class_set_schema_1.ClassSetSchema);
    const branchMembershipModel = mongoose_1.connection.model('BranchMembership', branch_membership_schema_1.BranchMembershipSchema);
    const classMembershipModel = mongoose_1.connection.model('ClassMembership', class_membership_schema_1.ClassMembershipSchema);
    const paymentModel = mongoose_1.connection.model('Payment', payment_schema_1.PaymentSchema);
    const receiptModel = mongoose_1.connection.model('PaymentReceipt', payment_receipt_schema_1.PaymentReceiptSchema);
    const roleModel = mongoose_1.connection.model('Role', role_schema_1.RoleSchema);
    const roleAssignmentModel = mongoose_1.connection.model('RoleAssignment', role_assignment_schema_1.RoleAssignmentSchema);
    const announcementModel = mongoose_1.connection.model('Announcement', announcement_schema_1.AnnouncementSchema);
    const eventModel = mongoose_1.connection.model('DashboardEvent', event_schema_1.EventSchema);
    const houseModel = mongoose_1.connection.model('House', house_schema_1.HouseSchema);
    await Promise.all([
        schemeModel.deleteMany({}),
        invoiceModel.deleteMany({}),
        welfareCaseModel.deleteMany({}),
        welfareContributionModel.deleteMany({}),
        welfarePayoutModel.deleteMany({}),
        userModel.deleteMany({}),
        branchModel.deleteMany({}),
        classModel.deleteMany({}),
        branchMembershipModel.deleteMany({}),
        classMembershipModel.deleteMany({}),
        paymentModel.deleteMany({}),
        receiptModel.deleteMany({}),
        roleModel.deleteMany({}),
        roleAssignmentModel.deleteMany({}),
        announcementModel.deleteMany({}),
        eventModel.deleteMany({}),
        houseModel.deleteMany({}),
    ]);
    const passwordHash = await bcrypt_1.default.hash('password', 10);
    const globalAdminPasswordHash = await bcrypt_1.default.hash('Gcuoba2026', 10);
    const [executiveUser, memberUser, globalAdminUser] = await userModel.create([
        {
            name: 'Executive Demo',
            email: 'exec@example.com',
            passwordHash,
            status: 'active',
        },
        {
            name: 'Member Demo',
            email: 'member@example.com',
            passwordHash,
            status: 'pending',
        },
        {
            name: 'Ejovi Ekakitie',
            email: 'ejovi.ekakitie@hotmail.com',
            passwordHash: globalAdminPasswordHash,
            status: 'active',
        },
    ]);
    const [lagosBranch, abujaBranch] = await branchModel.create([
        { name: 'Lagos Branch', country: 'Nigeria' },
        { name: 'Abuja Branch', country: 'Nigeria' },
    ]);
    const [class2025, class2024] = await classModel.create([
        { label: 'Class of 2025', entryYear: 2025, status: 'active' },
        { label: 'Class of 2024', entryYear: 2024, status: 'active' },
    ]);
    await houseModel.create([
        { name: 'Purple House', motto: 'Unity and Service' },
        { name: 'Red House', motto: 'Courage and Honor' },
        { name: 'Blue House', motto: 'Excellence and Discipline' },
        { name: 'Green House', motto: 'Growth and Progress' },
    ]);
    const [chairRole, secretaryRole, superAdminRole] = await roleModel.create([
        { code: 'chairman', name: 'Branch Chairman', scope: 'branch' },
        { code: 'secretary', name: 'Branch Secretary', scope: 'branch' },
        { code: 'super_admin', name: 'Super Admin', scope: 'global' },
    ]);
    await roleAssignmentModel.create({
        userId: executiveUser._id.toString(),
        roleId: chairRole._id,
        roleCode: chairRole.code,
        scopeType: 'branch',
        scopeId: lagosBranch._id.toString(),
        startDate: new Date(),
    });
    await roleAssignmentModel.create({
        userId: executiveUser._id.toString(),
        roleId: secretaryRole._id,
        roleCode: secretaryRole.code,
        scopeType: 'branch',
        scopeId: abujaBranch._id.toString(),
        startDate: new Date(),
    });
    await roleAssignmentModel.create({
        userId: globalAdminUser._id.toString(),
        roleId: superAdminRole._id,
        roleCode: superAdminRole.code,
        scopeType: 'global',
        scopeId: null,
        startDate: new Date(),
    });
    await branchMembershipModel.create({
        userId: memberUser._id.toString(),
        branchId: lagosBranch._id.toString(),
        status: 'requested',
        requestedAt: new Date(),
        note: 'Looking to get involved with the Lagos alumni.',
    });
    await branchMembershipModel.create({
        userId: executiveUser._id.toString(),
        branchId: lagosBranch._id.toString(),
        status: 'approved',
        requestedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: executiveUser._id.toString(),
    });
    await branchMembershipModel.create({
        userId: globalAdminUser._id.toString(),
        branchId: lagosBranch._id.toString(),
        status: 'approved',
        requestedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: globalAdminUser._id.toString(),
    });
    await classMembershipModel.create([
        {
            userId: executiveUser._id.toString(),
            classId: class2024._id.toString(),
            joinedAt: new Date(),
        },
        {
            userId: memberUser._id.toString(),
            classId: class2025._id.toString(),
            joinedAt: new Date(),
        },
        {
            userId: globalAdminUser._id.toString(),
            classId: class2024._id.toString(),
            joinedAt: new Date(),
        },
    ]);
    const scheme = await schemeModel.create({
        title: 'Annual Global Dues',
        amount: 50000,
        currency: 'NGN',
        frequency: 'annual',
        scope_type: 'global',
        status: 'active',
    });
    const invoice = await invoiceModel.create({
        schemeId: new mongoose_1.Types.ObjectId(scheme._id),
        userId: memberUser._id.toString(),
        amount: 50000,
        currency: 'NGN',
        status: 'unpaid',
        periodStart: new Date(),
    });
    const samplePayment = await paymentModel.create({
        payerUserId: memberUser._id.toString(),
        amount: 20000,
        currency: 'NGN',
        channel: 'transfer',
        reference: 'PAY-0001',
        scopeType: 'global',
        status: 'completed',
        paidAt: new Date(),
    });
    await receiptModel.create({
        paymentId: samplePayment._id,
        receiptNo: 'RC000001',
        issuedAt: new Date(),
    });
    await invoiceModel.updateOne({ _id: invoice._id }, { $set: { paidAmount: 20000, status: 'part_paid' } });
    const welfareCase = await welfareCaseModel.create({
        title: 'Medical Appeal',
        description: 'Support needed for urgent surgery.',
        categoryId: 'medical',
        scopeType: 'global',
        targetAmount: 300000,
        currency: 'NGN',
        status: 'open',
        totalRaised: 0,
        totalDisbursed: 0,
        beneficiaryName: memberUser.name,
        beneficiaryUserId: memberUser._id.toString(),
    });
    await welfareContributionModel.create([
        {
            caseId: welfareCase._id.toString(),
            userId: executiveUser._id.toString(),
            contributorName: 'Executive Demo',
            contributorEmail: 'exec@example.com',
            amount: 50000,
            currency: 'NGN',
            paidAt: new Date(),
            notes: 'Initial contribution',
        },
        {
            caseId: welfareCase._id.toString(),
            userId: memberUser._id.toString(),
            contributorName: 'Member Demo',
            contributorEmail: 'member@example.com',
            amount: 25000,
            currency: 'NGN',
            paidAt: new Date(),
            notes: 'Member support',
        },
    ]);
    await welfarePayoutModel.create({
        caseId: welfareCase._id.toString(),
        beneficiaryUserId: memberUser._id.toString(),
        amount: 30000,
        currency: 'NGN',
        channel: 'transfer',
        reference: 'WLF-REF-01',
        notes: 'First disbursement',
        disbursedAt: new Date(),
    });
    await welfareCaseModel.updateOne({ _id: welfareCase._id }, { $set: { totalRaised: 75000, totalDisbursed: 30000 } });
    await announcementModel.create([
        {
            title: 'Welcome to the TS portal',
            body: 'We are gradually migrating member services to this new experience.',
            scopeType: 'global',
            status: 'published',
            publishedAt: new Date(),
        },
        {
            title: 'Lagos alumni meetup',
            body: 'Join us this weekend for networking at the branch secretariat.',
            scopeType: 'branch',
            scopeId: lagosBranch._id.toString(),
            status: 'published',
            publishedAt: new Date(),
        },
    ]);
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const twoWeeks = new Date();
    twoWeeks.setDate(twoWeeks.getDate() + 14);
    await eventModel.create([
        {
            title: 'Global health webinar',
            description: 'Updates on welfare initiatives and how to plug in.',
            scopeType: 'global',
            location: 'Online',
            startAt: nextWeek,
            endAt: new Date(nextWeek.getTime() + 60 * 60 * 1000),
            status: 'published',
        },
        {
            title: 'Lagos fund-raiser',
            description: 'Cocktail fundraiser for upcoming projects.',
            scopeType: 'branch',
            scopeId: lagosBranch._id.toString(),
            location: 'Lagos Branch Hall',
            startAt: twoWeeks,
            endAt: new Date(twoWeeks.getTime() + 2 * 60 * 60 * 1000),
            status: 'published',
        },
    ]);
    await mongoose_1.connection.close();
    console.log('Seeded demo users, branches, roles, memberships, and finance data.');
    console.log('Login with exec@example.com / password for branch executive access.');
    console.log('Login with member@example.com / password for a pending member view.');
    console.log('Login with ejovi.ekakitie@hotmail.com / Gcuoba2026 for global admin access.');
}
void run();
//# sourceMappingURL=seed.js.map