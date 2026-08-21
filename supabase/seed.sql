-- SEED DE DEMONSTRACAO -- NAO E DADO REAL.
--
-- ATENCAO: este arquivo NAO deve ser executado em producao com cadastros
-- reais. Ele cria 8 artistas ficticios e as contas de auth correspondentes,
-- todas no dominio @seed.feztival.local e com UUIDs fixos, justamente para
-- poderem ser identificadas e removidas sem risco de tocar em alguem legitimo.
--
-- Para remover tudo o que este seed criou:
--   delete from auth.users where email like '%@seed.feztival.local';
-- O cascade em profiles -> artists leva embora artistas, midias, servicos,
-- generos vinculados e agenda.
--
-- Os dados vem de src/data/landingContent.js, que alimenta o site hoje. Os
-- slugs sao preservados exatamente porque as URLs /artista/<slug> ja estao
-- publicadas no sitemap: mudar um slug quebra a URL indexada.
--
-- Campos sem equivalente em src/data ficam NULL de proposito -- nada aqui e
-- inventado:
--   profiles.full_name  os dados tem apenas nome artistico
--   profiles.phone, avatar_url, city
--   artists.bio_short, bio_long   os registros nao tem biografia
--   artists.cover_url             todos com image: null
--   artists.service_radius_km     distanceKm e a distancia ate o usuario,
--                                 nao o raio de atendimento do artista
--   artist_media, artist_services nao ha midia nem catalogo de servicos
--   availability                  nao ha agenda declarada
--
-- rating e reviews existem em src/data (por exemplo 4.9 com 87 avaliacoes)
-- mas NAO entram: no schema a nota deriva de reviews amarradas a bookings
-- reais, e inventar 87 reservas falsas para reproduzir a media seria dado
-- fabricado. Artista semeado comeca sem avaliacao.

-- Idempotente: rodar duas vezes nao duplica nem falha.

-- ---------------------------------------------------------------------------
-- generos
-- ---------------------------------------------------------------------------

insert into public.genres (name, slug) values
  ('Acústico', 'acustico'),
  ('Eletrônica', 'eletronica'),
  ('Funk', 'funk'),
  ('House', 'house'),
  ('Indie', 'indie'),
  ('MPB', 'mpb'),
  ('Pagode', 'pagode'),
  ('Pop', 'pop'),
  ('R&B', 'r-b'),
  ('Rock', 'rock'),
  ('Rock Gaúcho', 'rock-gaucho'),
  ('Samba', 'samba'),
  ('Soul', 'soul'),
  ('Techno', 'techno')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- contas de demonstracao
-- ---------------------------------------------------------------------------

