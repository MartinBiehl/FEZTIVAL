import Header from '../../components/Header/Header.jsx';
import Footer from '../../components/Footer/Footer.jsx';
import ScrollManager from '../components/ScrollManager.jsx';

/*
 * Envolve as rotas que exibem Header e Footer
 * (/, /explorar, /artista/[slug], /reservar/[slug]).
 * As rotas de acesso e painel ficam fora deste grupo, sem o shell.
 */
export default function PublicLayout({ children }) {
  return (
    <div className="site-shell">
      <ScrollManager />
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
