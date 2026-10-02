'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase, getCurrentUser } from './supabaseServer.js';
import { ensureAccount } from './account.js';

/*
 * Perguntas publicas do perfil ("Pergunte antes de contratar") e a resposta do
 * artista no painel.
 *
 * Como nas reservas, a validacao aqui e so para a mensagem ficar clara. Quem
 * barra e a RLS de questions/answers (migration add_questions_and_payments):
 * pergunta so em artista publicado e em nome proprio; resposta so do dono do
 * artista, uma por pergunta.
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

  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { needsAuth: true };

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, profile_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();
  if (artistError) return { error: 'Não foi possível enviar agora. Tente novamente.' };
  if (!artist) return { error: 'Este artista não está mais disponível.' };
  if (artist.profile_id === user.id) return { error: 'Você não pode perguntar ao seu próprio perfil.' };

  // questions.author_profile_id referencia profiles: garante a linha antes do INSERT.
  await ensureAccount(supabase, user);

  const { error } = await supabase
    .from('questions')
    .insert({ artist_id: artist.id, author_profile_id: user.id, body });
  if (error) {
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

  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const { data: question } = await supabase
    .from('questions')
    .select('artist:artists ( slug )')
    .eq('id', questionId)
    .maybeSingle();
  if (!question?.artist) return { error: 'Pergunta não encontrada.' };

  const { error } = await supabase
    .from('answers')
    .insert({ question_id: questionId, author_profile_id: user.id, body });
  if (error?.code === '23505') return { error: 'Esta pergunta já foi respondida.' };
  // 42501: a policy recusou -- a pergunta nao e de um artista do usuario.
  if (error?.code === '42501') return { error: 'Só o artista do perfil pode responder.' };
  if (error) {
    console.error('answerQuestion falhou', error.code);
    return { error: 'Não foi possível enviar a resposta. Tente novamente.' };
  }

  revalidatePath(`/artista/${question.artist.slug}`);
  revalidatePath('/painel');
  return { ok: true };
}
