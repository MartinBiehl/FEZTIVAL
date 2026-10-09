import { readArtistImage } from '../../../../lib/mediaStorage.js';

/*
 * Serve as fotos dos artistas gravadas em disco (src/lib/mediaStorage.js).
 *
 * Cada arquivo tem nome unico e nunca e regravado -- trocar a foto gera outro
 * nome --, entao pode ficar em cache para sempre.
 */
export async function GET(_request, { params }) {
  const { artistId, file } = await params;
  const image = await readArtistImage(artistId, `${artistId}/${file}`);
  if (!image) return new Response('Not found', { status: 404 });

  return new Response(image, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
