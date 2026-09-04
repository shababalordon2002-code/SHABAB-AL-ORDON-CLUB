import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export const metadata: Metadata = {
  title: 'Shabab Al Ordon Club | Football Analytics Platform',
  description: 'Plataforma profesional de análisis de fútbol para Shabab Al Ordon Club. Importación y normalización de XMLs de LongoMatch.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased flex flex-col md:flex-row">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header />
          <main className="flex-1 overflow-y-auto w-full p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
