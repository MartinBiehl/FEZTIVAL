import 'server-only';
import { queryOne } from './db.js';

/*
 * Regras de conta compartilhadas pelas Server Actions de acesso e pelo
 * callback de confirmacao de e-mail.
 */

/* Categorias aceitas no cadastro, iguais ao enum artist_category do banco. */
export const ARTIST_CATEGORIES = ['dj', 'solo', 'band'];

/*
 * "/painel" e aceito, "//evil.com" e "https://evil.com" nao: o parametro
 * ?next= vem da URL e nao pode virar redirecionamento para fora do site.
 */
export function safeNextPath(value) {
  if (typeof value !== 'string') return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

/* "Banda Nativus Ivoti!" -> "banda-nativus-ivoti", no formato do CHECK de artists.slug. */
export function slugify(value) {
  const slug = value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
  return slug || 'artista';
}

/*
 * Cadastro artistico do usuario, ou null. Se houver mais de um (decisao de
 * produto em aberto), vale o mais antigo -- o mesmo em todas as telas e actions.
 */
export function findOwnArtist(userId, columns = 'id, slug') {
  return queryOne(
    `select ${columns} from artists where profile_id = $1 order by created_at limit 1`,
    [userId],
  );
}

/*
 * O slug e unico e imutavel na pratica (ja vai para URL e sitemap), entao e
 * definido uma unica vez, aqui. Em colisao, tenta um sufixo curto.
 */
async function freeSlug(tx, stageName) {
  const base = slugify(stageName);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    if (!(await tx.queryOne('select 1 from artists where slug = $1', [slug]))) return slug;
  }
  throw new Error('Nao foi possivel gerar um endereco unico para o perfil artistico.');
}

/*
 * Cria a linha de profiles e, no cadastro de artista, o rascunho em artists,
 * na mesma transacao do usuario: ou a conta nasce inteira, ou nao nasce.
 *
 * signupAs e so a intencao do cadastro. Nao e papel: quem tem linha em
 * artists e artista (ver AGENTS.md).
 */
export async function createAccountRows(tx, userId, {
  signupAs, fullName, phone, stageName, category,
}) {
  await tx.query(
    'insert into profiles (id, full_name, phone) values ($1, $2, $3)',
    [userId, fullName, phone || null],
  );

  if (signupAs !== 'artist') return;
  await tx.query(
    // Rascunho: so aparece no catalogo depois de publicado.
    `insert into artists (profile_id, slug, stage_name, category, is_published)
     values ($1, $2, $3, $4, false)`,
    [userId, await freeSlug(tx, stageName), stageName, category],
  );
}

/* Para onde mandar o usuario depois de entrar. */
export function destinationFor(artist) {
  return artist ? '/painel' : '/minhas-reservas';
}
