import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Space_Grotesk } from 'next/font/google';
import './globals.css';

const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const display = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export const metadata: Metadata = {
  title: 'magent — Find what you’ll love',
  description: 'A personal shopping concierge that learns your brands, sizes and budgets from your order emails, then finds what you will love next at the best price.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#f8f9fb' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <a className="skip-link" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
