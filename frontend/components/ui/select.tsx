import { cn } from '@/lib/cn';
import { SelectHTMLAttributes, forwardRef } from 'react';

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none ring-brand/30 focus:ring-2',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';
