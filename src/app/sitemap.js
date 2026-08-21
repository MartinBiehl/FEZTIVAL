import { fetchArtistSlugs } from '../lib/artistQueries.js';
import { SITE_URL } from '../lib/site.js';

/*
 * Inclui apenas as rotas públicas de descoberta: a landing, o catálogo e os
 * perfis de artista. Ficam fora as áreas de acesso (/entrar*), o painel,
 * as reservas do cliente e os formulários de proposta (/reservar/[slug]) —
 * as mesmas rotas bloqueadas em robots.js.
 *
 * /artistas também fica fora: é redirect para /explorar, e listar as duas
 * URLs sinalizaria conteúdo duplicado.
 */
export default async function sitemap() {
  const staticRoutes = [
    { url: '/', changeFrequency: 'weekly', priority: 1 },
    { url: '/explorar', changeFrequency: 'daily', priority: 0.9 },
  ];

  const slugs = await fetchArtistSlugs();
  const artistRoutes = slugs.map((slug) => ({
    url: `/artista/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...staticRoutes, ...artistRoutes].map((route) => ({
    ...route,
    url: `${SITE_URL}${route.url === '/' ? '' : route.url}`,
  }));
}
