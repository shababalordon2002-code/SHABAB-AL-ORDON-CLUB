import type { Metadata } from 'next';
import './globals.css';
import { AppLayoutWrapper } from '@/components/layout/AppLayoutWrapper';

export const metadata: Metadata = {
  title: 'Shabab Al Ordon Club | Football Analytics Platform',
  description: 'Plataforma profesional de análisis de fútbol para Shabab Al Ordon Club.',
  icons: {
    icon: '/logo.png?v=3',
    shortcut: '/logo.png?v=3',
    apple: '/logo.png?v=3',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased">
        <AppLayoutWrapper>{children}</AppLayoutWrapper>
      </body>
    </html>
  );
}
