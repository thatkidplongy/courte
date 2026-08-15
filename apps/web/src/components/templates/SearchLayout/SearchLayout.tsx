import type { ReactNode } from 'react';

type SearchLayoutProps = {
  header: ReactNode;
  rail: ReactNode;
  map: ReactNode;
  children: ReactNode;
};

/**
 * Three panes: filters, results, map. The column widths come straight from the mockups, and the
 * map column is `sticky` at full viewport height so it stays put while the result list scrolls —
 * a map that scrolls away is a map nobody uses.
 *
 * Below `lg` the map is dropped rather than stacked. A map under a list is a second scroll
 * region on a small screen, and the phone screens in the design have no map at all.
 */
export const SearchLayout = ({ header, rail, map, children }: SearchLayoutProps) => (
  <div className="flex min-h-screen flex-col">
    {header}
    <div className="flex flex-1 flex-col lg:grid lg:grid-cols-[236px_minmax(0,1fr)_470px]">
      <div className="border-border border-b lg:border-b-0">{rail}</div>

      <main className="min-w-0 px-5 py-6 lg:px-6">{children}</main>

      <div className="border-border hidden border-l lg:block">
        <div className="sticky top-0 h-screen">{map}</div>
      </div>
    </div>
  </div>
);
