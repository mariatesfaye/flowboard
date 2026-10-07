import type { QueryClient } from '@tanstack/react-query';
import type { Board, Task } from '@/types';
import { markPendingMutation, mutationKey } from '@/lib/socket';

export function markTaskEditPending(taskId: string) {
  markPendingMutation(mutationKey('task-edit', taskId));
}

export function mergeTaskIntoBoard(board: Board, task: Task): Board {
  const without = board.columns.map((col) => ({
    ...col,
    tasks: col.tasks.filter((t) => t.id !== task.id),
  }));
  return {
    ...board,
    columns: without.map((col) =>
      col.id === task.columnId
        ? {
            ...col,
            tasks: [...col.tasks, task].sort((a, b) => a.position - b.position),
          }
        : col,
    ),
  };
}

export function syncTaskAcrossCaches(
  queryClient: QueryClient,
  boardId: string,
  task: Task,
) {
  queryClient.setQueryData<Board>(['board', boardId], (board) =>
    board ? mergeTaskIntoBoard(board, task) : board,
  );
  queryClient.setQueryData(['task', task.id], (prev: unknown) =>
    prev && typeof prev === 'object'
      ? { ...(prev as object), ...task }
      : task,
  );
}
