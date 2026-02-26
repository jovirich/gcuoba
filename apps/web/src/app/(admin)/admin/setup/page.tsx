import type {
    BranchDTO,
    ClassSetDTO,
    CountryDTO,
    HouseDTO,
    RoleAssignmentDTO,
    RoleDTO,
    RoleFeatureDTO,
    UserDTO,
} from "@gcuoba/types";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { fetchJson } from "@/lib/api";
import { RoleAssignmentsPanel } from "./role-assignments-panel";
import { SetupPanel } from "./setup-panel";

export default async function SetupPage() {
    const session = await getServerSession(authOptions);
    const sessionUser = session?.user as
        | { id?: string; token?: string; status?: string }
        | undefined;
    if (!sessionUser?.id || !sessionUser.token) {
        redirect("/login");
    }
    if (sessionUser.status !== "active") {
        redirect("/profile?pending=1");
    }

    const [
        branches,
        classes,
        houses,
        countries,
        roles,
        roleFeatures,
        featureModules,
        members,
        assignments,
    ] = await Promise.all([
        fetchJson<BranchDTO[]>("/branches", { token: sessionUser.token }),
        fetchJson<ClassSetDTO[]>("/classes", { token: sessionUser.token }),
        fetchJson<HouseDTO[]>("/houses", { token: sessionUser.token }),
        fetchJson<CountryDTO[]>("/countries", { token: sessionUser.token }),
        fetchJson<RoleDTO[]>("/roles", { token: sessionUser.token }),
        fetchJson<RoleFeatureDTO[]>("/roles/features", { token: sessionUser.token }),
        fetchJson<Array<{ key: string; label: string }>>("/roles/feature-modules", {
            token: sessionUser.token,
        }),
        fetchJson<UserDTO[]>("/users", { token: sessionUser.token }),
        fetchJson<RoleAssignmentDTO[]>("/roles/assignments", {
            token: sessionUser.token,
        }),
    ]);

    return (
        <div className="admin-page space-y-8">
            <header className="admin-page-header">
                <p className="admin-page-kicker">Setup</p>
                <h1 className="admin-page-title">Setup datasets and member roles</h1>
                <p className="admin-page-subtitle">
                    Manage core datasets (countries, branches, classes, houses) and role permissions.
                </p>
            </header>
            <SetupPanel
                branches={branches}
                classes={classes}
                houses={houses}
                countries={countries}
                roles={roles}
                roleFeatures={roleFeatures}
                featureModules={featureModules}
                authToken={sessionUser.token}
            />
            <RoleAssignmentsPanel
                assignments={assignments}
                branches={branches}
                classes={classes}
                members={members}
                roles={roles}
                authToken={sessionUser.token}
            />
        </div>
    );
}

