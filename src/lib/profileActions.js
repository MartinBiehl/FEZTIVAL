'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase, getCurrentUser } from './supabaseServer.js';
import { ARTIST_CATEGORIES } from './account.js';
import {
  MAX_GALLERY_PHOTOS, MEDIA_BUCKET, isArtistObjectPath, objectPathFromUrl, publicUrl,
} from './artistMedia.js';
import { INFRASTRUCTURE_STATUSES, SERVICE_DURATIONS, selectOwnArtist } from './profileEditor.js';

/*
 * Salva o perfil do artista a partir do editor (/painel/perfil).
 *
 * O artista e sempre o do usuario logado, buscado aqui: o formulario nao
 * envia id de artista, entao nao ha como editar o perfil de outro. A RLS
 * barraria de qualquer forma.
 *
 * As listas sao sincronizadas por diferenca (apaga o que saiu, grava o que
 * entrou) em vez de apagar tudo e regravar: se uma etapa falhar, o perfil nao
 * fica sem generos ou sem servicos. Servicos e infraestrutura preservam o id,
 * porque bookings.service_id aponta para o servico escolhido na proposta.
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

function check(result, step) {
  if (result.error) throw new Error(`${step}: ${result.error.message}`);
  return result.data;
}

/* Vinculo N:N: apaga os que sairam e insere os novos. */
async function syncLinks(supabase, table, column, artistId, ids) {
  let remove = supabase.from(table).delete().eq('artist_id', artistId);
  if (ids.length) remove = remove.not(column, 'in', `(${ids.join(',')})`);
  check(await remove, table);

  if (ids.length) {
    check(await supabase.from(table).upsert(
      ids.map((id) => ({ artist_id: artistId, [column]: id })),
      { onConflict: `artist_id,${column}`, ignoreDuplicates: true },
    ), table);
  }
}

