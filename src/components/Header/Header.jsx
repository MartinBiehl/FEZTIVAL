import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import BrandLogo from '../BrandLogo/BrandLogo.jsx';
import './Header.css';

const navigation = [
  { label: 'Explorar artistas', to: '/explorar' },
  { label: 'Como funciona', to: '/#como-funciona' },
  { label: 'Para artistas', to: '/#para-artistas' },
];

function Header() {
  const { pathname } = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isHome = pathname === '/';

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24);
    const closeOnEscape = (event) => event.key === 'Escape' && setIsMenuOpen(false);
    setIsMenuOpen(false);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [pathname]);

  const headerClassName = [
    'site-header',
    isHome ? 'site-header--home' : '',
    isScrolled ? 'site-header--scrolled' : '',
    isMenuOpen ? 'site-header--menu-open' : '',
  ].filter(Boolean).join(' ');

  return (
    <header className={headerClassName}>
      <div className="site-header__content">
        <BrandLogo />

        <nav className="site-header__nav" aria-label="Navegação principal">
          {navigation.map(({ label, to }) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
        </nav>

        <div className="site-header__actions">
          <Link className="site-header__login" to="/entrar">Entrar</Link>
          <Link className="site-header__signup" to="/entrar/contratante">Cadastre-se</Link>
          <button
            className="site-header__menu-toggle"
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <span /><span />
          </button>
        </div>

        <nav
          id="mobile-navigation"
          className={`site-header__mobile-nav${isMenuOpen ? ' site-header__mobile-nav--open' : ''}`}
          aria-label="Navegação móvel"
        >
          {navigation.map(({ label, to }) => (
            <Link key={to} to={to} onClick={() => setIsMenuOpen(false)}>{label}</Link>
          ))}
          <Link to="/entrar" onClick={() => setIsMenuOpen(false)}>Entrar ou cadastrar</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
