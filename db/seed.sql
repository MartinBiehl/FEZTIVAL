-- SEED DE DEMONSTRACAO -- NAO E DADO REAL.
--
-- ATENCAO: este arquivo NAO deve ser executado em producao com cadastros
-- reais. Ele cria 8 artistas ficticios e as contas correspondentes,
-- todas no dominio @seed.feztival.local e com UUIDs fixos, justamente para
-- poderem ser identificadas e removidas sem risco de tocar em alguem legitimo.
--
-- Para remover tudo o que este seed criou:
--   delete from users where email like '%@seed.feztival.local';
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
-- contas de demonstracao
-- ---------------------------------------------------------------------------

-- UUIDs fixos no formato 5eed....-0000-4000-8000-00000000000N ("seed" em
-- leetspeak) para serem reconheciveis a olho nu em qualquer consulta.
-- password_hash '!' nao corresponde a nenhuma senha: ninguem entra nessas contas.
insert into users (id, email, password_hash, email_verified_at) values
  ('5eed0000-0000-4000-8000-000000000001', 'dj-kauan@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000002', 'marina-santos@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000003', 'banda-nativus@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000004', 'dj-vitoria@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000005', 'rafael-acustico@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000006', 'samba-ivoti@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000007', 'leticia-black@seed.feztival.local', '!', now()),
  ('5eed0000-0000-4000-8000-000000000008', 'banda-quartel@seed.feztival.local', '!', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

-- full_name, phone, avatar_url e city ficam nulos: src/data traz apenas o
-- nome artistico, que pertence a artists.stage_name.
insert into profiles (id, full_name, phone, avatar_url, city) values
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
insert into artists (
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

insert into artist_genres (artist_id, genre_id) values
  ('5eed1111-0000-4000-8000-000000000001', (select id from genres where slug = 'funk')),
  ('5eed1111-0000-4000-8000-000000000001', (select id from genres where slug = 'eletronica')),
  ('5eed1111-0000-4000-8000-000000000002', (select id from genres where slug = 'mpb')),
  ('5eed1111-0000-4000-8000-000000000002', (select id from genres where slug = 'pop')),
  ('5eed1111-0000-4000-8000-000000000003', (select id from genres where slug = 'rock-gaucho')),
  ('5eed1111-0000-4000-8000-000000000003', (select id from genres where slug = 'mpb')),
  ('5eed1111-0000-4000-8000-000000000004', (select id from genres where slug = 'techno')),
  ('5eed1111-0000-4000-8000-000000000004', (select id from genres where slug = 'house')),
  ('5eed1111-0000-4000-8000-000000000005', (select id from genres where slug = 'acustico')),
  ('5eed1111-0000-4000-8000-000000000005', (select id from genres where slug = 'pop')),
  ('5eed1111-0000-4000-8000-000000000006', (select id from genres where slug = 'pagode')),
  ('5eed1111-0000-4000-8000-000000000006', (select id from genres where slug = 'samba')),
  ('5eed1111-0000-4000-8000-000000000007', (select id from genres where slug = 'soul')),
  ('5eed1111-0000-4000-8000-000000000007', (select id from genres where slug = 'r-b')),
  ('5eed1111-0000-4000-8000-000000000008', (select id from genres where slug = 'rock')),
  ('5eed1111-0000-4000-8000-000000000008', (select id from genres where slug = 'indie'))
on conflict (artist_id, genre_id) do nothing;

-- Estruturas de perfil dos mesmos 8 artistas ficticios: cor, formas de
-- pagamento, tipos de local, area, infraestrutura, horario e servicos. O
-- conteudo veio de src/data/artistProfileDetails.js -- nada foi inventado.

-- ---------------------------------------------------------------------------
-- Cor de destaque de cada artista (token --artist-color)
-- ---------------------------------------------------------------------------

update artists set color = '#FFD600', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'dj-kauan';
update artists set color = '#FF3CAC', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'marina-santos';
update artists set color = '#FF6B35', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'banda-nativus';
update artists set color = '#B36AFF', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'dj-vitoria';
update artists set color = '#00D4FF', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'rafael-acustico';
update artists set color = '#FFD600', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'samba-ivoti';
update artists set color = '#FF3CAC', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'leticia-black';
update artists set color = '#FF6B35', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'banda-quartel';

-- ---------------------------------------------------------------------------
-- Vinculos: todos os 8 aceitam as mesmas formas de pagamento e tipos de local
-- (era o que o JSX exibia, igual para todos)
-- ---------------------------------------------------------------------------

insert into artist_payment_methods (artist_id, payment_method_id)
select a.id, p.id from artists a cross join payment_methods p
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
on conflict do nothing;

insert into artist_venue_types (artist_id, venue_type_id)
select a.id, v.id from artists a cross join venue_types v
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Area de atendimento: as 6 cidades da regiao
-- ---------------------------------------------------------------------------

insert into artist_service_areas (artist_id, city, sort_order)
select a.id, c.city, c.ord
from artists a
cross join (values
  ('Ivoti', 0),
  ('Novo Hamburgo', 1),
  ('Estância Velha', 2),
  ('Dois Irmãos', 3),
  ('Campo Bom', 4),
  ('São Leopoldo', 5)
) as c(city, ord)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
on conflict (artist_id, city) do nothing;

-- ---------------------------------------------------------------------------
-- Infraestrutura
-- ---------------------------------------------------------------------------

insert into artist_infrastructure (artist_id, status, title, detail, sort_order)
select a.id, i.status::infrastructure_status, i.title, i.detail, i.ord
from artists a
cross join (values
  ('included', 'Instrumentos e cabos básicos', 'O artista leva os instrumentos e os cabos necessários para a apresentação.', 0),
  ('negotiable', 'Equipamento de som', 'Pode ser fornecido conforme o formato contratado e o porte do evento.', 1),
  ('required', 'Energia, espaço e área coberta', 'O contratante deve garantir tomadas próximas, circulação segura e proteção contra chuva.', 2)
) as i(status, title, detail, ord)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
  and not exists (
    select 1 from artist_infrastructure x
    where x.artist_id = a.id and x.title = i.title
  );

-- ---------------------------------------------------------------------------
-- Horario semanal
-- ---------------------------------------------------------------------------

insert into artist_weekly_hours (artist_id, weekday, is_available, opens_at, closes_at)
select a.id, w.weekday, w.is_available, w.opens_at::time, w.closes_at::time
from artists a
cross join (values

  (1, true, '09:00', '18:00'),
  (2, true, '09:00', '18:00'),
  (3, true, '09:00', '18:00'),
  (4, true, '09:00', '18:00'),
  (5, true, '09:00', '18:00'),
  (6, true, '10:00', '16:00'),
  (0, false, null, null)
) as w(weekday, is_available, opens_at, closes_at)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
on conflict (artist_id, weekday) do nothing;

-- ---------------------------------------------------------------------------
-- Servicos: preco absoluto, derivado do base_price mais o ajuste que o JSX
-- aplicava (a modelagem do banco e valor absoluto, nao delta)
-- ---------------------------------------------------------------------------

insert into artist_services (artist_id, title, description, price, duration_minutes)
select a.id, s.title, s.description, greatest(a.base_price + s.adjustment, 0), s.duration
from artists a
cross join (values

  ('Show completo', 'Repertório personalizado · até 3h · Equipamento de som a combinar', 0, 180),
  ('Formato compacto', 'Ideal para recepções · até 1h30 · Equipamento básico incluso', -500, 90)
) as s(title, description, adjustment, duration)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
  and not exists (
    select 1 from artist_services x
    where x.artist_id = a.id and x.title = s.title
  );

-- ---------------------------------------------------------------------------
-- Galeria: arquivos em public/images, caminho estavel entre builds
-- (o hash de /_next/static/media muda a cada build e quebraria os links)
-- ---------------------------------------------------------------------------

insert into artist_media (artist_id, type, url, caption, sort_order)
select a.id, m.type::media_type, m.url, m.caption, m.ord
from artists a
cross join (values

  ('video', '/images/concert_stage.png', 'Banda se apresentando em um palco iluminado', 0),
  ('photo', '/images/crowd_party.png', 'Público celebrando durante um show', 1),
  ('photo', '/images/concert_stage.png', 'Palco preparado para uma apresentação musical', 2)
) as m(type, url, caption, ord)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
  and not exists (
    select 1 from artist_media x
    where x.artist_id = a.id and x.caption = m.caption
  );
