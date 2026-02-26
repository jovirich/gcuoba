import type { AdminMemberDTO, BranchDTO, ClassSetDTO, RoleDTO } from "@gcuoba/types";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { fetchJson } from "@/lib/api";
import { MemberManagementPanel } from "./member-management-panel";

type ScopeType = "global" | "branch" | "class";

type MembersManagementPageProps = {
    searchParams?: Promise<{ scopeType?: string; scopeId?: string }>;
};

export default async function MembersManagementPage({
    searchParams,
}: MembersManagementPageProps) {
    const session = await getServerSession(authOptions);
    const user = session?.user as
        | { id?: string; name?: string; token?: string; status?: string }
        | undefined;
    if (!user?.id || !user?.token) {
        redirect("/login");
    }
    if (user.status !== "active") {
        redirect("/profile?pending=1");
    }
    const params = searchParams ? await searchParams : undefined;
    const scopeType = normalizeScopeType(params?.scopeType);
    const scopeId = params?.scopeId?.trim() || undefined;
    const scopedMembersPath = buildScopedPath("/admin/members", scopeType, scopeId);

    const [members, branches, classes, roles] = await Promise.all([
        fetchJson<AdminMemberDTO[]>(scopedMembersPath, { token: user.token }),
        fetchJson<BranchDTO[]>("/branches", { token: user.token }),
        fetchJson<ClassSetDTO[]>("/classes", { token: user.token }),
        fetchJson<RoleDTO[]>("/roles", { token: user.token }),
    ]);

    return (
        <div className="admin-page space-y-8">
            <header className="admin-page-header">
                <p className="admin-page-kicker">Member management</p>
                <h1 className="admin-page-title">Member lifecycle & assignments</h1>
                <p className="admin-page-subtitle">
                    View profiles, approve or suspend members, change class membership, and assign executive roles from one
                    centralized console.
                </p>
            </header>
            <MemberManagementPanel
                members={members}
                branches={branches}
                classes={classes}
                roles={roles}
                authToken={user.token}
                activeScopeType={scopeType}
                activeScopeId={scopeId ?? null}
            />
        </div>
    );
}

function normalizeScopeType(value?: string): ScopeType | undefined {
    if (value === "global" || value === "branch" || value === "class") {
        return value;
    }
    return undefined;
}

function buildScopedPath(
    path: string,
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
    return query ? `${path}?${query}` : path;
}
