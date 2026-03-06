"use client";

import type {
    BranchDTO,
    ClassSetDTO,
    CountryDTO,
    HouseDTO,
    RoleDTO,
    RoleFeatureDTO,
} from "@gcuoba/types";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/api";
import { PaginationControls } from "@/components/ui/pagination-controls";

type Props = {
    branches: BranchDTO[];
    classes: ClassSetDTO[];
    houses: HouseDTO[];
    countries: CountryDTO[];
    roles: RoleDTO[];
    roleFeatures: RoleFeatureDTO[];
    featureModules: Array<{ key: string; label: string }>;
    authToken: string;
};

type BranchForm = {
    id?: string;
    name: string;
    country: string;
};

type ClassForm = {
    id?: string;
    label: string;
    entryYear: string;
    status: "active" | "inactive";
};

type HouseForm = {
    id?: string;
    name: string;
    motto: string;
};

type CountryForm = {
    id?: string;
    name: string;
    isoCode: string;
};

type ReferenceTabKey =
    | "branches"
    | "countries"
    | "classes"
    | "houses"
    | "role-features";

export function SetupPanel({
    branches,
    classes,
    houses,
    countries,
    roles,
    roleFeatures,
    featureModules,
    authToken,
}: Props) {
    const router = useRouter();
    const [branchList, setBranchList] = useState(branches);
    const [classList, setClassList] = useState(classes);
    const [houseList, setHouseList] = useState(houses);
    const [countryList, setCountryList] = useState(countries);
    const [roleList] = useState(roles);
    const [roleFeatureList, setRoleFeatureList] = useState(roleFeatures);
    const [selectedRoleId, setSelectedRoleId] = useState(
        roles.find((role) => role.scope === "global")?.id ?? roles[0]?.id ?? "",
    );
    const [branchForm, setBranchForm] = useState<BranchForm>({
        name: "",
        country: "",
    });
    const [classForm, setClassForm] = useState<ClassForm>({
        label: "",
        entryYear: new Date().getFullYear().toString(),
        status: "active",
    });
    const [houseForm, setHouseForm] = useState<HouseForm>({
        name: "",
        motto: "",
    });
    const [countryForm, setCountryForm] = useState<CountryForm>({
        name: "",
        isoCode: "",
    });
    const [activeTab, setActiveTab] = useState<ReferenceTabKey>("branches");
    const [message, setMessage] = useState<string | null>(null);
    const [branchQuery, setBranchQuery] = useState("");
    const [branchPage, setBranchPage] = useState(1);
    const [branchPageSize, setBranchPageSize] = useState(10);
    const [countryQuery, setCountryQuery] = useState("");
    const [countryPage, setCountryPage] = useState(1);
    const [countryPageSize, setCountryPageSize] = useState(10);
    const [classQuery, setClassQuery] = useState("");
    const [classPage, setClassPage] = useState(1);
    const [classPageSize, setClassPageSize] = useState(10);
    const [houseQuery, setHouseQuery] = useState("");
    const [housePage, setHousePage] = useState(1);
    const [housePageSize, setHousePageSize] = useState(10);
    const [featureQuery, setFeatureQuery] = useState("");
    const [featurePage, setFeaturePage] = useState(1);
    const [featurePageSize, setFeaturePageSize] = useState(20);

    const resetClassForm = () =>
        setClassForm({
            label: "",
            entryYear: new Date().getFullYear().toString(),
            status: "active",
        });

    function showError(error: unknown, fallback: string) {
        setMessage(error instanceof Error ? error.message : fallback);
    }

    async function handleBranchSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        const payload = {
            name: branchForm.name.trim(),
            country: branchForm.country.trim() || undefined,
        };
        const isUpdate = Boolean(branchForm.id);
        const path = isUpdate ? `/branches/${branchForm.id}` : "/branches";
        try {
            const saved = await fetchJson<BranchDTO>(path, {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                token: authToken,
            });
            setBranchList((prev) => {
                if (isUpdate) {
                    return prev.map((item) =>
                        item.id === saved.id ? saved : item,
                    );
                }
                return [saved, ...prev];
            });
            setBranchForm({ name: "", country: "" });
            router.refresh();
        } catch (error) {
            showError(error, "Unable to save branch.");
        }
    }

    async function handleBranchDelete(id: string) {
        const branchName =
            branchList.find((item) => item.id === id)?.name ?? "this branch";
        const proceed = window.confirm(
            `Delete ${branchName}? This action cannot be undone.`,
        );
        if (!proceed) {
            return;
        }
        setMessage(null);
        try {
            await fetchJson(`/branches/${id}`, {
                method: "DELETE",
                token: authToken,
            });
            setBranchList((prev) => prev.filter((item) => item.id !== id));
            if (branchForm.id === id) {
                setBranchForm({ name: "", country: "" });
            }
            router.refresh();
        } catch (error) {
            showError(error, "Unable to delete branch.");
        }
    }

    async function handleClassSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        const payload = {
            label: classForm.label.trim(),
            entryYear: Number(classForm.entryYear),
            status: classForm.status,
        };
        const isUpdate = Boolean(classForm.id);
        const path = isUpdate ? `/classes/${classForm.id}` : "/classes";
        try {
            const saved = await fetchJson<ClassSetDTO>(path, {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                token: authToken,
            });
            setClassList((prev) => {
                if (isUpdate) {
                    return prev.map((item) =>
                        item.id === saved.id ? saved : item,
                    );
                }
                return [saved, ...prev];
            });
            resetClassForm();
            router.refresh();
        } catch (error) {
            showError(error, "Unable to save class.");
        }
    }

    async function handleClassDelete(id: string) {
        const classLabel =
            classList.find((item) => item.id === id)?.label ?? "this class";
        const proceed = window.confirm(
            `Delete ${classLabel}? This action cannot be undone.`,
        );
        if (!proceed) {
            return;
        }
        setMessage(null);
        try {
            await fetchJson(`/classes/${id}`, {
                method: "DELETE",
                token: authToken,
            });
            setClassList((prev) => prev.filter((item) => item.id !== id));
            if (classForm.id === id) {
                resetClassForm();
            }
            router.refresh();
        } catch (error) {
            showError(error, "Unable to delete class.");
        }
    }

    async function handleHouseSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setMessage(null);
        const payload = {
            name: houseForm.name.trim(),
            motto: houseForm.motto.trim() || undefined,
        };
        const isUpdate = Boolean(houseForm.id);
        const path = isUpdate ? `/houses/${houseForm.id}` : "/houses";
        try {
            const saved = await fetchJson<HouseDTO>(path, {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                token: authToken,
            });
            setHouseList((prev) => {
                if (isUpdate) {
                    return prev.map((item) =>
                        item.id === saved.id ? saved : item,
                    );
                }
                return [saved, ...prev];
            });
            setHouseForm({ name: "", motto: "" });
            router.refresh();
        } catch (error) {
            showError(error, "Unable to save house.");
        }
    }

    async function handleHouseDelete(id: string) {
        const houseName =
            houseList.find((item) => item.id === id)?.name ?? "this house";
        const proceed = window.confirm(
            `Delete ${houseName}? This action cannot be undone.`,
        );
        if (!proceed) {
            return;
        }
        setMessage(null);
        try {
            await fetchJson(`/houses/${id}`, {
                method: "DELETE",
                token: authToken,
            });
            setHouseList((prev) => prev.filter((item) => item.id !== id));
            if (houseForm.id === id) {
                setHouseForm({ name: "", motto: "" });
            }
            router.refresh();
        } catch (error) {
            showError(error, "Unable to delete house.");
        }
    }

    async function handleCountrySubmit(
        event: React.FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();
        setMessage(null);
        const payload = {
            name: countryForm.name.trim(),
            isoCode: countryForm.isoCode.trim() || undefined,
        };
        const isUpdate = Boolean(countryForm.id);
        const path = isUpdate ? `/countries/${countryForm.id}` : "/countries";
        try {
            const saved = await fetchJson<CountryDTO>(path, {
                method: isUpdate ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                token: authToken,
            });
            setCountryList((prev) => {
                if (isUpdate) {
                    return prev.map((item) =>
                        item.id === saved.id ? saved : item,
                    );
                }
                return [...prev, saved].sort((a, b) =>
                    a.name.localeCompare(b.name),
                );
            });
            setCountryForm({ name: "", isoCode: "" });
            router.refresh();
        } catch (error) {
            showError(error, "Unable to save country.");
        }
    }

    async function handleCountryDelete(id: string) {
        const countryName =
            countryList.find((item) => item.id === id)?.name ?? "this country";
        const proceed = window.confirm(
            `Delete ${countryName}? This action cannot be undone.`,
        );
        if (!proceed) {
            return;
        }
        setMessage(null);
        try {
            await fetchJson(`/countries/${id}`, {
                method: "DELETE",
                token: authToken,
            });
            setCountryList((prev) => prev.filter((item) => item.id !== id));
            if (countryForm.id === id) {
                setCountryForm({ name: "", isoCode: "" });
            }
            router.refresh();
        } catch (error) {
            showError(error, "Unable to delete country.");
        }
    }

    async function handleRoleFeatureChange(moduleKey: string, allowed: boolean) {
        if (!selectedRoleId) {
            return;
        }
        const roleName =
            roleList.find((role) => role.id === selectedRoleId)?.name ?? "selected role";
        const actionLabel = allowed ? "enable" : "disable";
        const proceed = window.confirm(
            `Confirm ${actionLabel} access to "${moduleKey}" for ${roleName}?`,
        );
        if (!proceed) {
            return;
        }
        setMessage(null);
        try {
            const saved = await fetchJson<RoleFeatureDTO>(
                `/roles/${selectedRoleId}/features/${moduleKey}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ allowed }),
                    token: authToken,
                },
            );
            setRoleFeatureList((prev) => {
                const withoutCurrent = prev.filter(
                    (feature) =>
                        !(
                            feature.roleId === selectedRoleId &&
                            feature.moduleKey === moduleKey
                        ),
                );
                return [...withoutCurrent, saved];
            });
        } catch (error) {
            showError(error, "Unable to update role feature.");
        }
    }

    const selectedRoleFeatures = roleFeatureList.filter(
        (feature) => feature.roleId === selectedRoleId,
    );
    const selectedRoleFeatureMap = new Map(
        selectedRoleFeatures.map((feature) => [feature.moduleKey, feature]),
    );

    const filteredBranches = useMemo(() => {
        const q = branchQuery.trim().toLowerCase();
        if (!q) {
            return branchList;
        }
        return branchList.filter(
            (branch) =>
                branch.name.toLowerCase().includes(q) ||
                (branch.country ?? "").toLowerCase().includes(q),
        );
    }, [branchList, branchQuery]);
    const branchPageItems = filteredBranches.slice(
        (branchPage - 1) * branchPageSize,
        branchPage * branchPageSize,
    );

    const filteredCountries = useMemo(() => {
        const q = countryQuery.trim().toLowerCase();
        if (!q) {
            return countryList;
        }
        return countryList.filter(
            (country) =>
                country.name.toLowerCase().includes(q) ||
                (country.isoCode ?? "").toLowerCase().includes(q),
        );
    }, [countryList, countryQuery]);
    const countryPageItems = filteredCountries.slice(
        (countryPage - 1) * countryPageSize,
        countryPage * countryPageSize,
    );

    const filteredClasses = useMemo(() => {
        const q = classQuery.trim().toLowerCase();
        if (!q) {
            return classList;
        }
        return classList.filter(
            (classSet) =>
                classSet.label.toLowerCase().includes(q) ||
                String(classSet.entryYear).includes(q) ||
                classSet.status.toLowerCase().includes(q),
        );
    }, [classList, classQuery]);
    const classPageItems = filteredClasses.slice(
        (classPage - 1) * classPageSize,
        classPage * classPageSize,
    );

    const filteredHouses = useMemo(() => {
        const q = houseQuery.trim().toLowerCase();
        if (!q) {
            return houseList;
        }
        return houseList.filter(
            (house) =>
                house.name.toLowerCase().includes(q) ||
                (house.motto ?? "").toLowerCase().includes(q),
        );
    }, [houseList, houseQuery]);
    const housePageItems = filteredHouses.slice(
        (housePage - 1) * housePageSize,
        housePage * housePageSize,
    );

    const filteredFeatureModules = useMemo(() => {
        const q = featureQuery.trim().toLowerCase();
        if (!q) {
            return featureModules;
        }
        return featureModules.filter(
            (module) =>
                module.label.toLowerCase().includes(q) ||
                module.key.toLowerCase().includes(q),
        );
    }, [featureModules, featureQuery]);
    const featurePageItems = filteredFeatureModules.slice(
        (featurePage - 1) * featurePageSize,
        featurePage * featurePageSize,
    );

    return (
        <div className="space-y-8">
            {message && (
                <p className="status-banner status-banner-error">
                    {message}
                </p>
            )}

            <section className="surface-card p-4 shadow-sm">
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: "branches", label: "Branches" },
                        { key: "countries", label: "Countries" },
                        { key: "classes", label: "Classes" },
                        { key: "houses", label: "Houses" },
                        { key: "role-features", label: "Role features" },
                    ].map((tab) => {
                        const selected = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                className={`btn-pill text-sm ${
                                    selected
                                        ? "border-red-300 bg-red-100 text-red-800"
                                        : "hover:border-red-200 hover:bg-red-50"
                                }`}
                                onClick={() =>
                                    setActiveTab(tab.key as ReferenceTabKey)
                                }
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </section>

            {activeTab === "branches" && (
                <section className="surface-card p-6 shadow-sm">
                <header className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Branches
                    </h2>
                    <p className="text-sm text-slate-500">
                        Manage the list of global branches.
                    </p>
                </header>
                <div className="grid gap-6 lg:grid-cols-2">
                    <form className="space-y-3" onSubmit={handleBranchSubmit}>
                        <label className="text-sm text-slate-600">
                            Name
                            <input
                                required
                                className="field-input"
                                value={branchForm.name}
                                onChange={(event) =>
                                    setBranchForm((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="text-sm text-slate-600">
                            Country
                            <input
                                className="field-input"
                                value={branchForm.country}
                                onChange={(event) =>
                                    setBranchForm((prev) => ({
                                        ...prev,
                                        country: event.target.value,
                                    }))
                                }
                                placeholder="Nigeria"
                            />
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                {branchForm.id ? "Update branch" : "Add branch"}
                            </button>
                            {branchForm.id && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() =>
                                        setBranchForm({ name: "", country: "" })
                                    }
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-xs text-slate-500">
                                Search branches
                                <input
                                    className="field-input text-sm"
                                    placeholder="Search by name or country"
                                    value={branchQuery}
                                    onChange={(event) => {
                                        setBranchQuery(event.target.value);
                                        setBranchPage(1);
                                    }}
                                />
                            </label>
                            <p className="text-xs text-slate-500 md:pt-6">
                                {filteredBranches.length} record(s)
                            </p>
                        </div>
                    <div className="table-wrap">
                        <table className="table-base">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Country</th>
                                    <th className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {branchPageItems.map((branch) => (
                                    <tr
                                        key={branch.id}
                                        className="table-row"
                                    >
                                        <td className="py-2 font-medium text-slate-900">
                                            {branch.name}
                                        </td>
                                        <td className="py-2 text-slate-500">
                                            {branch.country ?? "--"}
                                        </td>
                                        <td className="py-2 text-sm">
                                            <button
                                                type="button"
                                                className="btn-pill mr-2 text-red-700"
                                                onClick={() =>
                                                    setBranchForm({
                                                        id: branch.id,
                                                        name: branch.name,
                                                        country:
                                                            branch.country ??
                                                            "",
                                                    })
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                                                onClick={() =>
                                                    handleBranchDelete(
                                                        branch.id,
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        page={branchPage}
                        pageSize={branchPageSize}
                        total={filteredBranches.length}
                        onPageChange={setBranchPage}
                        onPageSizeChange={(value) => {
                            setBranchPageSize(value);
                            setBranchPage(1);
                        }}
                    />
                    </div>
                </div>
            </section>
            )}

            {activeTab === "countries" && (
                <section className="surface-card p-6 shadow-sm">
                <header className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Countries
                    </h2>
                    <p className="text-sm text-slate-500">
                        Maintain canonical country list and ISO codes.
                    </p>
                </header>
                <div className="grid gap-6 lg:grid-cols-2">
                    <form className="space-y-3" onSubmit={handleCountrySubmit}>
                        <label className="text-sm text-slate-600">
                            Country name
                            <input
                                required
                                className="field-input"
                                value={countryForm.name}
                                onChange={(event) =>
                                    setCountryForm((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="text-sm text-slate-600">
                            ISO code
                            <input
                                className="field-input uppercase"
                                value={countryForm.isoCode}
                                onChange={(event) =>
                                    setCountryForm((prev) => ({
                                        ...prev,
                                        isoCode: event.target.value.toUpperCase(),
                                    }))
                                }
                                maxLength={3}
                                placeholder="NGA"
                            />
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                {countryForm.id
                                    ? "Update country"
                                    : "Add country"}
                            </button>
                            {countryForm.id && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() =>
                                        setCountryForm({
                                            name: "",
                                            isoCode: "",
                                        })
                                    }
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-xs text-slate-500">
                                Search countries
                                <input
                                    className="field-input text-sm"
                                    placeholder="Search by name or ISO code"
                                    value={countryQuery}
                                    onChange={(event) => {
                                        setCountryQuery(event.target.value);
                                        setCountryPage(1);
                                    }}
                                />
                            </label>
                            <p className="text-xs text-slate-500 md:pt-6">
                                {filteredCountries.length} record(s)
                            </p>
                        </div>
                    <div className="table-wrap">
                        <table className="table-base">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">ISO</th>
                                    <th className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {countryPageItems.map((country) => (
                                    <tr
                                        key={country.id}
                                        className="table-row"
                                    >
                                        <td className="py-2 font-medium text-slate-900">
                                            {country.name}
                                        </td>
                                        <td className="py-2 text-slate-500">
                                            {country.isoCode ?? "--"}
                                        </td>
                                        <td className="py-2 text-sm">
                                            <button
                                                type="button"
                                                className="btn-pill mr-2 text-red-700"
                                                onClick={() =>
                                                    setCountryForm({
                                                        id: country.id,
                                                        name: country.name,
                                                        isoCode:
                                                            country.isoCode ??
                                                            "",
                                                    })
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                                                onClick={() =>
                                                    handleCountryDelete(
                                                        country.id,
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        page={countryPage}
                        pageSize={countryPageSize}
                        total={filteredCountries.length}
                        onPageChange={setCountryPage}
                        onPageSizeChange={(value) => {
                            setCountryPageSize(value);
                            setCountryPage(1);
                        }}
                    />
                    </div>
                </div>
            </section>
            )}

            {activeTab === "classes" && (
                <section className="surface-card p-6 shadow-sm">
                <header className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Class sets
                    </h2>
                    <p className="text-sm text-slate-500">
                        Maintain the class of entry catalog.
                    </p>
                </header>
                <div className="grid gap-6 lg:grid-cols-2">
                    <form className="space-y-3" onSubmit={handleClassSubmit}>
                        <label className="text-sm text-slate-600">
                            Label
                            <input
                                required
                                className="field-input"
                                value={classForm.label}
                                onChange={(event) =>
                                    setClassForm((prev) => ({
                                        ...prev,
                                        label: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="text-sm text-slate-600">
                            Entry year
                            <input
                                required
                                type="number"
                                className="field-input"
                                value={classForm.entryYear}
                                onChange={(event) =>
                                    setClassForm((prev) => ({
                                        ...prev,
                                        entryYear: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="text-sm text-slate-600">
                            Status
                            <select
                                className="field-input"
                                value={classForm.status}
                                onChange={(event) =>
                                    setClassForm((prev) => ({
                                        ...prev,
                                        status: event.target
                                            .value as ClassForm["status"],
                                    }))
                                }
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                {classForm.id ? "Update class" : "Add class"}
                            </button>
                            {classForm.id && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={resetClassForm}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-xs text-slate-500">
                                Search classes
                                <input
                                    className="field-input text-sm"
                                    placeholder="Search by label, year, or status"
                                    value={classQuery}
                                    onChange={(event) => {
                                        setClassQuery(event.target.value);
                                        setClassPage(1);
                                    }}
                                />
                            </label>
                            <p className="text-xs text-slate-500 md:pt-6">
                                {filteredClasses.length} record(s)
                            </p>
                        </div>
                    <div className="table-wrap">
                        <table className="table-base">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="py-2">Label</th>
                                    <th className="py-2">Entry year</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {classPageItems.map((classSet) => (
                                    <tr
                                        key={classSet.id}
                                        className="table-row"
                                    >
                                        <td className="py-2 font-medium text-slate-900">
                                            {classSet.label}
                                        </td>
                                        <td className="py-2 text-slate-500">
                                            {classSet.entryYear}
                                        </td>
                                        <td className="py-2">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                    classSet.status === "active"
                                                        ? "bg-red-50 text-red-700"
                                                        : "bg-slate-100 text-slate-600"
                                                }`}
                                            >
                                                {classSet.status}
                                            </span>
                                        </td>
                                        <td className="py-2 text-sm">
                                            <button
                                                type="button"
                                                className="btn-pill mr-2 text-red-700"
                                                onClick={() =>
                                                    setClassForm({
                                                        id: classSet.id,
                                                        label: classSet.label,
                                                        entryYear:
                                                            classSet.entryYear.toString(),
                                                        status: classSet.status,
                                                    })
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                                                onClick={() =>
                                                    handleClassDelete(
                                                        classSet.id,
                                                    )
                                                }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        page={classPage}
                        pageSize={classPageSize}
                        total={filteredClasses.length}
                        onPageChange={setClassPage}
                        onPageSizeChange={(value) => {
                            setClassPageSize(value);
                            setClassPage(1);
                        }}
                    />
                    </div>
                </div>
            </section>
            )}

            {activeTab === "houses" && (
                <section className="surface-card p-6 shadow-sm">
                <header className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Houses
                    </h2>
                    <p className="text-sm text-slate-500">
                        Manage the house affiliations used during registration.
                    </p>
                </header>
                <div className="grid gap-6 lg:grid-cols-2">
                    <form className="space-y-3" onSubmit={handleHouseSubmit}>
                        <label className="text-sm text-slate-600">
                            Name
                            <input
                                required
                                className="field-input"
                                value={houseForm.name}
                                onChange={(event) =>
                                    setHouseForm((prev) => ({
                                        ...prev,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <label className="text-sm text-slate-600">
                            Motto
                            <input
                                className="field-input"
                                value={houseForm.motto}
                                onChange={(event) =>
                                    setHouseForm((prev) => ({
                                        ...prev,
                                        motto: event.target.value,
                                    }))
                                }
                            />
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className="btn-primary"
                            >
                                {houseForm.id ? "Update house" : "Add house"}
                            </button>
                            {houseForm.id && (
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() =>
                                        setHouseForm({ name: "", motto: "" })
                                    }
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                    <div className="space-y-3">
                        <div className="grid gap-3 md:grid-cols-2">
                            <label className="text-xs text-slate-500">
                                Search houses
                                <input
                                    className="field-input text-sm"
                                    placeholder="Search by name or motto"
                                    value={houseQuery}
                                    onChange={(event) => {
                                        setHouseQuery(event.target.value);
                                        setHousePage(1);
                                    }}
                                />
                            </label>
                            <p className="text-xs text-slate-500 md:pt-6">
                                {filteredHouses.length} record(s)
                            </p>
                        </div>
                    <div className="table-wrap">
                        <table className="table-base">
                            <thead className="text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="py-2">Name</th>
                                    <th className="py-2">Motto</th>
                                    <th className="py-2">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {housePageItems.map((house) => (
                                    <tr
                                        key={house.id}
                                        className="table-row"
                                    >
                                        <td className="py-2 font-medium text-slate-900">
                                            {house.name}
                                        </td>
                                        <td className="py-2 text-slate-500">
                                            {house.motto ?? "--"}
                                        </td>
                                        <td className="py-2 text-sm">
                                            <button
                                                type="button"
                                                className="btn-pill mr-2 text-red-700"
                                                onClick={() =>
                                                    setHouseForm({
                                                        id: house.id,
                                                        name: house.name,
                                                        motto:
                                                            house.motto ?? "",
                                                    })
                                                }
                                            >
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-pill border-rose-200 bg-rose-50 text-rose-700"
                                                onClick={() =>
                                                    handleHouseDelete(house.id)
                                                }
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls
                        page={housePage}
                        pageSize={housePageSize}
                        total={filteredHouses.length}
                        onPageChange={setHousePage}
                        onPageSizeChange={(value) => {
                            setHousePageSize(value);
                            setHousePage(1);
                        }}
                    />
                    </div>
                </div>
            </section>
            )}

            {activeTab === "role-features" && (
                <section className="surface-card p-6 shadow-sm">
                <header className="mb-4">
                    <h2 className="text-xl font-semibold text-slate-900">
                        Role features
                    </h2>
                    <p className="text-sm text-slate-500">
                        Enable or disable module-level permissions per role.
                    </p>
                </header>

                <div className="space-y-4">
                    <label className="text-sm text-slate-600">
                        Role
                        <select
                            className="field-input"
                            value={selectedRoleId}
                            onChange={(event) =>
                                setSelectedRoleId(event.target.value)
                            }
                        >
                            {roleList.map((role) => (
                                <option key={role.id} value={role.id}>
                                    {role.name} ({role.scope})
                                </option>
                            ))}
                        </select>
                    </label>

                    {!selectedRoleId ? (
                        <p className="text-sm text-slate-500">
                            No roles available.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            <div className="grid gap-3 md:grid-cols-2">
                                <label className="text-xs text-slate-500">
                                    Search role features
                                    <input
                                        className="field-input text-sm"
                                        placeholder="Search module label or key"
                                        value={featureQuery}
                                        onChange={(event) => {
                                            setFeatureQuery(event.target.value);
                                            setFeaturePage(1);
                                        }}
                                    />
                                </label>
                                <p className="text-xs text-slate-500 md:pt-6">
                                    {filteredFeatureModules.length} record(s)
                                </p>
                            </div>
                        <div className="table-wrap">
                            <table className="table-base">
                                <thead className="text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="py-2">Module</th>
                                        <th className="py-2">Status</th>
                                        <th className="py-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {featurePageItems.map((module) => {
                                        const feature =
                                            selectedRoleFeatureMap.get(
                                                module.key,
                                            );
                                        const allowed = feature?.allowed ?? false;
                                        return (
                                            <tr
                                                key={module.key}
                                                className="table-row"
                                            >
                                                <td className="py-2 font-medium text-slate-900">
                                                    {module.label}
                                                    <div className="text-xs text-slate-500">
                                                        {module.key}
                                                    </div>
                                                </td>
                                                <td className="py-2">
                                                    <span
                                                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                                            allowed
                                                                ? "bg-red-50 text-red-700"
                                                                : "bg-slate-100 text-slate-600"
                                                        }`}
                                                    >
                                                        {allowed
                                                            ? "Allowed"
                                                            : "Blocked"}
                                                    </span>
                                                </td>
                                                <td className="py-2">
                                                    <button
                                                        type="button"
                                                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                                            allowed
                                                                ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                                                : "bg-red-600 text-white"
                                                        }`}
                                                        onClick={() =>
                                                            handleRoleFeatureChange(
                                                                module.key,
                                                                !allowed,
                                                            )
                                                        }
                                                    >
                                                        {allowed
                                                            ? "Disable"
                                                            : "Enable"}
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <PaginationControls
                            page={featurePage}
                            pageSize={featurePageSize}
                            total={filteredFeatureModules.length}
                            onPageChange={setFeaturePage}
                            onPageSizeChange={(value) => {
                                setFeaturePageSize(value);
                                setFeaturePage(1);
                            }}
                        />
                        </div>
                    )}
                </div>
            </section>
            )}
        </div>
    );
}




