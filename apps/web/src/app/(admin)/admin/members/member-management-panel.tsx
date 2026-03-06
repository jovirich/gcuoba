"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
    AdminMemberDTO,
    BranchDTO,
    BranchMembershipDTO,
    ClassMembershipDTO,
    ClassSetDTO,
    HouseDTO,
    MemberStatus,
    RoleAssignmentDTO,
    RoleDTO,
    UserDTO,
} from "@gcuoba/types";
import { fetchJson } from "@/lib/api";
import { PaginationControls } from "@/components/ui/pagination-controls";

type TabKey = "profile" | "roles" | "actions";
type ScopeType = "global" | "branch" | "class";

type Props = {
    members: AdminMemberDTO[];
    branches: BranchDTO[];
    classes: ClassSetDTO[];
    houses: HouseDTO[];
    roles: RoleDTO[];
    authToken: string;
    activeScopeType?: ScopeType;
    activeScopeId?: string | null;
};

const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "roles", label: "Roles" },
    { key: "actions", label: "Actions" },
];

const statusPills: Record<MemberStatus, string> = {
    active: "border-lime-200 bg-lime-50 text-lime-700",
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    suspended: "border-rose-200 bg-rose-50 text-rose-700",
};

export function MemberManagementPanel({
    members: initialMembers,
    branches,
    classes,
    houses,
    roles,
    authToken,
    activeScopeType,
    activeScopeId,
}: Props) {
    const [members, setMembers] = useState(initialMembers);
    const [selectedMemberId, setSelectedMemberId] = useState(initialMembers[0]?.user.id ?? "");
    const [search, setSearch] = useState("");
    const [membersPage, setMembersPage] = useState(1);
    const [membersPageSize, setMembersPageSize] = useState(20);
    const [tab, setTab] = useState<TabKey>("profile");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusLoading, setStatusLoading] = useState(false);
    const [classLoading, setClassLoading] = useState(false);
    const [assignLoading, setAssignLoading] = useState(false);
    const [removeRoleId, setRemoveRoleId] = useState<string | null>(null);
    const [branchLoading, setBranchLoading] = useState(false);
    const [endingBranchId, setEndingBranchId] = useState<string | null>(null);
    const [scope, setScope] = useState<ScopeType>(activeScopeType ?? "global");
    const [scopeTarget, setScopeTarget] = useState(activeScopeId ?? "");
    const [roleCode, setRoleCode] = useState("");
    const [classChoice, setClassChoice] = useState(classes[0]?.id ?? "");
    const [branchChoice, setBranchChoice] = useState(branches[0]?.id ?? "");
    const [branchNote, setBranchNote] = useState("");
    const isScopeLocked = Boolean(activeScopeType && activeScopeType !== "global");
    const effectiveScopeType: ScopeType = isScopeLocked && activeScopeType ? activeScopeType : scope;
    const effectiveScopeTarget =
        effectiveScopeType === "global"
            ? null
            : isScopeLocked
              ? (activeScopeId ?? "")
              : scopeTarget;

    const branchMap = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);
    const classMap = useMemo(() => new Map(classes.map((classSet) => [classSet.id, classSet.label])), [classes]);
    const houseMap = useMemo(() => new Map(houses.map((house) => [house.id, house.name])), [houses]);
    const roleNameMap = useMemo(() => new Map(roles.map((role) => [role.code, role.name])), [roles]);
    const resolveBranchLabel = useCallback((branchId?: string | null) => {
        if (!branchId) {
            return "N/A";
        }
        return branchMap.get(branchId) ?? `Branch ${branchId}`;
    }, [branchMap]);
    const resolveClassLabel = useCallback((classId?: string | null) => {
        if (!classId) {
            return "N/A";
        }
        return classMap.get(classId) ?? `Class ${classId}`;
    }, [classMap]);
    const resolveHouseLabel = useCallback((houseId?: string | null) => {
        if (!houseId) {
            return "N/A";
        }
        return houseMap.get(houseId) ?? `House ${houseId}`;
    }, [houseMap]);
    const activeScopeLabel = useMemo(() => {
        if (!activeScopeType) {
            return null;
        }
        if (activeScopeType === "global") {
            return "Global";
        }
        if (activeScopeType === "branch") {
            return `Branch: ${resolveBranchLabel(activeScopeId ?? "")}`;
        }
        return `Class: ${resolveClassLabel(activeScopeId ?? "")}`;
    }, [activeScopeId, activeScopeType, resolveBranchLabel, resolveClassLabel]);

    const rolesByScope = useMemo(() => {
        const grouped: Record<ScopeType, RoleDTO[]> = { global: [], branch: [], class: [] };
        roles.forEach((role) => {
            if (role.scope in grouped) {
                grouped[role.scope as ScopeType].push(role);
            }
        });
        return grouped;
    }, [roles]);

    const availableScopeTypes = useMemo(() => {
        if (activeScopeType === "branch") {
            return ["branch"] as ScopeType[];
        }
        if (activeScopeType === "class") {
            return ["class"] as ScopeType[];
        }
        return (["global", "branch", "class"] as ScopeType[]).filter(
            (scopeType) => rolesByScope[scopeType].length > 0,
        );
    }, [activeScopeType, rolesByScope]);

    const availableRoles = useMemo(
        () => rolesByScope[effectiveScopeType] ?? [],
        [effectiveScopeType, rolesByScope],
    );

    const scopeTargetOptions = useMemo(() => {
        if (effectiveScopeType === "branch") {
            if (activeScopeType === "branch" && activeScopeId) {
                return branches.filter((branch) => branch.id === activeScopeId);
            }
            return branches;
        }
        if (effectiveScopeType === "class") {
            if (activeScopeType === "class" && activeScopeId) {
                return classes.filter((classSet) => classSet.id === activeScopeId);
            }
            return classes;
        }
        return [];
    }, [activeScopeId, activeScopeType, branches, classes, effectiveScopeType]);

    const branchActionOptions = useMemo(() => {
        if (activeScopeType === "branch" && activeScopeId) {
            return branches.filter((branch) => branch.id === activeScopeId);
        }
        if (activeScopeType === "class") {
            return [];
        }
        return branches;
    }, [activeScopeId, activeScopeType, branches]);

    useEffect(() => {
        if (!activeScopeType) {
            return;
        }
        setScope(activeScopeType);
        if (activeScopeType === "global") {
            setScopeTarget("");
            return;
        }
        setScopeTarget(activeScopeId ?? "");
    }, [activeScopeId, activeScopeType]);

    useEffect(() => {
        if (isScopeLocked) {
            return;
        }
        if (availableScopeTypes.length === 0) {
            return;
        }
        if (!availableScopeTypes.includes(scope)) {
            setScope(availableScopeTypes[0]);
        }
    }, [availableScopeTypes, isScopeLocked, scope]);

    const filteredMembers = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return members;
        }
        return members.filter((member) => {
            const haystack = [
                member.user.name,
                member.user.email,
                member.user.status,
                classMap.get(member.classMembership?.classId ?? ""),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return haystack.includes(query);
        });
    }, [members, search, classMap]);

    const selectedMember =
        members.find((member) => member.user.id === selectedMemberId) ??
        filteredMembers[0] ??
        members[0] ??
        undefined;

    const pagedMembers = useMemo(() => {
        const start = (membersPage - 1) * membersPageSize;
        return filteredMembers.slice(start, start + membersPageSize);
    }, [filteredMembers, membersPage, membersPageSize]);

    useEffect(() => {
        setMembersPage(1);
    }, [search]);

    useEffect(() => {
        const totalPages = Math.max(1, Math.ceil(filteredMembers.length / membersPageSize));
        if (membersPage > totalPages) {
            setMembersPage(totalPages);
        }
    }, [filteredMembers.length, membersPage, membersPageSize]);

    useEffect(() => {
        setClassChoice(selectedMember?.classMembership?.classId ?? classes[0]?.id ?? "");
    }, [selectedMember?.user.id, selectedMember?.classMembership?.classId, classes]);

    useEffect(() => {
        if (branchActionOptions.length === 0) {
            setBranchChoice("");
            return;
        }
        if (!branchActionOptions.some((branch) => branch.id === branchChoice)) {
            setBranchChoice(branchActionOptions[0]?.id ?? "");
        }
    }, [branchActionOptions, branchChoice]);

    useEffect(() => {
        if (effectiveScopeType === "global") {
            if (!isScopeLocked) {
                setScopeTarget("");
            }
            return;
        }
        if (isScopeLocked) {
            return;
        }
        if (!scopeTargetOptions.length) {
            setScopeTarget("");
            return;
        }
        if (!scopeTargetOptions.some((scopeItem) => scopeItem.id === scopeTarget)) {
            setScopeTarget(scopeTargetOptions[0]?.id ?? "");
        }
    }, [effectiveScopeType, isScopeLocked, scopeTargetOptions, scopeTarget]);

    useEffect(() => {
        if (!availableRoles.some((role) => role.code === roleCode)) {
            setRoleCode("");
        }
    }, [availableRoles, roleCode]);

    const updateMember = (userId: string, updater: (member: AdminMemberDTO) => AdminMemberDTO) => {
        setMembers((prev) => prev.map((member) => (member.user.id === userId ? updater(member) : member)));
    };

    const handleStatusChange = async (status: MemberStatus) => {
        if (!selectedMember) {
            return;
        }
        const action = status === "active" ? "approve" : "suspend";
        const proceed = window.confirm(
            `Are you sure you want to ${action} ${selectedMember.user.name}?`,
        );
        if (!proceed) {
            return;
        }
        try {
            setStatusLoading(true);
            setMessage(null);
            setError(null);
            const updated = await fetchJson<UserDTO>(buildScopedAdminMembersPath(
                `/admin/members/${selectedMember.user.id}/status`,
                activeScopeType,
                activeScopeId ?? undefined,
            ), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status }),
                token: authToken,
            });
            updateMember(updated.id, (member) => ({ ...member, user: updated }));
            setMessage(`Status set to ${capitalize(status)}.`);
        } catch (err) {
            setError(extractError(err));
        } finally {
            setStatusLoading(false);
        }
    };

    const handleAddBranchMembership = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedMember || !branchChoice) {
            setError("Select a branch first.");
            return;
        }
        try {
            setBranchLoading(true);
            setMessage(null);
            setError(null);
            const updated = await fetchJson<BranchMembershipDTO>(buildScopedAdminMembersPath(
                `/admin/members/${selectedMember.user.id}/branch`,
                activeScopeType,
                activeScopeId ?? undefined,
            ), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    branchId: branchChoice,
                    note: branchNote.trim() || null,
                }),
                token: authToken,
            });
            updateMember(selectedMember.user.id, (member) => {
                const existing = member.branchMemberships.find((item) => item.branchId === updated.branchId);
                if (existing) {
                    return {
                        ...member,
                        branchMemberships: member.branchMemberships.map((item) =>
                            item.branchId === updated.branchId ? updated : item,
                        ),
                    };
                }
                return {
                    ...member,
                    branchMemberships: [updated, ...member.branchMemberships],
                };
            });
            setMessage("Branch membership updated.");
            setBranchNote("");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setBranchLoading(false);
        }
    };

    const handleEndBranchMembership = async (membership: BranchMembershipDTO) => {
        if (!selectedMember) {
            return;
        }
        if (effectiveScopeType === "class") {
            setError("Branch membership updates are not allowed in class scope.");
            return;
        }
        if (membership.status === "ended") {
            return;
        }
        const branchName = branchMap.get(membership.branchId) ?? "this branch";
        const proceed = window.confirm(
            `End ${selectedMember.user.name}'s membership in ${branchName}?`,
        );
        if (!proceed) {
            return;
        }
        try {
            setEndingBranchId(membership.id);
            setMessage(null);
            setError(null);
            const updated = await fetchJson<BranchMembershipDTO>(buildScopedAdminMembersPath(
                `/admin/members/${selectedMember.user.id}/branch`,
                activeScopeType,
                activeScopeId ?? undefined,
            ), {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ branchId: membership.branchId }),
                token: authToken,
            });
            updateMember(selectedMember.user.id, (member) => ({
                ...member,
                branchMemberships: member.branchMemberships.map((item) =>
                    item.branchId === updated.branchId ? updated : item,
                ),
            }));
            setMessage("Branch membership ended.");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setEndingBranchId(null);
        }
    };

    const handleClassSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedMember || !classChoice) {
            return;
        }
        const className = classMap.get(classChoice) ?? "selected class";
        const proceed = window.confirm(`Move ${selectedMember.user.name} to ${className}?`);
        if (!proceed) {
            return;
        }
        const previousClassId = selectedMember.classMembership?.classId ?? null;
        try {
            setClassLoading(true);
            setMessage(null);
            setError(null);
            const updated = await fetchJson<ClassMembershipDTO>(buildScopedAdminMembersPath(
                `/admin/members/${selectedMember.user.id}/class`,
                activeScopeType,
                activeScopeId ?? undefined,
            ), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ classId: classChoice }),
                token: authToken,
            });
            updateMember(selectedMember.user.id, (member) => ({
                ...member,
                classMembership: updated,
                roleAssignments: member.roleAssignments.map((assignment) => {
                    if (
                        assignment.scopeType === "class" &&
                        previousClassId &&
                        assignment.scopeId === previousClassId
                    ) {
                        return { ...assignment, scopeId: updated.classId };
                    }
                    return assignment;
                }),
            }));
            setMessage("Class membership updated.");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setClassLoading(false);
        }
    };

    const handleClassReject = async () => {
        if (!selectedMember || !selectedMember.classMembership?.classId) {
            setError("Member has no class membership to reject.");
            return;
        }
        const className =
            classMap.get(selectedMember.classMembership.classId) ?? "their current class";
        const proceed = window.confirm(
            `Reject ${selectedMember.user.name} from ${className}? This removes class membership and class-scoped roles.`,
        );
        if (!proceed) {
            return;
        }
        try {
            setClassLoading(true);
            setMessage(null);
            setError(null);
            const result = await fetchJson<{ success: boolean; classId?: string | null }>(buildScopedAdminMembersPath(
                `/admin/members/${selectedMember.user.id}/class`,
                activeScopeType,
                activeScopeId ?? undefined,
            ), {
                method: "DELETE",
                token: authToken,
            });
            updateMember(selectedMember.user.id, (member) => ({
                ...member,
                classMembership: null,
                roleAssignments: member.roleAssignments.filter(
                    (assignment) =>
                        assignment.scopeType !== "class" ||
                        assignment.scopeId !== (result.classId ?? undefined),
                ),
            }));
            setMessage("Class membership rejected.");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setClassLoading(false);
        }
    };

    const handleAssignRole = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedMember || !roleCode) {
            return;
        }
        if (effectiveScopeType !== "global" && !effectiveScopeTarget) {
            setError("Choose a class or branch for this scope.");
            return;
        }
        try {
            setAssignLoading(true);
            setMessage(null);
            setError(null);
            const payload: {
                userId: string;
                roleCode: string;
                scopeType: ScopeType;
                scopeId?: string | null;
            } = {
                userId: selectedMember.user.id,
                roleCode,
                scopeType: effectiveScopeType,
                scopeId:
                    effectiveScopeType === "global"
                        ? null
                        : effectiveScopeTarget,
            };
            const assignment = await fetchJson<RoleAssignmentDTO>("/roles/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                token: authToken,
            });
            updateMember(selectedMember.user.id, (member) => ({
                ...member,
                roleAssignments: [assignment, ...(member.roleAssignments ?? [])],
            }));
            setMessage("Role assigned.");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setAssignLoading(false);
        }
    };

    const handleRemoveRole = async (assignment: RoleAssignmentDTO) => {
        const proceed = window.confirm("Remove this role assignment?");
        if (!proceed) {
            return;
        }
        try {
            setRemoveRoleId(assignment.id);
            setMessage(null);
            setError(null);
            await fetchJson<RoleAssignmentDTO>(`/roles/assignments/${assignment.id}`, {
                method: "DELETE",
                token: authToken,
            });
            updateMember(assignment.userId, (member) => ({
                ...member,
                roleAssignments: member.roleAssignments.filter((item) => item.id !== assignment.id),
            }));
            setMessage("Role removed.");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setRemoveRoleId(null);
        }
    };

    if (!selectedMember) {
        return <p className="text-sm text-slate-500">No members found.</p>;
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            <section className="surface-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">Members</h2>
                    <span className="text-xs uppercase tracking-[0.2em] text-red-700">{filteredMembers.length} total</span>
                </div>
                <label className="block pt-4 text-sm text-slate-600">
                    Search
                    <input
                        className="field-input mt-2 w-full"
                        placeholder="Search name or email"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                </label>
                <div className="mt-4 flex max-h-[520px] flex-col gap-2 overflow-y-auto">
                    {pagedMembers.map((member) => (
                        <button
                            key={member.user.id}
                            type="button"
                            onClick={() => setSelectedMemberId(member.user.id)}
                            className={`w-full text-left rounded-2xl border px-4 py-3 transition ${
                                member.user.id === selectedMemberId
                                    ? "border-red-200 bg-red-50"
                                    : "border-slate-100 hover:border-slate-200"
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold">{member.user.name}</p>
                                    <p className="text-xs text-slate-500">{member.user.email}</p>
                                </div>
                                <span className={`btn-pill ${statusPills[member.user.status]} border-transparent`}>
                                    {capitalize(member.user.status)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">
                                Class: {classMap.get(member.classMembership?.classId ?? "") ?? "Unassigned"}
                            </p>
                        </button>
                    ))}
                </div>
                <PaginationControls
                    page={membersPage}
                    pageSize={membersPageSize}
                    total={filteredMembers.length}
                    onPageChange={setMembersPage}
                    onPageSizeChange={(value) => {
                        setMembersPageSize(value);
                        setMembersPage(1);
                    }}
                />
            </section>

            <section className="space-y-4">
                {message && <p className="status-banner status-banner-success">{message}</p>}
                {error && <p className="status-banner status-banner-error">{error}</p>}
                {activeScopeType && (
                    <p className="status-banner">
                        Active scope: {activeScopeLabel}
                    </p>
                )}
                <div className="surface-card p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.2em] text-red-700">Member details</p>
                            <h2 className="text-2xl font-semibold text-slate-900">{selectedMember.user.name}</h2>
                            <p className="text-sm text-slate-500">{selectedMember.user.email}</p>
                        </div>
                        <span className={`btn-pill ${statusPills[selectedMember.user.status]} border-transparent`}>
                            {capitalize(selectedMember.user.status)}
                        </span>
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-100 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Class</p>
                            <p className="text-sm text-slate-900">
                                {selectedMember.classMembership?.classId
                                    ? resolveClassLabel(selectedMember.classMembership.classId)
                                    : "None"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 p-4">
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Branches</p>
                            <p className="text-sm text-slate-900">
                                {(() => {
                                    const approvedBranches = selectedMember.branchMemberships
                                        .filter((branch) => branch.status === "approved")
                                        .map((branch) => resolveBranchLabel(branch.branchId));
                                    return approvedBranches.length ? approvedBranches.join(", ") : "Pending";
                                })()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {tabs.map((entry) => (
                        <button
                            key={entry.key}
                            type="button"
                            className={`btn-pill text-sm ${
                                tab === entry.key
                                    ? "border-red-300 bg-red-100 text-red-800"
                                    : "border-slate-200 hover:border-slate-300"
                            }`}
                            onClick={() => setTab(entry.key)}
                        >
                            {entry.label}
                        </button>
                    ))}
                </div>

                {tab === "profile" && (
                    <div className="surface-card p-4">
                        <p className="text-sm text-slate-600">Full member profile</p>
                        <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                            <div className="rounded-2xl border border-slate-100 p-3">
                                <p><span className="font-semibold">Name:</span> {selectedMember.user.name}</p>
                                <p><span className="font-semibold">Email:</span> {selectedMember.user.email}</p>
                                <p><span className="font-semibold">Phone:</span> {selectedMember.user.phone ?? "N/A"}</p>
                                <p><span className="font-semibold">Status:</span> {capitalize(selectedMember.user.status)}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 p-3">
                                <p><span className="font-semibold">Title:</span> {selectedMember.profile?.title ?? "N/A"}</p>
                                <p><span className="font-semibold">First name:</span> {selectedMember.profile?.firstName ?? "N/A"}</p>
                                <p><span className="font-semibold">Middle name:</span> {selectedMember.profile?.middleName ?? "N/A"}</p>
                                <p><span className="font-semibold">Last name:</span> {selectedMember.profile?.lastName ?? "N/A"}</p>
                                <p><span className="font-semibold">Privacy:</span> {selectedMember.profile?.privacyLevel ?? "N/A"}</p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 p-3">
                                <p><span className="font-semibold">Date of birth:</span> {formatDob(selectedMember.profile)}</p>
                                <p><span className="font-semibold">Sex:</span> {selectedMember.profile?.sex ?? "N/A"}</p>
                                <p><span className="font-semibold">Occupation:</span> {selectedMember.profile?.occupation ?? "N/A"}</p>
                                <p>
                                    <span className="font-semibold">House:</span>{" "}
                                    {selectedMember.profile?.houseId
                                        ? resolveHouseLabel(selectedMember.profile.houseId)
                                        : "N/A"}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-slate-100 p-3">
                                <p><span className="font-semibold">State of origin:</span> {selectedMember.profile?.stateOfOrigin ?? "N/A"}</p>
                                <p><span className="font-semibold">LGA of origin:</span> {selectedMember.profile?.lgaOfOrigin ?? "N/A"}</p>
                                <p><span className="font-semibold">Residence:</span> {formatResidence(selectedMember.profile)}</p>
                            </div>
                        </div>
                        <div className="mt-4 rounded-2xl border border-slate-100 p-3">
                            <p className="text-sm font-semibold text-slate-800">Branch memberships</p>
                            <div className="mt-2 space-y-2">
                                {selectedMember.branchMemberships.length === 0 ? (
                                    <p className="text-sm text-slate-500">No branch memberships found.</p>
                                ) : (
                                    selectedMember.branchMemberships.map((membership) => (
                                        <div
                                            key={membership.id}
                                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2"
                                        >
                                            <div className="text-sm text-slate-700">
                                                <p className="font-medium">
                                                    {resolveBranchLabel(membership.branchId)}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Status: {capitalize(membership.status)} |
                                                    Requested: {formatDateOrFallback(membership.requestedAt)}
                                                    {membership.endedAt ? ` | Ended: ${formatDateOrFallback(membership.endedAt)}` : ""}
                                                </p>
                                            </div>
                                            {effectiveScopeType !== "class" && (
                                                <button
                                                    type="button"
                                                    className="btn-pill border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-70"
                                                    onClick={() => handleEndBranchMembership(membership)}
                                                    disabled={membership.status === "ended" || endingBranchId === membership.id}
                                                >
                                                    {endingBranchId === membership.id ? "Ending..." : membership.status === "ended" ? "Ended" : "End membership"}
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {tab === "roles" && (
                    <div className="surface-card p-4 space-y-3">
                        {selectedMember.roleAssignments.length === 0 ? (
                            <p className="text-sm text-slate-500">No assignments yet.</p>
                        ) : (
                            selectedMember.roleAssignments.map((assignment) => (
                                <div
                                    key={assignment.id}
                                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {roleNameMap.get(assignment.roleCode ?? "") ?? assignment.roleCode}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {assignment.scopeType} - Assigned{" "}
                                            {formatDate(assignment.startDate)}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-semibold uppercase text-slate-500">
                                            {assignment.scopeType}
                                        </span>
                                        <button
                                            type="button"
                                            className="btn-pill border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-70"
                                            onClick={() => handleRemoveRole(assignment)}
                                            disabled={removeRoleId === assignment.id}
                                        >
                                            {removeRoleId === assignment.id ? "Removing..." : "Remove"}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {tab === "actions" && (
                    <div className="space-y-3">
                        <div className="surface-card p-4">
                            <p className="text-sm text-slate-700">Status</p>
                            <div className="mt-3 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    className="btn-primary disabled:opacity-70"
                                    disabled={statusLoading || selectedMember.user.status === "active"}
                                    onClick={() => handleStatusChange("active")}
                                >
                                    {statusLoading ? "Saving..." : "Approve"}
                                </button>
                                <button
                                    type="button"
                                    className="btn-pill border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-70"
                                    disabled={statusLoading || selectedMember.user.status === "suspended"}
                                    onClick={() => handleStatusChange("suspended")}
                                >
                                    Suspend
                                </button>
                                <button
                                    type="button"
                                    className="btn-pill border-rose-300 bg-rose-100 text-rose-800 disabled:opacity-70"
                                    disabled={classLoading || !selectedMember.classMembership?.classId}
                                    onClick={handleClassReject}
                                >
                                    Reject class
                                </button>
                            </div>
                        </div>

                        {effectiveScopeType === "class" ? (
                            <div className="surface-card p-4 text-sm text-slate-600">
                                Branch updates are disabled in class scope.
                            </div>
                        ) : (
                            <form className="surface-card p-4" onSubmit={handleAddBranchMembership}>
                                <p className="text-sm text-slate-700">Add member to branch</p>
                                <div className="mt-3 grid gap-2 text-sm text-slate-600">
                                    <select
                                        className="field-input"
                                        value={branchChoice}
                                        onChange={(event) => setBranchChoice(event.target.value)}
                                        disabled={branchActionOptions.length === 0}
                                    >
                                        {branchActionOptions.length === 0 ? (
                                            <option value="">No branches available</option>
                                        ) : (
                                            <>
                                                <option value="">Select branch</option>
                                                {branchActionOptions.map((branch) => (
                                                    <option key={branch.id} value={branch.id}>
                                                        {branch.name}
                                                    </option>
                                                ))}
                                            </>
                                        )}
                                    </select>
                                    <textarea
                                        className="field-input min-h-[92px]"
                                        placeholder="Optional note"
                                        value={branchNote}
                                        onChange={(event) => setBranchNote(event.target.value)}
                                    />
                                    <button
                                        type="submit"
                                        className="btn-primary disabled:opacity-70"
                                        disabled={branchLoading || !branchChoice}
                                    >
                                        {branchLoading ? "Saving..." : "Add to branch"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {effectiveScopeType === "branch" ? (
                            <div className="surface-card p-4 text-sm text-slate-600">
                                Class updates are disabled in branch scope.
                            </div>
                        ) : (
                            <form className="surface-card p-4" onSubmit={handleClassSubmit}>
                                <p className="text-sm text-slate-700">Change class</p>
                                <div className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
                                    <select
                                        className="field-input"
                                        value={classChoice}
                                        onChange={(event) => setClassChoice(event.target.value)}
                                    >
                                        {classes
                                            .filter((classSet) =>
                                                effectiveScopeType === "class"
                                                    ? classSet.id === activeScopeId
                                                    : true,
                                            )
                                            .map((classSet) => (
                                                <option key={classSet.id} value={classSet.id}>
                                                    {classSet.label} ({classSet.entryYear})
                                                </option>
                                            ))}
                                    </select>
                                    <button
                                        type="submit"
                                        className="btn-primary disabled:opacity-70"
                                        disabled={classLoading}
                                    >
                                        {classLoading ? "Saving..." : "Update class"}
                                    </button>
                                </div>
                            </form>
                        )}

                        <form className="surface-card p-4" onSubmit={handleAssignRole}>
                            <p className="text-sm text-slate-700">Assign role</p>
                            <div className="mt-3 grid gap-2 text-sm">
                                <select
                                    className="field-input"
                                    value={effectiveScopeType}
                                    onChange={(event) => setScope(event.target.value as ScopeType)}
                                    disabled={isScopeLocked}
                                >
                                    {availableScopeTypes.map((scopeType) => (
                                        <option key={scopeType} value={scopeType}>
                                            {capitalize(scopeType)}
                                        </option>
                                    ))}
                                </select>
                                {(effectiveScopeType === "branch" || effectiveScopeType === "class") && (
                                    <select
                                        className="field-input"
                                        value={effectiveScopeTarget ?? ""}
                                        onChange={(event) => setScopeTarget(event.target.value)}
                                        disabled={isScopeLocked}
                                    >
                                        <option value="">Select {effectiveScopeType}</option>
                                        {scopeTargetOptions.map((scopeItem) => (
                                            <option key={scopeItem.id} value={scopeItem.id}>
                                                {"name" in scopeItem ? scopeItem.name : scopeItem.label}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <select
                                    className="field-input"
                                    value={roleCode}
                                    onChange={(event) => setRoleCode(event.target.value)}
                                >
                                    <option value="">Select role</option>
                                    {availableRoles.map((role) => (
                                        <option key={role.code} value={role.code}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    className="btn-primary disabled:opacity-70"
                                    disabled={assignLoading || !roleCode}
                                >
                                    {assignLoading ? "Saving..." : "Assign role"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </section>
        </div>
    );
}

function capitalize(value: string) {
    if (!value) {
        return value;
    }
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value?: string | null) {
    if (!value) {
        return "today";
    }
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
}

function formatDateOrFallback(value?: string | null) {
    if (!value) {
        return "N/A";
    }
    return formatDate(value);
}

function formatDob(profile: AdminMemberDTO["profile"]) {
    if (!profile) {
        return "N/A";
    }
    const day = profile.dobDay ? String(profile.dobDay).padStart(2, "0") : null;
    const month = profile.dobMonth ? String(profile.dobMonth).padStart(2, "0") : null;
    const year = profile.dobYear ? String(profile.dobYear) : null;
    const parts = [day, month, year].filter(Boolean);
    return parts.length ? parts.join("/") : "N/A";
}

function formatResidence(profile: AdminMemberDTO["profile"]) {
    if (!profile?.residence) {
        return "N/A";
    }
    const { houseNo, street, area, city, country } = profile.residence;
    const parts = [houseNo, street, area, city, country]
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value));
    return parts.length ? parts.join(", ") : "N/A";
}

function extractError(error: unknown) {
    if (error instanceof Error) {
        const match = error.message.match(/^API\s+(\d+):\s*(.*)$/i);
        if (!match) {
            return error.message;
        }
        const statusCode = Number(match[1]);
        const payload = match[2]?.trim();
        if (payload) {
            try {
                const parsed = JSON.parse(payload) as { message?: string };
                if (parsed?.message) {
                    if (
                        statusCode === 403 &&
                        parsed.message.toLowerCase().includes("branch updates require branch or global scope")
                    ) {
                        return "Branch membership updates are only available in branch or global scope.";
                    }
                    return parsed.message;
                }
            } catch {
                // fall through to generic message
            }
        }
        if (statusCode === 403) {
            return "You are not authorized to perform this action in the active scope.";
        }
        return error.message;
    }
    return "Unable to complete the request.";
}

function buildScopedAdminMembersPath(
    basePath: string,
    scopeType?: ScopeType,
    scopeId?: string,
) {
    const params = new URLSearchParams();
    if (scopeType) {
        params.set("scopeType", scopeType);
    }
    if (scopeId) {
        params.set("scopeId", scopeId);
    }
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
}

