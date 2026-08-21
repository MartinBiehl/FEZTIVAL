-- Teste dos triggers de bookings.
--
-- Como rodar: cole este arquivo inteiro no SQL Editor do painel do Supabase e
-- execute. Todo o script roda dentro de uma transacao que termina em ROLLBACK,
-- portanto NADA persiste no banco -- inclusive as linhas de auth.users,
-- profiles, artists e bookings criadas aqui.
--
-- O resultado sai como UMA TABELA com os sete casos e o veredito de cada um.
-- Todos precisam mostrar PASSOU. O painel do Supabase nao exibe mensagens
-- NOTICE, por isso o resultado e montado como tabela.

begin;

create temporary table resultado (
  ordem int,
  caso text,
  veredito text
) on commit drop;

-- Cenario -------------------------------------------------------------------

-- auth.users precisa existir para profiles; inserimos direto por ser teste.
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at)
values ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'teste-trigger@example.com', '', now(), now(), now());

insert into public.profiles (id, full_name)
values ('11111111-1111-1111-1111-111111111111', 'Teste');

insert into public.artists (id, profile_id, slug, stage_name, category, price_on_request)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'teste-trigger', 'Teste', 'dj', true);

insert into public.bookings (id, client_id, artist_id, event_date, status,
  agreed_price, platform_fee, artist_payout)
values ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '2026-12-01', 'pending', 1000.00, 120.00, 880.00);

-- Casos ---------------------------------------------------------------------

-- 1. Enquanto pending, os valores podem ser renegociados.
do $$
begin
  update public.bookings set agreed_price = 2000, platform_fee = 240, artist_payout = 1760
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (1, 'valores mutaveis enquanto pending', 'PASSOU');
exception when others then
  insert into resultado values (1, 'valores mutaveis enquanto pending',
    'FALHOU: bloqueou indevidamente (' || sqlerrm || ')');
end $$;

-- 2. Transicao valida.
do $$
begin
  update public.bookings set status = 'accepted'
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (2, 'transicao pending -> accepted', 'PASSOU');
exception when others then
  insert into resultado values (2, 'transicao pending -> accepted',
    'FALHOU: bloqueou indevidamente (' || sqlerrm || ')');
end $$;

-- 3. Fora de pending, os valores ficam congelados.
do $$
begin
  update public.bookings set agreed_price = 9999
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (3, 'valor imutavel apos aceite',
    'FALHOU: permitiu alterar agreed_price');
exception when check_violation then
  insert into resultado values (3, 'valor imutavel apos aceite', 'PASSOU');
end $$;

-- 4. Nao se pula etapa do fluxo.
do $$
begin
  update public.bookings set status = 'completed'
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (4, 'accepted -> completed bloqueado',
    'FALHOU: permitiu pular confirmed');
exception when check_violation then
  insert into resultado values (4, 'accepted -> completed bloqueado', 'PASSOU');
end $$;

-- 5. Estado terminal nao retrocede.
update public.bookings set status = 'confirmed'
  where id = '33333333-3333-3333-3333-333333333333';
update public.bookings set status = 'completed'
  where id = '33333333-3333-3333-3333-333333333333';

do $$
begin
  update public.bookings set status = 'pending'
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (5, 'completed e terminal',
    'FALHOU: permitiu sair de completed');
exception when check_violation then
  insert into resultado values (5, 'completed e terminal', 'PASSOU');
end $$;

-- 6. A soma tem de fechar: agreed_price = platform_fee + artist_payout.
do $$
begin
  insert into public.bookings (client_id, artist_id, event_date, status,
    agreed_price, platform_fee, artist_payout)
  values ('11111111-1111-1111-1111-111111111111',
          '22222222-2222-2222-2222-222222222222', '2026-12-02', 'accepted',
          1000.00, 120.00, 500.00);
  insert into resultado values (6, 'soma inconsistente rejeitada',
    'FALHOU: aceitou 1000 <> 120 + 500');
exception when check_violation then
  insert into resultado values (6, 'soma inconsistente rejeitada', 'PASSOU');
end $$;

-- 7. rating aceita apenas 1 a 5.
do $$
begin
  insert into public.reviews (booking_id, rating)
  values ('33333333-3333-3333-3333-333333333333', 6);
  insert into resultado values (7, 'rating fora da faixa rejeitado',
    'FALHOU: aceitou rating 6');
exception when check_violation then
  insert into resultado values (7, 'rating fora da faixa rejeitado', 'PASSOU');
end $$;

-- Resultado -----------------------------------------------------------------

select ordem, caso, veredito from resultado order by ordem;

rollback;
