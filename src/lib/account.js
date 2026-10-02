/*
 * Regras de conta compartilhadas pelas Server Actions e pelo callback de
 * confirmacao de e-mail. Recebem o cliente com sessao (createServerSupabase),
 * entao toda escrita passa pela RLS em nome do proprio usuario.
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

async function findOwnArtist(supabase, userId) {
  const { data, error } = await supabase
    .from('artists')
    .select('id, slug')
    .eq('profile_id', userId)
    .order('created_at')
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Falha ao carregar o cadastro artistico: ${error.message}`);
  return data;
}

/*
 * O slug e unico e imutavel na pratica (ja vai para URL e sitemap), entao e
 * definido uma unica vez, aqui. Em colisao, tenta um sufixo curto em vez de
 * consultar antes: rascunhos alheios nao sao visiveis pela RLS, entao so o
 * INSERT sabe se o slug esta livre.
 */
async function createDraftArtist(supabase, userId, { stageName, category }) {
  const base = slugify(stageName);

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from('artists').insert({
      profile_id: userId,
      slug,
      stage_name: stageName,
      category,
      // Rascunho: so aparece no catalogo depois de publicado.
      is_published: false,
    });

    if (!error) return;
    if (error.code !== '23505') throw new Error(`Falha ao criar o perfil artistico: ${error.message}`);
  }

  throw new Error('Nao foi possivel gerar um endereco unico para o perfil artistico.');
}

/*
 * Garante as linhas de profiles (e, para quem se cadastrou como artista, de
 * artists) depois que a sessao existe.
 *
 * Nao e feito no signUp porque, com confirmacao de e-mail ligada, ainda nao ha
 * sessao naquele momento e a RLS recusaria o INSERT. Os dados do formulario
 * viajam em user_metadata e sao gravados no primeiro login ou na confirmacao.
 * Idempotente: pode rodar a cada login.
 *
 * user_metadata.signup_as registra so a intencao do cadastro. Nao e papel:
 * quem tem linha em artists e artista (ver AGENTS.md).
 */
export async function ensureAccount(supabase, user) {
  const meta = user.user_metadata ?? {};

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: user.id, full_name: meta.full_name ?? null, phone: meta.phone ?? null },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (profileError) throw new Error(`Falha ao criar o perfil: ${profileError.message}`);

  /*
   * Se a linha ja existia, o upsert acima nao grava nada. O banco remoto tem um
   * trigger em auth.users (handle_new_user, aplicado fora deste repositorio)
   * que cria profiles no cadastro sem o telefone -- sem este passo o WhatsApp
   * informado no formulario se perderia. So preenche o que esta vazio.
   */
  if (meta.phone) {
    const { error: phoneError } = await supabase
      .from('profiles')
      .update({ phone: meta.phone })
      .eq('id', user.id)
      .is('phone', null);
    if (phoneError) throw new Error(`Falha ao gravar o telefone: ${phoneError.message}`);
  }

  let artist = await findOwnArtist(supabase, user.id);

  if (!artist && meta.signup_as === 'artist' && meta.stage_name && ARTIST_CATEGORIES.includes(meta.category)) {
    await createDraftArtist(supabase, user.id, { stageName: meta.stage_name, category: meta.category });
    artist = await findOwnArtist(supabase, user.id);
  }

  return { artist };
}

/* Para onde mandar o usuario depois de entrar. */
export function destinationFor({ artist }) {
  return artist ? '/painel' : '/minhas-reservas';
}
