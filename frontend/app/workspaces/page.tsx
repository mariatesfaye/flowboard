'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import { createWorkspace, fetchWorkspaces } from '@/features/workspaces/api';

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
  });

  const createMutation = useMutation({
    mutationFn: () => createWorkspace(name.trim()),
    onSuccess: () => {
      setName('');
      setCreating(false);
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    },
    onError: (e: Error) => toast(e.message, 'error'),
  });

  return (
    <div className="px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Workspaces</h1>
          <p className="mt-1 text-sm text-text-muted">
            Organize projects and teams in one place.
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>New workspace</Button>
      </div>

      {creating ? (
        <form
          className="mt-6 flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            createMutation.mutate();
          }}
        >
          <Input
            autoFocus
            placeholder="Workspace name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button type="submit">Create</Button>
          <Button type="button" variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </form>
      ) : null}

      {isLoading ? (
        <p className="mt-8 text-sm text-text-muted">Loading workspaces…</p>
      ) : !data?.length ? (
        <div className="mt-12 rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-text-muted">No workspaces yet.</p>
          <Button className="mt-4" onClick={() => setCreating(true)}>
            Create your first workspace
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((ws) => (
            <li key={ws.id}>
              <Link
                href={`/workspaces/${ws.id}`}
                className="block rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-brand/40"
              >
                <h2 className="font-semibold text-text">{ws.name}</h2>
                <p className="mt-1 text-xs text-text-muted">
                  Role: {ws.currentUserRole ?? 'MEMBER'}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
