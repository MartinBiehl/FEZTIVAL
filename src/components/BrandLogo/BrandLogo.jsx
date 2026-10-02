import Link from 'next/link';
import './BrandLogo.css';

/*
 * Cada letra do wordmark "FEZTIVAL" tem sua cor. E identidade visual, nao
 * dado de negocio: nao pertence ao banco e nao muda por artista ou ambiente.
 */
const brandLetters = [
  { letter: 'F', color: '#FFD600' },
  { letter: 'E', color: '#FF6B35' },
  { letter: 'Z', color: '#FF3CAC' },
  { letter: 'T', color: '#B36AFF' },
  { letter: 'I', color: '#00D4FF' },
  { letter: 'V', color: '#FFD600' },
  { letter: 'A', color: '#FF6B35' },
  { letter: 'L', color: '#FF3CAC' },
];

function BrandLogo({ size = 'medium', asLink = true }) {
  const wordmark = (
    <span className={`brand-logo brand-logo--${size}`} aria-label="Feztival">
      {brandLetters.map(({ letter, color }, index) => (
        <span key={`${letter}-${index}`} aria-hidden="true" style={{ color }}>
          {letter}
        </span>
      ))}
    </span>
  );

  if (!asLink) {
    return wordmark;
  }

  return (
    <Link className="brand-logo__link" href="/" aria-label="Ir para o início da Feztival">
      {wordmark}
    </Link>
  );
}

export default BrandLogo;
