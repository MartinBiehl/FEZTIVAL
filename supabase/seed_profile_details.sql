-- SEED COMPLEMENTAR DE DEMONSTRACAO -- NAO E DADO REAL.
--
-- Popula as estruturas de perfil criadas na migration de expansao, para os
-- mesmos 8 artistas ficticios de seed.sql. Leia o aviso daquele arquivo: estes
-- dados sao identificados pelos UUIDs 5eed1111 e saem junto com os 8 quando
-- artistas reais entrarem.
--
-- O conteudo vem de src/data/artistProfileDetails.js, que alimentava o perfil
-- diretamente no JSX -- os mesmos textos para os 8 artistas. Nada foi
-- inventado aqui, apenas transferido para o banco.
--
-- view_count fica em zero: nao ha visualizacao real a registrar.
--
-- Idempotente: rodar duas vezes nao duplica nem falha.

-- ---------------------------------------------------------------------------
-- Catalogos da plataforma
-- ---------------------------------------------------------------------------

insert into public.payment_methods (slug, name, detail, sort_order) values
  ('pix', 'Pix', 'Confirmação rápida e sem taxas adicionais', 0),
  ('credit-card', 'Cartão de crédito', 'Condições combinadas na confirmação', 1),
  ('bank-transfer', 'Transferência bancária', 'Dados enviados após o aceite da proposta', 2)
on conflict (slug) do nothing;

insert into public.venue_types (slug, name, sort_order) values
  ('festas-particulares', 'Festas particulares', 0),
  ('casamentos', 'Casamentos', 1),
  ('eventos-corporativos', 'Eventos corporativos', 2),
  ('hoteis', 'Hotéis', 3),
  ('bares-e-restaurantes', 'Bares e restaurantes', 4),
  ('local-proprio', 'Local próprio', 5)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Cor de destaque de cada artista (token --artist-color)
-- ---------------------------------------------------------------------------

update public.artists set color = '#FFD600', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'dj-kauan';
update public.artists set color = '#FF3CAC', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'marina-santos';
update public.artists set color = '#FF6B35', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'banda-nativus';
update public.artists set color = '#B36AFF', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'dj-vitoria';
update public.artists set color = '#00D4FF', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'rafael-acustico';
update public.artists set color = '#FFD600', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'samba-ivoti';
update public.artists set color = '#FF3CAC', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'leticia-black';
update public.artists set color = '#FF6B35', service_area_summary = 'Ivoti e região do Vale do Sinos, com deslocamento de até 50 km.' where slug = 'banda-quartel';

-- ---------------------------------------------------------------------------
-- Vinculos: todos os 8 aceitam as mesmas formas de pagamento e tipos de local
-- (era o que o JSX exibia, igual para todos)
-- ---------------------------------------------------------------------------

insert into public.artist_payment_methods (artist_id, payment_method_id)
select a.id, p.id from public.artists a cross join public.payment_methods p
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
on conflict do nothing;

insert into public.artist_venue_types (artist_id, venue_type_id)
select a.id, v.id from public.artists a cross join public.venue_types v
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Area de atendimento: as 6 cidades da regiao
-- ---------------------------------------------------------------------------

insert into public.artist_service_areas (artist_id, city, sort_order)
select a.id, c.city, c.ord
from public.artists a
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

insert into public.artist_infrastructure (artist_id, status, title, detail, sort_order)
select a.id, i.status::public.infrastructure_status, i.title, i.detail, i.ord
from public.artists a
cross join (values
  ('included', 'Instrumentos e cabos básicos', 'O artista leva os instrumentos e os cabos necessários para a apresentação.', 0),
  ('negotiable', 'Equipamento de som', 'Pode ser fornecido conforme o formato contratado e o porte do evento.', 1),
  ('required', 'Energia, espaço e área coberta', 'O contratante deve garantir tomadas próximas, circulação segura e proteção contra chuva.', 2)
) as i(status, title, detail, ord)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
  and not exists (
    select 1 from public.artist_infrastructure x
    where x.artist_id = a.id and x.title = i.title
  );

-- ---------------------------------------------------------------------------
-- Horario semanal
-- ---------------------------------------------------------------------------

insert into public.artist_weekly_hours (artist_id, weekday, is_available, opens_at, closes_at)
select a.id, w.weekday, w.is_available, w.opens_at::time, w.closes_at::time
from public.artists a
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

insert into public.artist_services (artist_id, title, description, price, duration_minutes)
select a.id, s.title, s.description, greatest(a.base_price + s.adjustment, 0), s.duration
from public.artists a
cross join (values

  ('Show completo', 'Repertório personalizado · até 3h · Equipamento de som a combinar', 0, 180),
  ('Formato compacto', 'Ideal para recepções · até 1h30 · Equipamento básico incluso', -500, 90)
) as s(title, description, adjustment, duration)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
  and not exists (
    select 1 from public.artist_services x
    where x.artist_id = a.id and x.title = s.title
  );

-- ---------------------------------------------------------------------------
-- Galeria: arquivos em public/images, caminho estavel entre builds
-- (o hash de /_next/static/media muda a cada build e quebraria os links)
-- ---------------------------------------------------------------------------

insert into public.artist_media (artist_id, type, url, caption, sort_order)
select a.id, m.type::public.media_type, m.url, m.caption, m.ord
from public.artists a
cross join (values

  ('video', '/images/concert_stage.png', 'Banda se apresentando em um palco iluminado', 0),
  ('photo', '/images/crowd_party.png', 'Público celebrando durante um show', 1),
  ('photo', '/images/concert_stage.png', 'Palco preparado para uma apresentação musical', 2)
) as m(type, url, caption, ord)
where a.slug in ('dj-kauan', 'marina-santos', 'banda-nativus', 'dj-vitoria', 'rafael-acustico', 'samba-ivoti', 'leticia-black', 'banda-quartel')
  and not exists (
    select 1 from public.artist_media x
    where x.artist_id = a.id and x.caption = m.caption
  );
