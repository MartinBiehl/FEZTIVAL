import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import Header from './components/Header/Header.jsx';
import Footer from './components/Footer/Footer.jsx';
import Home from './pages/Home/Home.jsx';
import Explore from './pages/Explore/Explore.jsx';
import ArtistProfile from './pages/ArtistProfile/ArtistProfile.jsx';
import Login from './pages/Login/Login.jsx';
import ArtistLogin from './pages/ArtistLogin/ArtistLogin.jsx';
import ArtistDashboard from './pages/ArtistDashboard/ArtistDashboard.jsx';
import ClientBookings from './pages/ClientBookings/ClientBookings.jsx';
import Contract from './pages/Contract/Contract.jsx';
import ChooseLogin from './pages/ChooseLogin/ChooseLogin.jsx';

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      window.requestAnimationFrame(() => {
        document.querySelector(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return null;
}

function PublicLayout({ children }) {
  return (
    <div className="site-shell">
      <Header />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/explorar" element={<PublicLayout><Explore /></PublicLayout>} />
        <Route path="/artistas" element={<Navigate to="/explorar" replace />} />
        <Route path="/artista/:slug" element={<PublicLayout><ArtistProfile /></PublicLayout>} />
        <Route path="/reservar/:slug" element={<PublicLayout><Contract /></PublicLayout>} />
        <Route path="/entrar" element={<ChooseLogin />} />
        <Route path="/entrar/contratante" element={<Login />} />
        <Route path="/entrar/artista" element={<ArtistLogin />} />
        <Route path="/painel" element={<ArtistDashboard />} />
        <Route path="/minhas-reservas" element={<ClientBookings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
