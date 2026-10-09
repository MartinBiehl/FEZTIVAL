'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth.js';
import { queryOne } from './db.js';

/*
 * Perguntas publicas do perfil ("Pergunte antes de contratar") e a resposta do
 * artista no painel.
 *
 * Como nas reservas, quem pode escrever e decidido dentro da query: pergunta
 * so em artista publicado e em nome proprio; resposta so do dono do artista.
 * "Uma resposta por pergunta" e o unique de answers.question_id.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

/* Formulario do perfil publico. Sem login devolve needsAuth: a pagina e estatica e nao sabe quem esta vendo. */
export async function askQuestion(_prevState, formData) {
  const slug = field(formData, 'slug');
  const body = field(formData, 'body');
  if (body.length < 10 || body.length > 1000) {
    return { error: 'A pergunta precisa ter entre 10 e 1.000 caracteres.' };
  }

  const user = await getCurrentUser();
  if (!user) return { needsAuth: true };

  const artist = await queryOne('select id, profile_id from artists where slug = $1 and is_published', [slug]);
  if (!artist) return { error: 'Este artista não está mais disponível.' };
  if (artist.profile_id === user.id) return { error: 'Você não pode perguntar ao seu próprio perfil.' };

  try {
    await queryOne(
      `insert into questions (artist_id, author_profile_id, body, moderation_status)
       values ($1, $2, $3, 'published')`,
      [artist.id, user.id, body],
    );
  } catch (error) {
    console.error('askQuestion falhou', error.code);
    return { error: 'Não foi possível enviar a pergunta. Tente novamente.' };
  }

  revalidatePath(`/artista/${slug}`);
  revalidatePath('/painel');
  return { ok: true };
}

/* Resposta do artista, no painel. Uma por pergunta, publica no perfil. */
export async function answerQuestion(_prevState, formData) {
  const questionId = field(formData, 'questionId');
  const body = field(formData, 'body');
  if (!UUID.test(questionId)) return { error: 'Pergunta inválida.' };
  if (body.length < 2 || body.length > 2000) {
    return { error: 'A resposta precisa ter entre 2 e 2.000 caracteres.' };
  }

  const user = await getCurrentUser();
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  let answered;
  try {
    answered = await queryOne(
      `with inserted as (
         insert into answers (question_id, author_profile_id, body, moderation_status)
         select q.id, $2, $3, 'published'
           from questions q
           join artists a on a.id = q.artist_id
          where q.id = $1 and a.profile_id = $2
         returning question_id
       )
       select a.slug from inserted i join questions q on q.id = i.question_id join artists a on a.id = q.artist_id`,
      [questionId, user.id, body],
    );
  } catch (error) {
    if (error.code === '23505') return { error: 'Esta pergunta já foi respondida.' };
    console.error('answerQuestion falhou', error.code);
    return { error: 'Não foi possível enviar a resposta. Tente novamente.' };
  }
  // Nada inserido: a pergunta nao existe ou nao e de um artista do usuario.
  if (!answered) return { error: 'Só o artista do perfil pode responder.' };

  revalidatePath(`/artista/${answered.slug}`);
  revalidatePath('/painel');
  return { ok: true };
}
