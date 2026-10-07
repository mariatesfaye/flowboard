import type { Task, TaskPriority } from '@/types';
import { cn } from '@/lib/cn';

export const PRIORITIES: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export function priorityClasses(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    MEDIUM: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    HIGH: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    URGENT: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  };
  return map[priority];
}

export function priorityDotClass(priority: TaskPriority): string {
  const map: Record<TaskPriority, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-sky-500',
    HIGH: 'bg-amber-500',
    URGENT: 'bg-rose-500',
  };
  return map[priority];
}

export function formatDueDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function dueDateTone(iso: string | null | undefined): string {
  if (!iso) return 'text-text-muted';
  const due = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  if (due < today) {
    return 'text-rose-600 dark:text-rose-400 font-medium';
  }
  const inWeek = new Date(today);
  inWeek.setDate(inWeek.getDate() + 7);
  if (due <= inWeek) {
    return 'text-amber-700 dark:text-amber-400';
  }
  return 'text-text-muted';
}

export function userInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function taskCardMetaClass(isDragging?: boolean) {
  return cn(
    'group rounded-xl border border-border bg-surface p-3 shadow-sm transition-shadow',
    'hover:border-brand/30 hover:shadow-md',
    isDragging && 'opacity-50 shadow-lg ring-2 ring-brand/20',
  );
}
