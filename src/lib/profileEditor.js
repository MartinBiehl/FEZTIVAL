import 'server-only';
import { query } from './db.js';
import { findOwnArtist } from './account.js';

/*
 * Leitura do editor de perfil (/painel/perfil): o cadastro artistico do
 * usuario da sessao, publicado ou nao -- o dono edita o proprio rascunho.
 */

/* Listas agregadas em JSON, ja na ordem de exibicao: o editor custa uma linha. */
const EDITOR_COLUMNS = `
  id, slug, stage_name, category, city, bio_short, bio_long, base_price,
  price_on_request, color, cover_url, service_area_summary, is_published,
  array(select genre_id from artist_genres where artist_id = artists.id) as genre_ids,
  array(select payment_method_id from artist_payment_methods where artist_id = artists.id) as payment_method_ids,
  array(select venue_type_id from artist_venue_types where artist_id = artists.id) as venue_type_ids,
  array(select city from artist_service_areas where artist_id = artists.id order by sort_order) as service_areas,
  coalesce((
    select json_agg(json_build_object(
      'weekday', weekday, 'is_available', is_available, 'opens_at', opens_at, 'closes_at', closes_at
    )) from artist_weekly_hours where artist_id = artists.id
  ), '[]') as weekly_hours,
  coalesce((
    select json_agg(json_build_object(
      'id', id, 'title', title, 'description', description, 'price', price, 'duration_minutes', duration_minutes
    )) from artist_services where artist_id = artists.id
  ), '[]') as services,
  coalesce((
    select json_agg(json_build_object('id', id, 'status', status, 'title', title, 'detail', detail) order by sort_order)
    from artist_infrastructure where artist_id = artists.id
  ), '[]') as infrastructure,
  coalesce((
    select json_agg(json_build_object('id', id, 'url', url) order by sort_order)
    from artist_media where artist_id = artists.id and type = 'photo'
  ), '[]') as gallery
`;
const hhmm = (value) => (value ? value.slice(0, 5) : '');

function toEditable(row) {
  const hours = new Map(row.weekly_hours.map((entry) => [entry.weekday, entry]));

  return {
    id: row.id,
    slug: row.slug,
    stageName: row.stage_name,
    category: row.category,
    city: row.city ?? '',
    bioShort: row.bio_short ?? '',
    bioLong: row.bio_long ?? '',
    basePrice: row.base_price == null ? '' : String(Number(row.base_price)),
    priceOnRequest: row.price_on_request,
    color: row.color ?? '',
    coverUrl: row.cover_url ?? '',
    serviceAreaSummary: row.service_area_summary ?? '',
    isPublished: row.is_published,
    genreIds: row.genre_ids,
    paymentMethodIds: row.payment_method_ids,
    venueTypeIds: row.venue_type_ids,
    serviceAreas: row.service_areas,
    /* Sempre 7 dias, 0 = domingo. Dia sem linha = nao declarado. */
    weeklyHours: Array.from({ length: 7 }, (_, weekday) => {
      const entry = hours.get(weekday);
      return {
        weekday,
        isAvailable: entry?.is_available ?? false,
        opensAt: hhmm(entry?.opens_at),
        closesAt: hhmm(entry?.closes_at),
      };
    }),
    services: row.services
      .sort((a, b) => (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0))
      .map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description ?? '',
        price: service.price == null ? '' : String(Number(service.price)),
        durationMinutes: service.duration_minutes == null ? '' : String(service.duration_minutes),
      })),
    infrastructure: row.infrastructure.map((item) => ({
      id: item.id,
      status: item.status,
      title: item.title,
      detail: item.detail ?? '',
    })),
    gallery: row.gallery,
  };
}

/* Cadastro artistico do usuario e os catalogos, ou null sem cadastro. */
export async function fetchProfileEditor(userId) {
  const [row, genres, paymentMethods, venueTypes] = await Promise.all([
    findOwnArtist(userId, EDITOR_COLUMNS),
    query('select id, name from genres order by name'),
    query('select id, name from payment_methods order by sort_order'),
    query('select id, name from venue_types order by sort_order'),
  ]);
  if (!row) return null;

  return {
    profile: toEditable(row),
    catalogs: { genres, paymentMethods, venueTypes },
  };
}
