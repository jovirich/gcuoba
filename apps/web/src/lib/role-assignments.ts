import type { RoleAssignmentDTO } from '@gcuoba/types';
import { fetchJson } from './api';

export async function fetchUserAssignments(token: string): Promise<RoleAssignmentDTO[]> {
  try {
    return await fetchJson<RoleAssignmentDTO[]>('/roles/assignments/me', {
      token,
    });
  } catch {
    return [];
  }
}

export async function fetchAssignmentsForUser(token: string, userId: string): Promise<RoleAssignmentDTO[]> {
  if (!userId) {
    return [];
  }
  const params = new URLSearchParams({ userId });
  try {
    return await fetchJson<RoleAssignmentDTO[]>(`/roles/assignments?${params.toString()}`, {
      token,
    });
  } catch {
    return [];
  }
}

export async function createRoleAssignment(
  token: string,
  payload: {
    userId: string;
    roleCode: string;
    scopeType: 'global' | 'branch' | 'class';
    scopeId?: string | null;
  },
): Promise<RoleAssignmentDTO> {
  return fetchJson<RoleAssignmentDTO>('/roles/assignments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    token,
  });
}
