-- Amplia o schema para cobrir tudo o que o cadastro de perfil precisa gravar.
--
-- Motivo: as telas exibiam cinco estruturas do perfil (formas de pagamento,
-- tipos de local, area de atendimento, infraestrutura e horario semanal) que
-- viviam apenas no JSX, iguais nos 8 perfis. Sao informacoes que o artista vai
-- declarar no cadastro, portanto precisam de lugar no banco. A varredura
-- tambem encontrou campos do formulario de contratacao sem coluna e o token
-- visual do artista.
--
-- Padrao adotado: listas fechadas que o artista seleciona viram catalogo mais
-- vinculo N:N, como genres/artist_genres. Dados livres do artista viram tabela
-- direta ligada a artists.
--
-- RLS: habilitada em TODAS as tabelas novas, no fim do arquivo.

-- ---------------------------------------------------------------------------
-- Colunas novas em artists
-- ---------------------------------------------------------------------------

alter table public.artists
  -- Token visual do artista, usado como --artist-color em 6 componentes
  -- (card, perfil, modais, resumo da proposta). E identidade, nao decoracao.
  add column color text
    constraint artists_color_format check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  -- Texto livre que resume a area de atendimento ("Ivoti e regiao do Vale do
  -- Sinos, com deslocamento de ate 50 km"). As cidades ficam em
  -- artist_service_areas; este campo e a frase que o artista escreve.
  add column service_area_summary text,
  -- Contador de visualizacoes do perfil. Incrementado pela funcao
  -- increment_artist_view_count, nunca por UPDATE direto: a RLS nao permite
  -- escrita anonima em artists, e abrir essa policy exporia todas as colunas.
  -- Sem historico por data, portanto nao suporta variacao mensal.
  add column view_count int not null default 0
    constraint artists_view_count_positive check (view_count >= 0);

-- ---------------------------------------------------------------------------
-- Formas de pagamento: catalogo + vinculo
-- ---------------------------------------------------------------------------

-- O catalogo e mantido pela plataforma: `detail` descreve o meio de pagamento
-- em si ("Confirmacao rapida e sem taxas adicionais"), nao a politica do
-- artista, entao vive aqui e nao no vinculo.
create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint payment_methods_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  detail text,
  sort_order int not null default 0
);

create table public.artist_payment_methods (
  artist_id uuid not null references public.artists (id) on delete cascade,
  payment_method_id uuid not null references public.payment_methods (id) on delete cascade,
  primary key (artist_id, payment_method_id)
);

create index artist_payment_methods_method_idx
  on public.artist_payment_methods (payment_method_id);

-- ---------------------------------------------------------------------------
-- Tipos de local: catalogo + vinculo
-- ---------------------------------------------------------------------------

-- Sao apenas rotulos que o artista marca ("Casamentos", "Hoteis"), sem texto
-- proprio -- por isso o catalogo nao tem coluna de detalhe.
create table public.venue_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint venue_types_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  sort_order int not null default 0
);

create table public.artist_venue_types (
  artist_id uuid not null references public.artists (id) on delete cascade,
  venue_type_id uuid not null references public.venue_types (id) on delete cascade,
  primary key (artist_id, venue_type_id)
);

create index artist_venue_types_venue_idx
  on public.artist_venue_types (venue_type_id);

-- ---------------------------------------------------------------------------
-- Area de atendimento: cidades declaradas pelo artista
-- ---------------------------------------------------------------------------

-- Cidade em texto livre, e nao catalogo, porque a lista de municipios que um
-- artista atende e aberta -- nao ha como pre-cadastrar todas as combinacoes.
create table public.artist_service_areas (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  city text not null,
  sort_order int not null default 0,
  constraint artist_service_areas_city_key unique (artist_id, city)
);

create index artist_service_areas_artist_idx
  on public.artist_service_areas (artist_id, sort_order);

-- ---------------------------------------------------------------------------
-- Infraestrutura: o que o artista leva, negocia ou exige do local
-- ---------------------------------------------------------------------------

-- O status tem efeito contratual: define quem fornece o que. Por isso e enum,
-- e nao texto livre.
create type public.infrastructure_status as enum (
  'included',   -- o artista leva
  'negotiable', -- a combinar conforme o evento
  'required'    -- o contratante precisa garantir no local
);

