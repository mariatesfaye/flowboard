import { cn } from '@/lib/cn';
import { userInitials } from '@/lib/task-ui';

export function Avatar({
  name,
  src,
  size = 'sm',
  className,
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dim = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={cn('rounded-full object-cover', dim, className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-brand/10 font-semibold text-brand',
        dim,
        className,
      )}
      title={name}
    >
      {userInitials(name)}
    </span>
  );
}
