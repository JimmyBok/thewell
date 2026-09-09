import type { Metadata } from 'next';
import Link from 'next/link';

import { SearchBox } from '@/components/SearchBox';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Well',
  description: 'Upload text and audio files into folders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header
          className="sticky top-0 z-20 backdrop-blur"
          style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 88%, transparent)' }}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-3">
            <Link href="/" className="text-base font-semibold tracking-tight">
              The Well
            </Link>
            <div className="ml-auto w-full sm:w-72">
              <SearchBox />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>

        <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs muted">
          Text and audio only, 50&nbsp;MB per file.
        </footer>
      </body>
    </html>
  );
}
