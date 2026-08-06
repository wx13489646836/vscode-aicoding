import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Titanium Cup Showcase - Pure Titanium Drinkware',
  description:
    'A basic English storefront for premium pure titanium cups and thermos products.',
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
