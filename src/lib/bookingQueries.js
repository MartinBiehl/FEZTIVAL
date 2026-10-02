import { addDaysIso, todayIso } from './bookingDisplay.js';

/*
 * Leituras das areas autenticadas. Recebem o cliente com sessao
 * (createServerSupabase): a RLS de bookings so devolve as reservas em que o
 * usuario e contratante ou dono do artista, entao nao ha filtro de seguranca
 * aqui -- os .eq() abaixo apenas escolhem qual dos dois lados mostrar.
 */

const ACTIVE_STATUSES = ['pending', 'accepted', 'confirmed'];

/*
 * Painel do artista: o cadastro artistico do usuario, as propostas recebidas e
 * as metricas derivadas delas. null quando o usuario nao tem cadastro de
 * artista.
 */
export async function fetchArtistDashboard(supabase, userId) {
  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, slug, stage_name, is_published, view_count')
    .eq('profile_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  if (artistError) throw new Error(`Falha ao carregar o painel: ${artistError.message}`);
  if (!artist) return null;

  const { data: rows, error } = await supabase
    .from('bookings')
    .select(`
      id, status, event_date, event_time, event_location, event_type, guest_count,
      sound_structure, message, agreed_price, artist_payout, created_at,
      client:profiles ( full_name, phone )
    `)
    .eq('artist_id', artist.id)
    .order('event_date');

  if (error) throw new Error(`Falha ao carregar as propostas: ${error.message}`);

  const bookings = (rows ?? []).map((row) => ({
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
    clientName: row.client?.full_name ?? 'Contratante',
    clientPhone: row.client?.phone ?? null,
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
export async function fetchClientBookings(supabase, userId) {
  const [{ data: profile }, { data: rows, error }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
    supabase
      .from('bookings')
      .select(`
        id, status, event_date, event_time, event_type, event_location, agreed_price,
        artist:artists ( slug, stage_name, color ),
        review:reviews ( id )
      `)
      .eq('client_id', userId)
      .order('event_date'),
  ]);

  if (error) throw new Error(`Falha ao carregar as reservas: ${error.message}`);

  const bookings = (rows ?? []).map((row) => {
    // booking_id e unico em reviews; o embed pode vir como objeto ou lista.
    const review = Array.isArray(row.review) ? row.review[0] : row.review;
    return {
      id: row.id,
      status: row.status,
      eventDate: row.event_date,
      eventTime: row.event_time,
      eventType: row.event_type,
      location: row.event_location,
      agreedPrice: row.agreed_price == null ? null : Number(row.agreed_price),
      // A RLS de artists esconde perfis despublicados: o artista pode vir nulo.
      artistName: row.artist?.stage_name ?? 'Artista indisponível',
      artistSlug: row.artist?.slug ?? null,
      artistColor: row.artist?.color ?? null,
      reviewed: Boolean(review),
    };
  });

  return { clientName: profile?.full_name ?? null, bookings };
}
