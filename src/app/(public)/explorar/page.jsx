import Explore from '../../../views/Explore/Explore.jsx';
import { fetchArtists, fetchGenres } from '../../../lib/artistQueries.js';
import { shuffleWithDailySeed } from '../../../lib/dailyShuffle.js';

const DESCRIPTION = 'Navegue pelo catálogo de artistas do Vale do Sinos: DJs, bandas e '
  + 'músicos solo. Filtre por estilo musical e duração do show.';

export const metadata = {
  title: 'Explorar artistas — músicos, DJs e bandas em Ivoti e região',
  description: DESCRIPTION,
  alternates: { canonical: '/explorar' },
  /*
   * Sobrescreve o Open Graph do layout raiz, que descreve a landing. Sem isso,
   * um link de /explorar compartilhado mostraria o título da home.
   */
  openGraph: {
    url: '/explorar',
    title: 'Explorar artistas — músicos, DJs e bandas em Ivoti e região',
    description: DESCRIPTION,
  },
};

/*
 * A ordem "Recomendados" é embaralhada por dia, então a página precisa ser
 * revalidada — sem isso o prerender do build congelaria a semente para sempre.
 * 3600s dá uma vantagem de cache mantendo a virada diária.
 */
export const revalidate = 3600;

export default async function Page() {
  const [artists, genres] = await Promise.all([fetchArtists(), fetchGenres()]);

  /*
   * O embaralhamento acontece AQUI, no servidor: a view é Client Component e
   * embaralhar durante a renderização faria servidor e cliente produzirem
   * ordens diferentes, quebrando a hidratação.
   */
  const recommended = shuffleWithDailySeed(artists, (artist) => artist.slug);

  return <Explore artists={recommended} genres={genres} />;
}
