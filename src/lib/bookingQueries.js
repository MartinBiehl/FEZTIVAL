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
              b.duration_minutes, b.guest_count, b.sound_structure, b.message, b.agreed_price, b.artist_payout,
              p.full_name as client_name, p.phone as client_phone
         from bookings b
         join profiles p on p.id = b.client_id
        where b.artist_id = $1
        order by b.event_date`,
      [artist.id],
    ),
    // Perguntas do perfil com a resposta, quando houver; mais antigas primeiro.
    query(
      `select q.id, q.body, q.created_at, an.body as answer
         from questions q
         left join answers an on an.question_id = q.id
        where q.artist_id = $1
        order by q.created_at`,
      [artist.id],
    ),
  ]);

  const questions = questionRows.map((row) => ({
    id: row.id, body: row.body, createdAt: row.created_at, answer: row.answer ?? null,
  }));
  const openQuestions = questions.filter((question) => question.answer == null);
  // Historico para o artista rever o que ja respondeu; mais recentes primeiro.
  const answeredQuestions = questions.filter((question) => question.answer != null).reverse();

  const bookings = rows.map((row) => ({
    id: row.id,
    status: row.status,
    eventDate: row.event_date,
    eventTime: row.event_time,
    durationMinutes: row.duration_minutes,
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
  bookings.forEach((booking) => {
    booking.isPast = booking.eventDate < today;
  });

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
    /*
     * Reservas ativas. Aceitas e confirmadas continuam aqui depois da data:
     * "Marcar como realizado" so faz sentido depois do show, e e a conclusao
     * que libera a avaliacao do contratante. Se sumissem no dia seguinte,
     * nenhuma reserva chegaria a completed. Pendente vencida nao tem mais o
     * que responder e fica de fora. Ordenadas por data: as vencidas, que pedem
     * acao, aparecem primeiro.
     */
    proposals: bookings.filter((booking) => ACTIVE_STATUSES.includes(booking.status)
      && (!booking.isPast || booking.status !== 'pending')),
    nextShows: upcoming.filter((booking) => booking.status === 'confirmed').slice(0, 3),
    openQuestions,
    answeredQuestions,
    metrics: {
      // Mesmo criterio da lista: pendente vencida nao conta como nova.
      pending: bookings.filter((booking) => booking.status === 'pending' && !booking.isPast).length,
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
    /*
     * Artista despublicado sai do join: a reserva aparece como "Artista
     * indisponivel". O WhatsApp do artista so vem depois do aceite: sem RLS,
     * e esta condicao que decide quando o contato e liberado.
     */
    query(
      `select b.id, b.status, b.event_date, b.event_time, b.event_type, b.event_location,
              b.agreed_price, b.guest_count, b.sound_structure, b.message, b.duration_minutes,
              a.slug as artist_slug, a.stage_name as artist_name,
              a.color as artist_color, a.cover_url as artist_cover_url,
              case when b.status in ('accepted', 'confirmed') then p.phone end as artist_phone,
              exists (select 1 from reviews r where r.booking_id = b.id) as reviewed
         from bookings b
         left join artists a on a.id = b.artist_id and a.is_published
         left join profiles p on p.id = a.profile_id
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
    guestCount: row.guest_count,
    soundStructure: row.sound_structure,
    message: row.message,
    durationMinutes: row.duration_minutes,
    artistName: row.artist_name ?? 'Artista indisponível',
    artistSlug: row.artist_slug ?? null,
    artistColor: row.artist_color ?? null,
    artistCoverUrl: row.artist_cover_url ?? null,
    artistPhone: row.artist_phone ?? null,
    reviewed: row.reviewed,
  }));

  return { clientName: profile?.full_name ?? null, bookings };
}
