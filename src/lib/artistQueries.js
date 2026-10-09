import 'server-only';
import { query, queryOne } from './db.js';

/*
 * Leitura de artistas a partir do banco.
 *
 * As funcoes daqui rodam em Server Component. A forma do objeto devolvido
 * imita a que src/data expunha, para que os componentes de tela continuem
 * iguais -- com uma diferenca importante: campos que o banco nao tem vem
 * nulos ou vazios, nunca preenchidos com valor inventado.
 *
 * Toda consulta daqui filtra is_published = true: o publico nunca ve
 * rascunho. Nao remova esse filtro -- o banco nao tem mais RLS para barrar.
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
    genres: [...row.genres].sort((a, b) => a.localeCompare(b, 'pt-BR')),
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

/* Servicos ordenados por duracao, do mais curto ao mais longo. */
function mapServices(row) {
  return row.services
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
    /* So perguntas e respostas publicadas, e sem o autor: profiles nao e publico. */
    questions: row.questions.map((question) => ({
      id: question.id,
      body: question.body,
      createdAt: question.created_at,
      answer: question.answer,
    })),
    /* So fotos: o editor ainda nao envia audio nem video, e o lightbox exibe <img>. */
    mediaGallery: row.photos.map((item, index) => ({
      id: item.id,
      type: item.type,
      src: item.url,
      alt: item.caption || `${row.stage_name}, foto ${index + 1}`,
      featured: index === 0,
    })),
    serviceAreas: {
      summary: row.service_area_summary,
      locations: row.service_areas,
    },
    infrastructure: row.infrastructure.map((item) => ({
      status: INFRASTRUCTURE_LABEL[item.status] ?? item.status,
      title: item.title,
      detail: item.detail,
    })),
    weeklyHours: row.weekly_hours.map((entry) => ({
      day: WEEKDAY_LABEL[entry.weekday] ?? `Dia ${entry.weekday}`,
      hours: entry.is_available
        ? `${formatTime(entry.opens_at)} às ${formatTime(entry.closes_at)}`
        : 'Não atende',
      available: entry.is_available,
    })),
    paymentMethods: row.payment_methods,
    venueTypes: row.venue_types,
  };
}

/*
 * Colunas do catalogo: o /explorar so precisa do cartao. As listas vem
 * agregadas em JSON, ja na ordem de exibicao, para cada artista custar uma
 * linha so -- sem cascata de consultas.
 */
const ARTIST_LIST_COLUMNS = `
  a.id, a.slug, a.stage_name, a.category, a.city, a.base_price, a.price_on_request,
  a.bio_short, a.cover_url, a.color,
  array(
    select g.name from artist_genres ag join genres g on g.id = ag.genre_id
     where ag.artist_id = a.id
  ) as genres,
  coalesce((
    select json_agg(json_build_object(
      'id', s.id, 'title', s.title, 'description', s.description,
      'price', s.price, 'duration_minutes', s.duration_minutes
    ))
    from artist_services s where s.artist_id = a.id
  ), '[]') as services
`;

/* O perfil carrega tudo que o artista declarou, na mesma consulta. */
const ARTIST_DETAIL_COLUMNS = `
  ${ARTIST_LIST_COLUMNS},
  a.bio_long, a.service_area_summary, a.view_count,
  coalesce((
    select json_agg(json_build_object('id', m.id, 'type', m.type, 'url', m.url, 'caption', m.caption)
                    order by m.sort_order)
    from artist_media m where m.artist_id = a.id and m.type = 'photo'
  ), '[]') as photos,
  coalesce((
    select json_agg(json_build_object('id', q.id, 'body', q.body, 'created_at', q.created_at, 'answer', an.body)
                    order by q.created_at desc)
    from questions q
    left join answers an on an.question_id = q.id and an.moderation_status = 'published'
    where q.artist_id = a.id and q.moderation_status = 'published'
  ), '[]') as questions,
  array(
    select sa.city from artist_service_areas sa where sa.artist_id = a.id order by sa.sort_order
  ) as service_areas,
  coalesce((
    select json_agg(json_build_object('status', i.status, 'title', i.title, 'detail', i.detail)
                    order by i.sort_order)
    from artist_infrastructure i where i.artist_id = a.id
  ), '[]') as infrastructure,
  coalesce((
    select json_agg(json_build_object(
      'weekday', h.weekday, 'is_available', h.is_available, 'opens_at', h.opens_at, 'closes_at', h.closes_at
    ) order by h.weekday)
    from artist_weekly_hours h where h.artist_id = a.id
  ), '[]') as weekly_hours,
  coalesce((
    select json_agg(json_build_object('name', pm.name, 'detail', pm.detail) order by pm.sort_order)
    from artist_payment_methods apm join payment_methods pm on pm.id = apm.payment_method_id
    where apm.artist_id = a.id
  ), '[]') as payment_methods,
  array(
    select vt.name from artist_venue_types avt join venue_types vt on vt.id = avt.venue_type_id
     where avt.artist_id = a.id order by vt.sort_order
  ) as venue_types
`;

/*
 * Nota media e contagem por artista publicado. A nota deriva de bookings,
 * que nunca e exposta: artist_review_summary devolve so o agregado.
 */
async function fetchReviewSummaries() {
  const rows = await query('select * from artist_review_summary()');
  return new Map(rows.map((row) => [row.artist_id, row]));
}

/* Todos os artistas publicados, para o catalogo. */
export async function fetchArtists() {
  const [rows, summaries] = await Promise.all([
    query(`select ${ARTIST_LIST_COLUMNS} from artists a where a.is_published`),
    fetchReviewSummaries(),
  ]);
  return rows.map((row) => toArtist(row, summaries.get(row.id)));
}

/* Um artista por slug, ou null quando nao existe (a rota responde 404). */
export async function fetchArtistBySlug(slug) {
  const row = await queryOne(
    `select ${ARTIST_DETAIL_COLUMNS} from artists a where a.slug = $1 and a.is_published`,
    [slug],
  );
  if (!row) return null;

  const [summaries, reviews] = await Promise.all([
    fetchReviewSummaries(),
    query('select * from artist_reviews($1)', [slug]),
  ]);
  return toArtistDetail(row, summaries.get(row.id), reviews);
}

/* Slugs publicados, usados por generateStaticParams e pelo sitemap. */
export async function fetchArtistSlugs() {
  const rows = await query('select slug from artists where is_published');
  return rows.map((row) => row.slug);
}

/* Catalogo de generos, para o filtro do /explorar. */
export function fetchGenres() {
  return query('select name, slug from genres order by name');
}
