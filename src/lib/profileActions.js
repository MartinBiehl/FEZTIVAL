'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth.js';
import { query, queryOne, transaction } from './db.js';
import { ARTIST_CATEGORIES, findOwnArtist } from './account.js';
import { MAX_GALLERY_PHOTOS, objectPathFromUrl, publicUrl } from './artistMedia.js';
import { deleteArtistImage, saveArtistImage } from './mediaStorage.js';
import { INFRASTRUCTURE_STATUSES, SERVICE_DURATIONS } from './profileOptions.js';

/*
 * Salva o perfil do artista a partir do editor (/painel/perfil).
 *
 * O artista e sempre o do usuario logado, buscado aqui: o formulario nao
 * envia id de artista, entao nao ha como editar o perfil de outro. Todo
 * UPDATE/DELETE abaixo filtra por esse artist_id -- e essa e a protecao.
 *
 * Tudo e gravado numa transacao: ou o perfil inteiro e salvo, ou nada muda.
 * As listas sao sincronizadas por diferenca (apaga o que saiu, grava o que
 * entrou) porque servicos e infraestrutura precisam preservar o id:
 * bookings.service_id aponta para o servico escolhido na proposta.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIME = /^\d{2}:\d{2}$/;
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MAX_PRICE = 1_000_000;

class ValidationError extends Error {}

function text(formData, name, max) {
  const value = formData.get(name);
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed.length > max) throw new ValidationError(`Um dos campos passou de ${max} caracteres.`);
  return trimmed;
}

function list(formData, name) {
  return formData.getAll(name).map((value) => (typeof value === 'string' ? value.trim() : ''));
}

function optionalPrice(value, label) {
  if (value === '') return null;
  const price = Number(value.replace(',', '.'));
  if (!Number.isFinite(price) || price < 0 || price > MAX_PRICE) {
    throw new ValidationError(`Valor inválido em ${label}.`);
  }
  return Math.round(price * 100) / 100;
}

function uuids(formData, name) {
  return [...new Set(formData.getAll(name).filter((value) => typeof value === 'string' && UUID.test(value)))];
}

function parseProfile(formData) {
  const stageName = text(formData, 'stageName', 80);
  const category = text(formData, 'category', 10);
  const color = text(formData, 'color', 7);

  if (stageName.length < 2) throw new ValidationError('Informe o nome artístico.');
  if (!ARTIST_CATEGORIES.includes(category)) throw new ValidationError('Escolha a categoria.');
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) throw new ValidationError('Cor inválida.');

  const cities = [...new Set(
    text(formData, 'serviceAreas', 3000).split('\n').map((city) => city.trim()).filter(Boolean),
  )];
  if (cities.length > 40 || cities.some((city) => city.length > 80)) {
    throw new ValidationError('Liste até 40 cidades, uma por linha.');
  }

  const weeklyHours = WEEKDAYS.map((label, weekday) => {
    const isAvailable = formData.get(`day_${weekday}`) === 'on';
    const opensAt = text(formData, `opens_${weekday}`, 5);
    const closesAt = text(formData, `closes_${weekday}`, 5);
    if (isAvailable && !(TIME.test(opensAt) && TIME.test(closesAt) && opensAt < closesAt)) {
      throw new ValidationError(`Confira o horário de ${label}: o início precisa ser antes do fim.`);
    }
    return {
      weekday,
      is_available: isAvailable,
      opens_at: isAvailable ? opensAt : null,
      closes_at: isAvailable ? closesAt : null,
    };
  });

  const serviceIds = list(formData, 'serviceId');
  const serviceDescriptions = list(formData, 'serviceDescription');
  const servicePrices = list(formData, 'servicePrice');
  const serviceDurations = list(formData, 'serviceDuration');
  const services = list(formData, 'serviceTitle')
    .map((title, index) => ({
      id: UUID.test(serviceIds[index] ?? '') ? serviceIds[index] : null,
      title,
      description: (serviceDescriptions[index] ?? '') || null,
      price: optionalPrice(servicePrices[index] ?? '', `"${title}"`),
      duration_minutes: serviceDurations[index] ? Number(serviceDurations[index]) : null,
    }))
    .filter((service) => service.title);
  services.forEach((service) => {
    if (service.title.length > 80 || (service.description?.length ?? 0) > 500) {
      throw new ValidationError('Título do serviço até 80 caracteres e descrição até 500.');
    }
    if (service.duration_minutes != null && !SERVICE_DURATIONS.includes(service.duration_minutes)) {
      throw new ValidationError(`Duração inválida em "${service.title}".`);
    }
  });

  const infraIds = list(formData, 'infraId');
  const infraStatuses = list(formData, 'infraStatus');
  const infraDetails = list(formData, 'infraDetail');
  const statuses = INFRASTRUCTURE_STATUSES.map((item) => item.value);
  const infrastructure = list(formData, 'infraTitle')
    .map((title, index) => ({
      id: UUID.test(infraIds[index] ?? '') ? infraIds[index] : null,
      status: infraStatuses[index],
      title,
      detail: (infraDetails[index] ?? '') || null,
      sort_order: index,
    }))
    .filter((item) => item.title);
  infrastructure.forEach((item) => {
    if (!statuses.includes(item.status)) throw new ValidationError(`Escolha quem fornece "${item.title}".`);
    if (item.title.length > 80 || (item.detail?.length ?? 0) > 300) {
      throw new ValidationError('Item de estrutura até 80 caracteres e detalhe até 300.');
    }
  });

  const artist = {
    stage_name: stageName,
    category,
    city: text(formData, 'city', 80) || null,
    bio_short: text(formData, 'bioShort', 200) || null,
    bio_long: text(formData, 'bioLong', 3000) || null,
    base_price: optionalPrice(text(formData, 'basePrice', 12), 'preço inicial'),
    price_on_request: formData.get('priceOnRequest') === 'on',
    color: color || null,
    service_area_summary: text(formData, 'serviceAreaSummary', 300) || null,
    is_published: formData.get('isPublished') === 'on',
  };

  const genreIds = uuids(formData, 'genres');

  /*
   * O banco ja exige preco ou "sob consulta" para publicar. Cidade e genero
   * entram aqui porque sem eles o artista nao aparece na busca nem no filtro.
   */
  if (artist.is_published) {
    if (!artist.city) throw new ValidationError('Para publicar, informe sua cidade.');
    if (genreIds.length === 0) throw new ValidationError('Para publicar, escolha ao menos um gênero.');
    if (artist.base_price == null && !artist.price_on_request) {
      throw new ValidationError('Para publicar, informe o preço inicial ou marque "sob consulta".');
    }
  }

  return {
    artist,
    genreIds,
    paymentMethodIds: uuids(formData, 'paymentMethods'),
    venueTypeIds: uuids(formData, 'venueTypes'),
    cities,
    weeklyHours,
    services,
    infrastructure,
  };
}

