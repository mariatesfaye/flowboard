'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import type { Board, Task } from '@/types';
import { createTask, fetchBoard, updateTask } from './api';
import { SortableTaskCard, TaskCard } from './task-card';
import { useBoardRealtime } from './use-board-realtime';
import { markPendingMutation, mutationKey } from '@/lib/socket';
import { cn } from '@/lib/cn';

export function KanbanBoard({
  boardId,
  onOpenTask,
}: {
  boardId: string;
  onOpenTask: (taskId: string) => void;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [addingColumnId, setAddingColumnId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
  });

  useBoardRealtime(boardId);

  const createMutation = useMutation({
    mutationFn: (vars: { columnId: string; title: string }) =>
      createTask(boardId, vars),
    onSuccess: () => {
      setNewTitle('');
      setAddingColumnId(null);
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const board = boardQuery.data;

  const taskMap = useMemo(() => {
    const map = new Map<string, Task>();
    board?.columns.forEach((col) =>
      col.tasks.forEach((t) => map.set(t.id, t)),
    );
    return map;
  }, [board]);

  async function persistMove(
    taskId: string,
    columnId: string,
    position: number,
    previous: Board,
  ) {
    const key = mutationKey('task', taskId, `${columnId}:${position}`);
    markPendingMutation(key);

    queryClient.setQueryData<Board>(['board', boardId], (current) => {
      if (!current) return current;
      const without = current.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== taskId),
      }));
      const task = taskMap.get(taskId);
      if (!task) return current;
      const moved = { ...task, columnId, position };
      return {
        ...current,
        columns: without.map((col) =>
          col.id === columnId
            ? {
                ...col,
                tasks: [...col.tasks, moved].sort(
                  (a, b) => a.position - b.position,
                ),
              }
            : col,
        ),
      };
    });

    try {
      await updateTask(taskId, { columnId, position });
    } catch (e) {
      queryClient.setQueryData(['board', boardId], previous);
      toast(e instanceof Error ? e.message : 'Failed to move task', 'error');
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    if (!board) return;

    const { active, over } = event;
    if (!over) return;

    const taskId = String(active.id);
    const task = taskMap.get(taskId);
    if (!task) return;

    const overId = String(over.id);
    const overColumn = board.columns.find(
      (c) => c.id === overId || c.tasks.some((t) => t.id === overId),
    );
    if (!overColumn) return;

    let position = 0;
    if (overId === overColumn.id) {
      position = overColumn.tasks.filter((t) => t.id !== taskId).length;
    } else {
      const idx = overColumn.tasks.findIndex((t) => t.id === overId);
      position = idx >= 0 ? idx : overColumn.tasks.length;
    }

    if (task.columnId === overColumn.id && task.position === position) {
      return;
    }

    const snapshot = structuredClone(board);
    void persistMove(taskId, overColumn.id, position, snapshot);
  }

  if (boardQuery.isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto p-4 md:p-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-[28rem] w-80 shrink-0 animate-pulse rounded-2xl bg-surface-muted"
          />
        ))}
      </div>
    );
  }

  if (!board) {
    return (
      <p className="p-6 text-text-muted">Board not found or inaccessible.</p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={(e: DragStartEvent) => {
        const t = taskMap.get(String(e.active.id));
        if (t) setActiveTask(t);
      }}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto p-4 pb-8 md:p-6">
        {board.columns.map((column) => (
          <div
            key={column.id}
            className="flex w-80 shrink-0 flex-col rounded-2xl border border-border bg-surface/80 shadow-sm backdrop-blur-sm"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold tracking-tight text-text">
                {column.name}
              </h3>
              <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-medium text-text-muted">
                {column.tasks.length}
              </span>
            </div>
            <ColumnDropZone columnId={column.id} taskIds={column.tasks.map((t) => t.id)}>
              {column.tasks.length === 0 ? (
                <p className="px-2 py-6 text-center text-xs text-text-muted">
                  Drop tasks here or add one below
                </p>
              ) : null}
              {column.tasks.map((task) => (
                <SortableTaskCard
                  key={task.id}
                  task={task}
                  onOpen={() => onOpenTask(task.id)}
                />
              ))}
            </ColumnDropZone>
            <div className="border-t border-border p-2">
              {addingColumnId === column.id ? (
                <form
                  className="space-y-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newTitle.trim()) return;
                    createMutation.mutate({
                      columnId: column.id,
                      title: newTitle.trim(),
                    });
                  }}
                >
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Task title"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={createMutation.isPending}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setAddingColumnId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-text-muted transition-colors hover:bg-surface-muted"
                  onClick={() => setAddingColumnId(column.id)}
                >
                  <Plus className="h-4 w-4" /> Add task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? (
          <div className="w-72 rotate-2 scale-[1.02]">
            <TaskCard task={activeTask} onOpen={() => undefined} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function ColumnDropZone({
  columnId,
  taskIds,
  children,
}: {
  columnId: string;
  taskIds: string[];
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });
  return (
    <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[140px] flex-1 flex-col gap-2 p-2 transition-colors',
          isOver && 'bg-brand/5',
        )}
      >
        {children}
      </div>
    </SortableContext>
  );
}
