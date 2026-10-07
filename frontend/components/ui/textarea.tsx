import { cn } from '@/lib/cn';
import { TextareaHTMLAttributes, forwardRef } from 'react';

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-muted outline-none ring-brand/30 focus:ring-2',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
