'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/providers/toast-provider';
import { createComment } from '@/features/comments/api';
import { deleteTask, fetchBoard, fetchTask, updateTask } from '@/features/boards/api';
import { fetchLabels, createLabel } from '@/features/workspaces/labels-api';
import { fetchMembers } from '@/features/workspaces/api';
import {
  markTaskEditPending,
  syncTaskAcrossCaches,
} from '@/features/tasks/sync-task-cache';
import { markPendingMutation, mutationKey } from '@/lib/socket';
import type { Board, TaskPriority } from '@/types';
import { PRIORITIES } from '@/lib/task-ui';
import { cn } from '@/lib/cn';

export function TaskDetailPanel({
  taskId,
  boardId,
  workspaceId,
  onClose,
}: {
  taskId: string;
  boardId: string;
  workspaceId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [comment, setComment] = useState('');
  const [newLabelName, setNewLabelName] = useState('');

  const taskQuery = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTask(taskId),
  });

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
  });

  const membersQuery = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: () => fetchMembers(workspaceId),
  });

  const labelsQuery = useQuery({
    queryKey: ['labels', workspaceId],
    queryFn: () => fetchLabels(workspaceId),
  });

  const task = taskQuery.data;
  const columns = boardQuery.data?.columns ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const patchTask = async (data: Parameters<typeof updateTask>[1]) => {
    markTaskEditPending(taskId);
    try {
      const updated = await updateTask(taskId, data);
      syncTaskAcrossCaches(queryClient, boardId, updated);
      return updated;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Update failed', 'error');
      throw e;
    }
  };

  const commentMutation = useMutation({
    mutationFn: () => createComment(taskId, comment.trim()),
    onSuccess: () => {
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      markPendingMutation(mutationKey('task-delete', taskId));
      return deleteTask(taskId);
    },
    onSuccess: () => {
      queryClient.setQueryData<Board>(['board', boardId], (board) => {
        if (!board) return board;
        return {
          ...board,
          columns: board.columns.map((col) => ({
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          })),
        };
      });
      onClose();
      toast('Task deleted');
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const createLabelMutation = useMutation({
    mutationFn: (name: string) => createLabel(workspaceId, name),
    onSuccess: () => {
      setNewLabelName('');
      labelsQuery.refetch();
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const selectedLabelIds = task?.labels?.map((l) => l.label.id) ?? [];

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/40 backdrop-blur-[1px]"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="drawer-panel flex h-full w-full max-w-xl flex-col border-l border-border bg-surface shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
          <div className="min-w-0 flex-1">
            {taskQuery.isLoading ? (
              <div className="h-8 w-2/3 animate-pulse rounded bg-surface-muted" />
            ) : task ? (
              <Input
                className="border-transparent px-0 text-lg font-semibold shadow-none focus:border-border"
                defaultValue={task.title}
                onBlur={(e) => {
                  const title = e.target.value.trim();
                  if (title && title !== task.title) {
                    void patchTask({ title });
                  }
                }}
              />
            ) : null}
            {task?.column ? (
              <p className="text-xs text-text-muted">In {task.column.name}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Delete this task permanently?')) {
                  deleteMutation.mutate();
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {taskQuery.isLoading ? (
            <p className="text-sm text-text-muted">Loading task…</p>
          ) : task ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Status">
                  <Select
                    value={task.columnId}
                    onChange={(e) => {
                      const columnId = e.target.value;
                      if (columnId !== task.columnId) {
                        void patchTask({ columnId });
                      }
                    }}
                  >
                    {columns.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select
                    value={task.priority}
                    onChange={(e) => {
                      const priority = e.target.value as TaskPriority;
                      if (priority !== task.priority) {
                        void patchTask({ priority });
                      }
                    }}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Assignee">
                  <Select
                    value={task.assigneeId ?? ''}
                    onChange={(e) => {
                      const assigneeId = e.target.value || null;
                      if (assigneeId !== (task.assigneeId ?? '')) {
                        void patchTask({ assigneeId });
                      }
                    }}
                  >
                    <option value="">Unassigned</option>
                    {membersQuery.data?.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Due date">
                  <Input
                    type="date"
                    defaultValue={
                      task.dueDate
                        ? new Date(task.dueDate).toISOString().slice(0, 10)
                        : ''
                    }
                    onBlur={(e) => {
                      const val = e.target.value;
                      const next = val ? `${val}T12:00:00.000Z` : null;
                      const prev = task.dueDate;
                      if (next !== prev && (next === null || prev !== next)) {
                        void patchTask({ dueDate: next });
                      }
                    }}
                  />
                </Field>
              </div>

              <Field label="Description">
                <Textarea
                  rows={4}
                  defaultValue={task.description ?? ''}
                  placeholder="Add a description…"
                  onBlur={(e) => {
                    const description = e.target.value;
                    if (description !== (task.description ?? '')) {
                      void patchTask({ description });
                    }
                  }}
                />
              </Field>

              <Field label="Labels">
                <div className="flex flex-wrap gap-2">
                  {labelsQuery.data?.map((label) => {
                    const active = selectedLabelIds.includes(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                          active
                            ? 'border-transparent text-white'
                            : 'border-border bg-surface-muted text-text-muted hover:border-brand/40',
                        )}
                        style={
                          active
                            ? { backgroundColor: label.color }
                            : undefined
                        }
                        onClick={() => {
                          const next = active
                            ? selectedLabelIds.filter((id) => id !== label.id)
                            : [...selectedLabelIds, label.id];
                          void patchTask({ labelIds: next });
                        }}
                      >
                        {label.name}
                      </button>
                    );
                  })}
                </div>
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newLabelName.trim()) return;
                    createLabelMutation.mutate(newLabelName.trim());
                  }}
                >
                  <Input
                    placeholder="New label name"
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button type="submit" size="sm" variant="secondary" disabled={createLabelMutation.isPending}>
                    Add label
                  </Button>
                </form>
              </Field>

              <section>
                <h3 className="text-sm font-semibold text-text">Comments</h3>
                <ul className="mt-3 space-y-3">
                  {task.comments?.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-xl border border-border bg-surface-muted/50 p-3 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar name={c.author.name} src={c.author.avatarUrl} size="md" />
                        <div>
                          <p className="font-medium">{c.author.name}</p>
                          <p className="text-[11px] text-text-muted">
                            {new Date(c.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="mt-2 text-text-muted">{c.content}</p>
                    </li>
                  ))}
                  {!task.comments?.length ? (
                    <p className="rounded-xl border border-dashed border-border py-8 text-center text-sm text-text-muted">
                      No comments yet. Start the conversation below.
                    </p>
                  ) : null}
                </ul>
                <form
                  className="mt-4 space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!comment.trim()) return;
                    commentMutation.mutate();
                  }}
                >
                  <Textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Write a comment…"
                    rows={3}
                  />
                  <Button type="submit" size="sm" disabled={commentMutation.isPending}>
                    Post comment
                  </Button>
                </form>
              </section>
            </>
          ) : (
            <p className="text-sm text-text-muted">Task not found.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
        {label}
      </p>
      {children}
    </div>
  );
}
