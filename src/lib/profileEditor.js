/*
 * Leitura do editor de perfil (/painel/perfil). Usa o cliente com sessao: o
 * dono enxerga o proprio rascunho pela RLS (artists_select_published inclui
 * profile_id = auth.uid()).
 */

export const INFRASTRUCTURE_STATUSES = [
  { value: 'included', label: 'Eu levo' },
  { value: 'negotiable', label: 'A combinar' },
  { value: 'required', label: 'O local precisa ter' },
];

export const SERVICE_DURATIONS = [30, 60, 90, 120, 180, 240, 300];

const EDITOR_COLUMNS = `
  id, slug, stage_name, category, city, bio_short, bio_long, base_price,
  price_on_request, color, cover_url, service_area_summary, is_published,
  artist_genres ( genre_id ),
  artist_payment_methods ( payment_method_id ),
  artist_venue_types ( venue_type_id ),
  artist_service_areas ( city, sort_order ),
  artist_weekly_hours ( weekday, is_available, opens_at, closes_at ),
  artist_services ( id, title, description, price, duration_minutes ),
  artist_infrastructure ( id, status, title, detail, sort_order ),
  artist_media ( id, type, url, sort_order )
`;

const bySortOrder = (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0);
const hhmm = (value) => (value ? value.slice(0, 5) : '');

function toEditable(row) {
  const hours = new Map((row.artist_weekly_hours ?? []).map((entry) => [entry.weekday, entry]));

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
    genreIds: (row.artist_genres ?? []).map((link) => link.genre_id),
    paymentMethodIds: (row.artist_payment_methods ?? []).map((link) => link.payment_method_id),
    venueTypeIds: (row.artist_venue_types ?? []).map((link) => link.venue_type_id),
    serviceAreas: [...(row.artist_service_areas ?? [])].sort(bySortOrder).map((area) => area.city),
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
    services: (row.artist_services ?? [])
      .sort((a, b) => (a.duration_minutes ?? 0) - (b.duration_minutes ?? 0))
      .map((service) => ({
        id: service.id,
        title: service.title,
        description: service.description ?? '',
        price: service.price == null ? '' : String(Number(service.price)),
        durationMinutes: service.duration_minutes == null ? '' : String(service.duration_minutes),
      })),
    infrastructure: [...(row.artist_infrastructure ?? [])].sort(bySortOrder).map((item) => ({
      id: item.id,
      status: item.status,
      title: item.title,
      detail: item.detail ?? '',
    })),
    gallery: [...(row.artist_media ?? [])]
      .filter((item) => item.type === 'photo')
      .sort(bySortOrder)
      .map((item) => ({ id: item.id, url: item.url })),
  };
}

/*
 * Cadastro artistico do usuario. Se houver mais de um (decisao de produto em
 * aberto), vale o mais antigo -- o mesmo no editor e nas Server Actions.
 */
export function selectOwnArtist(supabase, userId, columns) {
  return supabase
    .from('artists')
    .select(columns)
    .eq('profile_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle();
}

/* Cadastro artistico do usuario e os catalogos, ou null sem cadastro. */
export async function fetchProfileEditor(supabase, userId) {
  const [{ data: row, error }, genres, paymentMethods, venueTypes] = await Promise.all([
    selectOwnArtist(supabase, userId, EDITOR_COLUMNS),
    supabase.from('genres').select('id, name').order('name'),
    supabase.from('payment_methods').select('id, name').order('sort_order'),
    supabase.from('venue_types').select('id, name').order('sort_order'),
  ]);

  if (error) throw new Error(`Falha ao carregar o perfil: ${error.message}`);
  const catalogError = genres.error ?? paymentMethods.error ?? venueTypes.error;
  if (catalogError) throw new Error(`Falha ao carregar os catalogos: ${catalogError.message}`);
  if (!row) return null;

  return {
    profile: toEditable(row),
    catalogs: {
      genres: genres.data ?? [],
      paymentMethods: paymentMethods.data ?? [],
      venueTypes: venueTypes.data ?? [],
    },
  };
}
