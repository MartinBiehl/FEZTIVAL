import Login from '../Login/Login.jsx';

function ArtistLogin({ mode = 'login' }) {
  return <Login role="artist" mode={mode} />;
}

export default ArtistLogin;