-- UUIDs fixos no formato 5eed....-0000-4000-8000-00000000000N ("seed" em
-- leetspeak) para serem reconheciveis a olho nu em qualquer consulta.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values
  ('5eed0000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dj-kauan@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'marina-santos@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'banda-nativus@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'dj-vitoria@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'rafael-acustico@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'samba-ivoti@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'leticia-black@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb),
  ('5eed0000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'banda-quartel@seed.feztival.local', '',
   now(), now(), now(), '{"provider":"seed","providers":["seed"]}'::jsonb, '{}'::jsonb)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- full_name, phone, avatar_url e city ficam nulos: src/data traz apenas o
-- nome artistico, que pertence a artists.stage_name.
insert into public.profiles (id, full_name, phone, avatar_url, city) values
  ('5eed0000-0000-4000-8000-000000000001', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000002', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000003', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000004', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000005', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000006', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000007', null, null, null, null),
  ('5eed0000-0000-4000-8000-000000000008', null, null, null, null)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- artists
-- ---------------------------------------------------------------------------

-- category traduz as 5 categorias de src/data para o enum de 3 valores, no
-- mesmo mapeamento que a Fase 2 usa no JSON-LD:
--   DJ                    -> dj
--   Cantor, Musico Solo   -> solo   (Person)
--   Banda, Pagode         -> band   (MusicGroup)
--
-- is_published = true porque os 8 ja estao publicos no site atual.
-- price_on_request = false porque todos tem preco definido em src/data.
insert into public.artists (
  id, profile_id, slug, stage_name, category, city, base_price,
  price_on_request, is_published
) values
  ('5eed1111-0000-4000-8000-000000000001', '5eed0000-0000-4000-8000-000000000001', 'dj-kauan', 'DJ Kauan', 'dj', 'Ivoti', 2500.00, false, true),
  ('5eed1111-0000-4000-8000-000000000002', '5eed0000-0000-4000-8000-000000000002', 'marina-santos', 'Marina Santos', 'solo', 'Novo Hamburgo', 1800.00, false, true),
  ('5eed1111-0000-4000-8000-000000000003', '5eed0000-0000-4000-8000-000000000003', 'banda-nativus', 'Banda Nativus', 'band', 'Ivoti', 3200.00, false, true),
  ('5eed1111-0000-4000-8000-000000000004', '5eed0000-0000-4000-8000-000000000004', 'dj-vitoria', 'DJ Vitória', 'dj', 'Estância Velha', 1500.00, false, true),
  ('5eed1111-0000-4000-8000-000000000005', '5eed0000-0000-4000-8000-000000000005', 'rafael-acustico', 'Rafael Acústico', 'solo', 'Dois Irmãos', 900.00, false, true),
  ('5eed1111-0000-4000-8000-000000000006', '5eed0000-0000-4000-8000-000000000006', 'samba-ivoti', 'Samba Ivoti', 'band', 'Ivoti', 2800.00, false, true),
  ('5eed1111-0000-4000-8000-000000000007', '5eed0000-0000-4000-8000-000000000007', 'leticia-black', 'Letícia Black', 'solo', 'Campo Bom', 2000.00, false, true),
  ('5eed1111-0000-4000-8000-000000000008', '5eed0000-0000-4000-8000-000000000008', 'banda-quartel', 'Banda Quartel', 'band', 'São Leopoldo', 3500.00, false, true)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- artist_genres
-- ---------------------------------------------------------------------------

insert into public.artist_genres (artist_id, genre_id) values
  ('5eed1111-0000-4000-8000-000000000001', (select id from public.genres where slug = 'funk')),
  ('5eed1111-0000-4000-8000-000000000001', (select id from public.genres where slug = 'eletronica')),
  ('5eed1111-0000-4000-8000-000000000002', (select id from public.genres where slug = 'mpb')),
  ('5eed1111-0000-4000-8000-000000000002', (select id from public.genres where slug = 'pop')),
  ('5eed1111-0000-4000-8000-000000000003', (select id from public.genres where slug = 'rock-gaucho')),
  ('5eed1111-0000-4000-8000-000000000003', (select id from public.genres where slug = 'mpb')),
  ('5eed1111-0000-4000-8000-000000000004', (select id from public.genres where slug = 'techno')),
  ('5eed1111-0000-4000-8000-000000000004', (select id from public.genres where slug = 'house')),
  ('5eed1111-0000-4000-8000-000000000005', (select id from public.genres where slug = 'acustico')),
  ('5eed1111-0000-4000-8000-000000000005', (select id from public.genres where slug = 'pop')),
  ('5eed1111-0000-4000-8000-000000000006', (select id from public.genres where slug = 'pagode')),
  ('5eed1111-0000-4000-8000-000000000006', (select id from public.genres where slug = 'samba')),
  ('5eed1111-0000-4000-8000-000000000007', (select id from public.genres where slug = 'soul')),
  ('5eed1111-0000-4000-8000-000000000007', (select id from public.genres where slug = 'r-b')),
  ('5eed1111-0000-4000-8000-000000000008', (select id from public.genres where slug = 'rock')),
  ('5eed1111-0000-4000-8000-000000000008', (select id from public.genres where slug = 'indie'))
on conflict (artist_id, genre_id) do nothing;
