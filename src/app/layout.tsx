import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/providers';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'كورسة',
  description: 'Sports Event & Race Management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${geist.className} h-full bg-gray-50`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
