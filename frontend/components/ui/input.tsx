import { cn } from '@/lib/cn';
import { InputHTMLAttributes, forwardRef } from 'react';

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none ring-brand/30 focus:ring-2',
      className,
    )}
    {...props}
  />
));
Input.displayName = 'Input';
