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
 * rating e reviews ficam nulos/zero: a nota deriva de avaliacoes reais, e
 * nenhum artista tem avaliacao ainda. setMinutes fica vazio porque
 * artist_services nao tem registros. Os componentes tratam ambos os casos.
 */
function toArtist(row) {
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
    bioShort: row.bio_short,
    bioLong: row.bio_long,
    coverUrl: row.cover_url,
    // Sem avaliacoes no banco: a interface exibe "Novo na plataforma".
    rating: null,
    reviews: 0,
    // artist_services esta vazia: a interface oculta a linha de duracao.
    setMinutes: [],
  };
}

const ARTIST_COLUMNS = `
  id, slug, stage_name, category, city, base_price, price_on_request,
  bio_short, bio_long, cover_url,
  artist_genres ( genres ( name, slug ) )
`;

/* Todos os artistas publicados, para o catalogo. */
export async function fetchArtists() {
  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .eq('is_published', true);

  if (error) throw new Error(`Falha ao carregar artistas: ${error.message}`);

  return (data ?? []).map(toArtist);
}

/* Um artista por slug, ou null quando nao existe (a rota responde 404). */
export async function fetchArtistBySlug(slug) {
  const { data, error } = await supabase
    .from('artists')
    .select(ARTIST_COLUMNS)
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o artista ${slug}: ${error.message}`);
  if (!data) return null;

  return toArtist(data);
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
