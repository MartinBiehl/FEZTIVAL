import { motion, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';
import useModalDialog from '../../hooks/useModalDialog.js';
import {
  NO_RATING_LABEL, formatMoney, formatRating, formatReviewCount, hasRating,
} from '../../lib/artistDisplay.js';
import {
  estimatePrice, formatEventTimeRange, joinEventLocation, parseFormDate,
} from '../../lib/bookingDisplay.js';
import './ProposalReviewModal.css';

function formatDate(value) {
  const date = parseFormDate(value);
  if (!date) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/* Mesmos textos de SOUND_OPTIONS em Contract.jsx. */
const SOUND_LABEL = {
  'nao-sei': 'Ainda não sei',
  local: 'O local já tem som',
  artista: 'O artista leva o som',
};

function formatDuration(value) {
  const minutes = Number(value);
  // Artista sem servicos cadastrados nao oferece duracao para escolher.
  if (!value || !Number.isFinite(minutes)) return 'A combinar';
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours.toLocaleString('pt-BR')} ${hours === 1 ? 'hora' : 'horas'}`;
}

function initials(name) {
  return name.split(' ').map((part) => part[0]).slice(0, 2).join('');
}

/*
 * Ultima etapa da proposta: o mesmo ingresso do formulario, agora completo.
 * Faixa na cor do artista, os dados do evento e, depois do picote, o valor.
 */
function ProposalReviewModal({
  artist,
  proposal,
  onClose,
  onConfirm,
  returnFocusRef,
  isSending = false,
}) {
  const shouldReduceMotion = useReducedMotion();
  const { dialogRef, initialFocusRef } = useModalDialog({
    isOpen: true,
    onClose,
    returnFocusRef,
  });
  const titleId = 'proposal-review-title';
  const descriptionId = 'proposal-review-description';
  const estimate = estimatePrice(artist, proposal.duration);
  const message = proposal.message?.trim();
  const venueName = proposal.venueName?.trim();
  // Rascunho salvo antes da troca de campos ainda traz "location" pronto.
  const address = joinEventLocation({ address: proposal.address, city: proposal.city }) || proposal.location;

  const rows = [
    ['Data', formatDate(proposal.date)],
    ['Horário', formatEventTimeRange(proposal.time, proposal.duration)],
    ['Duração', formatDuration(proposal.duration)],
    ['Evento', proposal.eventType],
    ['Convidados', Number(proposal.guestCount).toLocaleString('pt-BR')],
    ['Som', SOUND_LABEL[proposal.soundStructure] ?? SOUND_LABEL['nao-sei']],
  ];

  return (
    <div className="proposal-review-layer">
      <motion.div
        className="proposal-review-backdrop"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        onClick={onClose}
      />

      <motion.section
        ref={dialogRef}
        className="proposal-review"
        style={{ '--artist-color': artist.color || 'var(--yellow)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="proposal-review__scroll">
          <header className="proposal-review__band">
            <span className="proposal-review__avatar" aria-hidden="true">
              {artist.coverUrl ? <img src={artist.coverUrl} alt="" /> : initials(artist.name)}
            </span>
            <div>
              <h2 id={titleId}>Sua proposta para {artist.name}</h2>
              <p id={descriptionId}>
                Confira os dados. {hasRating(artist)
                  ? `${artist.category}, ★ ${formatRating(artist)} (${formatReviewCount(artist)}).`
                  : `${artist.category}, ${NO_RATING_LABEL.toLowerCase()}.`}
              </p>
            </div>
            <button
              ref={initialFocusRef}
              className="proposal-review__close"
              type="button"
              aria-label="Fechar e voltar ao formulário"
              onClick={onClose}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </header>

          <div className="proposal-review__body">
            <div className="proposal-review__place">
              <span>Local</span>
              {venueName && <strong>{venueName}</strong>}
              <p>{address}</p>
            </div>

            <dl className="proposal-review__rows">
              {rows.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>

            {message && (
              <div className="proposal-review__message">
                <span>Seu recado</span>
                <p>{message}</p>
              </div>
            )}
          </div>

          <div className="proposal-review__stub">
            <div>
              <span>Valor estimado</span>
              <strong>{formatMoney(estimate)}</strong>
            </div>
            <p>
              {artist.name} confirma o valor final ao aceitar. Enviar não gera cobrança.
            </p>
            {/* Sem formas de pagamento cadastradas, a lista ficaria so com o titulo. */}
            {artist.paymentMethods?.length > 0 && (
              <p className="proposal-review__payments">
                Aceita {new Intl.ListFormat('pt-BR', { type: 'conjunction' })
                  .format(artist.paymentMethods.map((method) => method.name))}.
              </p>
            )}
          </div>
        </div>

        <footer className="proposal-review__actions">
          <button type="button" onClick={onClose}>Voltar e editar</button>
          <button type="button" onClick={onConfirm} disabled={isSending} aria-busy={isSending}>
            {isSending ? 'Enviando…' : 'Enviar proposta'}
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

export default ProposalReviewModal;
