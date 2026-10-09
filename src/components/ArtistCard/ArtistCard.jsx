import { motion, useReducedMotion } from 'motion/react';
import {
  NO_RATING_LABEL, formatPrice, formatRating, formatReviewCount, hasRating, priceLabel,
} from '../../lib/artistDisplay.js';
import './ArtistCard.css';

/* Generos visiveis no cartao; o resto vira "+N" para nao quebrar a altura. */
const VISIBLE_GENRES = 2;

function ArtistCard({ artist, featured = false, onPreview }) {
  const shouldReduceMotion = useReducedMotion();
  const visibleGenres = artist.genres.slice(0, VISIBLE_GENRES);
  const hiddenGenres = artist.genres.length - visibleGenres.length;

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
        {artist.coverUrl ? (
          <img className="artist-result-card__cover" src={artist.coverUrl} alt="" loading="lazy" />
        ) : (
          <span className="artist-result-card__monogram" aria-hidden="true">
            {artist.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}
          </span>
        )}
      </div>
      <div className="artist-result-card__body">
        <div className="artist-result-card__tags">
          <span className="artist-result-card__category">{artist.category}</span>
          {artist.location && (
            <span className="artist-result-card__location">
              <svg viewBox="0 0 16 16" aria-hidden="true">
                <path d="M8 15s5-4.6 5-8.5a5 5 0 0 0-10 0C3 10.4 8 15 8 15Zm0-6.5a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z" />
              </svg>
              {artist.location}
            </span>
          )}
        </div>
        <h3>{artist.name}</h3>
        {visibleGenres.length > 0 && (
          <ul className="artist-result-card__genres" aria-label="Gêneros">
            {visibleGenres.map((genre) => <li key={genre}>{genre}</li>)}
            {hiddenGenres > 0 && <li aria-label={`e mais ${hiddenGenres}`}>+{hiddenGenres}</li>}
          </ul>
        )}
        <div className="artist-result-card__footer">
          <div>
            <span>{priceLabel(artist)}</span>
            <strong>{formatPrice(artist)}</strong>
          </div>
          <div className="artist-result-card__rating">
            {hasRating(artist) ? (
              <span title={formatReviewCount(artist)}>★ {formatRating(artist)}</span>
            ) : (
              <small>{NO_RATING_LABEL}</small>
            )}
            <span className="artist-result-card__preview-icon" aria-hidden="true">↗</span>
          </div>
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
