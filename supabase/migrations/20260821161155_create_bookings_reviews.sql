-- Fase do banco de dados, Etapa C: reservas e avaliacoes.
--
-- Esta migration contem as DUAS UNICAS regras de negocio impostas pelo banco:
-- imutabilidade dos valores financeiros e validacao das transicoes de status.
-- Todo o resto da logica fica na aplicacao. O criterio para essa excecao e que
-- erro nesses dois pontos custa dinheiro (repasse errado ao artista) ou
-- confianca (reserva retrocedendo de estado).

-- ---------------------------------------------------------------------------
-- bookings
-- ---------------------------------------------------------------------------

create type public.booking_status as enum (
  'pending', 'accepted', 'confirmed', 'completed', 'declined', 'cancelled'
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  artist_id uuid not null references public.artists (id) on delete restrict,
  -- Nulo quando o pedido e customizado, sem partir de um servico do catalogo.
  -- on delete set null: apagar um servico nao pode apagar o historico de
  -- reservas que o usaram.
  service_id uuid references public.artist_services (id) on delete set null,
  event_date date not null,
  event_time time,
  event_location text,
  event_type text,
  message text,
  -- Os tres valores abaixo sao gravados na reserva, nao derivados do servico
  -- em tempo de leitura: se o artista mudar o preco depois, o historico e o
  -- repasse ja acordado nao podem mudar junto.
  agreed_price numeric(10, 2)
    constraint bookings_agreed_price_positive
      check (agreed_price is null or agreed_price >= 0),
  platform_fee numeric(10, 2)
    constraint bookings_platform_fee_positive
      check (platform_fee is null or platform_fee >= 0),
  artist_payout numeric(10, 2)
    constraint bookings_artist_payout_positive
      check (artist_payout is null or artist_payout >= 0),
  status public.booking_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Reserva aceita precisa ter valor definido: e a partir dela que o repasse
  -- e calculado. Enquanto esta pending, os valores podem estar em negociacao.
  constraint bookings_priced_when_accepted check (
    status in ('pending', 'declined', 'cancelled')
    or (agreed_price is not null and platform_fee is not null and artist_payout is not null)
  ),
  -- A soma tem de fechar: o que o artista recebe mais a comissao e o total.
  constraint bookings_amounts_consistent check (
    agreed_price is null or platform_fee is null or artist_payout is null
    or agreed_price = platform_fee + artist_payout
  )
);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- "Minhas reservas" (contratante) e "propostas recebidas" (artista).
create index bookings_client_id_idx on public.bookings (client_id, created_at desc);
create index bookings_artist_id_idx on public.bookings (artist_id, created_at desc);
-- Agenda do artista: reservas ativas por data de evento.
create index bookings_artist_event_date_idx on public.bookings (artist_id, event_date);

-- ---------------------------------------------------------------------------
-- Excecao 1: imutabilidade dos valores financeiros
-- ---------------------------------------------------------------------------

-- agreed_price, platform_fee e artist_payout sao a base do repasse ao artista.
-- Enquanto a reserva esta pending eles podem ser ajustados (negociacao); a
-- partir do momento em que ela sai de pending, ficam congelados.
--
-- A regra vive no banco, e nao so na aplicacao, porque um erro aqui altera
-- quanto o artista recebe. Codigo futuro que atualize bookings por qualquer
-- caminho continua sujeito a ela.
create or replace function public.enforce_booking_amounts_immutable()
returns trigger
language plpgsql
as $$
begin
  -- Enquanto a reserva ainda esta pending, os valores podem mudar.
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
  before update on public.bookings
  for each row execute function public.enforce_booking_amounts_immutable();

-- ---------------------------------------------------------------------------
-- Excecao 2: transicoes de status validas
-- ---------------------------------------------------------------------------

-- Fluxo permitido:
--   pending   -> accepted | declined | cancelled
--   accepted  -> confirmed | cancelled
--   confirmed -> completed | cancelled
--
-- completed, declined e cancelled sao terminais: uma reserva nunca retrocede
-- de estado nem sai de um desfecho definitivo. A regra vive no banco porque
-- uma reserva que volta de completed para pending destroi a confianca no
-- historico -- e no repasse ja calculado.
create or replace function public.enforce_booking_status_transition()
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
  before update on public.bookings
  for each row execute function public.enforce_booking_status_transition();

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

-- booking_id unico amarra a avaliacao a uma contratacao real: uma avaliacao
-- por reserva, e nenhuma avaliacao sem reserva.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  rating int not null
    constraint reviews_rating_range check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();
