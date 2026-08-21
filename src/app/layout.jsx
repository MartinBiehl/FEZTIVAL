import { AuthProvider } from '../context/AuthContext.jsx';
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '../lib/site.js';
import '../styles/fonts.css';
import '../styles/variables.css';
import '../styles/global.css';

export const metadata = {
  /*
   * metadataBase resolve as URLs relativas de Open Graph e do sitemap, para que
   * o domínio fique definido só em src/lib/site.js.
   */
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Feztival — Talento local para momentos que ficam',
    // As rotas definem só o próprio título; a marca é acrescentada aqui.
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  /*
   * Open Graph e Twitter Card no layout raiz: as rotas herdam e sobrescrevem
   * apenas title/description. Sem imagem por ora — o repositório não tem arte
   * de marca e os artistas não têm foto. Ver OG_IMAGE em src/lib/site.js.
   */
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'pt_BR',
    url: '/',
    title: 'Feztival — Talento local para momentos que ficam',
    description: SITE_DESCRIPTION,
    ...(OG_IMAGE ? { images: [{ url: OG_IMAGE }] } : {}),
  },
  twitter: {
    card: OG_IMAGE ? 'summary_large_image' : 'summary',
    title: 'Feztival — Talento local para momentos que ficam',
    description: SITE_DESCRIPTION,
    ...(OG_IMAGE ? { images: [OG_IMAGE] } : {}),
  },
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
          Syne (títulos e marca) vem do Google Fonts. O CSS referencia 'Syne'
          por nome literal em ~44 declarações; next/font geraria nomes com hash
          e exigiria reescrever todas elas.

          Inter saiu do carregamento: a fonte de interface passou a ser SF Pro,
          servida localmente por src/styles/fonts.css, e nenhuma regra de CSS
          referencia 'Inter' mais.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
