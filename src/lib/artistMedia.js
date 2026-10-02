import { SUPABASE_URL } from './supabaseConfig.js';

/*
 * Imagens do artista no Supabase Storage (bucket `artist-media`), usadas pelo
 * navegador (envio) e pelas Server Actions (registro e remocao).
 *
 * Caminho: `<artists.id>/<uuid>.jpg`. A pasta e o que as policies do bucket
 * conferem para saber quem e o dono (migration artist_media_storage). Limite
 * de tamanho e tipos tambem sao impostos pelo bucket; os daqui so evitam um
 * envio que seria recusado.
 */

export const MEDIA_BUCKET = 'artist-media';
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_GALLERY_PHOTOS = 12;

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.85;
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const OBJECT_PATH = new RegExp(`^(${UUID})/${UUID}\\.jpg$`, 'i');

/* Erro com mensagem pronta para exibir ao artista. */
export class MediaError extends Error {}

export function newObjectPath(artistId) {
  return `${artistId}/${crypto.randomUUID()}.jpg`;
}

/* true se o caminho tem o formato gerado aqui e fica na pasta do artista. */
export function isArtistObjectPath(path, artistId) {
  const match = typeof path === 'string' ? OBJECT_PATH.exec(path) : null;
  return Boolean(match) && match[1].toLowerCase() === artistId.toLowerCase();
}

export function publicUrl(path) {
  return `${PUBLIC_PREFIX}${path}`;
}

/* Caminho no bucket de uma URL publica, ou null se a imagem e de outro lugar. */
export function objectPathFromUrl(url) {
  return typeof url === 'string' && url.startsWith(PUBLIC_PREFIX) ? url.slice(PUBLIC_PREFIX.length) : null;
}

/*
 * Redimensiona no navegador e regrava como JPEG antes do envio.
 *
 * Foto de celular passa facil de 5 MB; reduzida a 2000 px fica bem abaixo. A
 * regravacao tambem descarta os metadados EXIF -- inclusive a localizacao GPS
 * de onde a foto foi tirada, que nao deve ir para um perfil publico.
 */
export async function prepareImage(file) {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new MediaError('Não foi possível ler a imagem. Use JPG, PNG ou WEBP.');
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  // Fundo branco: areas transparentes de PNG ficariam pretas no JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve) => { canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY); });
  if (!blob) throw new MediaError('Não foi possível processar a imagem.');
  if (blob.size > MAX_UPLOAD_BYTES) throw new MediaError('A imagem ficou maior que 5 MB. Tente outra foto.');
  return blob;
}
