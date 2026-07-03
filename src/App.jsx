import Header from './components/Header/Header.jsx';
import Footer from './components/Footer/Footer.jsx';
import ArtistCard from './components/ArtistCard/ArtistCard.jsx';
import Home from './pages/Home/Home.jsx';
import ArtistProfile from './pages/ArtistProfile/ArtistProfile.jsx';
import Login from './pages/Login/Login.jsx';
import ArtistLogin from './pages/ArtistLogin/ArtistLogin.jsx';
import ArtistDashboard from './pages/ArtistDashboard/ArtistDashboard.jsx';
import Contract from './pages/Contract/Contract.jsx';

function App() {
  return (
    <>
      <Header />
      <main>
        <Home />
        <ArtistCard />
        <ArtistProfile />
        <Login />
        <ArtistLogin />
        <ArtistDashboard />
        <Contract />
      </main>
      <Footer />
    </>
  );
}

export default App;