/* Vinculo N:N: apaga os que sairam e insere os novos. */
async function syncLinks(tx, table, column, artistId, ids) {
  await tx.query(
    `delete from ${table} where artist_id = $1 and not (${column} = any($2::uuid[]))`,
    [artistId, ids],
  );
  await tx.query(
    `insert into ${table} (artist_id, ${column})
     select $1, unnest($2::uuid[]) on conflict do nothing`,
    [artistId, ids],
  );
}

/* Linhas com id proprio: atualiza as que ficaram, insere as novas, apaga o resto. */
async function syncRows(tx, table, artistId, rows) {
  const existing = await tx.query(`select id from ${table} where artist_id = $1`, [artistId]);
  const existingIds = new Set(existing.map((row) => row.id));
  const keptIds = rows.map((row) => row.id).filter((id) => id && existingIds.has(id));

  await tx.query(
    `delete from ${table} where artist_id = $1 and not (id = any($2::uuid[]))`,
    [artistId, keptIds],
  );

  for (const { id, ...fields } of rows) {
    const columns = Object.keys(fields);
    const values = Object.values(fields);
    if (id && existingIds.has(id)) {
      const assignments = columns.map((column, index) => `${column} = $${index + 3}`).join(', ');
      await tx.query(`update ${table} set ${assignments} where id = $1 and artist_id = $2`, [id, artistId, ...values]);
    } else {
      const placeholders = columns.map((_, index) => `$${index + 2}`).join(', ');
      await tx.query(
        `insert into ${table} (artist_id, ${columns.join(', ')}) values ($1, ${placeholders})`,
        [artistId, ...values],
      );
    }
  }
}

