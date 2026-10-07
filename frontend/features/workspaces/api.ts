import { apiFetch } from '@/lib/api';
import type {
  Activity,
  Workspace,
  WorkspaceDetail,
  WorkspaceMember,
  WorkspaceRole,
} from '@/types';

export function fetchWorkspaces() {
  return apiFetch<Workspace[]>('/workspaces');
}

export function fetchWorkspace(id: string) {
  return apiFetch<WorkspaceDetail>(`/workspaces/${id}`);
}

export function createWorkspace(name: string) {
  return apiFetch<Workspace>('/workspaces', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function addMember(
  workspaceId: string,
  email: string,
  role: WorkspaceRole,
) {
  return apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });
}

export function fetchActivity(workspaceId: string) {
  return apiFetch<Activity[]>(`/workspaces/${workspaceId}/activity`);
}

export function fetchMembers(workspaceId: string) {
  return apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
}
