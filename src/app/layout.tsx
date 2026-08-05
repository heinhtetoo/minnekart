import type { Metadata } from 'next';
import { DM_Sans, EB_Garamond } from 'next/font/google';
import './globals.css';

import { env } from '@/lib/env';

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

// Named by role, not by face: the variable outlives any particular font.
// No italic requested — EB Garamond's chancery italic is task 26.
const ebGaramond = EB_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(env().APP_URL),
  title: 'Minnekart',
  description: 'Your journeys, mapped. Pin every place, keep every photograph.',
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${ebGaramond.variable}`}>
      <body>{children}</body>
    </html>
  );
}
