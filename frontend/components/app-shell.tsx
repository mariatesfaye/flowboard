'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { LayoutGrid, Menu, Moon, Sun, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/features/auth/use-auth';
import { fetchWorkspaces } from '@/features/workspaces/api';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/cn';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);

  const workspacesQuery = useQuery({
    queryKey: ['workspaces'],
    queryFn: fetchWorkspaces,
    enabled: isAuthenticated,
  });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-muted text-text-muted">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  const activeWorkspaceId = pathname.match(/\/workspaces\/([^/]+)/)?.[1];

  const sidebar = (
    <>
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <LayoutGrid className="h-5 w-5 text-brand" />
        <Link href="/workspaces" className="text-lg font-semibold tracking-tight text-text">
          FlowBoard
        </Link>
        <button
          type="button"
          className="ml-auto rounded-lg p-2 text-text-muted hover:bg-surface-muted md:hidden"
          onClick={() => setMobileNav(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          Workspaces
        </p>
        <nav className="mt-2 space-y-1">
          {workspacesQuery.data?.map((ws) => (
            <Link
              key={ws.id}
              href={`/workspaces/${ws.id}`}
              className={cn(
                'block rounded-lg px-3 py-2 text-sm transition-colors',
                activeWorkspaceId === ws.id
                  ? 'bg-brand/10 font-medium text-brand'
                  : 'text-text-muted hover:bg-surface-muted hover:text-text',
              )}
            >
              {ws.name}
            </Link>
          ))}
          {!workspacesQuery.data?.length ? (
            <p className="px-3 py-2 text-xs text-text-muted">No workspaces yet</p>
          ) : null}
        </nav>
      </div>
      <div className="border-t border-border p-3 space-y-2">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-muted hover:bg-surface-muted"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2">
          <Avatar name={user?.name ?? 'User'} src={user?.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-text-muted">{user?.email}</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" className="w-full" onClick={() => signOut()}>
          Log out
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-surface-muted">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
        {sidebar}
      </aside>
      {mobileNav ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileNav(false)}
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-sidebar shadow-xl">
            {sidebar}
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-text-muted hover:bg-surface-muted"
            onClick={() => setMobileNav(true)}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold">FlowBoard</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
