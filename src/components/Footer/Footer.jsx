import Link from 'next/link';
import BrandLogo from '../BrandLogo/BrandLogo.jsx';
import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <BrandLogo size="large" />
        <p>Talento local para momentos que ficam.</p>
      </div>
      <div className="site-footer__columns">
        <div>
          <strong>Descobrir</strong>
          <Link href="/explorar">Explorar artistas</Link>
          <Link href="/#como-funciona">Como funciona</Link>
          <Link href="/minhas-reservas">Minhas reservas</Link>
        </div>
        <div>
          <strong>Feztival</strong>
          <Link href="/#sobre">Sobre o projeto</Link>
          <Link href="/#para-artistas">Para artistas</Link>
          <Link href="/entrar">Entrar</Link>
        </div>
      </div>
      <div className="site-footer__bottom">
        <span>© 2026 Feztival. Ivoti, RS.</span>
        <span>Feito para a cena local.</span>
      </div>
    </footer>
  );
}

export default Footer;
