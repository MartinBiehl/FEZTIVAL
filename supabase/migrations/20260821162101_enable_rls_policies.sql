-- Fase do banco de dados, Etapa D: Row Level Security em todas as tabelas.
--
-- RLS e habilitada nas 9 tabelas, sem excecao. Uma tabela sem RLS no Supabase
-- fica legivel e gravavel por qualquer portador da chave publica.
--
-- Duas decisoes de produto guiam as policies abaixo:
--  * A avaliacao e imutavel depois de criada (nao ha policy de UPDATE/DELETE
--    em reviews).
--  * Em bookings, UPDATE e separado por papel: o artista aceita ou recusa, o
--    contratante cancela. Os triggers da Etapa C ja impedem transicao invalida
--    e alteracao de valor, mas nao impedem o PAPEL ERRADO fazendo uma
--    transicao valida -- e isso que as policies abaixo cobrem.

-- ---------------------------------------------------------------------------
-- Funcoes auxiliares
-- ---------------------------------------------------------------------------

-- Verificar posse exige consultar artists dentro da policy de outra tabela.
-- Sem security definer, essa leitura seria filtrada pela propria RLS de
-- artists, causando recursao. set search_path evita captura de nome.
create or replace function public.owns_artist(target_artist_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.artists a
    where a.id = target_artist_id
      and a.profile_id = auth.uid()
  );
$$;

-- Um artista e visivel publicamente apenas quando publicado. As tabelas
-- satelite (midia, servicos, generos, agenda) herdam essa visibilidade.
create or replace function public.artist_is_published(target_artist_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.artists a
    where a.id = target_artist_id
      and a.is_published
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles: leitura publica, escrita apenas do proprio dono
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy profiles_select_public
  on public.profiles for select
  using (true);

-- O INSERT e feito pelo proprio usuario apos o cadastro em auth.users.
create policy profiles_insert_self
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Sem policy de DELETE: remover o perfil e consequencia de remover a conta em
-- auth.users, via cascade.

-- ---------------------------------------------------------------------------
-- artists: leitura publica so de publicados; escrita apenas do dono
-- ---------------------------------------------------------------------------

alter table public.artists enable row level security;

-- Rascunhos ficam invisiveis ao publico, mas o dono ve os proprios.
create policy artists_select_published
  on public.artists for select
  using (is_published or profile_id = auth.uid());

create policy artists_insert_own
  on public.artists for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy artists_update_own
  on public.artists for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy artists_delete_own
  on public.artists for delete
  to authenticated
  using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- artist_media, artist_services, availability, artist_genres
-- Leitura publica se o artista estiver publicado; escrita apenas do dono.
-- ---------------------------------------------------------------------------

alter table public.artist_media enable row level security;

create policy artist_media_select_published
  on public.artist_media for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));

create policy artist_media_write_own
  on public.artist_media for all
  to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.artist_services enable row level security;

create policy artist_services_select_published
  on public.artist_services for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));

create policy artist_services_write_own
  on public.artist_services for all
  to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.artist_genres enable row level security;

create policy artist_genres_select_published
  on public.artist_genres for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));

create policy artist_genres_write_own
  on public.artist_genres for all
  to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

alter table public.availability enable row level security;

-- A agenda e publica: o contratante precisa ver as datas livres antes de
-- enviar uma proposta.
create policy availability_select_public
  on public.availability for select
  using (public.artist_is_published(artist_id) or public.owns_artist(artist_id));

create policy availability_write_own
  on public.availability for all
  to authenticated
  using (public.owns_artist(artist_id))
  with check (public.owns_artist(artist_id));

-- ---------------------------------------------------------------------------
-- genres: leitura publica, escrita bloqueada
-- ---------------------------------------------------------------------------

alter table public.genres enable row level security;

create policy genres_select_public
  on public.genres for select
  using (true);

-- Nenhuma policy de escrita: o catalogo de generos e mantido por
-- administracao, via painel ou service_role, que ignora RLS.

-- ---------------------------------------------------------------------------
-- bookings: o contratante ve as proprias, o artista ve as recebidas
-- ---------------------------------------------------------------------------

alter table public.bookings enable row level security;

create policy bookings_select_own
  on public.bookings for select
  to authenticated
  using (client_id = auth.uid() or public.owns_artist(artist_id));

-- Quem cria a proposta e o contratante, sempre em nome proprio.
create policy bookings_insert_client
  on public.bookings for insert
  to authenticated
  with check (client_id = auth.uid() and status = 'pending');

-- UPDATE separado por papel. Sem essa separacao, o contratante poderia marcar
-- a propria reserva como completed, ou o artista cancelar em nome do cliente.
-- As transicoes em si sao validadas pelo trigger da Etapa C; aqui controlamos
-- QUEM pode dispara-las.
create policy bookings_update_artist
  on public.bookings for update
  to authenticated
  using (public.owns_artist(artist_id))
  with check (
    public.owns_artist(artist_id)
    and status in ('accepted', 'declined', 'confirmed', 'completed', 'cancelled')
  );

create policy bookings_update_client
  on public.bookings for update
  to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid() and status = 'cancelled');

-- Sem policy de DELETE: reserva e historico e nao deve ser apagada. Cancelar
-- e uma transicao de status, nao uma exclusao.

-- ---------------------------------------------------------------------------
-- reviews: leitura publica, escrita so pelo contratante da reserva concluida
-- ---------------------------------------------------------------------------

alter table public.reviews enable row level security;

create policy reviews_select_public
  on public.reviews for select
  using (true);

-- Somente o contratante da reserva, e somente depois do show. O status
-- completed amarra a avaliacao a uma contratacao que realmente aconteceu.
create policy reviews_insert_client
  on public.reviews for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.client_id = auth.uid()
        and b.status = 'completed'
    )
  );

-- Sem policy de UPDATE nem DELETE: a avaliacao e imutavel depois de criada.
-- Como o status permanece completed para sempre, uma policy de UPDATE daria
-- ao contratante o direito de reescrever a avaliacao indefinidamente.
