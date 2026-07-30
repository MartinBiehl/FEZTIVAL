import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { artistProfileDetails } from '../../data/artistProfileDetails.js';
import useModalDialog from '../../hooks/useModalDialog.js';
import './ArtistPreviewModal.css';

function ArtistPreviewModal({ artist, onClose, returnFocusRef }) {
  const shouldReduceMotion = useReducedMotion();
  const { dialogRef, initialFocusRef } = useModalDialog({
    isOpen: true,
    onClose,
    returnFocusRef,
  });
  const titleId = `artist-preview-title-${artist.id}`;
  const descriptionId = `artist-preview-description-${artist.id}`;

  return (
    <div className="artist-preview-layer">
      <motion.div
        className="artist-preview-backdrop"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        onClick={onClose}
      />

      <motion.section
        ref={dialogRef}
        className="artist-preview-dialog"
        style={{ '--artist-color': artist.color }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        layoutId={shouldReduceMotion ? undefined : `artist-card-${artist.slug}`}
        initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={shouldReduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 330, damping: 32 }}
      >
        <button
          ref={initialFocusRef}
          className="artist-preview-dialog__close"
          type="button"
          aria-label="Fechar prévia do artista"
          onClick={onClose}
        >
          ×
        </button>

        <div className="artist-preview-dialog__visual">
          <span className="artist-preview-dialog__monogram" aria-hidden="true">
            {artist.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </span>
          <div className="artist-preview-dialog__visual-meta">
            <span>{artist.category}</span>
            <small>Disponível esta semana</small>
          </div>
        </div>

        <motion.div
          className="artist-preview-dialog__content"
          initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, x: 10 }}
          transition={{ delay: shouldReduceMotion ? 0 : 0.12, duration: shouldReduceMotion ? 0 : 0.25 }}
        >
          <p className="artist-preview-dialog__eyebrow">
            {artist.category} · {artist.location}
          </p>
          <h2 id={titleId}>{artist.name}</h2>
          <p id={descriptionId} className="artist-preview-dialog__genres">
            {artist.genres.join(' · ')}
          </p>

          <div className="artist-preview-dialog__proof">
            <span><strong>★ {artist.rating.toFixed(1)}</strong> {artist.reviews} avaliações</span>
            <span>A partir de <strong>R$ {artist.price.toLocaleString('pt-BR')}</strong></span>
          </div>

          <div className="artist-preview-dialog__services">
            <div className="artist-preview-dialog__section-heading">
              <span>Serviços</span>
              <small>2 formatos disponíveis</small>
            </div>
            {artistProfileDetails.services.map((service) => (
              <article key={service.id}>
                <span aria-hidden="true">♫</span>
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.detail}</p>
                  <small>{service.extra}</small>
                </div>
              </article>
            ))}
          </div>

          <Link className="artist-preview-dialog__cta" to={`/artista/${artist.slug}`}>
            Ver perfil completo <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </motion.section>
    </div>
  );
}

export default ArtistPreviewModal;
