import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';

import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'Courte — book your court, play your game',
  description: 'Fast, easy and reliable court booking for the sports you love.',
};

const RootLayout = ({ children }: { children: React.ReactNode }) => (
  <html lang="en" className={inter.className}>
    <body className="flex min-h-screen flex-col bg-neutral-100 text-neutral-900 antialiased">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </body>
  </html>
);

export default RootLayout;
