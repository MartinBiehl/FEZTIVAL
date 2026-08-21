import '../styles/variables.css';
import '../styles/global.css';

export const metadata = {
  title: 'Feztival — Talento local para momentos que ficam',
  description:
    'Descubra e contrate músicos, DJs e bandas de Ivoti e região para fazer seu evento acontecer.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4f2ec',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <head>
        {/*
          Fontes carregadas por <link>, exatamente como no index.html do Vite.
          O CSS de páginas e componentes referencia 'Inter' e 'Syne' por nome
          literal em ~50 declarações; next/font geraria nomes com hash e exigiria
          reescrever todas elas. Migração para next/font fica para a Fase 2.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
