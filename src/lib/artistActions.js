'use server';

import { cookies } from 'next/headers';
import { query } from './db.js';

const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/*
 * Conta uma visualizacao do perfil, no maximo uma por visitante a cada 24h.
 *
 * O perfil e HTML estatico, entao a contagem e disparada pelo navegador. O
 * cookie evita que F5 infle o numero. So conta artista publicado.
 */
export async function recordArtistView(slug) {
  if (typeof slug !== 'string' || !SLUG_PATTERN.test(slug)) return;

  const cookieStore = await cookies();
  const cookieName = `fz_view_${slug}`;
  if (cookieStore.has(cookieName)) return;

  cookieStore.set(cookieName, '1', {
    maxAge: VIEW_COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });

  await query('update artists set view_count = view_count + 1 where slug = $1 and is_published', [slug]);
}
