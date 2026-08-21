-- Fase do banco de dados, Etapa A: perfis, artistas e generos.
--
-- Notas de modelagem:
--  * Um usuario pode ser artista e contratante ao mesmo tempo. Nao existe
--    coluna `role` em profiles: quem tem linha em `artists` e artista.
--  * RLS e habilitada em uma migration separada (Etapa D). Ate lá as tabelas
--    ficam sem policy, e por isso o banco ainda nao deve receber dados reais.

-- ---------------------------------------------------------------------------
-- updated_at compartilhado
-- ---------------------------------------------------------------------------

-- Mantem updated_at em sincronia sem depender da aplicacao.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Estende auth.users 1:1. O id e a propria chave de auth.users, e nao um id
-- proprio, para que as policies possam comparar direto com auth.uid().
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  -- WhatsApp e o canal real de contato no Brasil.
  phone text,
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- artists
-- ---------------------------------------------------------------------------

-- Define o schema JSON-LD do perfil: band -> MusicGroup, dj/solo -> Person.
create type public.artist_category as enum ('dj', 'solo', 'band');

create table public.artists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  -- Usado em /artista/[slug] e ja indexado pelo buscador: deve ser imutavel.
  -- Alterar um slug quebra a URL publicada e o sitemap.
  slug text not null unique
    constraint artists_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  stage_name text not null,
  category public.artist_category not null,
  -- Alimenta a meta description do perfil.
  bio_short text,
  bio_long text,
  city text,
  service_radius_km int
    constraint artists_service_radius_positive check (service_radius_km is null or service_radius_km >= 0),
  -- Preco opcional: o artista escolhe entre exibir valor ou "sob consulta".
  base_price numeric(10, 2)
    constraint artists_base_price_positive check (base_price is null or base_price >= 0),
  price_on_request boolean not null default false,
  -- Resolve o og:image, hoje ausente por falta de arte.
  cover_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Um perfil publicado precisa informar valor ou dizer "sob consulta"; sem um
  -- dos dois, a pagina fica sem qualquer informacao de preco. Rascunhos
  -- (is_published = false) podem ficar incompletos enquanto sao preenchidos.
  constraint artists_price_defined check (
    not is_published or base_price is not null or price_on_request
  )
);

create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

-- Indice de FK, usado ao carregar "os artistas deste perfil".
-- Nao e unico de proposito: se um perfil pode ter mais de um cadastro (por
-- exemplo, atuar como DJ solo e tambem integrar uma banda) e uma decisao de
-- produto ainda em aberto. Adicionar a restricao depois e trivial; remover
-- depois de ja existirem dados duplicados, nao.
create index artists_profile_id_idx on public.artists (profile_id);
-- A listagem publica filtra por is_published.
create index artists_is_published_idx on public.artists (is_published) where is_published;

-- ---------------------------------------------------------------------------
-- genres e artist_genres
-- ---------------------------------------------------------------------------

create table public.genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
    constraint genres_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table public.artist_genres (
  artist_id uuid not null references public.artists (id) on delete cascade,
  genre_id uuid not null references public.genres (id) on delete cascade,
  primary key (artist_id, genre_id)
);

-- Busca por genero ("todos os artistas de Pagode") percorre o lado do genero.
create index artist_genres_genre_id_idx on public.artist_genres (genre_id);
