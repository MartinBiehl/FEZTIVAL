import { supabase } from './supabase.js';

/*
 * Leitura de artistas a partir do banco.
 *
 * As funcoes daqui rodam em Server Component. A forma do objeto devolvido
 * imita a que src/data expunha, para que os componentes de tela continuem
 * iguais -- com uma diferenca importante: campos que o banco nao tem vem
 * nulos ou vazios, nunca preenchidos com valor inventado.
 *
 * A leitura passa pela RLS com a chave publishable, portanto so retorna
 * artistas com is_published = true.
 */

/* Enum do banco -> rotulo exibido. O banco tem 3 categorias, nao 5. */
const CATEGORY_LABEL = {
  dj: 'DJ',
  band: 'Banda',
  solo: 'Músico Solo',
};

export function categoryLabel(value) {
  return CATEGORY_LABEL[value] ?? value;
}

/*
 * Converte a linha do banco na forma que as telas consomem.
 *
 * rating e reviews vem do resumo de artist_review_summary (null/0 quando o
 * artista ainda nao foi avaliado). setMinutes fica vazio quando o artista nao
 * cadastrou servicos. Os componentes tratam ambos os casos.
 */
function toArtist(row, summary) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.stage_name,
    category: categoryLabel(row.category),
    categoryValue: row.category,
    genres: (row.artist_genres ?? [])
      .map((link) => link.genres?.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    price: row.base_price == null ? null : Number(row.base_price),
    priceOnRequest: row.price_on_request,
    location: row.city,
    /* Token --artist-color, usado no cartao, no perfil e nos modais. */
    color: row.color,
    bioShort: row.bio_short,
    bioLong: row.bio_long,
    coverUrl: row.cover_url,
    // Sem avaliacao a interface exibe "Novo na plataforma".
    rating: summary ? Number(summary.rating_avg) : null,
    reviews: summary?.rating_count ?? 0,
    services: mapServices(row),
    /* Alimenta o filtro de duracao do catalogo e o seletor do formulario. */
    setMinutes: mapServices(row)
      .map((service) => service.durationMinutes)
      .filter((minutes) => minutes != null)
      .sort((a, b) => a - b),
  };
}

/* Colunas do catalogo: o /explorar so precisa do cartao. */
/* 0 = domingo, 6 = sabado (convencao de artist_weekly_hours e Date.getDay()). */
const WEEKDAY_LABEL = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
];

const INFRASTRUCTURE_LABEL = {
  included: 'Incluso',
  negotiable: 'A combinar',
  required: 'Necessário no local',
};

/* "09:00:00" -> "09h"; "10:30:00" -> "10h30" */
function formatTime(value) {
  if (!value) return null;
  const [hour, minute] = value.split(':');
  return minute === '00' ? `${hour}h` : `${hour}h${minute}`;
}

const bySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);

/* Servicos ordenados por duracao, do mais curto ao mais longo. */
function mapServices(row) {
  return (row.artist_services ?? [])
    .map((service) => ({
      id: service.id,
      title: service.title,
      detail: service.description,
      price: service.price == null ? null : Number(service.price),
      durationMinutes: service.duration_minutes,
    }))
    .sort((a, b) => (a.durationMinutes ?? 0) - (b.durationMinutes ?? 0));
}

/*
 * Detalhe do perfil: acrescenta ao cartao tudo que o artista declarou.
 *
 * Cada lista pode vir vazia -- as tabelas existem, mas um artista novo nao
 * preencheu nada. As telas tratam o vazio ocultando a secao correspondente,
 * em vez de exibir texto de preenchimento.
 */
