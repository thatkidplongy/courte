import '@testing-library/jest-dom/vitest';

import type { AnchorHTMLAttributes, ReactNode } from 'react';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

/**
 * The single place cross-cutting test setup lives. Anything a majority of test files would
 * otherwise import goes here — per-file duplication is how setup drifts.
 */

afterEach(cleanup);

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { children: ReactNode; href: string };

/**
 * next/link expects an app router in context. Components under test assert on the rendered
 * href rather than on navigation, so a plain anchor is the honest stand-in.
 */
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: LinkProps) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
