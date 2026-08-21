import Header from '../../components/Header/Header.jsx';
import Footer from '../../components/Footer/Footer.jsx';
import ScrollManager from '../components/ScrollManager.jsx';

/*
 * Equivalente ao PublicLayout de src/App.jsx: envolve as rotas que exibem
 * Header e Footer (/, /explorar, /artista/[slug], /reservar/[slug]).
 * As rotas de acesso e painel ficam fora deste grupo, como no App.jsx atual.
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
