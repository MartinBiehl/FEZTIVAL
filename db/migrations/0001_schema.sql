-- Schema do Feztival em Postgres puro.
--
-- Consolida as 11 migrations da epoca do Supabase (historico no Git, ate o
-- commit 812b02e) no estado final que elas produziam, com tres diferencas:
--
--  * Contas proprias: users, sessions e auth_tokens substituem auth.users.
--    profiles.id continua sendo o id da conta.
--  * Sem RLS, sem policies e sem grants. So o servidor do Next fala com o
--    banco, e quem decide quem le e grava o que e o codigo de src/lib, que
--    filtra pelo usuario da sessao dentro de cada query.
--  * Sem funcoes security definer: is_booking_counterparty e handle_new_user
--    sairam (a primeira so servia a RLS; a segunda virou createAccountRows).
--
-- As DUAS regras de negocio impostas pelo banco continuam aqui: imutabilidade
-- dos valores financeiros e transicoes de status de bookings.

-- ---------------------------------------------------------------------------
-- updated_at compartilhado
-- ---------------------------------------------------------------------------

create function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Contas
-- ---------------------------------------------------------------------------

create table users (
  id uuid primary key default gen_random_uuid(),
  -- Sempre minusculo: a aplicacao normaliza antes de gravar e de buscar.
  email text not null unique
    constraint users_email_lowercase check (email = lower(email)),
  -- 'scrypt$N$r$p$sal$hash' (src/lib/auth.js). Contas do seed usam '!',
  -- que nao corresponde a nenhuma senha.
  password_hash text not null,
  -- Nulo ate o link de confirmacao ser aberto: sem isso nao ha login.
  email_verified_at timestamptz,
  -- Freio de tentativas de senha errada (ver signIn).
  failed_login_count int not null default 0,
  last_failed_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger users_set_updated_at
  before update on users
  for each row execute function set_updated_at();

-- O id e o SHA-256 do token do cookie, nunca o token em si.
create table sessions (
  id text primary key,
  user_id uuid not null references users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index sessions_user_id_idx on sessions (user_id);

-- Link de confirmacao de cadastro e codigo de recuperacao de senha. Como nas
-- sessoes, so o hash e guardado.
create table auth_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  purpose text not null
    constraint auth_tokens_purpose_valid
      check (purpose in ('email_verification', 'password_reset', 'password_reset_grant')),
  token_hash text not null unique,
  -- Tentativas erradas do codigo de recuperacao; na quinta ele e descartado.
  attempts int not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index auth_tokens_user_purpose_idx on auth_tokens (user_id, purpose);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- Estende users 1:1: o id e o da conta. Guarda nome e WhatsApp, entao NAO e
-- publico: cada um le o proprio, e o artista le o do contratante das suas
-- reservas (fetchArtistDashboard).
create table profiles (
  id uuid primary key references users (id) on delete cascade,
  full_name text,
  -- WhatsApp e o canal real de contato no Brasil.
  phone text,
  avatar_url text,
  city text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- artists e catalogos
-- ---------------------------------------------------------------------------

-- Define o schema JSON-LD do perfil: band -> MusicGroup, dj/solo -> Person.
create type artist_category as enum ('dj', 'solo', 'band');

create table artists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  -- Usado em /artista/[slug] e ja indexado pelo buscador: deve ser imutavel.
  slug text not null unique
    constraint artists_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  stage_name text not null,
  category artist_category not null,
  bio_short text,
  bio_long text,
  city text,
  service_radius_km int
    constraint artists_service_radius_positive check (service_radius_km is null or service_radius_km >= 0),
  -- Preco opcional: o artista escolhe entre exibir valor ou "sob consulta".
  base_price numeric(10, 2)
    constraint artists_base_price_positive check (base_price is null or base_price >= 0),
  price_on_request boolean not null default false,
  cover_url text,
  is_published boolean not null default false,
  -- Token visual do artista, usado como --artist-color. E identidade, nao decoracao.
  color text
    constraint artists_color_format check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  -- Frase livre sobre a area de atendimento; as cidades ficam em artist_service_areas.
  service_area_summary text,
  -- Contador simples, sem historico por data (recordArtistView).
  view_count int not null default 0
    constraint artists_view_count_positive check (view_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Perfil publicado precisa de valor ou "sob consulta". Rascunho pode ficar incompleto.
  constraint artists_price_defined check (
    not is_published or base_price is not null or price_on_request
  )
);

create trigger artists_set_updated_at
  before update on artists
  for each row execute function set_updated_at();

-- NAO unico de proposito: se um perfil pode ter mais de um cadastro artistico
-- e decisao de produto em aberto.
create index artists_profile_id_idx on artists (profile_id);
create index artists_is_published_idx on artists (is_published) where is_published;

create table genres (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique
    constraint genres_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

create table artist_genres (
  artist_id uuid not null references artists (id) on delete cascade,
  genre_id uuid not null references genres (id) on delete cascade,
  primary key (artist_id, genre_id)
);

create index artist_genres_genre_id_idx on artist_genres (genre_id);

create table payment_methods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint payment_methods_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  detail text,
  sort_order int not null default 0
);

create table artist_payment_methods (
  artist_id uuid not null references artists (id) on delete cascade,
  payment_method_id uuid not null references payment_methods (id) on delete cascade,
  primary key (artist_id, payment_method_id)
);

create index artist_payment_methods_method_idx on artist_payment_methods (payment_method_id);

create table venue_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    constraint venue_types_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  sort_order int not null default 0
);

create table artist_venue_types (
  artist_id uuid not null references artists (id) on delete cascade,
  venue_type_id uuid not null references venue_types (id) on delete cascade,
  primary key (artist_id, venue_type_id)
);

create index artist_venue_types_venue_idx on artist_venue_types (venue_type_id);

-- ---------------------------------------------------------------------------
-- O que o artista declara no perfil
-- ---------------------------------------------------------------------------

create type media_type as enum ('photo', 'audio', 'video');

create table artist_media (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  type media_type not null,
  url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artist_media_set_updated_at
  before update on artist_media
  for each row execute function set_updated_at();

create index artist_media_artist_id_sort_idx on artist_media (artist_id, sort_order);

create table artist_services (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  title text not null,
  description text,
  -- Valor absoluto, nao delta sobre base_price.
  price numeric(10, 2)
    constraint artist_services_price_positive check (price is null or price >= 0),
  duration_minutes int
    constraint artist_services_duration_positive check (duration_minutes is null or duration_minutes > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artist_services_set_updated_at
  before update on artist_services
  for each row execute function set_updated_at();

create index artist_services_artist_id_idx on artist_services (artist_id);

create table artist_service_areas (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  city text not null,
  sort_order int not null default 0,
  constraint artist_service_areas_city_key unique (artist_id, city)
);

create index artist_service_areas_artist_idx on artist_service_areas (artist_id, sort_order);

create type infrastructure_status as enum ('included', 'negotiable', 'required');

create table artist_infrastructure (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  status infrastructure_status not null,
  title text not null,
  detail text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger artist_infrastructure_set_updated_at
  before update on artist_infrastructure
  for each row execute function set_updated_at();

create index artist_infrastructure_artist_idx on artist_infrastructure (artist_id, sort_order);

-- A rotina semanal ("segundas, 9h as 18h"). NAO e availability, que e uma data.
create table artist_weekly_hours (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  -- 0 = domingo, 6 = sabado (convencao de Date.getDay()).
  weekday int not null
    constraint artist_weekly_hours_weekday_range check (weekday between 0 and 6),
  is_available boolean not null default true,
  opens_at time,
  closes_at time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_weekly_hours_weekday_key unique (artist_id, weekday),
  constraint artist_weekly_hours_times_consistent check (
    (is_available and opens_at is not null and closes_at is not null and opens_at < closes_at)
    or (not is_available and opens_at is null and closes_at is null)
  )
);

create trigger artist_weekly_hours_set_updated_at
  before update on artist_weekly_hours
  for each row execute function set_updated_at();

-- Uma linha por data declarada. Data sem linha = "nao informado".
create table availability (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  date date not null,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_artist_date_key unique (artist_id, date)
);

create trigger availability_set_updated_at
  before update on availability
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

create type booking_status as enum (
  'pending', 'accepted', 'confirmed', 'completed', 'declined', 'cancelled'
);

create type sound_structure as enum ('unknown', 'venue', 'artist');

create table bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles (id) on delete restrict,
  artist_id uuid not null references artists (id) on delete restrict,
  -- Apagar um servico nao pode apagar o historico de reservas que o usaram.
  service_id uuid references artist_services (id) on delete set null,
  event_date date not null,
  event_time time,
  event_location text,
  event_type text,
  message text,
  guest_count int
    constraint bookings_guest_count_positive check (guest_count is null or guest_count > 0),
  sound_structure sound_structure,
  duration_minutes int
    constraint bookings_duration_minutes_positive check (duration_minutes is null or duration_minutes > 0),
  -- Gravados na reserva, nao derivados do servico: se o artista mudar o preco
  -- depois, o historico e o repasse ja acordado nao mudam junto.
  agreed_price numeric(10, 2)
    constraint bookings_agreed_price_positive check (agreed_price is null or agreed_price >= 0),
  platform_fee numeric(10, 2)
    constraint bookings_platform_fee_positive check (platform_fee is null or platform_fee >= 0),
  artist_payout numeric(10, 2)
    constraint bookings_artist_payout_positive check (artist_payout is null or artist_payout >= 0),
  status booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Reserva aceita precisa ter valor definido: e a base do repasse.
  constraint bookings_priced_when_accepted check (
    status in ('pending', 'declined', 'cancelled')
    or (agreed_price is not null and platform_fee is not null and artist_payout is not null)
  ),
  constraint bookings_amounts_consistent check (
    agreed_price is null or platform_fee is null or artist_payout is null
    or agreed_price = platform_fee + artist_payout
  )
);

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute function set_updated_at();

create index bookings_client_id_idx on bookings (client_id, created_at desc);
create index bookings_artist_id_idx on bookings (artist_id, created_at desc);
create index bookings_artist_event_date_idx on bookings (artist_id, event_date);
create index bookings_service_id_idx on bookings (service_id) where service_id is not null;

-- Regra 1: os tres valores podem mudar enquanto a reserva esta pending
-- (negociacao) e congelam quando ela sai de pending. `is distinct from`, e nao
-- `<>`, para que uma troca envolvendo NULL tambem seja detectada.
create function enforce_booking_amounts_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'pending' then
    return new;
  end if;

  if new.agreed_price is distinct from old.agreed_price
    or new.platform_fee is distinct from old.platform_fee
    or new.artist_payout is distinct from old.artist_payout then
    raise exception
      'Valores financeiros da reserva % sao imutaveis apos sair de pending (status atual: %).',
      old.id, old.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger bookings_amounts_immutable
  before update on bookings
  for each row execute function enforce_booking_amounts_immutable();

-- Regra 2: fluxo de status. completed, declined e cancelled sao terminais.
--   pending   -> accepted | declined | cancelled
--   accepted  -> confirmed | cancelled
--   confirmed -> completed | cancelled
create function enforce_booking_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status in ('completed', 'declined', 'cancelled') then
    raise exception
      'Reserva % esta em estado terminal (%) e nao pode mudar para %.',
      old.id, old.status, new.status
      using errcode = 'check_violation';
  end if;

  if not (
    (old.status = 'pending'   and new.status in ('accepted', 'declined', 'cancelled'))
    or (old.status = 'accepted'  and new.status in ('confirmed', 'cancelled'))
    or (old.status = 'confirmed' and new.status in ('completed', 'cancelled'))
  ) then
    raise exception
      'Transicao de status invalida na reserva %: % -> %.',
      old.id, old.status, new.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger bookings_status_transition
  before update on bookings
  for each row execute function enforce_booking_status_transition();

-- Uma avaliacao por reserva, e nenhuma sem reserva. Imutavel: a aplicacao so
-- insere (createReview), nunca altera nem apaga.
create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id) on delete cascade,
  rating int not null
    constraint reviews_rating_range check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_set_updated_at
  before update on reviews
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- Perguntas publicas
-- ---------------------------------------------------------------------------

create table questions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references artists (id) on delete cascade,
  author_profile_id uuid not null references profiles (id) on delete cascade,
  body text not null
    constraint questions_body_length check (char_length(btrim(body)) between 10 and 1000),
  -- Ainda sem moderacao na interface: nasce published.
  moderation_status text not null default 'published'
    constraint questions_moderation_status_valid check (moderation_status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger questions_set_updated_at
  before update on questions
  for each row execute function set_updated_at();

create index questions_artist_created_at_idx on questions (artist_id, created_at desc);
create index questions_author_profile_id_idx on questions (author_profile_id);
create index questions_moderation_queue_idx on questions (created_at) where moderation_status = 'pending';

create table answers (
  id uuid primary key default gen_random_uuid(),
  -- Uma resposta por pergunta.
  question_id uuid not null unique references questions (id) on delete cascade,
  author_profile_id uuid not null references profiles (id) on delete restrict,
  body text not null
    constraint answers_body_length check (char_length(btrim(body)) between 2 and 2000),
  moderation_status text not null default 'published'
    constraint answers_moderation_status_valid check (moderation_status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger answers_set_updated_at
  before update on answers
  for each row execute function set_updated_at();

create index answers_author_profile_id_idx on answers (author_profile_id);
create index answers_moderation_queue_idx on answers (created_at) where moderation_status = 'pending';

-- ---------------------------------------------------------------------------
-- Pagamentos (tabelas prontas; integracao com a Pagar.me ainda nao existe)
-- ---------------------------------------------------------------------------

create table payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings (id) on delete restrict,
  provider text not null default 'pagarme'
    constraint payments_provider_valid check (provider = 'pagarme'),
  provider_order_id text,
  payment_method text not null
    constraint payments_method_valid check (payment_method in ('pix', 'credit_card', 'boleto')),
  currency text not null default 'BRL'
    constraint payments_currency_iso check (currency ~ '^[A-Z]{3}$'),
  amount_cents bigint not null
    constraint payments_amount_positive check (amount_cents > 0),
  platform_fee_cents bigint not null default 0
    constraint payments_platform_fee_positive check (platform_fee_cents >= 0),
  artist_payout_cents bigint not null
    constraint payments_artist_payout_positive check (artist_payout_cents >= 0),
  status text not null default 'pending'
    constraint payments_status_valid check (status in (
      'pending', 'processing', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded'
    )),
  expires_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amounts_consistent check (amount_cents = platform_fee_cents + artist_payout_cents)
);

create trigger payments_set_updated_at
  before update on payments
  for each row execute function set_updated_at();

create unique index payments_provider_order_id_key
  on payments (provider, provider_order_id) where provider_order_id is not null;
create index payments_status_created_at_idx on payments (status, created_at desc);

create table payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments (id) on delete restrict,
  transaction_type text not null
    constraint payment_transactions_type_valid
      check (transaction_type in ('authorization', 'capture', 'charge', 'refund', 'chargeback')),
  provider_charge_id text,
  provider_transaction_id text,
  idempotency_key text not null unique,
  amount_cents bigint not null
    constraint payment_transactions_amount_positive check (amount_cents > 0),
  status text not null default 'pending'
    constraint payment_transactions_status_valid check (status in ('pending', 'succeeded', 'failed')),
  failure_code text,
  failure_message text,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index payment_transactions_payment_created_at_idx
  on payment_transactions (payment_id, created_at desc);
create index payment_transactions_provider_charge_id_idx
  on payment_transactions (provider_charge_id) where provider_charge_id is not null;
create index payment_transactions_provider_transaction_id_idx
  on payment_transactions (provider_transaction_id) where provider_transaction_id is not null;

-- Caixa de entrada dos webhooks: so o servidor processa.
create table payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'pagarme',
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}',
  status text not null default 'received'
    constraint payment_webhook_events_status_valid check (status in ('received', 'processed', 'ignored', 'failed')),
  attempts int not null default 0
    constraint payment_webhook_events_attempts_positive check (attempts >= 0),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_webhook_events_provider_id_key unique (provider, provider_event_id)
);

create index payment_webhook_events_pending_idx
  on payment_webhook_events (received_at) where status in ('received', 'failed');

-- ---------------------------------------------------------------------------
-- Nota publica dos artistas
-- ---------------------------------------------------------------------------

-- A nota deriva de bookings, que guarda endereco, valores e mensagens. Estas
-- duas funcoes sao o unico caminho publico ate ela, e nao devolvem quem
-- avaliou nem outro dado da reserva.

-- Media e contagem por artista publicado. Artista sem avaliacao nao aparece.
create function artist_review_summary()
returns table (artist_id uuid, rating_avg numeric, rating_count int)
language sql
stable
as $$
  select b.artist_id, round(avg(r.rating), 1), count(*)::int
  from reviews r
  join bookings b on b.id = r.booking_id
  join artists a on a.id = b.artist_id
  where a.is_published
  group by b.artist_id;
$$;

create function artist_reviews(target_slug text)
returns table (rating int, comment text, event_type text, created_at timestamptz)
language sql
stable
as $$
  select r.rating, r.comment, b.event_type, r.created_at
  from reviews r
  join bookings b on b.id = r.booking_id
  join artists a on a.id = b.artist_id
  where a.slug = target_slug
    and a.is_published
  order by r.created_at desc
  limit 50;
$$;
