import { notFound } from 'next/navigation';
import ArtistProfile from '../../../../views/ArtistProfile/ArtistProfile.jsx';
import { fetchArtistBySlug, fetchArtistSlugs } from '../../../../lib/artistQueries.js';
import { artistDescription, artistJsonLd, artistTitle } from '../../../../lib/artistSeo.js';
import { OG_IMAGE, SITE_NAME, SITE_URL } from '../../../../lib/site.js';

/*
 * Cada perfil precisa de título e descrição próprios: sem isso os 8 artistas
 * ficariam indistinguíveis para o buscador. Os textos saem dos dados reais.
 */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const artist = await fetchArtistBySlug(slug);

  // Slug inválido: o próprio Page chama notFound(); aqui só evitamos quebrar.
  if (!artist) return {};

  const title = artistTitle(artist);
  const description = artistDescription(artist);
  const url = `/artista/${artist.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'profile',
      siteName: SITE_NAME,
      locale: 'pt_BR',
      url,
      title,
      description,
      /*
       * Os artistas ainda não têm foto (image: null em todos), e o repositório
       * não tem arte de marca. Com OG_IMAGE nulo, o preview mostra título e
       * descrição sem imagem. Ver src/lib/site.js para ativar.
       */
      ...(OG_IMAGE ? { images: [{ url: OG_IMAGE }] } : {}),
    },
    twitter: {
      card: OG_IMAGE ? 'summary_large_image' : 'summary',
      title,
      description,
      ...(OG_IMAGE ? { images: [OG_IMAGE] } : {}),
    },
  };
}

/*
 * O slug é resolvido aqui, no servidor: notFound() só funciona em Server
 * Component e assim o 404 sai no HTML inicial, com o status correto.
 * A view continua Client Component e recebe o artista por prop.
 */
export default async function Page({ params }) {
  const { slug } = await params;
  const artist = await fetchArtistBySlug(slug);

  if (!artist) notFound();

  /*
   * JSON-LD para o buscador entender que a página descreve um artista
   * contratável. Renderizado no servidor, junto do perfil.
   *
   * O escape de "<" evita injeção de HTML via JSON.stringify, conforme a
   * recomendação da documentação do Next.
   */
  const jsonLd = artistJsonLd(artist, SITE_URL);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
        }}
      />
      <ArtistProfile artist={artist} />
    </>
  );
}

/*
 * Prerender dos perfis no build: HTML estático pronto para indexação,
 * em vez de renderizado sob demanda. Os dados vêm de src/data como hoje.
 */
export async function generateStaticParams() {
  const slugs = await fetchArtistSlugs();
  return slugs.map((slug) => ({ slug }));
}
