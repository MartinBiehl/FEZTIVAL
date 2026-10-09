'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from './auth.js';
import { query, queryOne, transaction } from './db.js';
import { todayIso } from './bookingDisplay.js';
import { normalizePhone } from './phone.js';

/*
 * Server Actions de reservas e avaliacoes.
 *
 * QUEM pode escrever e decidido aqui, dentro de cada query (o WHERE ou o
 * SELECT do INSERT carrega o usuario da sessao), para a checagem e a escrita
 * serem uma coisa so. QUAIS transicoes e valores sao legais continua com os
 * triggers do banco: nao reimplemente essas regras no JavaScript.
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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const roundCents = (value) => Math.round(value * 100) / 100;

function refreshPrivateAreas() {
  revalidatePath('/painel');
  revalidatePath('/minhas-reservas');
}

/* Envio da proposta pelo formulario de /reservar/[slug]. */
export async function createBooking(formData) {
  const user = await getCurrentUser();
  if (!user) return { needsAuth: true };

  const slug = field(formData, 'slug');
  const eventType = field(formData, 'eventType');
  const guestCount = Number(field(formData, 'guestCount'));
  const date = field(formData, 'date');
  const time = field(formData, 'time');
  const location = field(formData, 'location');
  const duration = Number(field(formData, 'duration'));
  const phoneInput = field(formData, 'phone');
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

  const artist = await queryOne(
    `select a.id, a.profile_id, a.base_price, a.price_on_request,
            coalesce((select json_agg(json_build_object('id', s.id, 'price', s.price, 'duration_minutes', s.duration_minutes))
                        from artist_services s where s.artist_id = a.id), '[]') as services
       from artists a
      where a.slug = $1 and a.is_published`,
    [slug],
  );

  if (!artist) return { error: 'Este artista não está mais disponível.' };
  if (artist.profile_id === user.id) {
    return { error: 'Você não pode enviar proposta para o seu próprio perfil.' };
  }

  /*
   * Sem WhatsApp o artista nao tem como responder depois do aceite. Contas
   * antigas de contratante nao informaram no cadastro: o formulario pede e
   * gravamos aqui, so se o perfil ainda estiver sem.
   */
  const profile = await queryOne('select phone from profiles where id = $1', [user.id]);
  const phone = profile?.phone ? null : normalizePhone(phoneInput);
  if (!profile?.phone && !phone) {
    return { error: 'Informe seu WhatsApp com DDD para o artista poder responder.' };
  }

  const service = artist.services.find((item) => item.duration_minutes === duration);
  /*
   * Mesma regra de estimatePrice (bookingDisplay.js), exibida no formulario.
   * "Sob consulta" esconde o preco inicial, como em artistQueries.js.
   */
  const basePrice = artist.price_on_request ? null : artist.base_price;
  const estimate = service?.price ?? basePrice ?? null;

  try {
    await transaction(async (tx) => {
      if (phone) {
        await tx.query('update profiles set phone = $1 where id = $2 and phone is null', [phone, user.id]);
      }
      // Sempre pending e sempre em nome de quem esta logado.
      await tx.query(
        `insert into bookings (
           client_id, artist_id, service_id, duration_minutes, event_date, event_time,
           event_location, event_type, guest_count, sound_structure, message, agreed_price, status
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')`,
        [user.id, artist.id, service?.id ?? null, Number.isInteger(duration) && duration > 0 ? duration : null,
          date, time, location, eventType, guestCount, soundStructure, message || null, estimate],
      );
    });
  } catch (error) {
    console.error('createBooking falhou', error.code);
    return { error: 'Não foi possível enviar a proposta. Tente novamente.' };
  }

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
 *
 * Quem dispara cada status: o artista dono aceita, recusa, confirma, conclui
 * e cancela; o contratante so cancela. Sem essa separacao o contratante
 * marcaria a propria reserva como completed -- transicao valida, papel errado.
 */
export async function updateBookingStatus(_prevState, formData) {
  const bookingId = field(formData, 'bookingId');
  const status = STATUS_FOR_ACTION[field(formData, 'action')];
  if (!UUID.test(bookingId) || !status) return { error: 'Ação inválida.' };

  const user = await getCurrentUser();
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  let amounts = [null, null, null];

  if (status === 'accepted') {
    const price = Number(field(formData, 'price').replace(',', '.'));
    if (!Number.isFinite(price) || price <= 0 || price > MAX_PRICE) {
      return { error: 'Informe o valor final do show.' };
    }
    const agreedPrice = roundCents(price);
    const platformFee = roundCents(agreedPrice * PLATFORM_FEE_RATE);
    amounts = [agreedPrice, platformFee, roundCents(agreedPrice - platformFee)];
  }

  let updated;
  try {
    // Valores nulos mantem o que ja esta gravado: so o aceite os define.
    updated = await queryOne(
      `update bookings b
          set status = $3::booking_status,
              agreed_price = coalesce($4::numeric, b.agreed_price),
              platform_fee = coalesce($5::numeric, b.platform_fee),
              artist_payout = coalesce($6::numeric, b.artist_payout)
        where b.id = $1
          and (
            (b.client_id = $2 and $3::booking_status = 'cancelled')
            or (
              exists (select 1 from artists a where a.id = b.artist_id and a.profile_id = $2)
              and $3::booking_status in ('accepted', 'declined', 'confirmed', 'completed', 'cancelled')
            )
          )
        returning b.id`,
      [bookingId, user.id, status, ...amounts],
    );
  } catch (error) {
    // check_violation: transicao ilegal ou valor congelado (triggers do banco).
    if (error.code === '23514') return { error: 'Esta mudança não é permitida no estado atual da reserva.' };
    console.error('updateBookingStatus falhou', error.code);
    return { error: 'Não foi possível atualizar a reserva. Tente novamente.' };
  }

  // Sem linha afetada: reserva alheia ou papel errado.
  if (!updated) return { error: 'Você não pode alterar esta reserva.' };

  refreshPrivateAreas();
  return { ok: true };
}

/* Avaliacao do contratante, so para reserva concluida e uma unica vez. */
export async function createReview(_prevState, formData) {
  const bookingId = field(formData, 'bookingId');
  const rating = Number(field(formData, 'rating'));
  const comment = field(formData, 'comment');

  if (!UUID.test(bookingId)) return { error: 'Reserva inválida.' };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Escolha uma nota de 1 a 5.' };
  if (comment.length > 1000) return { error: 'O comentário pode ter até 1.000 caracteres.' };

  const user = await getCurrentUser();
  if (!user) return { error: 'Sua sessão expirou. Entre novamente.' };

  /*
   * So o contratante da reserva, e so depois de concluida. A avaliacao e
   * imutavel: nao existe action de editar nem apagar -- como o status fica
   * completed para sempre, editar permitiria reescreve-la indefinidamente.
   */
  let created;
  try {
    created = await queryOne(
      `insert into reviews (booking_id, rating, comment)
       select b.id, $3, $4 from bookings b
        where b.id = $1 and b.client_id = $2 and b.status = 'completed'
       returning id`,
      [bookingId, user.id, rating, comment || null],
    );
  } catch (error) {
    if (error.code === '23505') return { error: 'Esta reserva já foi avaliada.' };
    console.error('createReview falhou', error.code);
    return { error: 'Não foi possível enviar a avaliação. Tente novamente.' };
  }
  if (!created) return { error: 'Só é possível avaliar reservas concluídas.' };

  refreshPrivateAreas();
  return { ok: true };
}
