import { SITE_URL } from '../lib/site.js';

/*
 * Libera as rotas públicas e bloqueia as áreas de acesso, o painel, as reservas
 * do cliente e os formulários de proposta — nenhuma delas é conteúdo de
 * descoberta. As páginas correspondentes também declaram robots noindex na
 * própria metadata; o robots.txt evita o rastreamento, a metadata evita a
 * indexação caso a URL seja alcançada por um link.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/entrar', '/painel', '/minhas-reservas', '/reservar'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
