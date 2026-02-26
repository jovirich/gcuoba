"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
    BranchDTO,
    ClassSetDTO,
    RoleAssignmentDTO,
    RoleDTO,
    UserDTO,
} from "@gcuoba/types";
import { fetchJson } from "@/lib/api";

type ScopeType = "global" | "branch" | "class";

type Props = {
    branches: BranchDTO[];
    classes: ClassSetDTO[];
    roles: RoleDTO[];
    members: UserDTO[];
    assignments: RoleAssignmentDTO[];
    authToken: string;
};

const scopeLabels: Record<ScopeType, string> = {
    global: "Global",
    branch: "Branch",
    class: "Class",
};

export function RoleAssignmentsPanel({
    branches,
    classes,
    roles,
    members,
    assignments,
    authToken,
}: Props) {
    const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? "");
    const [scopeType, setScopeType] = useState<ScopeType>("global");
    const [scopeId, setScopeId] = useState("");
    const [selectedRoleCode, setSelectedRoleCode] = useState("");
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [assignmentState, setAssignmentState] = useState(assignments);

    const rolesByScope = useMemo(() => {
        const grouped: Record<ScopeType, RoleDTO[]> = {
            global: [],
            branch: [],
            class: [],
        };
        roles.forEach((role) => {
            if (role.scope in grouped) {
                grouped[role.scope as ScopeType].push(role);
            }
        });
        return grouped;
    }, [roles]);

    const memberMap = useMemo(
        () => new Map(members.map((member) => [member.id, member])),
        [members],
    );
    const branchMap = useMemo(
        () => new Map(branches.map((branch) => [branch.id, branch.name])),
        [branches],
    );
    const classMap = useMemo(
        () => new Map(classes.map((classSet) => [classSet.id, classSet.label])),
        [classes],
    );
    const roleMap = useMemo(
        () => new Map(roles.map((role) => [role.code, role])),
        [roles],
    );

    useEffect(() => {
        setSelectedMemberId((current) =>
            current && members.some((member) => member.id === current)
                ? current
                : members[0]?.id ?? "",
        );
    }, [members]);

    useEffect(() => {
        const available = rolesByScope[scopeType];
        setSelectedRoleCode((current) => {
            if (current && available.some((role) => role.code === current)) {
                return current;
            }
            return available[0]?.code ?? "";
        });

        if (scopeType === "branch") {
            setScopeId((current) => current || (branches[0]?.id ?? ""));
        } else if (scopeType === "class") {
            setScopeId((current) => current || (classes[0]?.id ?? ""));
        } else {
            setScopeId("");
        }
    }, [scopeType, branches, classes, rolesByScope]);

    const availableRoles = rolesByScope[scopeType];

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedMemberId || !selectedRoleCode) {
            setError("Select a member and a role.");
            return;
        }
        if (scopeType !== "global" && !scopeId) {
            setError("Select a branch or class before assigning a scoped role.");
            return;
        }

        setSubmitting(true);
        setError(null);
        setMessage(null);
        try {
            const payload: {
                userId: string;
                roleCode: string;
                scopeType: ScopeType;
                scopeId?: string | null;
            } = {
                userId: selectedMemberId,
                roleCode: selectedRoleCode,
                scopeType,
            };
            if (scopeType !== "global") {
                payload.scopeId = scopeId;
            }
            const created = await fetchJson<RoleAssignmentDTO>("/roles/assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                token: authToken,
            });
            setAssignmentState((prev) => [created, ...prev]);
            const member = memberMap.get(created.userId);
            const role = roleMap.get(created.roleCode ?? selectedRoleCode);
            const descriptor =
                scopeType === "global"
                    ? "globally"
                    : `${scopeLabels[scopeType]}: ${
                          scopeType === "branch"
                              ? branchMap.get(scopeId) ?? "branch"
                              : classMap.get(scopeId) ?? "class"
                      }`;
            setMessage(
                `Assigned ${member?.name ?? member?.email ?? "member"} to ${
                    role?.name ?? role?.code ?? selectedRoleCode
                } (${descriptor}).`,
            );
        } catch (assignmentError) {
            setError(
                assignmentError instanceof Error
                    ? assignmentError.message
                    : "Failed to assign the selected role.",
            );
        } finally {
            setSubmitting(false);
        }
    };

    const recentAssignments = assignmentState.slice(0, 10);

    const formatScope = (item: RoleAssignmentDTO) => {
        if (item.scopeType === "global") {
            return "Global";
        }
        if (item.scopeType === "branch") {
            return branchMap.get(item.scopeId ?? "") ?? "Branch";
        }
        if (item.scopeType === "class") {
            return classMap.get(item.scopeId ?? "") ?? "Class";
        }
        return item.scopeType;
    };

    return (
        <section className="surface-card p-6 shadow-sm space-y-6">
            <header className="module-card-head">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#b9031b]">Role assignments</p>
                    <h2 className="module-title">Manage member roles</h2>
                    <p className="module-copy">
                        Assign class, branch, or global roles to members and keep a recent activity snapshot.
                    </p>
                </div>
            </header>

            {message && (
                <p className="status-banner status-banner-success whitespace-pre-wrap">{message}</p>
            )}
            {error && <p className="status-banner status-banner-error">{error}</p>}

            <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-3">
                <label className="space-y-1 text-sm text-slate-600">
                    Member
                    <select
                        className="field-input"
                        value={selectedMemberId}
                        onChange={(event) => setSelectedMemberId(event.target.value)}
                    >
                        <option value="">Select member</option>
                        {members.map((member) => (
                            <option key={member.id} value={member.id}>
                                {member.name ?? member.email}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="space-y-1 text-sm text-slate-600">
                    Scope type
                    <select
                        className="field-input"
                        value={scopeType}
                        onChange={(event) => setScopeType(event.target.value as ScopeType)}
                    >
                        {(Object.keys(scopeLabels) as ScopeType[]).map((type) => (
                            <option key={type} value={type}>
                                {scopeLabels[type]}
                            </option>
                        ))}
                    </select>
                </label>

                {(scopeType === "branch" || scopeType === "class") && (
                    <label className="space-y-1 text-sm text-slate-600">
                        {scopeType === "branch" ? "Branch" : "Class"}
                        <select
                            className="field-input"
                            value={scopeId}
                            onChange={(event) => setScopeId(event.target.value)}
                        >
                            <option value="">Select {scopeType}</option>
                            {(scopeType === "branch" ? branches : classes).map((scope) => (
                                <option key={scope.id} value={scope.id}>
                                    {"name" in scope ? scope.name : scope.label}
                                </option>
                            ))}
                        </select>
                    </label>
                )}

                <label className="space-y-1 text-sm text-slate-600">
                    Role
                    <select
                        className="field-input"
                        value={selectedRoleCode}
                        onChange={(event) => setSelectedRoleCode(event.target.value)}
                    >
                        <option value="">Select role</option>
                        {availableRoles.map((role) => (
                            <option key={role.code} value={role.code}>
                                {role.name}
                            </option>
                        ))}
                    </select>
                </label>

                <div className="lg:col-span-3">
                    <button
                        type="submit"
                        className="btn-primary disabled:opacity-70"
                        disabled={
                            submitting ||
                            !selectedMemberId ||
                            !selectedRoleCode ||
                            (scopeType !== "global" && !scopeId)
                        }
                    >
                        {submitting ? "Assigning..." : "Assign role"}
                    </button>
                </div>
            </form>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Recent assignments</p>
                    <p className="text-xs text-slate-500">
                        Showing {recentAssignments.length} of {assignmentState.length}
                    </p>
                </div>

                {recentAssignments.length === 0 ? (
                    <p className="text-sm text-slate-500">No assignments yet.</p>
                ) : (
                    <div className="table-wrap">
                        <table className="table-base">
                            <thead>
                                <tr>
                                    <th>Member</th>
                                    <th>Role</th>
                                    <th>Scope</th>
                                    <th>Assigned</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentAssignments.map((assignment) => {
                                    const member = memberMap.get(assignment.userId);
                                    const role = roleMap.get(assignment.roleCode ?? "");
                                    return (
                                        <tr key={assignment.id} className="table-row">
                                            <td>
                                                <p className="text-sm font-semibold">
                                                    {member?.name ?? member?.email ?? "Member"}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {member?.email}
                                                </p>
                                            </td>
                                            <td className="text-sm">{role?.name ?? assignment.roleCode}</td>
                                            <td className="text-sm">{formatScope(assignment)}</td>
                                            <td className="text-sm text-slate-500">
                                                {assignment.startDate
                                                    ? new Date(assignment.startDate).toLocaleDateString()
                                                    : "Now"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </section>
    );
}