function toArtistDetail(row, summary, reviews) {
  return {
    ...toArtist(row, summary),
    reviewList: (reviews ?? []).map((review) => ({
      rating: review.rating,
      comment: review.comment,
      eventType: review.event_type,
      createdAt: review.created_at,
    })),
    bioLong: row.bio_long,
    viewCount: row.view_count ?? 0,
    mediaGallery: [...(row.artist_media ?? [])].sort(bySortOrder).map((item) => ({
      type: item.type,
      src: item.url,
      alt: item.caption,
    })),
    serviceAreas: {
      summary: row.service_area_summary,
      locations: [...(row.artist_service_areas ?? [])].sort(bySortOrder)
        .map((area) => area.city),
    },
    infrastructure: [...(row.artist_infrastructure ?? [])].sort(bySortOrder)
      .map((item) => ({
        status: INFRASTRUCTURE_LABEL[item.status] ?? item.status,
        title: item.title,
        detail: item.detail,
      })),
    weeklyHours: [...(row.artist_weekly_hours ?? [])]
      .sort((a, b) => a.weekday - b.weekday)
      .map((entry) => ({
        day: WEEKDAY_LABEL[entry.weekday] ?? `Dia ${entry.weekday}`,
        hours: entry.is_available
          ? `${formatTime(entry.opens_at)} às ${formatTime(entry.closes_at)}`
          : 'Não atende',
        available: entry.is_available,
      })),
    paymentMethods: (row.artist_payment_methods ?? [])
      .map((link) => link.payment_methods)
      .filter(Boolean)
      .sort(bySortOrder)
      .map((method) => ({ name: method.name, detail: method.detail })),
    venueTypes: (row.artist_venue_types ?? [])
      .map((link) => link.venue_types)
      .filter(Boolean)
      .sort(bySortOrder)
      .map((venue) => venue.name),
  };
}

const ARTIST_LIST_COLUMNS = `
  id, slug, stage_name, category, city, base_price, price_on_request,
  bio_short, cover_url, color,
  artist_genres ( genres ( name, slug ) ),
  artist_services ( id, title, description, price, duration_minutes )
`;

/*
 * O perfil carrega tudo que o artista declarou. Uma unica consulta com joins
 * evita a cascata de requisicoes que separar em varias traria.
 */
const ARTIST_DETAIL_COLUMNS = `
  ${ARTIST_LIST_COLUMNS},
  bio_long, service_area_summary, view_count,
  artist_media ( type, url, caption, sort_order ),
  artist_service_areas ( city, sort_order ),
  artist_infrastructure ( status, title, detail, sort_order ),
  artist_weekly_hours ( weekday, is_available, opens_at, closes_at ),
  artist_payment_methods ( payment_methods ( name, detail, sort_order ) ),
  artist_venue_types ( venue_types ( name, sort_order ) )
`;

/*
 * Nota media e contagem por artista. Vem de uma funcao security definer
 * porque a nota deriva de bookings, que o publico nao le (ver a migration
 * private_contacts_and_artist_ratings).
 */
async function fetchReviewSummaries() {
  const { data, error } = await supabase.rpc('artist_review_summary');
  if (error) throw new Error(`Falha ao carregar avaliacoes: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.artist_id, row]));
}

/* Todos os artistas publicados, para o catalogo. */
export async function fetchArtists() {
  const [{ data, error }, summaries] = await Promise.all([
    supabase.from('artists').select(ARTIST_LIST_COLUMNS).eq('is_published', true),
    fetchReviewSummaries(),
  ]);

  if (error) throw new Error(`Falha ao carregar artistas: ${error.message}`);

  return (data ?? []).map((row) => toArtist(row, summaries.get(row.id)));
}

/* Um artista por slug, ou null quando nao existe (a rota responde 404). */
export async function fetchArtistBySlug(slug) {
  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_DETAIL_COLUMNS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o artista ${slug}: ${error.message}`);
  if (!data) return null;

  const [summaries, { data: reviews, error: reviewsError }] = await Promise.all([
    fetchReviewSummaries(),
    supabase.rpc('artist_reviews', { target_slug: slug }),
  ]);
  if (reviewsError) throw new Error(`Falha ao carregar avaliacoes de ${slug}: ${reviewsError.message}`);

  return toArtistDetail(data, summaries.get(data.id), reviews);
}

/* Slugs publicados, usados por generateStaticParams e pelo sitemap. */
export async function fetchArtistSlugs() {
  const { data, error } = await supabase
    .from('artists')
    .select('slug')
    .eq('is_published', true);

  if (error) throw new Error(`Falha ao carregar slugs: ${error.message}`);

  return (data ?? []).map((row) => row.slug);
}

/* Catalogo de generos, para o filtro do /explorar. */
export async function fetchGenres() {
  const { data, error } = await supabase
    .from('genres')
    .select('name, slug')
    .order('name');

  if (error) throw new Error(`Falha ao carregar generos: ${error.message}`);

  return data ?? [];
}
