'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/providers/toast-provider';
import { useAuth } from '@/features/auth/use-auth';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { toast } = useToast();
  const { loginWithEmail, isAuthenticated, isLoading } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/workspaces');
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-text">Sign in to FlowBoard</h1>
        <p className="mt-1 text-sm text-text-muted">
          Collaborate on boards in real time.
        </p>
        <form
          className="mt-6 space-y-4"
          onSubmit={handleSubmit(async (values) => {
            try {
              await loginWithEmail(values.email, values.password);
              router.push(params.get('next') ?? '/workspaces');
            } catch (e) {
              toast(
                e instanceof Error ? e.message : 'Login failed',
                'error',
              );
            }
          })}
        >
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input type="email" className="mt-1" {...register('email')} />
            {errors.email ? (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            ) : null}
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input type="password" className="mt-1" {...register('password')} />
            {errors.password ? (
              <p className="mt-1 text-xs text-red-600">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            Sign in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-text-muted">
          No account?{' '}
          <Link href="/register" className="text-brand hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
