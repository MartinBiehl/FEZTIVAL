-- Verificacao do seed. Somente leitura: nenhuma alteracao.
-- Cole no SQL Editor do painel do Supabase.

select 'contas de seed' as item,
       count(*)::text || ' de 8' as valor,
       case when count(*) = 8 then 'OK' else 'DIVERGE' end as veredito
from auth.users where email like '%@seed.feztival.local'
union all
select 'perfis', count(*)::text || ' de 8',
       case when count(*) = 8 then 'OK' else 'DIVERGE' end
from public.profiles where id::text like '5eed0000%'
union all
select 'artistas publicados', count(*)::text || ' de 8',
       case when count(*) = 8 then 'OK' else 'DIVERGE' end
from public.artists where is_published
union all
select 'generos', count(*)::text || ' de 14',
       case when count(*) = 14 then 'OK' else 'DIVERGE' end
from public.genres
union all
select 'vinculos artista-genero', count(*)::text || ' de 16',
       case when count(*) = 16 then 'OK' else 'DIVERGE' end
from public.artist_genres
union all
select 'slugs preservados', count(*)::text || ' de 8',
       case when count(*) = 8 then 'OK' else 'DIVERGE' end
from public.artists
where slug in ('dj-kauan','marina-santos','banda-nativus','dj-vitoria',
               'rafael-acustico','samba-ivoti','leticia-black','banda-quartel')
union all
select 'sem avaliacao (esperado)', count(*)::text,
       case when count(*) = 0 then 'OK' else 'DIVERGE' end
from public.reviews
union all
select 'campos sem origem estao nulos', count(*)::text || ' de 8',
       case when count(*) = 8 then 'OK' else 'DIVERGE' end
from public.artists
where bio_short is null and bio_long is null and cover_url is null
  and service_radius_km is null;

-- Detalhe dos 8, para conferencia visual
select a.slug, a.stage_name, a.category, a.city, a.base_price,
       string_agg(g.name, ', ' order by g.name) as generos
from public.artists a
left join public.artist_genres ag on ag.artist_id = a.id
left join public.genres g on g.id = ag.genre_id
group by a.id, a.slug, a.stage_name, a.category, a.city, a.base_price
order by a.slug;
