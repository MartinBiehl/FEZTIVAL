-- Teste dos triggers de bookings.
--
-- Como rodar: npm run db:test. O script roda dentro de uma transacao desfeita
-- no fim (scripts/db.js), portanto NADA persiste no banco.
--
-- Cada caso grava seu veredito; no fim, qualquer FALHOU levanta excecao e o
-- teste falha.

create temporary table resultado (
  ordem int,
  caso text,
  veredito text
) on commit drop;

-- Cenario -------------------------------------------------------------------

insert into users (id, email, password_hash)
values ('11111111-1111-1111-1111-111111111111', 'teste-trigger@example.com', '!');

insert into profiles (id, full_name)
values ('11111111-1111-1111-1111-111111111111', 'Teste');

insert into artists (id, profile_id, slug, stage_name, category, price_on_request)
values ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'teste-trigger', 'Teste', 'dj', true);

insert into bookings (id, client_id, artist_id, event_date, status,
  agreed_price, platform_fee, artist_payout)
values ('33333333-3333-3333-3333-333333333333',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        '2026-12-01', 'pending', 1000.00, 120.00, 880.00);

-- Casos ---------------------------------------------------------------------

-- 1. Enquanto pending, os valores podem ser renegociados.
do $$
begin
  update bookings set agreed_price = 2000, platform_fee = 240, artist_payout = 1760
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (1, 'valores mutaveis enquanto pending', 'PASSOU');
exception when others then
  insert into resultado values (1, 'valores mutaveis enquanto pending',
    'FALHOU: bloqueou indevidamente (' || sqlerrm || ')');
end $$;

-- 2. Transicao valida.
do $$
begin
  update bookings set status = 'accepted'
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (2, 'transicao pending -> accepted', 'PASSOU');
exception when others then
  insert into resultado values (2, 'transicao pending -> accepted',
    'FALHOU: bloqueou indevidamente (' || sqlerrm || ')');
end $$;

-- 3. Fora de pending, os valores ficam congelados.
do $$
begin
  update bookings set agreed_price = 9999
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (3, 'valor imutavel apos aceite',
    'FALHOU: permitiu alterar agreed_price');
exception when check_violation then
  insert into resultado values (3, 'valor imutavel apos aceite', 'PASSOU');
end $$;

-- 4. Nao se pula etapa do fluxo.
do $$
begin
  update bookings set status = 'completed'
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (4, 'accepted -> completed bloqueado',
    'FALHOU: permitiu pular confirmed');
exception when check_violation then
  insert into resultado values (4, 'accepted -> completed bloqueado', 'PASSOU');
end $$;

-- 5. Estado terminal nao retrocede.
update bookings set status = 'confirmed'
  where id = '33333333-3333-3333-3333-333333333333';
update bookings set status = 'completed'
  where id = '33333333-3333-3333-3333-333333333333';

do $$
begin
  update bookings set status = 'pending'
    where id = '33333333-3333-3333-3333-333333333333';
  insert into resultado values (5, 'completed e terminal',
    'FALHOU: permitiu sair de completed');
exception when check_violation then
  insert into resultado values (5, 'completed e terminal', 'PASSOU');
end $$;

-- 6. A soma tem de fechar: agreed_price = platform_fee + artist_payout.
do $$
begin
  insert into bookings (client_id, artist_id, event_date, status,
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
  insert into reviews (booking_id, rating)
  values ('33333333-3333-3333-3333-333333333333', 6);
  insert into resultado values (7, 'rating fora da faixa rejeitado',
    'FALHOU: aceitou rating 6');
exception when check_violation then
  insert into resultado values (7, 'rating fora da faixa rejeitado', 'PASSOU');
end $$;

-- Resultado -----------------------------------------------------------------

do $$
declare
  falhas text;
begin
  select string_agg(ordem || '. ' || caso || ': ' || veredito, '; ' order by ordem)
    into falhas from resultado where veredito <> 'PASSOU';
  if (select count(*) from resultado) <> 7 then
    raise exception 'Esperados 7 casos, rodaram %.', (select count(*) from resultado);
  end if;
  if falhas is not null then
    raise exception '%', falhas;
  end if;
  raise notice '7 casos passaram.';
end $$;
