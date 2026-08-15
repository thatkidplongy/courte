import { SiteFooter } from '@/components/organisms/SiteFooter';
import { SiteHeader } from '@/components/organisms/SiteHeader';

/**
 * The chrome for the pages that are still selling something — the landing page and a signed-in
 * reader's own bookings. The search, booking and venue-management screens each draw their own
 * header instead, because in the mockups they do: once you are searching, the search bar is the
 * navigation, and a marketing nav above it would be a second row of chrome doing nothing.
 */
const SiteLayout = ({ children }: { children: React.ReactNode }) => (
  <>
    <SiteHeader />
    <div className="flex-1">{children}</div>
    <SiteFooter />
  </>
);

export default SiteLayout;
