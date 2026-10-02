-- Policies FOR ALL também participam de SELECT e provocavam avaliações RLS
-- duplicadas. Separe cada operação de escrita para manter uma única policy de
-- leitura por tabela.

drop policy if exists artist_genres_write_own on public.artist_genres;
create policy artist_genres_insert_own on public.artist_genres for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_genres.artist_id and a.profile_id = (select auth.uid())));
create policy artist_genres_update_own on public.artist_genres for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_genres.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_genres.artist_id and a.profile_id = (select auth.uid())));
create policy artist_genres_delete_own on public.artist_genres for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_genres.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_infrastructure_write on public.artist_infrastructure;
create policy artist_infrastructure_insert_own on public.artist_infrastructure for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_infrastructure.artist_id and a.profile_id = (select auth.uid())));
create policy artist_infrastructure_update_own on public.artist_infrastructure for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_infrastructure.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_infrastructure.artist_id and a.profile_id = (select auth.uid())));
create policy artist_infrastructure_delete_own on public.artist_infrastructure for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_infrastructure.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_media_write_own on public.artist_media;
create policy artist_media_insert_own on public.artist_media for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_media.artist_id and a.profile_id = (select auth.uid())));
create policy artist_media_update_own on public.artist_media for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_media.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_media.artist_id and a.profile_id = (select auth.uid())));
create policy artist_media_delete_own on public.artist_media for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_media.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_payment_methods_write on public.artist_payment_methods;
create policy artist_payment_methods_insert_own on public.artist_payment_methods for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_payment_methods.artist_id and a.profile_id = (select auth.uid())));
create policy artist_payment_methods_update_own on public.artist_payment_methods for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_payment_methods.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_payment_methods.artist_id and a.profile_id = (select auth.uid())));
create policy artist_payment_methods_delete_own on public.artist_payment_methods for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_payment_methods.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_service_areas_write on public.artist_service_areas;
create policy artist_service_areas_insert_own on public.artist_service_areas for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_service_areas.artist_id and a.profile_id = (select auth.uid())));
create policy artist_service_areas_update_own on public.artist_service_areas for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_service_areas.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_service_areas.artist_id and a.profile_id = (select auth.uid())));
create policy artist_service_areas_delete_own on public.artist_service_areas for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_service_areas.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_services_write_own on public.artist_services;
create policy artist_services_insert_own on public.artist_services for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_services.artist_id and a.profile_id = (select auth.uid())));
create policy artist_services_update_own on public.artist_services for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_services.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_services.artist_id and a.profile_id = (select auth.uid())));
create policy artist_services_delete_own on public.artist_services for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_services.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_venue_types_write on public.artist_venue_types;
create policy artist_venue_types_insert_own on public.artist_venue_types for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_venue_types.artist_id and a.profile_id = (select auth.uid())));
create policy artist_venue_types_update_own on public.artist_venue_types for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_venue_types.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_venue_types.artist_id and a.profile_id = (select auth.uid())));
create policy artist_venue_types_delete_own on public.artist_venue_types for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_venue_types.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists artist_weekly_hours_write on public.artist_weekly_hours;
create policy artist_weekly_hours_insert_own on public.artist_weekly_hours for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = artist_weekly_hours.artist_id and a.profile_id = (select auth.uid())));
create policy artist_weekly_hours_update_own on public.artist_weekly_hours for update to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_weekly_hours.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = artist_weekly_hours.artist_id and a.profile_id = (select auth.uid())));
create policy artist_weekly_hours_delete_own on public.artist_weekly_hours for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = artist_weekly_hours.artist_id and a.profile_id = (select auth.uid())));

drop policy if exists availability_write_own on public.availability;
create policy availability_insert_own on public.availability for insert to authenticated
  with check (exists (select 1 from public.artists a where a.id = availability.artist_id and a.profile_id = (select auth.uid())));
create policy availability_update_own on public.availability for update to authenticated
  using (exists (select 1 from public.artists a where a.id = availability.artist_id and a.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.artists a where a.id = availability.artist_id and a.profile_id = (select auth.uid())));
create policy availability_delete_own on public.availability for delete to authenticated
  using (exists (select 1 from public.artists a where a.id = availability.artist_id and a.profile_id = (select auth.uid())));

-- Uma única policy cobre os dois papéis e evita duas avaliações permissivas
-- em cada UPDATE. O trigger continua validando as transições de estado.
drop policy if exists bookings_update_artist on public.bookings;
drop policy if exists bookings_update_client on public.bookings;
create policy bookings_update_participants
  on public.bookings for update to authenticated
  using (
    client_id = (select auth.uid())
    or exists (
      select 1 from public.artists a
      where a.id = bookings.artist_id and a.profile_id = (select auth.uid())
    )
  )
  with check (
    (client_id = (select auth.uid()) and status = 'cancelled')
    or (
      exists (
        select 1 from public.artists a
        where a.id = bookings.artist_id and a.profile_id = (select auth.uid())
      )
      and status in ('accepted', 'declined', 'confirmed', 'completed', 'cancelled')
    )
  );

-- A tabela de inbox continua invisível ao browser. Esta policy explícita
-- documenta que apenas o backend privilegiado a processa e remove o alerta
-- “RLS enabled without policy”.
create policy payment_webhook_events_service_role
  on public.payment_webhook_events for all to service_role
  using (true)
  with check (true);

;
