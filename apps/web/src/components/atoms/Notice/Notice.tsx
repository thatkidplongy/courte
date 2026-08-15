import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type NoticeTone = 'success' | 'error' | 'info';

type NoticeProps = {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
};

const TONE_CLASSES: Record<NoticeTone, string> = {
  success: 'bg-accent text-accent-foreground',
  error: 'bg-destructive/10 text-destructive',
  info: 'bg-muted text-foreground',
};

/**
 * The one message strip. Every form in the app was growing its own `bg-red-50` block, which is
 * how two greens and three reds got into the codebase in the first place.
 *
 * An error carries `role="alert"` so it is announced when it appears after a submit — the whole
 * point of the strip is that it shows up in response to something you just did.
 */
export const Notice = ({ tone, children, className }: NoticeProps) => (
  <div
    role={tone === 'error' ? 'alert' : undefined}
    className={cn('rounded-md px-4 py-3 text-sm font-medium', TONE_CLASSES[tone], className)}
  >
    {children}
  </div>
);
