import { apiFetch } from '@/lib/api';
import type { Project } from '@/types';

export function fetchProjects(workspaceId: string) {
  return apiFetch<Project[]>(`/projects?workspaceId=${workspaceId}`);
}

export function createProject(data: {
  workspaceId: string;
  name: string;
  description?: string;
}) {
  return apiFetch<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchProject(id: string) {
  return apiFetch<Project & { boards: { id: string; name: string }[] }>(
    `/projects/${id}`,
  );
}
