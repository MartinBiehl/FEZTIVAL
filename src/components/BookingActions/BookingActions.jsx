'use client';

import { useActionState, useId } from 'react';
import useActionSubmit from '../../hooks/useActionSubmit.js';
import { createReview, updateBookingStatus } from '../../lib/bookingActions.js';
import './BookingActions.css';

/*
 * Botoes de status de uma reserva, para o artista (painel) e para o
 * contratante (minhas reservas).
 *
 * Mostrar so as acoes do papel e conveniencia de interface: quem barra o papel
 * errado e a RLS, e quem barra a transicao ilegal e o trigger do banco.
 */
const ARTIST_ACTIONS = {
  pending: [
    { action: 'accept', label: 'Aceitar', primary: true },
    { action: 'decline', label: 'Recusar', confirm: 'Recusar esta proposta? Não será possível desfazer.' },
  ],
  accepted: [
    { action: 'confirm', label: 'Confirmar show', primary: true },
    { action: 'cancel', label: 'Cancelar', confirm: 'Cancelar esta reserva? Não será possível desfazer.' },
  ],
  confirmed: [
    { action: 'complete', label: 'Marcar como realizado', primary: true },
    { action: 'cancel', label: 'Cancelar', confirm: 'Cancelar esta reserva? Não será possível desfazer.' },
  ],
};

const CLIENT_CANCEL = {
  action: 'cancel', label: 'Cancelar pedido', confirm: 'Cancelar este pedido? Não será possível desfazer.',
};

const CLIENT_ACTIONS = {
  pending: [CLIENT_CANCEL],
  accepted: [CLIENT_CANCEL],
  confirmed: [CLIENT_CANCEL],
};

export function BookingStatusActions({ booking, side, contextLabel }) {
  const [state, formAction, isPending] = useActionState(updateBookingStatus, null);
  const submit = useActionSubmit(formAction);
  const priceId = useId();
  const actions = (side === 'artist' ? ARTIST_ACTIONS : CLIENT_ACTIONS)[booking.status] ?? [];
  const needsPrice = side === 'artist' && booking.status === 'pending';

  if (actions.length === 0) return null;

  function confirmIfNeeded(event, item) {
    if (item.confirm && !window.confirm(item.confirm)) event.preventDefault();
  }

  return (
    <form className="booking-actions" onSubmit={submit} aria-label={contextLabel}>
      <input type="hidden" name="bookingId" value={booking.id} />
      {needsPrice && (
        <label className="booking-actions__price" htmlFor={priceId}>
          <span>Valor final (R$)</span>
          <input
            id={priceId}
            name="price"
            type="number"
            min="1"
            step="0.01"
            inputMode="decimal"
            defaultValue={booking.agreedPrice ?? ''}
            placeholder="Ex.: 2500"
          />
        </label>
      )}
      <div className="booking-actions__buttons">
        {actions.map((item) => (
          <button
            key={item.action}
            className={item.primary ? 'booking-actions__primary' : undefined}
            type="submit"
            name="action"
            value={item.action}
            disabled={isPending}
            onClick={(event) => confirmIfNeeded(event, item)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {needsPrice && (
        <small className="booking-actions__hint">
          Ao aceitar, o valor fica fixo. A comissão da Feztival é de 12%.
        </small>
      )}
      {state?.error && <p className="booking-actions__error" role="alert">{state.error}</p>}
    </form>
  );
}

/* Avaliacao de reserva concluida. Uma por reserva, sem edicao depois. */
export function BookingReviewForm({ booking }) {
  const [state, formAction, isPending] = useActionState(createReview, null);
  const submit = useActionSubmit(formAction);
  const ratingId = useId();
  const commentId = useId();

  if (state?.ok) return <p className="booking-actions__done" role="status">Obrigado pela avaliação!</p>;

  return (
    <form className="booking-actions" onSubmit={submit} aria-label={`Avaliar ${booking.artistName}`}>
      <input type="hidden" name="bookingId" value={booking.id} />
      <label className="booking-actions__price" htmlFor={ratingId}>
        <span>Nota</span>
        <select id={ratingId} name="rating" required defaultValue="">
          <option value="" disabled>Escolha</option>
          {[5, 4, 3, 2, 1].map((value) => (
            <option key={value} value={value}>{'★'.repeat(value)} ({value})</option>
          ))}
        </select>
      </label>
      <label className="booking-actions__comment" htmlFor={commentId}>
        <span>Comentário (opcional)</span>
        <textarea id={commentId} name="comment" rows="2" maxLength={1000} />
      </label>
      <small className="booking-actions__hint">A avaliação é pública e não pode ser editada depois.</small>
      <div className="booking-actions__buttons">
        <button className="booking-actions__primary" type="submit" disabled={isPending}>Enviar avaliação</button>
      </div>
      {state?.error && <p className="booking-actions__error" role="alert">{state.error}</p>}
    </form>
  );
}
