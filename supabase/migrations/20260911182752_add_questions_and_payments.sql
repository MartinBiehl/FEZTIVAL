-- Perguntas públicas anteriores à contratação e trilha financeira separada
-- da reserva. Valores monetários são armazenados em centavos para evitar
-- arredondamento; identificadores do gateway permanecem text porque podem ser
-- alfanuméricos.

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete cascade,
  body text not null constraint questions_body_length
    check (char_length(btrim(body)) between 10 and 1000),
  moderation_status text not null default 'published'
    constraint questions_moderation_status_valid
      check (moderation_status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index questions_artist_created_at_idx
  on public.questions (artist_id, created_at desc);
create index questions_author_profile_id_idx
  on public.questions (author_profile_id);
create index questions_moderation_queue_idx
  on public.questions (created_at)
  where moderation_status = 'pending';

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function private.set_updated_at();

create table public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null unique references public.questions (id) on delete cascade,
  author_profile_id uuid not null references public.profiles (id) on delete restrict,
  body text not null constraint answers_body_length
    check (char_length(btrim(body)) between 2 and 2000),
  moderation_status text not null default 'published'
    constraint answers_moderation_status_valid
      check (moderation_status in ('pending', 'published', 'hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index answers_author_profile_id_idx
  on public.answers (author_profile_id);
create index answers_moderation_queue_idx
  on public.answers (created_at)
  where moderation_status = 'pending';

create trigger answers_set_updated_at
  before update on public.answers
  for each row execute function private.set_updated_at();

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete restrict,
  provider text not null default 'pagarme'
    constraint payments_provider_valid check (provider in ('pagarme')),
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
    constraint payments_status_valid check (
      status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'partially_refunded', 'refunded')
    ),
  expires_at timestamptz,
  paid_at timestamptz,
  failed_at timestamptz,
  cancelled_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_amounts_consistent
    check (amount_cents = platform_fee_cents + artist_payout_cents)
);

create unique index payments_provider_order_id_key
  on public.payments (provider, provider_order_id)
  where provider_order_id is not null;
create index payments_status_created_at_idx
  on public.payments (status, created_at desc);

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function private.set_updated_at();

create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  transaction_type text not null
    constraint payment_transactions_type_valid check (
      transaction_type in ('authorization', 'capture', 'charge', 'refund', 'chargeback')
    ),
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
  on public.payment_transactions (payment_id, created_at desc);
create index payment_transactions_provider_charge_id_idx
  on public.payment_transactions (provider_charge_id)
  where provider_charge_id is not null;
create index payment_transactions_provider_transaction_id_idx
  on public.payment_transactions (provider_transaction_id)
  where provider_transaction_id is not null;

-- Caixa de entrada idempotente dos webhooks. O payload deve ser sanitizado no
-- Route Handler: nunca guardar número completo de cartão, CVV ou segredo.
create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'pagarme',
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received'
    constraint payment_webhook_events_status_valid
      check (status in ('received', 'processed', 'ignored', 'failed')),
  attempts int not null default 0
    constraint payment_webhook_events_attempts_positive check (attempts >= 0),
  last_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  constraint payment_webhook_events_provider_id_key unique (provider, provider_event_id)
);

create index payment_webhook_events_pending_idx
  on public.payment_webhook_events (received_at)
  where status in ('received', 'failed');

alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.payments enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;

-- Q&A: leitura pública apenas do conteúdo publicado. Autor e artista também
-- enxergam itens ocultos/pendentes relacionados a eles.
create policy questions_select_visible
  on public.questions for select to anon, authenticated
  using (
    moderation_status = 'published'
    or author_profile_id = (select auth.uid())
    or exists (
      select 1 from public.artists a
      where a.id = questions.artist_id
        and a.profile_id = (select auth.uid())
    )
  );

create policy questions_insert_own
  on public.questions for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and moderation_status = 'published'
    and exists (
      select 1 from public.artists a
      where a.id = questions.artist_id and a.is_published
    )
  );

