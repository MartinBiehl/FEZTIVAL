import Link from 'next/link';
import { brandLetters } from '../../data/brand.js';
import './BrandLogo.css';

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
