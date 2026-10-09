import 'server-only';
import { query, queryOne } from './db.js';
import { findOwnArtist } from './account.js';
import { addDaysIso, todayIso } from './bookingDisplay.js';

/*
 * Leituras das areas autenticadas. Recebem o id do usuario da sessao
 * (getCurrentUser) e o filtro por ele, dentro de cada query, E a protecao:
 * o banco nao tem RLS. Toda leitura nova daqui precisa do mesmo filtro.
 */

const ACTIVE_STATUSES = ['pending', 'accepted', 'confirmed'];

/*
 * Painel do artista: o cadastro artistico do usuario, as propostas recebidas e
 * as metricas derivadas delas. null quando o usuario nao tem cadastro de
 * artista.
 */
export async function fetchArtistDashboard(userId) {
  const artist = await findOwnArtist(userId, 'id, slug, stage_name, is_published, view_count');
  if (!artist) return null;

  const [rows, questionRows] = await Promise.all([
    /* O contato do contratante aparece so para o artista da reserva. */
    query(
      `select b.id, b.status, b.event_date, b.event_time, b.event_location, b.event_type,
              b.guest_count, b.sound_structure, b.message, b.agreed_price, b.artist_payout,
              p.full_name as client_name, p.phone as client_phone
         from bookings b
         join profiles p on p.id = b.client_id
        where b.artist_id = $1
        order by b.event_date`,
      [artist.id],
    ),
    // Perguntas do perfil ainda sem resposta, mais antigas primeiro.
    query(
      `select q.id, q.body, q.created_at
         from questions q
        where q.artist_id = $1
          and not exists (select 1 from answers an where an.question_id = q.id)
        order by q.created_at`,
      [artist.id],
    ),
  ]);

  const openQuestions = questionRows
    .map((row) => ({ id: row.id, body: row.body, createdAt: row.created_at }));

  const bookings = rows.map((row) => ({
    id: row.id,
    status: row.status,
    eventDate: row.event_date,
    eventTime: row.event_time,
    location: row.event_location,
    eventType: row.event_type,
    guestCount: row.guest_count,
    soundStructure: row.sound_structure,
    message: row.message,
    agreedPrice: row.agreed_price == null ? null : Number(row.agreed_price),
    artistPayout: row.artist_payout == null ? null : Number(row.artist_payout),
    clientName: row.client_name ?? 'Contratante',
    clientPhone: row.client_phone ?? null,
  }));

  const today = todayIso();
  const in30Days = addDaysIso(today, 30);
  const monthPrefix = today.slice(0, 7);
  const upcoming = bookings.filter((booking) => booking.eventDate >= today);

  return {
    artist: {
      slug: artist.slug,
      name: artist.stage_name,
      isPublished: artist.is_published,
      viewCount: artist.view_count ?? 0,
    },
    /* Ativas e futuras primeiro; o historico fica fora do painel. */
    proposals: upcoming.filter((booking) => ACTIVE_STATUSES.includes(booking.status)),
    nextShows: upcoming.filter((booking) => booking.status === 'confirmed').slice(0, 3),
    openQuestions,
    metrics: {
      pending: bookings.filter((booking) => booking.status === 'pending').length,
      confirmedNext30: upcoming.filter(
        (booking) => booking.status === 'confirmed' && booking.eventDate <= in30Days,
      ).length,
      /* Repasse ao artista (ja descontada a comissao) dos shows aceitos ou confirmados no mes. */
      payoutThisMonth: bookings
        .filter((booking) => ['accepted', 'confirmed'].includes(booking.status)
          && booking.eventDate.startsWith(monthPrefix))
        .reduce((sum, booking) => sum + (booking.artistPayout ?? 0), 0),
    },
  };
}

/* "Minhas reservas": tudo que o usuario pediu, com o artista e a avaliacao. */
export async function fetchClientBookings(userId) {
  const [profile, rows] = await Promise.all([
    queryOne('select full_name from profiles where id = $1', [userId]),
    /* Artista despublicado sai do join: a reserva aparece como "Artista indisponivel". */
    query(
      `select b.id, b.status, b.event_date, b.event_time, b.event_type, b.event_location,
              b.agreed_price, a.slug as artist_slug, a.stage_name as artist_name,
              a.color as artist_color,
              exists (select 1 from reviews r where r.booking_id = b.id) as reviewed
         from bookings b
         left join artists a on a.id = b.artist_id and a.is_published
        where b.client_id = $1
        order by b.event_date`,
      [userId],
    ),
  ]);

  const bookings = rows.map((row) => ({
    id: row.id,
    status: row.status,
    eventDate: row.event_date,
    eventTime: row.event_time,
    eventType: row.event_type,
    location: row.event_location,
    agreedPrice: row.agreed_price == null ? null : Number(row.agreed_price),
    artistName: row.artist_name ?? 'Artista indisponível',
    artistSlug: row.artist_slug ?? null,
    artistColor: row.artist_color ?? null,
    reviewed: row.reviewed,
  }));

  return { clientName: profile?.full_name ?? null, bookings };
}
