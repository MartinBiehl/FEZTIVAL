import Explore from '../../../views/Explore/Explore.jsx';

export const metadata = {
  title: 'Explorar artistas — músicos, DJs e bandas em Ivoti e região',
  description:
    'Navegue pelo catálogo de artistas do Vale do Sinos: DJs, bandas, cantores e '
    + 'músicos solo. Filtre por estilo, distância e duração do show.',
  alternates: { canonical: '/explorar' },
  /*
   * Sobrescreve o Open Graph do layout raiz, que descreve a landing. Sem isso,
   * um link de /explorar compartilhado mostraria o título da home.
   */
  openGraph: {
    url: '/explorar',
    title: 'Explorar artistas — músicos, DJs e bandas em Ivoti e região',
    description:
      'Navegue pelo catálogo de artistas do Vale do Sinos: DJs, bandas, cantores e '
      + 'músicos solo. Filtre por estilo, distância e duração do show.',
  },
};

export default function Page() {
  return <Explore />;
}
