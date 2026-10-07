import { cn } from '@/lib/cn';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50',
          size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2 text-sm',
          variant === 'primary' &&
            'bg-brand text-white hover:bg-brand-hover',
          variant === 'secondary' &&
            'border border-border bg-surface text-text hover:bg-surface-muted',
          variant === 'ghost' && 'text-text-muted hover:bg-surface-muted',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';
