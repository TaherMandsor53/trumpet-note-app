import type { Metadata } from 'next';
import { StoreProvider } from '@/store/StoreProvider';
import { ThemeWrapper } from '@/components/layout/ThemeWrapper';
import './globals.css';

export const metadata: Metadata = {
  title: 'Taheri Scout Band Group | Official Portal',
  description:
    'Comprehensive Role-Based Access Control, sheet music catalog, practice attendance tracking, Lavajam contributions, and musical transposer for Taheri Scout Band Group.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen selection:bg-amber-500 selection:text-black">
        <StoreProvider>
          <ThemeWrapper>{children}</ThemeWrapper>
        </StoreProvider>
      </body>
    </html>
  );
}
