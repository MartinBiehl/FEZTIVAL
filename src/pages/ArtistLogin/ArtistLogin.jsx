import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import stageImage from '../../images/concert_stage.png';
import '../Login/Login.css';

function ArtistLogin() {
  const [mode, setMode] = useState('login');

  return (
    <main className="access-page access-page--artist">
      <div className="access-page__brand">
        <BrandLogo />
        <Link to="/">Voltar ao início</Link>
      </div>
      <section className="access-page__form">
        <div className="access-card">
          <p className="eyebrow">Área do artista</p>
          <h1>{mode === 'login' ? 'O próximo palco está chamando.' : 'Faça seu talento circular.'}</h1>
          <p>{mode === 'login' ? 'Entre para administrar perfil e propostas.' : 'Crie seu perfil profissional na Feztival.'}</p>
          <form onSubmit={(event) => event.preventDefault()}>
            {mode === 'register' && (
              <label>Nome artístico<input type="text" required placeholder="Como o público conhece você?" /></label>
            )}
            <label>E-mail<input type="email" autoComplete="email" required placeholder="artista@email.com" /></label>
            <label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required placeholder="••••••••" /></label>
            <button type="submit">{mode === 'login' ? 'Entrar no painel' : 'Criar perfil artístico'} <span>→</span></button>
          </form>
          <div className="access-card__switch">
            {mode === 'login' ? 'Novo na Feztival?' : 'Já possui perfil?'}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Começar agora' : 'Entrar'}
            </button>
          </div>
          <Link className="access-card__artist-link" to="/entrar/contratante">Sou contratante →</Link>
        </div>
      </section>
      <aside className="access-page__visual">
        <img src={stageImage} alt="Banda se apresentando ao vivo" />
        <blockquote>“Mais visibilidade para o seu som. Mais tempo para fazer música.”</blockquote>
        <span>Feztival para artistas</span>
      </aside>
    </main>
  );
}

export default ArtistLogin;
