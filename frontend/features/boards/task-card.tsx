'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, GripVertical, MessageSquare } from 'lucide-react';
import type { Task } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import {
  dueDateTone,
  formatDueDate,
  priorityClasses,
  priorityDotClass,
  taskCardMetaClass,
} from '@/lib/task-ui';
import { cn } from '@/lib/cn';

export function TaskCard({
  task,
  onOpen,
  dragHandleProps,
}: {
  task: Task;
  onOpen: () => void;
  dragHandleProps?: Pick<
    ReturnType<typeof useSortable>,
    'attributes' | 'listeners'
  >;
}) {
  return (
    <div className={taskCardMetaClass()}>
      <div className="flex items-start gap-2">
        {dragHandleProps ? (
          <button
            type="button"
            className="mt-0.5 cursor-grab text-text-muted hover:text-text active:cursor-grabbing"
            {...dragHandleProps.attributes}
            {...dragHandleProps.listeners}
            aria-label="Drag task"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        ) : null}
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <div className="flex items-start gap-2">
            <span
              className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', priorityDotClass(task.priority))}
              title={task.priority}
            />
            <p className="text-sm font-medium leading-snug text-text">{task.title}</p>
          </div>
          {task.labels?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {task.labels.slice(0, 3).map(({ label }) => (
                <span
                  key={label.id}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: `${label.color}22`,
                    color: label.color,
                  }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                  priorityClasses(task.priority),
                )}
              >
                {task.priority}
              </span>
              {formatDueDate(task.dueDate) ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[11px]',
                    dueDateTone(task.dueDate),
                  )}
                >
                  <Calendar className="h-3 w-3" />
                  {formatDueDate(task.dueDate)}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1.5">
              {(task._count?.comments ?? 0) > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[11px] text-text-muted">
                  <MessageSquare className="h-3 w-3" />
                  {task._count?.comments}
                </span>
              ) : null}
              {task.assignee ? (
                <Avatar name={task.assignee.name} src={task.assignee.avatarUrl} size="sm" />
              ) : (
                <span className="h-6 w-6 rounded-full border border-dashed border-border" title="Unassigned" />
              )}
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

export function SortableTaskCard({
  task,
  onOpen,
}: {
  task: Task;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className={cn(isDragging && 'z-10')}>
      <TaskCard
        task={task}
        onOpen={onOpen}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
}