export async function saveArtistProfile(_prevState, formData) {
  let input;
  try {
    input = parseProfile(formData);
  } catch (error) {
    if (error instanceof ValidationError) return { error: error.message };
    throw error;
  }

  const user = await getCurrentUser();
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const artist = await findOwnArtist(user.id);
  if (!artist) return { error: 'Cadastro artístico não encontrado.' };

  try {
    await transaction(async (tx) => {
      // O slug nao entra: e imutavel depois de criado (URL e sitemap).
      const { artist: fields } = input;
      await tx.query(
        `update artists
            set stage_name = $2, category = $3, city = $4, bio_short = $5, bio_long = $6,
                base_price = $7, price_on_request = $8, color = $9,
                service_area_summary = $10, is_published = $11
          where id = $1`,
        [artist.id, fields.stage_name, fields.category, fields.city, fields.bio_short, fields.bio_long,
          fields.base_price, fields.price_on_request, fields.color,
          fields.service_area_summary, fields.is_published],
      );

      await syncLinks(tx, 'artist_genres', 'genre_id', artist.id, input.genreIds);
      await syncLinks(tx, 'artist_payment_methods', 'payment_method_id', artist.id, input.paymentMethodIds);
      await syncLinks(tx, 'artist_venue_types', 'venue_type_id', artist.id, input.venueTypeIds);

      await tx.query(
        'delete from artist_service_areas where artist_id = $1 and not (city = any($2::text[]))',
        [artist.id, input.cities],
      );
      await tx.query(
        `insert into artist_service_areas (artist_id, city, sort_order)
         select $1, city, ordinality - 1 from unnest($2::text[]) with ordinality as t(city, ordinality)
         on conflict (artist_id, city) do update set sort_order = excluded.sort_order`,
        [artist.id, input.cities],
      );

      // Sem nenhum dia marcado, o horario semanal e tratado como nao declarado.
      if (input.weeklyHours.some((day) => day.is_available)) {
        for (const day of input.weeklyHours) {
          await tx.query(
            `insert into artist_weekly_hours (artist_id, weekday, is_available, opens_at, closes_at)
             values ($1, $2, $3, $4, $5)
             on conflict (artist_id, weekday) do update
               set is_available = excluded.is_available, opens_at = excluded.opens_at, closes_at = excluded.closes_at`,
            [artist.id, day.weekday, day.is_available, day.opens_at, day.closes_at],
          );
        }
      } else {
        await tx.query('delete from artist_weekly_hours where artist_id = $1', [artist.id]);
      }

      await syncRows(tx, 'artist_services', artist.id, input.services);
      await syncRows(tx, 'artist_infrastructure', artist.id, input.infrastructure);
    });
  } catch (error) {
    // 23514: o CHECK artists_price_defined recusou publicar sem preco.
    if (error.code === '23514') return { error: 'Para publicar, informe o preço inicial ou marque "sob consulta".' };
    console.error('saveArtistProfile falhou', error.code ?? error.message);
    return { error: 'Não foi possível salvar. Confira os dados e tente de novo.' };
  }

  revalidateArtistPages(artist.slug);
  revalidatePath('/sitemap.xml');

  return { ok: true, isPublished: input.artist.is_published, slug: artist.slug };
}