create policy questions_update_own
  on public.questions for update to authenticated
  using (author_profile_id = (select auth.uid()))
  with check (author_profile_id = (select auth.uid()));

create policy questions_delete_own
  on public.questions for delete to authenticated
  using (author_profile_id = (select auth.uid()));

create policy answers_select_visible
  on public.answers for select to anon, authenticated
  using (
    moderation_status = 'published'
    and exists (
      select 1 from public.questions q
      where q.id = answers.question_id
        and q.moderation_status = 'published'
    )
  );

create policy answers_insert_artist
  on public.answers for insert to authenticated
  with check (
    author_profile_id = (select auth.uid())
    and moderation_status = 'published'
    and exists (
      select 1
      from public.questions q
      join public.artists a on a.id = q.artist_id
      where q.id = answers.question_id
        and a.profile_id = (select auth.uid())
    )
  );

create policy answers_update_artist
  on public.answers for update to authenticated
  using (
    author_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.questions q
      join public.artists a on a.id = q.artist_id
      where q.id = answers.question_id
        and a.profile_id = (select auth.uid())
    )
  )
  with check (author_profile_id = (select auth.uid()));

create policy answers_delete_artist
  on public.answers for delete to authenticated
  using (
    author_profile_id = (select auth.uid())
    and exists (
      select 1
      from public.questions q
      join public.artists a on a.id = q.artist_id
      where q.id = answers.question_id
        and a.profile_id = (select auth.uid())
    )
  );

-- Dados financeiros: participantes só leem. Toda escrita é server-side com a
-- chave secreta do Supabase; não existe policy de INSERT/UPDATE/DELETE para o
-- papel authenticated.
create policy payments_select_participants
  on public.payments for select to authenticated
  using (exists (
    select 1
    from public.bookings b
    left join public.artists a on a.id = b.artist_id
    where b.id = payments.booking_id
      and (b.client_id = (select auth.uid()) or a.profile_id = (select auth.uid()))
  ));

create policy payment_transactions_select_participants
  on public.payment_transactions for select to authenticated
  using (exists (
    select 1
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    left join public.artists a on a.id = b.artist_id
    where p.id = payment_transactions.payment_id
      and (b.client_id = (select auth.uid()) or a.profile_id = (select auth.uid()))
  ));

-- Revoga os defaults amplos do projeto somente nas tabelas novas e concede o
-- mínimo necessário. As tabelas financeiras nunca são gravadas pelo browser.
revoke all on public.questions, public.answers, public.payments,
  public.payment_transactions, public.payment_webhook_events
  from public, anon, authenticated;

grant select on public.questions, public.answers to anon, authenticated;
grant insert, delete on public.questions to authenticated;
grant update (body) on public.questions to authenticated;
grant insert, delete on public.answers to authenticated;
grant update (body) on public.answers to authenticated;
grant select on public.payments, public.payment_transactions to authenticated;

grant all on public.questions, public.answers, public.payments,
  public.payment_transactions, public.payment_webhook_events to service_role;

-- Cria profile e, no cadastro artístico, um rascunho de artist. Metadados de
-- signup servem apenas para bootstrap e nunca concedem privilégios.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_category public.artist_category;
  display_name text;
begin
  display_name := nullif(btrim(new.raw_user_meta_data ->> 'full_name'), '');

  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, display_name, new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  if new.raw_user_meta_data ->> 'account_type' = 'artist' then
    requested_category := case new.raw_user_meta_data ->> 'artist_category'
      when 'dj' then 'dj'::public.artist_category
      when 'band' then 'band'::public.artist_category
      else 'solo'::public.artist_category
    end;

    insert into public.artists (profile_id, slug, stage_name, category, is_published)
    values (
      new.id,
      'artista-' || left(replace(new.id::text, '-', ''), 12),
      coalesce(display_name, 'Novo artista'),
      requested_category,
      false
    );
  end if;

  return new;
end;
$$;

revoke all on function private.handle_new_user() from public, anon, authenticated, service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

;
