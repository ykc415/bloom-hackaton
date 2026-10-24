import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'magent — shopping that already knows you',
  description: 'magent learns your brands, sizes and budgets from your order emails, then finds what you will love next at the best price.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f5f7fa' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
