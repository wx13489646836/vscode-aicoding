import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Titanium Cup Showcase v2',
  description:
    'Premium media storefront for pure titanium cups and thermos products.',
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
