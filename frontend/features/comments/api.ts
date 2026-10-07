import { apiFetch } from '@/lib/api';
import type { Comment } from '@/types';

export function createComment(taskId: string, content: string) {
  return apiFetch<Comment>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}
