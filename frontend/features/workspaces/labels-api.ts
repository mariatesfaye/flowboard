import { apiFetch } from '@/lib/api';
import type { Label } from '@/types';

export function fetchLabels(workspaceId: string) {
  return apiFetch<Label[]>(`/workspaces/${workspaceId}/labels`);
}

export function createLabel(workspaceId: string, name: string, color?: string) {
  return apiFetch<Label>(`/workspaces/${workspaceId}/labels`, {
    method: 'POST',
    body: JSON.stringify({ name, color }),
  });
}
