'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import { formatActivity } from '@/features/activity/format-activity';
import { createProject } from '@/features/projects/api';
import {
  addMember,
  fetchActivity,
  fetchWorkspace,
} from '@/features/workspaces/api';

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [projectName, setProjectName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');

  const workspaceQuery = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => fetchWorkspace(workspaceId),
  });

  const activityQuery = useQuery({
    queryKey: ['activity', workspaceId],
    queryFn: () => fetchActivity(workspaceId),
  });

  const projectMutation = useMutation({
    mutationFn: () =>
      createProject({ workspaceId, name: projectName.trim() }),
    onSuccess: () => {
      setProjectName('');
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const memberMutation = useMutation({
    mutationFn: () => addMember(workspaceId, memberEmail.trim(), 'MEMBER'),
    onSuccess: () => {
      setMemberEmail('');
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['activity', workspaceId] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  const ws = workspaceQuery.data;
  const canManage = ws?.currentUserRole === 'OWNER';

  return (
    <div className="px-4 py-8">
      {workspaceQuery.isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : ws ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-text">{ws.name}</h1>
              <p className="mt-1 text-sm text-text-muted">
                Your role: {ws.currentUserRole}
              </p>
            </div>
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-text">Projects</h2>
            {ws.currentUserRole !== 'VIEWER' ? (
              <form
                className="mt-3 flex max-w-md gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!projectName.trim()) return;
                  projectMutation.mutate();
                }}
              >
                <Input
                  placeholder="New project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <Button type="submit">Create</Button>
              </form>
            ) : null}
            <ul className="mt-4 space-y-2">
              {ws.projects.map((p) => {
                const boardId = p.boards?.[0]?.id;
                return (
                  <li key={p.id}>
                    {boardId ? (
                      <Link
                        href={`/boards/${boardId}`}
                        className="block rounded-lg border border-border bg-surface px-4 py-3 hover:border-brand/40"
                      >
                        <span className="font-medium text-text">{p.name}</span>
                        {p.description ? (
                          <p className="text-sm text-text-muted">{p.description}</p>
                        ) : null}
                      </Link>
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </li>
                );
              })}
              {!ws.projects.length ? (
                <p className="text-sm text-text-muted">No projects yet.</p>
              ) : null}
            </ul>
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-text">Members</h2>
              <ul className="mt-3 space-y-2">
                {ws.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-2 text-sm text-text"
                  >
                    <span>
                      {m.user.name}{' '}
                      <span className="text-text-muted">({m.user.email})</span>
                    </span>
                    <span className="text-xs font-medium text-text-muted">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
              {canManage ? (
                <form
                  className="mt-3 flex max-w-md gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!memberEmail.trim()) return;
                    memberMutation.mutate();
                  }}
                >
                  <Input
                    type="email"
                    placeholder="Add member by email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                  />
                  <Button type="submit">Add</Button>
                </form>
              ) : null}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Recent activity</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {activityQuery.data?.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-text"
                  >
                    {formatActivity(a)}
                  </li>
                ))}
                {!activityQuery.data?.length ? (
                  <p className="text-text-muted">No activity yet.</p>
                ) : null}
              </ul>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
