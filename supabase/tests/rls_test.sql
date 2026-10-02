-- Teste das policies de RLS.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do painel do Supabase e
-- execute. Roda dentro de uma transacao que termina em ROLLBACK, portanto nada
-- persiste. O resultado sai como UMA TABELA; todos os casos devem dar PASSOU.
--
-- O teste simula dois usuarios trocando o papel `authenticated` e o claim
-- auth.uid(), que e como o Supabase identifica o usuario logado.

begin;

create temporary table resultado (
  ordem int, caso text, veredito text
) on commit drop;

-- A tabela temporaria pertence ao papel que criou a sessao. Como o teste troca
-- para `authenticated` mais adiante, esse papel precisa poder gravar aqui --
-- caso contrario os inserts de resultado falham por permissao, e nao por RLS.
grant insert, select on resultado to authenticated, anon;

-- Cenario -------------------------------------------------------------------
-- ana   = artista com perfil publicado
-- bruno = contratante
-- carla = terceiro sem relacao com a reserva

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at)
values
  ('aaaa0000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'ana@example.com', '', now(), now(), now()),
  ('bbbb0000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'bruno@example.com', '', now(), now(), now()),
  ('cccc0000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'carla@example.com', '', now(), now(), now());

insert into public.profiles (id, full_name) values
  ('aaaa0000-0000-0000-0000-000000000001', 'Ana'),
  ('bbbb0000-0000-0000-0000-000000000002', 'Bruno'),
  ('cccc0000-0000-0000-0000-000000000003', 'Carla');

-- Ana publicada; artista rascunho de Carla para testar visibilidade.
insert into public.artists (id, profile_id, slug, stage_name, category,
  price_on_request, is_published)
values
  ('aaaa1111-0000-0000-0000-000000000001', 'aaaa0000-0000-0000-0000-000000000001',
   'ana-dj', 'Ana DJ', 'dj', true, true),
  ('cccc1111-0000-0000-0000-000000000003', 'cccc0000-0000-0000-0000-000000000003',
   'carla-rascunho', 'Carla', 'solo', true, false);

insert into public.bookings (id, client_id, artist_id, event_date, status)
values ('bbbb2222-0000-0000-0000-000000000002',
        'bbbb0000-0000-0000-0000-000000000002',
        'aaaa1111-0000-0000-0000-000000000001', '2026-12-01', 'pending');

-- Passa a respeitar RLS (o dono da tabela a ignora por padrao).
set local role authenticated;

-- Casos ---------------------------------------------------------------------

-- 1. Rascunho de artista nao aparece para terceiros.
set local request.jwt.claims = '{"sub":"bbbb0000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.artists where slug = 'carla-rascunho';
  if n = 0 then
    insert into resultado values (1, 'rascunho invisivel a terceiros', 'PASSOU');
  else
    insert into resultado values (1, 'rascunho invisivel a terceiros',
      'FALHOU: rascunho visivel');
  end if;
end $$;

-- 2. O dono ve o proprio rascunho.
set local request.jwt.claims = '{"sub":"cccc0000-0000-0000-0000-000000000003","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.artists where slug = 'carla-rascunho';
  if n = 1 then
    insert into resultado values (2, 'dono ve o proprio rascunho', 'PASSOU');
  else
    insert into resultado values (2, 'dono ve o proprio rascunho',
      'FALHOU: dono nao ve');
  end if;
end $$;

-- 3. Terceiro nao ve reserva alheia.
set local request.jwt.claims = '{"sub":"cccc0000-0000-0000-0000-000000000003","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.bookings
    where id = 'bbbb2222-0000-0000-0000-000000000002';
  if n = 0 then
    insert into resultado values (3, 'reserva invisivel a terceiros', 'PASSOU');
  else
    insert into resultado values (3, 'reserva invisivel a terceiros',
      'FALHOU: terceiro viu a reserva');
  end if;
end $$;

-- 4. Contratante e artista veem a reserva.
do $$
declare n_cliente int; n_artista int;
begin
  -- Dentro de PL/pgSQL, SET LOCAL nao aceita valor dinamico: usa-se set_config.
  perform set_config('request.jwt.claims',
    '{"sub":"bbbb0000-0000-0000-0000-000000000002","role":"authenticated"}', true);
  select count(*) into n_cliente from public.bookings
    where id = 'bbbb2222-0000-0000-0000-000000000002';
  perform set_config('request.jwt.claims',
    '{"sub":"aaaa0000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  select count(*) into n_artista from public.bookings
    where id = 'bbbb2222-0000-0000-0000-000000000002';
  if n_cliente = 1 and n_artista = 1 then
    insert into resultado values (4, 'cliente e artista veem a reserva', 'PASSOU');
  else
    insert into resultado values (4, 'cliente e artista veem a reserva',
      format('FALHOU: cliente=%s artista=%s', n_cliente, n_artista));
  end if;
end $$;

-- 5. O contratante NAO pode marcar como completed (papel errado).
set local request.jwt.claims = '{"sub":"bbbb0000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$
declare n int;
begin
  update public.bookings set status = 'accepted'
    where id = 'bbbb2222-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n = 0 then
    insert into resultado values (5, 'cliente nao aceita a propria reserva', 'PASSOU');
  else
    insert into resultado values (5, 'cliente nao aceita a propria reserva',
      'FALHOU: cliente conseguiu aceitar');
  end if;
exception
  when insufficient_privilege then
    insert into resultado values (5, 'cliente nao aceita a propria reserva', 'PASSOU');
  when others then
    insert into resultado values (5, 'cliente nao aceita a propria reserva', 'FALHOU: erro inesperado: ' || sqlerrm);
end $$;

-- 6. O artista pode aceitar.
set local request.jwt.claims = '{"sub":"aaaa0000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$
declare n int;
begin
  update public.bookings set status = 'accepted',
    agreed_price = 1000, platform_fee = 120, artist_payout = 880
    where id = 'bbbb2222-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n = 1 then
    insert into resultado values (6, 'artista aceita a reserva recebida', 'PASSOU');
  else
    insert into resultado values (6, 'artista aceita a reserva recebida',
      'FALHOU: artista nao conseguiu aceitar');
  end if;
exception when others then
  insert into resultado values (6, 'artista aceita a reserva recebida',
    'FALHOU: ' || sqlerrm);
end $$;

-- 7. Avaliacao exige reserva concluida.
set local request.jwt.claims = '{"sub":"bbbb0000-0000-0000-0000-000000000002","role":"authenticated"}';
do $$
begin
  insert into public.reviews (booking_id, rating)
  values ('bbbb2222-0000-0000-0000-000000000002', 5);
  insert into resultado values (7, 'avaliacao bloqueada antes de completed',
    'FALHOU: aceitou avaliar reserva nao concluida');
exception when insufficient_privilege then
  insert into resultado values (7, 'avaliacao bloqueada antes de completed', 'PASSOU');
end $$;

-- 8. Ninguem edita perfil alheio.
set local request.jwt.claims = '{"sub":"cccc0000-0000-0000-0000-000000000003","role":"authenticated"}';
do $$
declare n int;
begin
  update public.profiles set full_name = 'Invadido'
    where id = 'aaaa0000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n = 0 then
    insert into resultado values (8, 'perfil alheio protegido', 'PASSOU');
  else
    insert into resultado values (8, 'perfil alheio protegido',
      'FALHOU: alterou perfil de outro');
  end if;
exception
  when insufficient_privilege then
    insert into resultado values (8, 'perfil alheio protegido', 'PASSOU');
  when others then
    insert into resultado values (8, 'perfil alheio protegido', 'FALHOU: erro inesperado: ' || sqlerrm);
end $$;

-- 9. genres e somente leitura para usuario comum.
do $$
begin
  insert into public.genres (name, slug) values ('Invadido', 'invadido');
  insert into resultado values (9, 'genres somente leitura',
    'FALHOU: usuario inseriu genero');
exception when insufficient_privilege then
  insert into resultado values (9, 'genres somente leitura', 'PASSOU');
end $$;

-- 11. Terceiro nao le o perfil (nome e WhatsApp) de outro usuario.
set local request.jwt.claims = '{"sub":"cccc0000-0000-0000-0000-000000000003","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.profiles
    where id = 'bbbb0000-0000-0000-0000-000000000002';
  insert into resultado values (11, 'perfil alheio invisivel para terceiro',
    case when n = 0 then 'PASSOU' else 'FALHOU: terceiro leu o perfil' end);
end $$;

-- 12. O artista le o perfil de quem pediu proposta a ele.
set local request.jwt.claims = '{"sub":"aaaa0000-0000-0000-0000-000000000001","role":"authenticated"}';
do $$
declare n int;
begin
  select count(*) into n from public.profiles
    where id = 'bbbb0000-0000-0000-0000-000000000002';
  insert into resultado values (12, 'artista ve o contratante da reserva',
    case when n = 1 then 'PASSOU' else 'FALHOU: artista nao viu o contratante' end);
end $$;

-- 13. Visitante anonimo nao le nenhum perfil.
set local role anon;
do $$
declare n int;
begin
  select count(*) into n from public.profiles;
  insert into resultado values (13, 'anonimo nao lista perfis',
    case when n = 0 then 'PASSOU' else format('FALHOU: anonimo leu %s perfis', n) end);
end $$;
set local role authenticated;

-- 10. RLS habilitada nas 9 tabelas.
reset role;
do $$
declare n int;
begin
  select count(*) into n
  from pg_tables
  where schemaname = 'public'
    and tablename in ('profiles','artists','genres','artist_genres','artist_media',
                      'artist_services','availability','bookings','reviews')
    and rowsecurity;
  if n = 9 then
    insert into resultado values (10, 'RLS habilitada nas 9 tabelas', 'PASSOU');
  else
    insert into resultado values (10, 'RLS habilitada nas 9 tabelas',
      format('FALHOU: apenas %s de 9', n));
  end if;
end $$;

select ordem, caso, veredito from resultado order by ordem;

rollback;
