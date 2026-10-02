'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabase, getCurrentUser } from './supabaseServer.js';
import { ensureAccount } from './account.js';
import { todayIso } from './bookingDisplay.js';

/*
 * Server Actions de reservas e avaliacoes.
 *
 * A validacao aqui e para o usuario receber mensagem clara. A protecao real
 * esta no banco: a RLS decide QUEM pode escrever e os triggers decidem QUAIS
 * transicoes e valores sao legais. Nao reimplemente essas regras aqui.
 */

/* Comissao da plataforma, aplicada no aceite (ver AGENTS.md). */
const PLATFORM_FEE_RATE = 0.12;
const MAX_PRICE = 1_000_000;

const EVENT_TYPES = ['Casamento', 'Aniversário', 'Evento corporativo', 'Bar ou restaurante', 'Outro'];

/* Valor do <select> do formulario -> enum sound_structure do banco. */
const SOUND_STRUCTURE = { 'nao-sei': 'unknown', local: 'venue', artista: 'artist' };

function field(formData, name) {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

const roundCents = (value) => Math.round(value * 100) / 100;

function refreshPrivateAreas() {
  revalidatePath('/painel');
  revalidatePath('/minhas-reservas');
}

/* Envio da proposta pelo formulario de /reservar/[slug]. */
export async function createBooking(formData) {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { needsAuth: true };

  const slug = field(formData, 'slug');
  const eventType = field(formData, 'eventType');
  const guestCount = Number(field(formData, 'guestCount'));
  const date = field(formData, 'date');
  const time = field(formData, 'time');
  const location = field(formData, 'location');
  const duration = Number(field(formData, 'duration'));
  const soundStructure = SOUND_STRUCTURE[field(formData, 'soundStructure')] ?? 'unknown';
  const message = field(formData, 'message');

  if (!EVENT_TYPES.includes(eventType)) return { error: 'Escolha o tipo de evento.' };
  if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 100000) {
    return { error: 'Informe o número de convidados.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayIso()) {
    return { error: 'Escolha uma data a partir de hoje.' };
  }
  if (!/^\d{2}:\d{2}$/.test(time)) return { error: 'Informe o horário do evento.' };
  if (location.length < 3 || location.length > 200) return { error: 'Informe o local do evento.' };
  if (message.length > 2000) return { error: 'A mensagem pode ter até 2.000 caracteres.' };

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('id, profile_id, base_price, artist_services ( id, price, duration_minutes )')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle();

  if (artistError) return { error: 'Não foi possível enviar agora. Tente novamente.' };
  if (!artist) return { error: 'Este artista não está mais disponível.' };
  if (artist.profile_id === user.id) {
    return { error: 'Você não pode enviar proposta para o seu próprio perfil.' };
  }

  // bookings.client_id referencia profiles: garante a linha antes do INSERT.
  await ensureAccount(supabase, user);

  /*
   * O valor gravado agora e a estimativa exibida ao contratante. O valor final,
   * a comissao e o repasse sao definidos pelo artista no aceite.
   */
  const service = (artist.artist_services ?? []).find((item) => item.duration_minutes === duration);
  const estimate = service?.price ?? artist.base_price ?? null;

  const { error } = await supabase.from('bookings').insert({
    client_id: user.id,
    artist_id: artist.id,
    service_id: service?.id ?? null,
    event_date: date,
    event_time: time,
    event_location: location,
    event_type: eventType,
    guest_count: guestCount,
    sound_structure: soundStructure,
    message: message || null,
    agreed_price: estimate,
    status: 'pending',
  });

  if (error) return { error: 'Não foi possível enviar a proposta. Tente novamente.' };

  refreshPrivateAreas();
  return { ok: true };
}

const STATUS_FOR_ACTION = {
  accept: 'accepted',
  decline: 'declined',
  confirm: 'confirmed',
  complete: 'completed',
  cancel: 'cancelled',
};

/*
 * Muda o status de uma reserva. No aceite o artista fixa o valor final, e a
 * comissao e o repasse sao gravados junto: depois de sair de pending, o
 * trigger congela os tres valores.
 */
export async function updateBookingStatus(_prevState, formData) {
  const bookingId = field(formData, 'bookingId');
  const status = STATUS_FOR_ACTION[field(formData, 'action')];
  if (!bookingId || !status) return { error: 'Ação inválida.' };

  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const changes = { status };

  if (status === 'accepted') {
    const price = Number(field(formData, 'price').replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      return { error: 'Informe o valor final do show.' };
    }
    const agreedPrice = roundCents(price);
    const platformFee = roundCents(agreedPrice * PLATFORM_FEE_RATE);
    Object.assign(changes, {
      agreed_price: agreedPrice,
      platform_fee: platformFee,
      artist_payout: roundCents(agreedPrice - platformFee),
    });
  }

  const { data, error } = await supabase
    .from('bookings')
    .update(changes)
    .eq('id', bookingId)
    .select('id');

  // check_violation: transicao ilegal ou valor congelado (triggers do banco).
  if (error?.code === '23514') return { error: 'Esta mudança não é permitida no estado atual da reserva.' };
  // 42501: WITH CHECK da policy recusou -- o papel nao pode disparar este status.
  if (error?.code === '42501') return { error: 'Você não pode alterar esta reserva.' };
  if (error) return { error: 'Não foi possível atualizar a reserva. Tente novamente.' };
  // Sem linha afetada: a RLS recusou -- reserva alheia ou papel errado.
  if (!data?.length) return { error: 'Você não pode alterar esta reserva.' };

  refreshPrivateAreas();
  return { ok: true };
}

/* Avaliacao do contratante, so para reserva concluida e uma unica vez. */
export async function createReview(_prevState, formData) {
  const bookingId = field(formData, 'bookingId');
  const rating = Number(field(formData, 'rating'));
  const comment = field(formData, 'comment');

  if (!bookingId) return { error: 'Reserva inválida.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Escolha uma nota de 1 a 5.' };
  if (comment.length > 1000) return { error: 'O comentário pode ter até 1.000 caracteres.' };

  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  const { error } = await supabase
    .from('reviews')
    .insert({ booking_id: bookingId, rating, comment: comment || null });

  if (error?.code === '23505') return { error: 'Esta reserva já foi avaliada.' };
  // 42501: a policy recusou -- a reserva nao e do usuario ou nao foi concluida.
  if (error?.code === '42501') return { error: 'Só é possível avaliar reservas concluídas.' };
  if (error) return { error: 'Não foi possível enviar a avaliação. Tente novamente.' };

  refreshPrivateAreas();
  return { ok: true };
}
