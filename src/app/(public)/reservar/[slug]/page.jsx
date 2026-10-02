import { notFound } from 'next/navigation';
import Contract from '../../../../views/Contract/Contract.jsx';
import { fetchArtistBySlug, fetchArtistSlugs } from '../../../../lib/artistQueries.js';

/*
 * Formulário de proposta, não conteúdo de descoberta: fica fora do índice.
 * O título ainda é útil para a aba do navegador e o histórico.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const artist = await fetchArtistBySlug(slug);

  if (!artist) return {};

  return {
    title: `Pedir proposta para ${artist.name}`,
    description: `Envie os detalhes do seu evento para ${artist.name}.`,
    robots: { index: false, follow: false },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const artist = await fetchArtistBySlug(slug);

  if (!artist) notFound();

  return <Contract artist={artist} />;
}

/*
 * Prerender dos perfis no build: HTML estático pronto para indexação,
 * em vez de renderizado sob demanda.
 *
 * Slugs que surgirem depois do build (artista publicado pelo cadastro) são
 * renderizados no primeiro acesso, e revalidate atualiza os já gerados.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await fetchArtistSlugs();
  return slugs.map((slug) => ({ slug }));
}
