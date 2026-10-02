-- Corrige os achados 3, 4, 6 e 7 da auditoria:
--   * remove RPCs SECURITY DEFINER expostas pelo schema public;
--   * fixa search_path de funcoes internas;
--   * avalia auth.uid() uma vez por statement nas policies;
--   * adiciona o indice ausente da FK bookings.service_id.
--
-- O achado 5 (proteção contra senhas vazadas) pertence ao Auth, não ao
-- Postgres. Ele é aplicado na configuração do projeto hospedado e documentado
-- em supabase/README.md.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- Funcoes de trigger não precisam ficar expostas pela Data API. Alterar o
-- schema preserva os triggers existentes, que referenciam a função por OID.
alter function public.set_updated_at() set schema private;
alter function private.set_updated_at() set search_path = '';

alter function public.enforce_booking_amounts_immutable() set schema private;
alter function private.enforce_booking_amounts_immutable() set search_path = '';

alter function public.enforce_booking_status_transition() set schema private;
alter function private.enforce_booking_status_transition() set search_path = '';

-- O event trigger continua funcional depois da mudança de schema, mas deixa de
-- ser uma função chamável pelo cliente.
alter function public.rls_auto_enable() set schema private;
alter function private.rls_auto_enable() set search_path = 'pg_catalog';

revoke all on function private.set_updated_at() from public, anon, authenticated, service_role;
revoke all on function private.enforce_booking_amounts_immutable() from public, anon, authenticated, service_role;
revoke all on function private.enforce_booking_status_transition() from public, anon, authenticated, service_role;
revoke all on function private.rls_auto_enable() from public, anon, authenticated, service_role;

-- Não há chamada deste RPC no projeto. Contagem de visualizações deve passar
-- por um Route Handler com rate limit/deduplicação antes de voltar a existir.
drop function if exists public.increment_artist_view_count(text);

-- Policies das tabelas-base: auth.uid() em subselect evita reavaliacao por
-- linha e mantém exatamente as regras de acesso anteriores.
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists artists_select_published on public.artists;
create policy artists_select_published
  on public.artists for select to anon, authenticated
  using (is_published or profile_id = (select auth.uid()));

drop policy if exists artists_insert_own on public.artists;
create policy artists_insert_own
  on public.artists for insert to authenticated
  with check (profile_id = (select auth.uid()));

drop policy if exists artists_update_own on public.artists;
create policy artists_update_own
  on public.artists for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

drop policy if exists artists_delete_own on public.artists;
create policy artists_delete_own
  on public.artists for delete to authenticated
  using (profile_id = (select auth.uid()));

-- As tabelas-filhas passam a consultar artists diretamente. Assim as antigas
-- helpers SECURITY DEFINER podem ser removidas sem abrir bypass de RLS.
drop policy if exists artist_genres_select_published on public.artist_genres;
create policy artist_genres_select_published
  on public.artist_genres for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_genres.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_genres_write_own on public.artist_genres;
create policy artist_genres_write_own
  on public.artist_genres for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_genres.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_genres.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_infrastructure_select on public.artist_infrastructure;
create policy artist_infrastructure_select
  on public.artist_infrastructure for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_infrastructure.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_infrastructure_write on public.artist_infrastructure;
create policy artist_infrastructure_write
  on public.artist_infrastructure for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_infrastructure.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_infrastructure.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_media_select_published on public.artist_media;
create policy artist_media_select_published
  on public.artist_media for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_media.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_media_write_own on public.artist_media;
create policy artist_media_write_own
  on public.artist_media for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_media.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_media.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_payment_methods_select on public.artist_payment_methods;
create policy artist_payment_methods_select
  on public.artist_payment_methods for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_payment_methods.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_payment_methods_write on public.artist_payment_methods;
create policy artist_payment_methods_write
  on public.artist_payment_methods for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_payment_methods.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_payment_methods.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_service_areas_select on public.artist_service_areas;
create policy artist_service_areas_select
  on public.artist_service_areas for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_service_areas.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_service_areas_write on public.artist_service_areas;
create policy artist_service_areas_write
  on public.artist_service_areas for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_service_areas.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_service_areas.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_services_select_published on public.artist_services;
create policy artist_services_select_published
  on public.artist_services for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_services.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_services_write_own on public.artist_services;
create policy artist_services_write_own
  on public.artist_services for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_services.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_services.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_venue_types_select on public.artist_venue_types;
create policy artist_venue_types_select
  on public.artist_venue_types for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_venue_types.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_venue_types_write on public.artist_venue_types;
create policy artist_venue_types_write
  on public.artist_venue_types for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_venue_types.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_venue_types.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists artist_weekly_hours_select on public.artist_weekly_hours;
create policy artist_weekly_hours_select
  on public.artist_weekly_hours for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_weekly_hours.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists artist_weekly_hours_write on public.artist_weekly_hours;
create policy artist_weekly_hours_write
  on public.artist_weekly_hours for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = artist_weekly_hours.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = artist_weekly_hours.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists availability_select_public on public.availability;
create policy availability_select_public
  on public.availability for select to anon, authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = availability.artist_id
      and (a.is_published or a.profile_id = (select auth.uid()))
  ));

drop policy if exists availability_write_own on public.availability;
create policy availability_write_own
  on public.availability for all to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = availability.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.artists a
    where a.id = availability.artist_id
      and a.profile_id = (select auth.uid())
  ));

drop policy if exists bookings_select_own on public.bookings;
create policy bookings_select_own
  on public.bookings for select to authenticated
  using (
    client_id = (select auth.uid())
    or exists (
      select 1 from public.artists a
      where a.id = bookings.artist_id
        and a.profile_id = (select auth.uid())
    )
  );

drop policy if exists bookings_insert_client on public.bookings;
create policy bookings_insert_client
  on public.bookings for insert to authenticated
  with check (client_id = (select auth.uid()) and status = 'pending');

drop policy if exists bookings_update_artist on public.bookings;
create policy bookings_update_artist
  on public.bookings for update to authenticated
  using (exists (
    select 1 from public.artists a
    where a.id = bookings.artist_id
      and a.profile_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.artists a
      where a.id = bookings.artist_id
        and a.profile_id = (select auth.uid())
    )
    and status in ('accepted', 'declined', 'confirmed', 'completed', 'cancelled')
  );

drop policy if exists bookings_update_client on public.bookings;
create policy bookings_update_client
  on public.bookings for update to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) and status = 'cancelled');

drop policy if exists reviews_insert_client on public.reviews;
create policy reviews_insert_client
  on public.reviews for insert to authenticated
  with check (exists (
    select 1 from public.bookings b
    where b.id = reviews.booking_id
      and b.client_id = (select auth.uid())
      and b.status = 'completed'
  ));

-- Somente agora, depois de remover todas as dependencias das policies.
drop function if exists public.owns_artist(uuid);
drop function if exists public.artist_is_published(uuid);

create index if not exists bookings_service_id_idx
  on public.bookings (service_id)
  where service_id is not null;

;
