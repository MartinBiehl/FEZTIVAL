-- Upload de imagens do artista: foto principal (artists.cover_url) e galeria
-- (artist_media).
--
-- Os arquivos ficam no bucket publico `artist-media`, em uma pasta por
-- cadastro artistico: `<artists.id>/<uuid>.jpg`. Publico porque as imagens
-- aparecem no perfil, que e indexavel; a leitura publica nao passa por policy.
-- Gravar, trocar e apagar exigem ser dono do artista da pasta.
--
-- Tamanho e tipo sao impostos pelo proprio bucket, e nao so pelo navegador: a
-- chave publishable permite chamar a API de Storage direto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-media',
  'artist-media',
  true,
  5242880, -- 5 MiB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- O dono e conferido comparando o primeiro segmento do caminho com os
-- artistas do usuario. A comparacao e como texto, de proposito: um caminho
-- cujo primeiro segmento nao e uuid simplesmente nao casa, sem cast que
-- lancaria erro. Nao usa owns_artist: o remoto removeu essa funcao do schema
-- public (migration fix_rls_security).
--
-- O Storage exige SELECT alem de DELETE para remover um objeto, e SELECT +
-- UPDATE para sobrescrever. O SELECT aqui e so do dono; o publico le pela URL
-- publica do bucket.
create policy artist_media_objects_select_own
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'artist-media'
    and exists (
      select 1 from public.artists a
      where a.id::text = split_part(name, '/', 1)
        and a.profile_id = (select auth.uid())
    )
  );

create policy artist_media_objects_insert_own
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'artist-media'
    and exists (
      select 1 from public.artists a
      where a.id::text = split_part(name, '/', 1)
        and a.profile_id = (select auth.uid())
    )
  );

create policy artist_media_objects_update_own
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'artist-media'
    and exists (
      select 1 from public.artists a
      where a.id::text = split_part(name, '/', 1)
        and a.profile_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'artist-media'
    and exists (
      select 1 from public.artists a
      where a.id::text = split_part(name, '/', 1)
        and a.profile_id = (select auth.uid())
    )
  );

create policy artist_media_objects_delete_own
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'artist-media'
    and exists (
      select 1 from public.artists a
      where a.id::text = split_part(name, '/', 1)
        and a.profile_id = (select auth.uid())
    )
  );
