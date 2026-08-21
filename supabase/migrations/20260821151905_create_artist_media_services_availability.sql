-- Fase do banco de dados, Etapa B: portfolio, servicos e agenda do artista.
--
-- As tres tabelas pendem de `artists` e usam on delete cascade: apagar um
-- cadastro de artista leva embora midias, servicos e agenda.

-- ---------------------------------------------------------------------------
-- artist_media
-- ---------------------------------------------------------------------------

create type public.media_type as enum ('photo', 'audio', 'video');

create table public.artist_media (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  type public.media_type not null,
  url text not null,
  caption text,
  -- Ordem de exibicao na galeria do perfil, definida pelo artista.
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artist_media_set_updated_at
  before update on public.artist_media
  for each row execute function public.set_updated_at();

-- A galeria carrega as midias de um artista na ordem definida.
create index artist_media_artist_id_sort_idx
  on public.artist_media (artist_id, sort_order);

-- ---------------------------------------------------------------------------
-- artist_services
-- ---------------------------------------------------------------------------

create table public.artist_services (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  title text not null,
  description text,
  price numeric(10, 2)
    constraint artist_services_price_positive check (price is null or price >= 0),
  duration_minutes int
    constraint artist_services_duration_positive
      check (duration_minutes is null or duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artist_services_set_updated_at
  before update on public.artist_services
  for each row execute function public.set_updated_at();

create index artist_services_artist_id_idx on public.artist_services (artist_id);

-- ---------------------------------------------------------------------------
-- availability
-- ---------------------------------------------------------------------------

-- Uma linha por data em que o artista declarou disponibilidade (ou a ausencia
-- dela). Datas sem linha significam "nao informado", nao "indisponivel".
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  date date not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Uma declaracao por artista por data.
  constraint availability_artist_date_key unique (artist_id, date)
);

create trigger availability_set_updated_at
  before update on public.availability
  for each row execute function public.set_updated_at();

-- Consulta tipica: a agenda de um artista dentro de um intervalo de datas.
-- O unique (artist_id, date) ja cobre esse acesso, entao nao criamos outro
-- indice sobre as mesmas colunas.
