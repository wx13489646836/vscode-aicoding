import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Titanium Cup Showcase',
  description: 'A Node.js and Next.js foundation for a premium titanium cup storefront.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
