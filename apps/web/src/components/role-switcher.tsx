'use client';

import type { BranchDTO, ClassSetDTO, RoleAssignmentDTO } from '@gcuoba/types';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchJson } from '@/lib/api';
import { readActiveScope, writeActiveScope } from '@/lib/active-scope';

type RoleSwitcherProps = {
  assignments: RoleAssignmentDTO[];
  token: string;
  portalBase?: string;
  showPortalLink?: boolean;
};

type ScopeOption = {
  id: string;
  scopeType: 'global' | 'branch' | 'class';
  scopeId: string | null;
  label: string;
};

export function RoleSwitcher({
  assignments,
  token,
  portalBase = '/admin',
  showPortalLink = false,
}: RoleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [classes, setClasses] = useState<ClassSetDTO[]>([]);
  const [active, setActive] = useState<ScopeOption | null>(null);

  useEffect(() => {
    if (!assignments.length) return;
    fetchJson<BranchDTO[]>('/branches', { token })
      .then(setBranches)
      .catch(() => setBranches([]));
    fetchJson<ClassSetDTO[]>('/classes', { token })
      .then(setClasses)
      .catch(() => setClasses([]));
  }, [assignments, token]);

  const branchMap = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );
  const classMap = useMemo(
    () => new Map(classes.map((classSet) => [classSet.id, classSet.label])),
    [classes],
  );

  const options = useMemo(() => {
    const grouped = new Map<string, ScopeOption & { roleCodes: string[] }>();

    assignments.forEach((assignment) => {
      const scopeType = assignment.scopeType;
      const scopeId = assignment.scopeId ?? null;
      const id = `${scopeType}:${scopeId ?? 'global'}`;

      const existing = grouped.get(id);
      const roleCodes = existing?.roleCodes ?? [];
      const roleCode = assignment.roleCode?.trim();
      if (roleCode && !roleCodes.includes(roleCode)) {
        roleCodes.push(roleCode);
      }

      let scopeLabel = 'Global';
      if (scopeType === 'branch') {
        const branchLabel = branchMap.get(scopeId ?? '') ?? `Branch ${scopeId ?? ''}`;
        scopeLabel = `Branch: ${branchLabel}`;
      }
      if (scopeType === 'class') {
        const classLabel = classMap.get(scopeId ?? '') ?? `Class ${scopeId ?? ''}`;
        scopeLabel = `Class: ${classLabel}`;
      }

      grouped.set(id, {
        id,
        scopeType,
        scopeId,
        roleCodes,
        label: scopeLabel,
      });
    });

    return Array.from(grouped.values()).map((option) => ({
      id: option.id,
      scopeType: option.scopeType,
      scopeId: option.scopeId,
      label: option.roleCodes.length
        ? `${option.label} (${option.roleCodes.join(', ')})`
        : option.label,
    }));
  }, [assignments, branchMap, classMap]);

  const activeFromUrl = useMemo(() => {
    const scopeType = searchParams.get('scopeType');
    const scopeId = searchParams.get('scopeId');
    if (scopeType !== 'global' && scopeType !== 'branch' && scopeType !== 'class') {
      return null;
    }
    return options.find((option) => {
      if (option.scopeType !== scopeType) {
        return false;
      }
      if (scopeType === 'global') {
        return option.scopeId === null;
      }
      return option.scopeId === (scopeId?.trim() || null);
    }) ?? null;
  }, [options, searchParams]);

  useEffect(() => {
    if (!options.length) {
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive((current) => {
      if (activeFromUrl) {
        writeActiveScope(activeFromUrl);
        return activeFromUrl;
      }
      if (current) {
        const matching = options.find((option) => option.id === current.id);
        if (matching) {
          return current;
        }
      }
      const stored = readActiveScope();
      if (stored) {
        const storedMatch = options.find((option) => option.id === stored.id);
        if (storedMatch) {
          writeActiveScope(storedMatch);
          return storedMatch;
        }
      }
      writeActiveScope(options[0]);
      return options[0];
    });
  }, [activeFromUrl, options]);

  useEffect(() => {
    if (showPortalLink || !active) {
      return;
    }
    if (pathname?.startsWith('/admin/select-scope')) {
      return;
    }

    const scopeType = searchParams.get('scopeType');
    const scopeId = searchParams.get('scopeId')?.trim() || null;
    const matchesUrl =
      scopeType === active.scopeType &&
      ((active.scopeType === 'global' && !scopeId) || (active.scopeType !== 'global' && scopeId === active.scopeId));

    if (matchesUrl) {
      return;
    }

    const basePath = pathname?.startsWith('/admin') ? pathname : portalBase;
    router.replace(buildPortalUrl(basePath, active));
  }, [active, pathname, portalBase, router, searchParams, showPortalLink]);

  const handleChange = (optionId: string) => {
    const next = options.find((option) => option.id === optionId);
    if (!next) return;
    setActive(next);
    writeActiveScope(next);
    if (!showPortalLink) {
      const basePath = pathname?.startsWith('/admin') ? pathname : portalBase;
      router.push(buildPortalUrl(basePath, next));
    }
  };

  if (!options.length) {
    return null;
  }

  const portalUrl = buildPortalUrl(portalBase, active);

  return (
    <div className="flex items-center gap-2">
      <select
        value={active?.id ?? ''}
        onChange={(event) => handleChange(event.target.value)}
        className="field-input text-sm"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      {showPortalLink && active && (
        <Link
          href={portalUrl}
          className="rounded-full border border-yellow-300 bg-yellow-100 px-3 py-1 text-xs font-semibold text-[#7f0716]"
        >
          Exec console
        </Link>
      )}
    </div>
  );
}

function buildPortalUrl(portalBase: string, active: ScopeOption | null) {
  const [rawPath, rawQuery = ''] = portalBase.split('?');
  if (!active) {
    return rawQuery ? `${rawPath}?${rawQuery}` : rawPath;
  }
  const params = new URLSearchParams(rawQuery);
  params.set('scopeType', active.scopeType);
  if (active.scopeId) {
    params.set('scopeId', active.scopeId);
  } else {
    params.delete('scopeId');
  }
  const query = params.toString();
  return query ? `${rawPath}?${query}` : rawPath;
}
