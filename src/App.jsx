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
import ArtistProfile from './pages/ArtistProfile/ArtistProfile.jsx';
import Login from './pages/Login/Login.jsx';
import ArtistLogin from './pages/ArtistLogin/ArtistLogin.jsx';
import ArtistDashboard from './pages/ArtistDashboard/ArtistDashboard.jsx';
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

function LandingPage() {
  return (
    <div className="landing-shell">
      <Header />
      <main>
        <Home />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/entrar" element={<ChooseLogin />} />
        <Route path="/entrar/contratante" element={<Login />} />
        <Route path="/entrar/artista" element={<ArtistLogin />} />
        <Route path="/artista/:slug" element={<ArtistProfile />} />
        <Route path="/reservar/:slug" element={<Contract />} />
        <Route path="/painel" element={<ArtistDashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
