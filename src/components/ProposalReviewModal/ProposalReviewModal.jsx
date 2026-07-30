import { motion, useReducedMotion } from 'motion/react';
import { artistProfileDetails } from '../../data/artistProfileDetails.js';
import useModalDialog from '../../hooks/useModalDialog.js';
import './ProposalReviewModal.css';

function formatDate(value) {
  if (!value) return 'Data não informada';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

function formatDuration(value) {
  const minutes = Number(value);
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
}) {
  const shouldReduceMotion = useReducedMotion();
  const { dialogRef, initialFocusRef } = useModalDialog({
    isOpen: true,
    onClose,
    returnFocusRef,
  });
  const titleId = 'proposal-review-title';
  const descriptionId = 'proposal-review-description';

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
              {artist.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </span>
            <div>
              <small>{artist.category}</small>
              <strong>{artist.name}</strong>
              <p>{artist.genres.join(' · ')} · ★ {artist.rating.toFixed(1)}</p>
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
              <strong>{formatDuration(proposal.duration)}</strong>
            </article>
          </div>

          <div className="proposal-review-price">
            <span>Valor inicial estimado</span>
            <strong>R$ {artist.price.toLocaleString('pt-BR')}</strong>
            <small>O valor final será confirmado pelo artista.</small>
          </div>

          <section className="proposal-review-payments" aria-labelledby="accepted-payments-title">
            <div>
              <span>Informação</span>
              <h3 id="accepted-payments-title">Formas de pagamento aceitas</h3>
            </div>
            <ul>
              {artistProfileDetails.paymentMethods.map((method) => (
                <li key={method.id}>
                  <span aria-hidden="true">✓</span>
                  {method.name}
                </li>
              ))}
            </ul>
          </section>

          <p className="proposal-review-notice">
            <span aria-hidden="true">i</span>
            Enviar esta proposta não gera cobrança. O preço pode variar conforme duração,
            deslocamento e estrutura necessária.
          </p>
        </div>

        <footer className="proposal-review-dialog__footer">
          <button type="button" onClick={onClose}>← Voltar e editar</button>
          <button type="button" onClick={onConfirm}>
            Enviar proposta <span aria-hidden="true">→</span>
          </button>
        </footer>
      </motion.section>
    </div>
  );
}

export default ProposalReviewModal;

