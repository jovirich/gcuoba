import type { AdminMemberDTO, BranchDTO, ClassSetDTO, HouseDTO, RoleDTO } from "@gcuoba/types";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { fetchJson, isApiErrorStatus } from "@/lib/api";
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

    let members: AdminMemberDTO[];
    let branches: BranchDTO[];
    let classes: ClassSetDTO[];
    let roles: RoleDTO[];
    let houses: HouseDTO[];
    try {
        [members, branches, classes, roles, houses] = await Promise.all([
            fetchJson<AdminMemberDTO[]>(scopedMembersPath, { token: user.token }),
            fetchJson<BranchDTO[]>("/branches", { token: user.token }),
            fetchJson<ClassSetDTO[]>("/classes", { token: user.token }),
            fetchJson<RoleDTO[]>("/roles", { token: user.token }),
            fetchJson<HouseDTO[]>("/houses", { token: user.token }),
        ]);
    } catch (error) {
        if (isApiErrorStatus(error, 403)) {
            redirect("/admin");
        }
        throw error;
    }

    return (
        <div className="admin-page space-y-8">
            <header className="admin-page-header">
                <p className="admin-page-kicker">Member management</p>
                <h1 className="admin-page-title">Member lifecycle & assignments</h1>
                <p className="admin-page-subtitle">
                    View profiles, approve or suspend members, reject class membership where needed, and assign executive roles from one
                    centralized console.
                </p>
            </header>
            <MemberManagementPanel
                members={members}
                branches={branches}
                classes={classes}
                houses={houses}
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
