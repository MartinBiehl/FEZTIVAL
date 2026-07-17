import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../BrandLogo/BrandLogo.jsx';
import { landingContent } from '../../data/landingContent.js';
import './Header.css';

function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setIsScrolled(window.scrollY > 36);
    }

    function closeMenuOnEscape(event) {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', closeMenuOnEscape);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', closeMenuOnEscape);
    };
  }, []);

  function closeMenu() {
    setIsMenuOpen(false);
  }

  return (
    <header className={`site-header${isScrolled ? ' site-header--scrolled' : ''}`}>
      <div className="site-header__content">
        <BrandLogo />

        <nav className="site-header__nav" aria-label="Navegação principal">
          {landingContent.navigation.map(({ href, label }) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>

        <div className="site-header__controls">
          <div className="site-header__actions">
            <Link className="site-header__login" to="/entrar">Entrar</Link>
            <Link className="site-header__signup" to="/entrar">Cadastrar</Link>
          </div>

          <button
            className="site-header__menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMenuOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <nav
          id="mobile-navigation"
          className={`site-header__mobile-nav${isMenuOpen ? ' site-header__mobile-nav--open' : ''}`}
          aria-label="Navegação móvel"
        >
          {landingContent.navigation.map(({ href, label }) => (
            <a key={href} href={href} onClick={closeMenu}>{label}</a>
          ))}
          <div className="site-header__mobile-actions">
            <Link className="site-header__login" to="/entrar" onClick={closeMenu}>Entrar</Link>
            <Link className="site-header__signup" to="/entrar" onClick={closeMenu}>Cadastrar</Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