create table public.artist_infrastructure (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  status public.infrastructure_status not null,
  title text not null,
  detail text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artist_infrastructure_set_updated_at
  before update on public.artist_infrastructure
  for each row execute function public.set_updated_at();

create index artist_infrastructure_artist_idx
  on public.artist_infrastructure (artist_id, sort_order);

-- ---------------------------------------------------------------------------
-- Horario semanal recorrente
-- ---------------------------------------------------------------------------

-- Distinto de `availability`, que registra uma DATA especifica ("dia 15 estou
-- livre"). Aqui e a rotina do artista ("segundas, 9h as 18h"), que nao expira.
--
-- opens_at/closes_at ficam nulos quando o artista nao atende naquele dia --
-- e por isso is_available existe: "domingo, nao atende" e uma declaracao, nao
-- ausencia de informacao.
create table public.artist_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  -- 0 = domingo, 6 = sabado (mesma convencao de Date.getDay()).
  weekday int not null
    constraint artist_weekly_hours_weekday_range check (weekday between 0 and 6),
  is_available boolean not null default true,
  opens_at time,
  closes_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_weekly_hours_weekday_key unique (artist_id, weekday),
  -- Dia disponivel precisa de horario; dia indisponivel nao deve ter.
  constraint artist_weekly_hours_times_consistent check (
    (is_available and opens_at is not null and closes_at is not null and opens_at < closes_at)
    or (not is_available and opens_at is null and closes_at is null)
  )
);

create trigger artist_weekly_hours_set_updated_at
  before update on public.artist_weekly_hours
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Colunas novas em bookings
-- ---------------------------------------------------------------------------

-- Quem fornece o equipamento de som. O formulario de contratacao ja coletava
-- essa resposta e nao tinha onde grava-la.
create type public.sound_structure as enum (
  'unknown',      -- "Ainda nao sei"
  'venue',        -- "O local possui"
  'artist'        -- "Preciso que o artista leve"
);

alter table public.bookings
  -- Numero de convidados, coletado no formulario.
  add column guest_count int
    constraint bookings_guest_count_positive check (guest_count is null or guest_count > 0),
  add column sound_structure public.sound_structure;

-- ---------------------------------------------------------------------------
-- Contador de visualizacoes
-- ---------------------------------------------------------------------------

-- security definer porque a RLS nao concede UPDATE em artists a visitantes
-- anonimos, e conceder exporia todas as colunas do perfil. A funcao so
-- incrementa o contador de um artista publicado, e nao devolve nada.
--
-- A deduplicacao (evitar que F5 infle o numero) e responsabilidade da
-- aplicacao, via cookie: sem isso o numero perde sentido para o artista.
create or replace function public.increment_artist_view_count(target_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.artists
  set view_count = view_count + 1
  where slug = target_slug
    and is_published;
$$;

-- Visitante anonimo pode contar visualizacao, mas nada alem disso.
grant execute on function public.increment_artist_view_count(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS nas tabelas novas
-- ---------------------------------------------------------------------------

-- Catalogos: leitura publica, escrita apenas por administracao (service_role
-- ignora RLS), como em genres.
alter table public.payment_methods enable row level security;
create policy payment_methods_select_public
  on public.payment_methods for select using (true);

alter table public.venue_types enable row level security;
create policy venue_types_select_public
  on public.venue_types for select using (true);

-- Tabelas do artista: visiveis quando o perfil esta publicado (ou para o
-- dono), gravaveis apenas pelo dono. Mesmo padrao de artist_media.
alter table public.artist_payment_methods enable row level security;
create policy artist_payment_methods_select
  on public.artist_payment_methods for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));
create policy artist_payment_methods_write
  on public.artist_payment_methods for all to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.artist_venue_types enable row level security;
create policy artist_venue_types_select
  on public.artist_venue_types for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));
create policy artist_venue_types_write
  on public.artist_venue_types for all to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.artist_service_areas enable row level security;
create policy artist_service_areas_select
  on public.artist_service_areas for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));
create policy artist_service_areas_write
  on public.artist_service_areas for all to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.artist_infrastructure enable row level security;
create policy artist_infrastructure_select
  on public.artist_infrastructure for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));
create policy artist_infrastructure_write
  on public.artist_infrastructure for all to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.artist_weekly_hours enable row level security;
create policy artist_weekly_hours_select
  on public.artist_weekly_hours for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));
create policy artist_weekly_hours_write
  on public.artist_weekly_hours for all to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));
