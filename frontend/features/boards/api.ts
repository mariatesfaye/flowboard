import { apiFetch } from '@/lib/api';
import type { Board, Task, TaskPriority } from '@/types';

export function fetchBoard(id: string) {
  return apiFetch<Board>(`/boards/${id}`);
}

export function createTask(
  boardId: string,
  data: {
    columnId: string;
    title: string;
    description?: string;
    priority?: TaskPriority;
    assigneeId?: string;
  },
) {
  return apiFetch<Task>(`/boards/${boardId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTask(
  taskId: string,
  data: Partial<{
    columnId: string;
    title: string;
    description: string;
    priority: TaskPriority;
    assigneeId: string | null;
    dueDate: string | null;
    position: number;
    labelIds: string[];
  }>,
) {
  return apiFetch<Task>(`/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteTask(taskId: string) {
  return apiFetch<{ success: boolean }>(`/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

export function fetchTask(taskId: string) {
  return apiFetch<import('@/types').TaskDetail>(`/tasks/${taskId}`);
}