/* Perfil, formulario de proposta, catalogo e painel saem do cache. */
function revalidateArtistPages(slug) {
  revalidatePath(`/artista/${slug}`);
  revalidatePath(`/reservar/${slug}`);
  revalidatePath('/explorar');
  revalidatePath('/painel');
  revalidatePath('/painel/perfil');
}

/*
 * Imagens: o navegador reduz a foto (prepareImage) e a envia aqui, num
 * FormData com o campo "image". O servidor confere o arquivo, grava em disco
 * na pasta do artista do usuario logado (mediaStorage.js) e registra no banco.
 * Se o registro falhar, o arquivo recem-gravado e apagado.
 */

async function ownArtistContext() {
  const user = await getCurrentUser();
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const artist = await findOwnArtist(user.id, 'id, slug, cover_url');
  if (!artist) return { error: 'Cadastro artístico não encontrado.' };
  return { artist };
}

/* Apaga do disco uma imagem nossa que deixou de ser usada; link externo so e desvinculado. */
function removeStoredImage(artistId, url) {
  const objectPath = objectPathFromUrl(url);
  return objectPath ? deleteArtistImage(artistId, objectPath) : undefined;
}

/* Define (FormData com "image") ou remove (null) a foto principal. */
export async function setArtistCover(formData) {
  const context = await ownArtistContext();
  if (context.error) return context;
  const { artist } = context;

  let url = null;
  let saved = null;
  if (formData !== null) {
    saved = await saveArtistImage(artist.id, formData.get('image'));
    if (saved.error) return saved;
    url = publicUrl(saved.path);
  }

  try {
    await query('update artists set cover_url = $2 where id = $1', [artist.id, url]);
  } catch (error) {
    console.error('setArtistCover falhou', error.code);
    if (saved) await deleteArtistImage(artist.id, saved.path);
    return { error: 'Não foi possível salvar a foto principal.' };
  }

  if (artist.cover_url && artist.cover_url !== url) {
    await removeStoredImage(artist.id, artist.cover_url);
  }
  revalidateArtistPages(artist.slug);
  return { ok: true, url };
}

export async function addArtistPhoto(formData) {
  const context = await ownArtistContext();
  if (context.error) return context;
  const { artist } = context;

  const saved = await saveArtistImage(artist.id, formData.get('image'));
  if (saved.error) return saved;

  let photo;
  try {
    /* O limite da galeria e conferido no proprio INSERT: nada entra se ja houver 12. */
    photo = await queryOne(
      `insert into artist_media (artist_id, type, url, sort_order)
       select $1, 'photo', $2, coalesce(max(sort_order), -1) + 1
         from artist_media where artist_id = $1 and type = 'photo'
       having count(*) < $3
       returning id, url`,
      [artist.id, publicUrl(saved.path), MAX_GALLERY_PHOTOS],
    );
  } catch (error) {
    console.error('addArtistPhoto falhou', error.code);
    await deleteArtistImage(artist.id, saved.path);
    return { error: 'Não foi possível adicionar a foto.' };
  }

  if (!photo) {
    await deleteArtistImage(artist.id, saved.path);
    return { error: `A galeria aceita até ${MAX_GALLERY_PHOTOS} fotos.` };
  }

  revalidateArtistPages(artist.slug);
  return { ok: true, photo };
}

export async function removeArtistPhoto(id) {
  if (typeof id !== 'string' || !UUID.test(id)) return { error: 'Foto inválida.' };

  const context = await ownArtistContext();
  if (context.error) return context;
  const { artist } = context;

  // O filtro por artista e a protecao: sem ele, qualquer foto poderia ser apagada.
  const removed = await queryOne(
    'delete from artist_media where id = $1 and artist_id = $2 returning url',
    [id, artist.id],
  );
  if (!removed) return { error: 'Não foi possível remover a foto.' };

  await removeStoredImage(artist.id, removed.url);
  revalidateArtistPages(artist.slug);
  return { ok: true };
}
