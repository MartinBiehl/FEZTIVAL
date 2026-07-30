import { motion, useReducedMotion } from 'motion/react';
import './ArtistCard.css';

function ArtistCard({ artist, featured = false, onPreview }) {
  const shouldReduceMotion = useReducedMotion();

  function openPreview(event) {
    onPreview?.(artist, event.currentTarget);
  }

  return (
    <motion.article
      layoutId={shouldReduceMotion ? undefined : `artist-card-${artist.slug}`}
      className={`artist-result-card${featured ? ' artist-result-card--featured' : ''}`}
      style={{ '--artist-color': artist.color }}
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
      transition={{ duration: 0.18 }}
    >
      <div className="artist-result-card__visual">
        <span className="artist-result-card__monogram" aria-hidden="true">
          {artist.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
        </span>
        <span className="artist-result-card__category">{artist.category}</span>
        <span className="artist-result-card__available">Disponível esta semana</span>
      </div>
      <div className="artist-result-card__body">
        <div className="artist-result-card__rating">
          <span>★ {artist.rating.toFixed(1)}</span>
          <small>{artist.reviews} avaliações</small>
        </div>
        <h3>{artist.name}</h3>
        <p>{artist.genres.join(' · ')} · {artist.location}</p>
        <div className="artist-result-card__footer">
          <span>A partir de <strong>R$ {artist.price.toLocaleString('pt-BR')}</strong></span>
          <span className="artist-result-card__preview-icon" aria-hidden="true">↗</span>
        </div>
      </div>
      <button
        className="artist-result-card__trigger"
        type="button"
        aria-label={`Abrir prévia de ${artist.name}`}
        aria-haspopup="dialog"
        onClick={openPreview}
      />
    </motion.article>
  );
}

export default ArtistCard;
