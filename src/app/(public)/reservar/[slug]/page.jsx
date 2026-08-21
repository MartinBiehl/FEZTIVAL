import { notFound } from 'next/navigation';
import Contract from '../../../../views/Contract/Contract.jsx';
import { artists } from '../../../../data/landingContent.js';

/*
 * Formulário de proposta, não conteúdo de descoberta: fica fora do índice.
 * O título ainda é útil para a aba do navegador e o histórico.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const artist = artists.find((item) => item.slug === slug);

  if (!artist) return {};

  return {
    title: `Pedir proposta para ${artist.name}`,
    description: `Envie os detalhes do seu evento para ${artist.name}.`,
    robots: { index: false, follow: false },
  };
}

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
