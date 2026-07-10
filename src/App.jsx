import { useState } from 'react';
import Header from './components/Header/Header.jsx';
import Footer from './components/Footer/Footer.jsx';
import Home from './pages/Home/Home.jsx';
import ArtistProfile from './pages/ArtistProfile/ArtistProfile.jsx';
import Login from './pages/Login/Login.jsx';
import ArtistLogin from './pages/ArtistLogin/ArtistLogin.jsx';
import ArtistDashboard from './pages/ArtistDashboard/ArtistDashboard.jsx';
import Contract from './pages/Contract/Contract.jsx';
import ChooseLogin from './pages/ChooseLogin/ChooseLogin.jsx';

const pages = {
  home: Home,
  artistProfile: ArtistProfile,
  chooseLogin: ChooseLogin,
  login: Login,
  artistLogin: ArtistLogin,
  artistDashboard: ArtistDashboard,
  contract: Contract,
};

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const CurrentPage = pages[currentPage] || Home;

  function navigateTo(pageName) {
    if (pages[pageName]) {
      setCurrentPage(pageName);
    }
  }

  return (
    <>
      <Header onNavigate={navigateTo} />
      <main>
        <CurrentPage onNavigate={navigateTo} />
      </main>
      <Footer onNavigate={navigateTo} />
    </>
  );
}

export default App;