/* Linhas com id proprio: atualiza as que ficaram, insere as novas, apaga o resto. */
async function syncRows(supabase, table, artistId, rows) {
  const existing = check(await supabase.from(table).select('id').eq('artist_id', artistId), table);
  const existingIds = new Set(existing.map((row) => row.id));
  const keptIds = rows.map((row) => row.id).filter((id) => id && existingIds.has(id));

  const removed = [...existingIds].filter((id) => !keptIds.includes(id));
  if (removed.length) check(await supabase.from(table).delete().in('id', removed), table);

  for (const { id, ...fields } of rows) {
    if (id && existingIds.has(id)) {
      check(await supabase.from(table).update(fields).eq('id', id).eq('artist_id', artistId), table);
    } else {
      check(await supabase.from(table).insert({ ...fields, artist_id: artistId }), table);
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

  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const { data: artist, error: artistError } = await selectOwnArtist(supabase, user.id, 'id, slug');
  if (artistError || !artist) return { error: 'Cadastro artístico não encontrado.' };

  try {
    // O slug nao entra: e imutavel depois de criado (URL e sitemap).
    const { error: updateError } = await supabase.from('artists').update(input.artist).eq('id', artist.id);
    if (updateError?.code === '23514') {
      return { error: 'Para publicar, informe o preço inicial ou marque "sob consulta".' };
    }
    check({ error: updateError }, 'artists');

    await syncLinks(supabase, 'artist_genres', 'genre_id', artist.id, input.genreIds);
    await syncLinks(supabase, 'artist_payment_methods', 'payment_method_id', artist.id, input.paymentMethodIds);
    await syncLinks(supabase, 'artist_venue_types', 'venue_type_id', artist.id, input.venueTypeIds);

    let removeCities = supabase.from('artist_service_areas').delete().eq('artist_id', artist.id);
    if (input.cities.length) {
      removeCities = removeCities.not('city', 'in', `(${input.cities.map((city) => `"${city.replace(/"/g, '\\"')}"`).join(',')})`);
    }
    check(await removeCities, 'artist_service_areas');
    if (input.cities.length) {
      check(await supabase.from('artist_service_areas').upsert(
        input.cities.map((city, index) => ({ artist_id: artist.id, city, sort_order: index })),
        { onConflict: 'artist_id,city' },
      ), 'artist_service_areas');
    }

    // Sem nenhum dia marcado, o horario semanal e tratado como nao declarado.
    if (input.weeklyHours.some((day) => day.is_available)) {
      check(await supabase.from('artist_weekly_hours').upsert(
        input.weeklyHours.map((day) => ({ ...day, artist_id: artist.id })),
        { onConflict: 'artist_id,weekday' },
      ), 'artist_weekly_hours');
    } else {
      check(await supabase.from('artist_weekly_hours').delete().eq('artist_id', artist.id), 'artist_weekly_hours');
    }

    await syncRows(supabase, 'artist_services', artist.id, input.services);
    await syncRows(supabase, 'artist_infrastructure', artist.id, input.infrastructure);
  } catch (error) {
    console.error('saveArtistProfile falhou', error.message);
    return { error: 'Não foi possível salvar tudo. Confira os dados e salve de novo.' };
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
 * Imagens: o navegador envia o arquivo direto ao Storage (bucket
 * artist-media, na pasta do artista) e chama as actions abaixo so com o
 * caminho, para registrar no banco. O arquivo nao passa pelo servidor do Next.
 *
 * O caminho vem do cliente, entao e conferido: precisa ter o formato gerado
 * por newObjectPath e ficar na pasta do artista do usuario logado. As policies
 * do bucket e a RLS de artists/artist_media barram o resto.
 */

async function ownArtistContext() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const { data: artist, error } = await selectOwnArtist(supabase, user.id, 'id, slug, cover_url');
  if (error || !artist) return { error: 'Cadastro artístico não encontrado.' };
  return { supabase, artist };
}

/* Apaga do bucket uma imagem que deixou de ser usada. Se falhar, sobra so um arquivo orfao. */
async function removeStoredImage(supabase, artistId, url) {
  const path = objectPathFromUrl(url);
  if (!path || !isArtistObjectPath(path, artistId)) return;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).remove([path]);
  if (error) console.error('Remocao de imagem falhou', error.message);
}

/* Define (caminho) ou remove (null) a foto principal. */
export async function setArtistCover(path) {
  const context = await ownArtistContext();
  if (context.error) return context;
  const { supabase, artist } = context;

  if (path !== null && !isArtistObjectPath(path, artist.id)) return { error: 'Imagem inválida.' };
  const url = path === null ? null : publicUrl(path);

  const { error } = await supabase.from('artists').update({ cover_url: url }).eq('id', artist.id);
  if (error) {
    console.error('setArtistCover falhou', error.message);
    return { error: 'Não foi possível salvar a foto principal.' };
  }

  if (artist.cover_url && artist.cover_url !== url) {
    await removeStoredImage(supabase, artist.id, artist.cover_url);
  }
  revalidateArtistPages(artist.slug);
  return { ok: true, url };
}

export async function addArtistPhoto(path) {
  const context = await ownArtistContext();
  if (context.error) return context;
  const { supabase, artist } = context;

  if (!isArtistObjectPath(path, artist.id)) return { error: 'Imagem inválida.' };

  const { data: photos, error: listError } = await supabase
    .from('artist_media')
    .select('sort_order')
    .eq('artist_id', artist.id)
    .eq('type', 'photo');
  if (listError) {
    console.error('addArtistPhoto falhou', listError.message);
    return { error: 'Não foi possível adicionar a foto.' };
  }
  if (photos.length >= MAX_GALLERY_PHOTOS) {
    return { error: `A galeria aceita até ${MAX_GALLERY_PHOTOS} fotos.` };
  }

  const { data: photo, error } = await supabase
    .from('artist_media')
    .insert({
      artist_id: artist.id,
      type: 'photo',
      url: publicUrl(path),
      sort_order: Math.max(-1, ...photos.map((item) => item.sort_order)) + 1,
    })
    .select('id, url')
    .single();
  if (error) {
    console.error('addArtistPhoto falhou', error.message);
    return { error: 'Não foi possível adicionar a foto.' };
  }

  revalidateArtistPages(artist.slug);
  return { ok: true, photo };
}

export async function removeArtistPhoto(id) {
  if (typeof id !== 'string' || !UUID.test(id)) return { error: 'Foto inválida.' };

  const context = await ownArtistContext();
  if (context.error) return context;
  const { supabase, artist } = context;

  // O filtro por artista importa: a RLS deixa ler a galeria de qualquer perfil publicado.
  const { data: removed, error } = await supabase
    .from('artist_media')
    .delete()
    .eq('id', id)
    .eq('artist_id', artist.id)
    .select('url')
    .maybeSingle();
  if (error || !removed) {
    if (error) console.error('removeArtistPhoto falhou', error.message);
    return { error: 'Não foi possível remover a foto.' };
  }

  await removeStoredImage(supabase, artist.id, removed.url);
  revalidateArtistPages(artist.slug);
  return { ok: true };
}
