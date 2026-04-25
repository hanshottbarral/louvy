import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Louvy',
  description: 'Escalas de louvor, chat e setlists em tempo real.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

