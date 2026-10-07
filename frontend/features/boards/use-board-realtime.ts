'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { Board, Comment, Task } from '@/types';
import {
  consumePendingMutation,
  getSocket,
  mutationKey,
} from '@/lib/socket';

export function useBoardRealtime(boardId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    const socket = getSocket();
    socket.connect();
    socket.emit('board.join', { boardId });

    const boardKey = ['board', boardId];

    const onTaskCreated = ({ task }: { task: Task }) => {
      queryClient.setQueryData<Board>(boardKey, (board) => {
        if (!board) return board;
        if (board.columns.some((col) => col.tasks.some((t) => t.id === task.id))) {
          return board;
        }
        return {
          ...board,
          columns: board.columns.map((col) =>
            col.id === task.columnId
              ? { ...col, tasks: [...col.tasks, task].sort((a, b) => a.position - b.position) }
              : col,
          ),
        };
      });
    };

    const applyTaskUpdate = (task: Task) => {
      if (consumePendingMutation(mutationKey('task-edit', task.id))) return;
      const key = mutationKey('task', task.id, `${task.columnId}:${task.position}`);
      if (consumePendingMutation(key)) return;

      queryClient.setQueryData<Board>(boardKey, (board) => {
        if (!board) return board;
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
      });
    };

    const onTaskDeleted = ({ taskId }: { taskId: string }) => {
      if (consumePendingMutation(mutationKey('task-delete', taskId))) return;
      queryClient.setQueryData<Board>(boardKey, (board) => {
        if (!board) return board;
        return {
          ...board,
          columns: board.columns.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          })),
        };
      });
    };

    const onComment = ({
      taskId,
      comment,
    }: {
      taskId: string;
      comment: Comment;
    }) => {
      queryClient.setQueryData(['task', taskId], (task: unknown) => {
        if (!task || typeof task !== 'object') return task;
        const t = task as { comments?: Comment[] };
        if (t.comments?.some((c) => c.id === comment.id)) return task;
        return { ...t, comments: [...(t.comments ?? []), comment] };
      });
    };

    socket.on('task.created', onTaskCreated);
    socket.on('task.updated', ({ task }: { task: Task }) => applyTaskUpdate(task));
    socket.on('task.moved', ({ task }: { task: Task }) => applyTaskUpdate(task));
    socket.on('task.deleted', onTaskDeleted);
    socket.on('comment.created', onComment);
    socket.on('comment.updated', onComment);

    return () => {
      socket.emit('board.leave', { boardId });
      socket.off('task.created', onTaskCreated);
      socket.off('task.updated');
      socket.off('task.moved');
      socket.off('task.deleted', onTaskDeleted);
      socket.off('comment.created', onComment);
      socket.off('comment.updated', onComment);
    };
  }, [boardId, queryClient]);
}
