import { notFound } from 'next/navigation';
import Contract from '../../../../views/Contract/Contract.jsx';
import { artists } from '../../../../data/landingContent.js';

export default async function Page({ params }) {
  const { slug } = await params;
  const artist = artists.find((item) => item.slug === slug);

  if (!artist) notFound();

  return <Contract artist={artist} />;
}

/*
 * Prerender dos perfis no build: HTML estático pronto para indexação,
 * em vez de renderizado sob demanda. Os dados vêm de src/data como hoje.
 */
export function generateStaticParams() {
  return artists.map((artist) => ({ slug: artist.slug }));
}
