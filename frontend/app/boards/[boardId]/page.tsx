'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { KanbanBoard } from '@/features/boards/kanban-board';
import { fetchBoard } from '@/features/boards/api';
import { TaskDetailPanel } from '@/features/tasks/task-detail-panel';

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [taskId, setTaskId] = useState<string | null>(null);

  const boardQuery = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => fetchBoard(boardId),
  });

  const meta = boardQuery.data;

  return (
    <AppShell>
      <div className="border-b border-border bg-surface px-4 py-5 md:px-8">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-text-muted">
          <Link href="/workspaces" className="hover:text-brand">
            Workspaces
          </Link>
          <ChevronRight className="h-3 w-3" />
          {meta ? (
            <Link
              href={`/workspaces/${meta.project.workspaceId}`}
              className="hover:text-brand"
            >
              Workspace
            </Link>
          ) : (
            <span>Workspace</span>
          )}
          <ChevronRight className="h-3 w-3" />
          <span className="text-text">{meta?.project.name ?? 'Project'}</span>
        </nav>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-text">
          {meta?.name ?? 'Board'}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Drag tasks between columns. Changes sync in real time for your team.
        </p>
      </div>
      <KanbanBoard boardId={boardId} onOpenTask={setTaskId} />
      {taskId && meta ? (
        <TaskDetailPanel
          taskId={taskId}
          boardId={boardId}
          workspaceId={meta.project.workspaceId}
          onClose={() => setTaskId(null)}
        />
      ) : null}
    </AppShell>
  );
}
