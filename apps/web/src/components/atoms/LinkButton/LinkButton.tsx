import type { ComponentProps } from 'react';

import Link from 'next/link';

import { Button } from '@/components/shadcn/ui/button';

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
};

/**
 * A link that looks like a button. Base UI's Button assumes it renders a real `<button>` and
 * warns when it does not, so anything navigational has to opt out with `nativeButton={false}` —
 * this is the one place that gets remembered, rather than at every call site.
 *
 * An anchor rather than a button-with-onClick on purpose: it is a destination, so it should
 * middle-click, open in a new tab and show its href on hover like any other link.
 */
export const LinkButton = ({ variant, size, ...linkProps }: LinkButtonProps) => (
  <Button variant={variant} size={size} nativeButton={false} render={<Link {...linkProps} />} />
);
