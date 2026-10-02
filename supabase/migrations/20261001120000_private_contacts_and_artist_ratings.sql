-- Fecha os contatos pessoais e expoe a nota dos artistas.
--
-- 1. profiles deixa de ser publico. A policy original (using (true)) permitia
--    a qualquer portador da chave publica listar nome e WhatsApp de todos os
--    usuarios, contratantes incluidos. Agora cada um ve o proprio perfil e o
--    da outra parte de uma reserva -- o artista precisa do contato de quem o
--    contratou, e o contratante, do artista.
--
-- 2. A nota do artista deriva de reviews -> bookings -> artists, mas o publico
--    nao le bookings (e nao deve: ali estao endereco, valores e mensagens).
--    As duas funcoes abaixo devolvem apenas o agregado e o texto das
--    avaliacoes, sem nada da reserva, e so de artistas publicados.

-- ---------------------------------------------------------------------------
-- profiles: so o proprio e as contrapartes de reserva
-- ---------------------------------------------------------------------------

-- security definer pelo mesmo motivo de owns_artist: a consulta a bookings e
-- artists de dentro de uma policy seria filtrada pela RLS dessas tabelas.
create or replace function public.is_booking_counterparty(target_profile_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.bookings b
    join public.artists a on a.id = b.artist_id
    where
      -- Eu sou o artista e o alvo e o contratante.
      (a.profile_id = auth.uid() and b.client_id = target_profile_id)
      -- Eu sou o contratante e o alvo e o artista.
      or (b.client_id = auth.uid() and a.profile_id = target_profile_id)
  );
$$;

drop policy profiles_select_public on public.profiles;

create policy profiles_select_self_or_counterparty
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_booking_counterparty(id));

-- ---------------------------------------------------------------------------
-- Nota publica dos artistas
-- ---------------------------------------------------------------------------

-- Media e contagem por artista publicado. Artista sem avaliacao nao aparece.
create or replace function public.artist_review_summary()
returns table (artist_id uuid, rating_avg numeric, rating_count int)
language sql
security definer
set search_path = public
stable
as $$
  select b.artist_id, round(avg(r.rating), 1), count(*)::int
  from public.reviews r
  join public.bookings b on b.id = r.booking_id
  join public.artists a on a.id = b.artist_id
  where a.is_published
  group by b.artist_id;
$$;

-- Avaliacoes de um artista publicado, mais recentes primeiro. Sem o nome de
-- quem avaliou nem qualquer dado da reserva alem do tipo de evento.
create or replace function public.artist_reviews(target_slug text)
returns table (rating int, comment text, event_type text, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select r.rating, r.comment, b.event_type, r.created_at
  from public.reviews r
  join public.bookings b on b.id = r.booking_id
  join public.artists a on a.id = b.artist_id
  where a.slug = target_slug
    and a.is_published
  order by r.created_at desc
  limit 50;
$$;

grant execute on function public.artist_review_summary() to anon, authenticated;
grant execute on function public.artist_reviews(text) to anon, authenticated;
