import { motion, useReducedMotion } from 'motion/react';
import useModalDialog from '../../hooks/useModalDialog.js';
import {
  NO_RATING_LABEL, estimateFor, findService, formatRating, hasRating,
} from '../../lib/artistDisplay.js';
import './ProposalReviewModal.css';

function formatDate(value) {
  if (!value) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

/* Valores do <select> de estrutura de som em Contract.jsx. */
const SOUND_LABEL = {
  'nao-sei': 'Ainda não sei',
  local: 'O local possui',
  artista: 'O artista leva',
};

function formatDuration(value) {
  const minutes = Number(value);
  // Artista sem servicos cadastrados nao oferece duracao para escolher.
  if (!value || !Number.isFinite(minutes)) return 'A combinar';
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours.toLocaleString('pt-BR')} ${hours === 1 ? 'hora' : 'horas'}`;
}

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
  const service = findService(artist, proposal.serviceId);
  const estimate = estimateFor(artist, proposal.serviceId);

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
        className="proposal-review-dialog"
        style={{ '--artist-color': artist.color }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 34 }}
      >
        <header className="proposal-review-dialog__header">
          <div>
            <p>Última etapa</p>
            <h2 id={titleId}>Revisar e enviar</h2>
            <span id={descriptionId}>Confira os dados principais antes de enviar a solicitação.</span>
          </div>
          <button
            ref={initialFocusRef}
            type="button"
            aria-label="Fechar revisão da proposta"
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="proposal-review-dialog__content">
          <div className="proposal-review-artist">
            <span aria-hidden="true">
              {artist.coverUrl
                ? <img src={artist.coverUrl} alt="" />
                : artist.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </span>
            <div>
              <small>{artist.category}</small>
              <strong>{artist.name}</strong>
              <p>
                {[...artist.genres, hasRating(artist) ? `★ ${formatRating(artist)}` : NO_RATING_LABEL].join(' · ')}
              </p>
            </div>
          </div>

          <div className="proposal-review-details">
            <article className="proposal-review-details__location">
              <span>Local do evento</span>
              <strong>{proposal.location}</strong>
            </article>
            <article>
              <span>Data</span>
              <strong>{formatDate(proposal.date)}</strong>
            </article>
            <article>
              <span>Horário</span>
              <strong>{proposal.time}</strong>
            </article>
            <article>
              <span>Duração</span>
              <strong>{formatDuration(service?.durationMinutes)}</strong>
            </article>
            <article>
              <span>Tipo de evento</span>
              <strong>{proposal.eventType}</strong>
            </article>
            <article>
              <span>Convidados</span>
              <strong>{Number(proposal.guestCount).toLocaleString('pt-BR')}</strong>
            </article>
            <article>
              <span>Estrutura de som</span>
              <strong>{SOUND_LABEL[proposal.soundStructure] ?? SOUND_LABEL['nao-sei']}</strong>
            </article>
            {proposal.message?.trim() && (
              <article className="proposal-review-details__message">
                <span>Mensagem</span>
                <p>{proposal.message.trim()}</p>
              </article>
            )}
          </div>

          <div className="proposal-review-price">
            <span>{service ? `Valor estimado · ${service.title}` : 'Valor inicial estimado'}</span>
            <strong>{estimate == null ? 'Sob consulta' : `R$ ${estimate.toLocaleString('pt-BR')}`}</strong>
            <small>O valor final será confirmado pelo artista.</small>
          </div>

          {/* Sem formas de pagamento cadastradas, a secao ficaria so com o titulo. */}
          {artist.paymentMethods?.length > 0 && (
            <section className="proposal-review-payments" aria-labelledby="accepted-payments-title">
              <div>
                <span>Informação</span>
                <h3 id="accepted-payments-title">Formas de pagamento aceitas</h3>
              </div>
              <ul>
                {artist.paymentMethods.map((method) => (
                  <li key={method.name}>
                    <span aria-hidden="true">✓</span>
                    {method.name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <p className="proposal-review-notice">
            <span aria-hidden="true">i</span>
            Enviar esta proposta não gera cobrança. O preço pode variar conforme duração,
            deslocamento e estrutura necessária.
          </p>
        </div>

        <footer className="proposal-review-dialog__footer">
          <button type="button" onClick={onClose}>← Voltar e editar</button>
          <button type="button" onClick={onConfirm} disabled={isSending} aria-busy={isSending}>
            {isSending ? 'Enviando…' : 'Enviar proposta'} <span aria-hidden="true">→</span>
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

export default ProposalReviewModal;

