import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { MAX_UPLOAD_BYTES, isArtistObjectPath } from './artistMedia.js';

/*
 * Imagens do artista gravadas em disco, em MEDIA_DIR/<artists.id>/<uuid>.jpg,
 * e servidas por /media/[artistId]/[file] (src/app/media).
 *
 * Exige disco persistente: num servidor sem disco proprio (Vercel e afins) as
 * fotos se perderiam a cada deploy. O caminho e sempre gerado aqui, nunca vem
 * do navegador, e e conferido por isArtistObjectPath antes de qualquer acesso
 * ao disco -- sem isso um "../" escaparia da pasta.
 */

// Pasta de dados em tempo de execucao: o turbopackIgnore impede o build de
// tentar empacota-la (e, com ela, o projeto inteiro) junto do servidor.
const MEDIA_DIR = path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || 'storage/media');

const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

function absolutePath(objectPath) {
  return path.join(/* turbopackIgnore: true */ MEDIA_DIR, ...objectPath.split('/'));
}

/*
 * Grava a imagem enviada pelo editor e devolve o caminho relativo. O navegador
 * ja reduziu e regravou a foto como JPEG (prepareImage); aqui so se confere
 * que e mesmo um JPEG dentro do limite, pelo conteudo e nao pelo nome.
 */
export async function saveArtistImage(artistId, file) {
  if (!(file instanceof File) || file.size === 0) return { error: 'Envie uma imagem.' };
  if (file.size > MAX_UPLOAD_BYTES) return { error: 'A imagem passou de 5 MB. Tente outra foto.' };

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!bytes.subarray(0, 3).equals(JPEG_MAGIC)) return { error: 'Formato de imagem inválido.' };

  const objectPath = `${artistId}/${randomUUID()}.jpg`;
  await mkdir(path.join(/* turbopackIgnore: true */ MEDIA_DIR, artistId), { recursive: true });
  await writeFile(absolutePath(objectPath), bytes, { flag: 'wx' });
  return { path: objectPath };
}

/* Apaga uma imagem que deixou de ser usada. Se falhar, sobra so um arquivo orfao. */
export async function deleteArtistImage(artistId, objectPath) {
  if (!isArtistObjectPath(objectPath, artistId)) return;
  try {
    await unlink(absolutePath(objectPath));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Remocao de imagem falhou', error.code);
  }
}

/* Conteudo da imagem, ou null se o caminho e invalido ou o arquivo nao existe. */
export async function readArtistImage(artistId, objectPath) {
  if (!isArtistObjectPath(objectPath, artistId)) return null;
  try {
    return await readFile(absolutePath(objectPath));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
