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

const claimStatusPills: Record<"claimed" | "unclaimed", string> = {
    claimed: "border-slate-200 bg-slate-50 text-slate-700",
    unclaimed: "border-rose-200 bg-rose-50 text-rose-700",
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
    const [deleteLoading, setDeleteLoading] = useState(false);
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
    const [profileEditLoading, setProfileEditLoading] = useState(false);
    const [profileEditMode, setProfileEditMode] = useState(false);
    const [profileEditForm, setProfileEditForm] = useState({
        title: "mr",
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phone: "",
        claimStatus: "" as "" | "claimed" | "unclaimed",
        dobDay: "",
        dobMonth: "",
        dobYear: "",
        sex: "",
        stateOfOrigin: "",
        lgaOfOrigin: "",
        occupation: "",
        houseId: "",
        privacyLevel: "public_to_members" as "public" | "public_to_members" | "private",
    });
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
    const resolveClaimStatus = useCallback((member: AdminMemberDTO): "claimed" | "unclaimed" | null => {
        return normalizeClaimStatus(member.user.claimStatus);
    }, []);
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
        setMembers(initialMembers);
    }, [initialMembers]);

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

    useEffect(() => {
        if (!selectedMember) {
            return;
        }
        setProfileEditMode(false);
        setProfileEditForm({
            title: selectedMember.profile?.title ?? "mr",
            firstName: selectedMember.profile?.firstName ?? selectedMember.user.name.split(" ")[0] ?? "",
            middleName: selectedMember.profile?.middleName ?? "",
            lastName:
                selectedMember.profile?.lastName ??
                selectedMember.user.name.split(" ").slice(-1).join(" ") ??
                "",
            email: selectedMember.user.email ?? "",
            phone: selectedMember.user.phone ?? "",
            claimStatus: normalizeClaimStatus(selectedMember.user.claimStatus) ?? "",
            dobDay: selectedMember.profile?.dobDay ? String(selectedMember.profile.dobDay) : "",
            dobMonth: selectedMember.profile?.dobMonth ? String(selectedMember.profile.dobMonth) : "",
            dobYear: selectedMember.profile?.dobYear ? String(selectedMember.profile.dobYear) : "",
            sex: selectedMember.profile?.sex ?? "",
            stateOfOrigin: selectedMember.profile?.stateOfOrigin ?? "",
            lgaOfOrigin: selectedMember.profile?.lgaOfOrigin ?? "",
            occupation: selectedMember.profile?.occupation ?? "",
            houseId: selectedMember.profile?.houseId ?? "",
            privacyLevel: selectedMember.profile?.privacyLevel ?? "public_to_members",
        });
    }, [selectedMember]);

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

    const handleProfileEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedMember) {
            return;
        }
        const proceed = window.confirm(`Save profile changes for ${selectedMember.user.name}?`);
        if (!proceed) {
            return;
        }
        try {
            setProfileEditLoading(true);
            setMessage(null);
            setError(null);
            const updated = await fetchJson<AdminMemberDTO>(
                buildScopedAdminMembersPath(
                    `/admin/members/${selectedMember.user.id}`,
                    activeScopeType,
                    activeScopeId ?? undefined,
                ),
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        title: profileEditForm.title,
                        firstName: profileEditForm.firstName,
                        middleName: profileEditForm.middleName || null,
                        lastName: profileEditForm.lastName,
                        email: profileEditForm.email,
                        phone: profileEditForm.phone || null,
                        claimStatus: profileEditForm.claimStatus || null,
                        dobDay: profileEditForm.dobDay || null,
                        dobMonth: profileEditForm.dobMonth || null,
                        dobYear: profileEditForm.dobYear || null,
                        sex: profileEditForm.sex || null,
                        stateOfOrigin: profileEditForm.stateOfOrigin || null,
                        lgaOfOrigin: profileEditForm.lgaOfOrigin || null,
                        occupation: profileEditForm.occupation || null,
                        houseId: profileEditForm.houseId || null,
                        privacyLevel: profileEditForm.privacyLevel,
                    }),
                    token: authToken,
                },
            );
            updateMember(selectedMember.user.id, () => updated);
            setMessage("Member profile updated.");
            setProfileEditMode(false);
        } catch (err) {
            setError(extractError(err));
        } finally {
            setProfileEditLoading(false);
        }
    };

    const handleDeleteImportedMember = async () => {
        if (!selectedMember) {
            return;
        }
        if (resolveClaimStatus(selectedMember) !== "unclaimed") {
            setError("Only imported members that are still unclaimed can be deleted.");
            return;
        }
        const proceed = window.confirm(
            `Delete ${selectedMember.user.name}? This action cannot be undone.`,
        );
        if (!proceed) {
            return;
        }
        try {
            setDeleteLoading(true);
            setMessage(null);
            setError(null);
            const result = await fetchJson<{ success: true; userId: string }>(
                buildScopedAdminMembersPath(
                    `/admin/members/${selectedMember.user.id}`,
                    activeScopeType,
                    activeScopeId ?? undefined,
                ),
                {
                    method: "DELETE",
                    token: authToken,
                },
            );
            setMembers((prev) => {
                const next = prev.filter((entry) => entry.user.id !== result.userId);
                setSelectedMemberId((current) =>
                    current === result.userId ? (next[0]?.user.id ?? "") : current,
                );
                return next;
            });
            setMessage("Imported unclaimed member deleted.");
        } catch (err) {
            setError(extractError(err));
        } finally {
            setDeleteLoading(false);
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
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`btn-pill ${statusPills[member.user.status]} border-transparent`}>
                                        {capitalize(member.user.status)}
                                    </span>
                                    {resolveClaimStatus(member) && (
                                        <span
                                            className={`btn-pill ${claimStatusPills[resolveClaimStatus(member)!]} border-transparent`}
                                        >
                                            {capitalize(resolveClaimStatus(member)!)}
                                        </span>
                                    )}
                                </div>
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
                        <div className="flex flex-col items-end gap-2">
                            <span className={`btn-pill ${statusPills[selectedMember.user.status]} border-transparent`}>
                                Status: {capitalize(selectedMember.user.status)}
                            </span>
                            {resolveClaimStatus(selectedMember) && (
                                <span
                                    className={`btn-pill ${claimStatusPills[resolveClaimStatus(selectedMember)!]} border-transparent`}
                                >
                                    Claim: {capitalize(resolveClaimStatus(selectedMember)!)}
                                </span>
                            )}
                        </div>
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
                    <div className="space-y-3">
                        <div className="surface-card p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-slate-700">Member profile</p>
                                {profileEditMode ? (
                                    <button
                                        type="button"
                                        className="btn-pill border-slate-200 text-slate-700"
                                        onClick={() => setProfileEditMode(false)}
                                        disabled={profileEditLoading}
                                    >
                                        Cancel edit
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={() => setProfileEditMode(true)}
                                    >
                                        Edit profile
                                    </button>
                                )}
                            </div>
                            <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                                <div className="rounded-2xl border border-slate-100 p-3">
                                    <p><span className="font-semibold">Name:</span> {selectedMember.user.name}</p>
                                    <p><span className="font-semibold">Email:</span> {selectedMember.user.email}</p>
                                    <p><span className="font-semibold">Phone:</span> {selectedMember.user.phone ?? "N/A"}</p>
                                    {resolveClaimStatus(selectedMember) && (
                                        <p><span className="font-semibold">Claim status:</span> {capitalize(resolveClaimStatus(selectedMember)!)}</p>
                                    )}
                                </div>
                                <div className="rounded-2xl border border-slate-100 p-3">
                                    <p><span className="font-semibold">Class:</span> {selectedMember.classMembership?.classId ? resolveClassLabel(selectedMember.classMembership.classId) : "Unassigned"}</p>
                                    <p><span className="font-semibold">House:</span> {selectedMember.profile?.houseId ? resolveHouseLabel(selectedMember.profile.houseId) : "N/A"}</p>
                                    <p><span className="font-semibold">Occupation:</span> {selectedMember.profile?.occupation ?? "N/A"}</p>
                                    <p><span className="font-semibold">Privacy:</span> {selectedMember.profile?.privacyLevel ?? "N/A"}</p>
                                </div>
                            </div>
                        </div>
                        {profileEditMode && (
                        <form className="surface-card p-4" onSubmit={handleProfileEditSubmit}>
                            <p className="text-sm text-slate-700">Edit member profile</p>
                            <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                                <label className="text-slate-600">
                                    Title
                                    <select
                                        className="field-input"
                                        value={profileEditForm.title}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, title: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    >
                                        <option value="mr">Mr</option>
                                        <option value="mrs">Mrs</option>
                                        <option value="ms">Ms</option>
                                        <option value="dr">Dr</option>
                                        <option value="prof">Prof</option>
                                        <option value="chief">Chief</option>
                                    </select>
                                </label>
                                <label className="text-slate-600">
                                    First name
                                    <input
                                        className="field-input"
                                        value={profileEditForm.firstName}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, firstName: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    Middle name
                                    <input
                                        className="field-input"
                                        value={profileEditForm.middleName}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, middleName: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600 md:col-span-2">
                                    Last name
                                    <input
                                        className="field-input"
                                        value={profileEditForm.lastName}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, lastName: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    Claim status
                                    <select
                                        className="field-input"
                                        value={profileEditForm.claimStatus}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({
                                                ...prev,
                                                claimStatus: event.target.value as "claimed" | "unclaimed",
                                            }))
                                        }
                                        disabled={profileEditLoading}
                                    >
                                        <option value="">Not applicable</option>
                                        <option value="claimed">Claimed</option>
                                        <option value="unclaimed">Unclaimed</option>
                                    </select>
                                </label>
                                <label className="text-slate-600 md:col-span-2">
                                    Email
                                    <input
                                        className="field-input"
                                        value={profileEditForm.email}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, email: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    Phone
                                    <input
                                        className="field-input"
                                        value={profileEditForm.phone}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, phone: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    Class
                                    <input
                                        className="field-input"
                                        value={
                                            selectedMember.classMembership?.classId
                                                ? resolveClassLabel(selectedMember.classMembership.classId)
                                                : "Unassigned"
                                        }
                                        disabled
                                    />
                                </label>
                                <label className="text-slate-600">
                                    House
                                    <select
                                        className="field-input"
                                        value={profileEditForm.houseId}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, houseId: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    >
                                        <option value="">No house</option>
                                        {houses.map((house) => (
                                            <option key={house.id} value={house.id}>
                                                {house.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-slate-600">
                                    Privacy
                                    <select
                                        className="field-input"
                                        value={profileEditForm.privacyLevel}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({
                                                ...prev,
                                                privacyLevel: event.target.value as
                                                    | "public"
                                                    | "public_to_members"
                                                    | "private",
                                            }))
                                        }
                                        disabled={profileEditLoading}
                                    >
                                        <option value="public">Public</option>
                                        <option value="public_to_members">Visible to members</option>
                                        <option value="private">Private</option>
                                    </select>
                                </label>
                                <label className="text-slate-600">
                                    DOB day
                                    <input
                                        type="number"
                                        min={1}
                                        max={31}
                                        className="field-input"
                                        value={profileEditForm.dobDay}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, dobDay: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    DOB month
                                    <input
                                        type="number"
                                        min={1}
                                        max={12}
                                        className="field-input"
                                        value={profileEditForm.dobMonth}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, dobMonth: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    DOB year
                                    <input
                                        type="number"
                                        min={1900}
                                        max={2100}
                                        className="field-input"
                                        value={profileEditForm.dobYear}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, dobYear: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    Sex
                                    <input
                                        className="field-input"
                                        value={profileEditForm.sex}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, sex: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    Occupation
                                    <input
                                        className="field-input"
                                        value={profileEditForm.occupation}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, occupation: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    State of origin
                                    <input
                                        className="field-input"
                                        value={profileEditForm.stateOfOrigin}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, stateOfOrigin: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                                <label className="text-slate-600">
                                    LGA of origin
                                    <input
                                        className="field-input"
                                        value={profileEditForm.lgaOfOrigin}
                                        onChange={(event) =>
                                            setProfileEditForm((prev) => ({ ...prev, lgaOfOrigin: event.target.value }))
                                        }
                                        disabled={profileEditLoading}
                                    />
                                </label>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    type="submit"
                                    className="btn-primary disabled:opacity-70"
                                    disabled={profileEditLoading}
                                >
                                    {profileEditLoading ? "Saving..." : "Save profile changes"}
                                </button>
                            </div>
                        </form>
                        )}

                        <div className="surface-card p-4">
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
                                                <p className="font-medium">{resolveBranchLabel(membership.branchId)}</p>
                                                <p className="text-xs text-slate-500">
                                                    Status: {capitalize(membership.status)} | Requested:{" "}
                                                    {formatDateOrFallback(membership.requestedAt)}
                                                    {membership.endedAt
                                                        ? ` | Ended: ${formatDateOrFallback(membership.endedAt)}`
                                                        : ""}
                                                </p>
                                            </div>
                                            {effectiveScopeType !== "class" && (
                                                <button
                                                    type="button"
                                                    className="btn-pill border-rose-200 bg-rose-50 text-rose-700 disabled:opacity-70"
                                                    onClick={() => handleEndBranchMembership(membership)}
                                                    disabled={membership.status === "ended" || endingBranchId === membership.id}
                                                >
                                                    {endingBranchId === membership.id
                                                        ? "Ending..."
                                                        : membership.status === "ended"
                                                          ? "Ended"
                                                          : "End membership"}
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
                                {resolveClaimStatus(selectedMember) === "unclaimed" && (
                                    <button
                                        type="button"
                                        className="btn-pill border-rose-300 bg-rose-100 text-rose-800 disabled:opacity-70"
                                        disabled={deleteLoading}
                                        onClick={handleDeleteImportedMember}
                                    >
                                        {deleteLoading ? "Deleting..." : "Delete imported member"}
                                    </button>
                                )}
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

function normalizeClaimStatus(value?: string | null): "claimed" | "unclaimed" | null {
    if (!value) {
        return null;
    }
    const normalized = `${value}`.trim().toLowerCase();
    if (normalized === "claimed" || normalized === "unclaimed") {
        return normalized;
    }
    return null;
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

