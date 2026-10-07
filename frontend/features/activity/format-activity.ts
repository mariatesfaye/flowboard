import type { Activity } from '@/types';

export function formatActivity(activity: Activity): string {
  const name = activity.actor.name;
  const meta = activity.metadata ?? {};

  switch (activity.action) {
    case 'CREATED':
      if (activity.entityType === 'PROJECT') {
        return `${name} created project "${String(meta.name ?? '')}".`;
      }
      if (activity.entityType === 'TASK') {
        return `${name} created "${String(meta.title ?? 'a task')}" in ${String(meta.column ?? 'a column')}.`;
      }
      if (activity.entityType === 'WORKSPACE') {
        return `${name} created workspace "${String(meta.name ?? '')}".`;
      }
      break;
    case 'MOVED':
      return `${name} moved "${String(meta.title ?? 'a task')}" from ${String(meta.fromColumn ?? '?')} to ${String(meta.toColumn ?? '?')}.`;
    case 'ASSIGNED':
      return `${name} updated assignee on "${String(meta.title ?? 'a task')}".`;
    case 'UPDATED':
      return `${name} updated "${String(meta.title ?? 'a task')}".`;
    case 'ADDED':
      if (activity.entityType === 'MEMBER') {
        return `${name} added ${String(meta.email ?? 'a member')} (${String(meta.role ?? '')}).`;
      }
      if (activity.entityType === 'COMMENT') {
        return `${name} commented on "${String(meta.taskTitle ?? 'a task')}".`;
      }
      break;
    case 'ARCHIVED':
      return `${name} archived project "${String(meta.name ?? '')}".`;
    default:
      break;
  }

  return `${name} performed ${activity.action.toLowerCase()} on ${activity.entityType.toLowerCase()}.`;
}
