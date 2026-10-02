'use server';

import { cookies } from 'next/headers';
import { supabase } from './supabase.js';

const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24;
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/*
 * Conta uma visualizacao do perfil, no maximo uma por visitante a cada 24h.
 *
 * O perfil e HTML estatico, entao a contagem e disparada pelo navegador. O
 * cookie evita que F5 infle o numero; increment_artist_view_count (security
 * definer) so incrementa artistas publicados e nao devolve nada.
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

  await supabase.rpc('increment_artist_view_count', { target_slug: slug });
}
