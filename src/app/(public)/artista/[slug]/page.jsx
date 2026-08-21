import { notFound } from 'next/navigation';
import ArtistProfile from '../../../../views/ArtistProfile/ArtistProfile.jsx';
import { artists } from '../../../../data/landingContent.js';

/*
 * O slug é resolvido aqui, no servidor: notFound() só funciona em Server
 * Component e assim o 404 sai no HTML inicial, com o status correto.
 * A view continua Client Component e recebe o artista por prop.
 */
export default async function Page({ params }) {
  const { slug } = await params;
  const artist = artists.find((item) => item.slug === slug);

  if (!artist) notFound();

  return <ArtistProfile artist={artist} />;
}

/*
 * Prerender dos perfis no build: HTML estático pronto para indexação,
 * em vez de renderizado sob demanda. Os dados vêm de src/data como hoje.
 */
export function generateStaticParams() {
  return artists.map((artist) => ({ slug: artist.slug }));
}
