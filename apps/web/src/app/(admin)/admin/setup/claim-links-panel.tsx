"use client";

import type { ClassSetDTO } from "@gcuoba/types";
import { useMemo, useState } from "react";

type Props = {
    classes: ClassSetDTO[];
    defaultBaseUrl?: string;
};

function normalizeBaseUrl(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
        return "";
    }
    return trimmed.replace(/\/+$/, "");
}

function buildClaimPath(classYear: number) {
    return `/claim/class/${classYear}`;
}

export function ClaimLinksPanel({ classes, defaultBaseUrl = "" }: Props) {
    const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
    const [query, setQuery] = useState("");
    const [message, setMessage] = useState<string | null>(null);

    const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

    const filteredClasses = useMemo(() => {
        const q = query.trim().toLowerCase();
        const ordered = [...classes].sort((a, b) => a.entryYear - b.entryYear);
        if (!q) {
            return ordered;
        }
        return ordered.filter(
            (entry) =>
                entry.label.toLowerCase().includes(q) ||
                String(entry.entryYear).includes(q),
        );
    }, [classes, query]);

    async function copyText(value: string, successMessage: string) {
        setMessage(null);
        try {
            await navigator.clipboard.writeText(value);
            setMessage(successMessage);
        } catch {
            setMessage("Unable to copy. Copy manually from the field.");
        }
    }

    return (
        <section className="surface-card space-y-4 p-6 shadow-sm">
            <header className="module-card-head">
                <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-[#b9031b]">Claim links</p>
                    <h2 className="module-title">Class account claim URLs</h2>
                    <p className="module-copy">
                        Generate shareable claim links for each class. Members can use these links to claim existing accounts and update their contact details.
                    </p>
                </div>
            </header>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <label className="text-sm text-slate-600">
                    App base URL
                    <input
                        className="field-input"
                        value={baseUrl}
                        onChange={(event) => setBaseUrl(event.target.value)}
                        placeholder="https://gcuoba-web.vercel.app"
                    />
                </label>
                <div className="md:pt-6">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() =>
                            copyText(
                                filteredClasses
                                    .map((entry) => {
                                        const path = buildClaimPath(entry.entryYear);
                                        return normalizedBaseUrl
                                            ? `${entry.entryYear},${entry.label},${normalizedBaseUrl}${path}`
                                            : `${entry.entryYear},${entry.label},${path}`;
                                    })
                                    .join("\n"),
                                "Class claim links copied.",
                            )
                        }
                    >
                        Copy all links
                    </button>
                </div>
            </div>

            <label className="text-xs text-slate-500">
                Search classes
                <input
                    className="field-input mt-1 text-sm"
                    placeholder="Search by class year or label"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                />
            </label>

            {message ? <p className="status-banner status-banner-success">{message}</p> : null}

            <div className="table-wrap">
                <table className="table-base">
                    <thead className="text-xs uppercase text-slate-500">
                        <tr>
                            <th className="py-2">Class</th>
                            <th className="py-2">Path</th>
                            <th className="py-2">Share URL</th>
                            <th className="py-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredClasses.map((entry) => {
                            const path = buildClaimPath(entry.entryYear);
                            const link = normalizedBaseUrl
                                ? `${normalizedBaseUrl}${path}`
                                : path;
                            return (
                                <tr key={entry.id} className="table-row">
                                    <td className="py-2 text-sm text-slate-900">
                                        {entry.entryYear} - {entry.label}
                                    </td>
                                    <td className="py-2 text-xs text-slate-600">{path}</td>
                                    <td className="py-2 text-xs text-slate-600 break-all">
                                        {link}
                                    </td>
                                    <td className="py-2">
                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                className="btn-pill"
                                                onClick={() =>
                                                    copyText(link, `Copied claim link for class ${entry.entryYear}.`)
                                                }
                                            >
                                                Copy
                                            </button>
                                            <a
                                                className="btn-pill"
                                                href={link}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open
                                            </a>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredClasses.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-3 text-sm text-slate-500">
                                    No classes match your search.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

