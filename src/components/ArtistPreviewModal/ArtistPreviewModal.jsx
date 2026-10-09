import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import {
  NO_RATING_LABEL, formatPrice, formatRating, formatReviewCount, hasRating,
} from '../../lib/artistDisplay.js';
import useModalDialog from '../../hooks/useModalDialog.js';
import './ArtistPreviewModal.css';

/* 90 -> "1h30", 180 -> "3h", 45 -> "45 min". */
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours}h` : `${hours}h${String(rest).padStart(2, '0')}`;
}

function ArtistPreviewModal({ artist, onClose, returnFocusRef }) {
  const shouldReduceMotion = useReducedMotion();
  const { dialogRef, initialFocusRef } = useModalDialog({
    isOpen: true,
    onClose,
    returnFocusRef,
  });
  const titleId = `artist-preview-title-${artist.id}`;
  const servicesId = `artist-preview-services-${artist.id}`;
  const services = artist.services ?? [];
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
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4 4l8 8M12 4l-8 8" />
          </svg>
        </button>

        <div className="artist-preview-dialog__visual">
          {artist.coverUrl ? (
            <img className="artist-preview-dialog__cover" src={artist.coverUrl} alt="" />
          ) : (
            <span className="artist-preview-dialog__monogram" aria-hidden="true">
              {artist.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </span>
          )}
        </div>

        <motion.div
          className="artist-preview-dialog__content"
          initial={shouldReduceMotion ? false : { opacity: 0, x: 18 }}
          animate={{ opacity: 1, x: 0 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, x: 10 }}
          transition={{ delay: shouldReduceMotion ? 0 : 0.12, duration: shouldReduceMotion ? 0 : 0.25 }}
        >
          <div className="artist-preview-dialog__tags">
            <span className="artist-preview-dialog__category">{artist.category}</span>
            {artist.location && (
              <span className="artist-preview-dialog__location">
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 15s5-4.6 5-8.5a5 5 0 0 0-10 0C3 10.4 8 15 8 15Zm0-6.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
                </svg>
                {artist.location}
              </span>
            )}
          </div>

          <h2 id={titleId}>{artist.name}</h2>

          {artist.genres.length > 0 && (
            <ul id={descriptionId} className="artist-preview-dialog__genres" aria-label="Gêneros">
              {artist.genres.map((genre) => <li key={genre}>{genre}</li>)}
            </ul>
          )}

          {artist.bioShort && <p className="artist-preview-dialog__bio">{artist.bioShort}</p>}

          <dl className="artist-preview-dialog__stats">
            <div>
              <dt>Avaliação</dt>
              {hasRating(artist) ? (
                <dd>
                  <strong>★ {formatRating(artist)}</strong>
                  <small>{formatReviewCount(artist)}</small>
                </dd>
              ) : (
                <dd><strong>{NO_RATING_LABEL}</strong></dd>
              )}
            </div>
            <div>
              <dt>{artist.price == null ? 'Cachê' : 'Cachê a partir de'}</dt>
              <dd><strong>{formatPrice(artist)}</strong></dd>
            </div>
          </dl>

          {services.length > 0 && (
          <section className="artist-preview-dialog__services" aria-labelledby={servicesId}>
            <div className="artist-preview-dialog__section-heading">
              <h3 id={servicesId}>Serviços</h3>
              <small>{services.length === 1 ? '1 formato' : `${services.length} formatos`}</small>
            </div>
            <ul>
              {services.map((service) => (
                <li key={service.id}>
                  <div>
                    <h4>{service.title}</h4>
                    {service.detail && <p>{service.detail}</p>}
                  </div>
                  {service.durationMinutes != null && (
                    <span className="artist-preview-dialog__duration">
                      {formatDuration(service.durationMinutes)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
          )}

          <Link className="artist-preview-dialog__cta" href={`/artista/${artist.slug}`}>
            Ver perfil completo <span aria-hidden="true">→</span>
          </Link>
        </motion.div>
      </motion.section>
    </div>
  );
}

export default ArtistPreviewModal;
