import BrandLogo from '../BrandLogo/BrandLogo.jsx';
import { landingContent } from '../../data/landingContent.js';
import './Footer.css';

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__topline">
        <BrandLogo size="small" />
        <nav className="site-footer__links" aria-label="Navegação do rodapé">
          {landingContent.footer.links.map(({ label, href }) => (
            <a key={href} href={href}>{label}</a>
          ))}
        </nav>
      </div>
      <p>{landingContent.footer.copyright}</p>
    </footer>
  );
}

export default Footer;
