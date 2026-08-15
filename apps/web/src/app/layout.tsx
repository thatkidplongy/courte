import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';

import { MobileTabBar } from '@/components/organisms/MobileTabBar';

import './globals.css';

/**
 * One family for everything. The design system pairs Archivo with Archivo and separates
 * heading from body by weight alone — 800 for display, 600/700 for labels, 400 for copy —
 * so the whole scale has to be loaded rather than the usual regular/bold pair.
 */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Courte — book your court, play your game',
  description: 'Fast, easy and reliable court booking for the sports you love.',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={archivo.variable}>
    {/* No chrome here on purpose: each route group brings its own header, because the mockups
        give the marketing, search, booking and venue screens four different ones. */}
    {/* `pb-16` on small screens clears the fixed tab bar, which would otherwise sit on top of
        whatever the last element of the page happens to be. */}
    <body className="bg-background text-foreground flex min-h-screen flex-col pb-16 font-sans antialiased lg:pb-0">
      {children}
      <MobileTabBar />
    </body>
  </html>
);

export default RootLayout;
