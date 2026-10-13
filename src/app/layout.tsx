import type { Metadata } from 'next';
import { DM_Sans, EB_Garamond } from 'next/font/google';
import './globals.css';

import JsonLd from '@/components/seo/JsonLd';
import { env } from '@/lib/env';
import { organizationSchema, webSiteSchema } from '@/lib/seo/schema';

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
});

// Named by role, not by face: the variable outlives any particular font.
// The italic is the real chancery cut, not a synthesised oblique — it is the
// map-label voice, and the browser only fetches it on pages that render italic.
const ebGaramond = EB_Garamond({
  variable: '--font-serif',
  subsets: ['latin'],
  style: ['normal', 'italic'],
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
  const base = env().APP_URL;

  return (
    <html lang="en" className={`${dmSans.variable} ${ebGaramond.variable}`}>
      <body>
        <JsonLd data={[organizationSchema(base), webSiteSchema(base)]} />
        {children}
      </body>
    </html>
  );
}
