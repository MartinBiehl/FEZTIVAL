import Link from 'next/link';
import Header from '../components/Header/Header.jsx';
import Footer from '../components/Footer/Footer.jsx';
import './not-found.css';

/*
 * O App.jsx do Vite redirecionava rotas desconhecidas para "/" com <Navigate>.
 * Aqui retornamos um 404 real: redirecionar sinalizaria ao buscador que a URL
 * quebrada é válida e poluiria o índice.
 */
export const metadata = {
  title: 'Página não encontrada — Feztival',
};

export default function NotFound() {
  return (
    <div className="site-shell">
      <Header />
      <main>
        <section className="not-found page-container">
          <p className="eyebrow">Erro 404</p>
          <h1>Esta página saiu de cartaz.</h1>
          <p className="not-found__lead">
            O link pode estar quebrado ou a página pode ter sido removida.
          </p>
          <div className="not-found__actions">
            <Link className="not-found__primary" href="/">Voltar ao início</Link>
            <Link className="not-found__secondary" href="/explorar">
              Explorar artistas <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
