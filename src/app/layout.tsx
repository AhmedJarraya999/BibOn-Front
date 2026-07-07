import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/layout/providers';

export const metadata: Metadata = {
  title: 'كورسة',
  description: 'Sports Event & Race Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
