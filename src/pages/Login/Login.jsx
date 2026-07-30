import { useState } from 'react';
import { Link } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import crowdImage from '../../images/crowd_party.png';
import './Login.css';

function Login() {
  const [mode, setMode] = useState('login');

  return (
    <main className="access-page">
      <div className="access-page__brand">
        <BrandLogo />
        <Link to="/">Voltar ao início</Link>
      </div>
      <section className="access-page__form">
        <div className="access-card">
          <p className="eyebrow">Área do contratante</p>
          <h1>{mode === 'login' ? 'Que bom ter você de volta.' : 'Seu próximo evento começa aqui.'}</h1>
          <p>{mode === 'login' ? 'Acesse suas propostas e artistas favoritos.' : 'Crie sua conta gratuitamente.'}</p>
          <form onSubmit={(event) => event.preventDefault()}>
            {mode === 'register' && (
              <label>Nome completo<input type="text" autoComplete="name" required placeholder="Como podemos chamar você?" /></label>
            )}
            <label>E-mail<input type="email" autoComplete="email" required placeholder="voce@email.com" /></label>
            <label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required placeholder="••••••••" /></label>
            <button type="submit">{mode === 'login' ? 'Entrar' : 'Criar minha conta'} <span>→</span></button>
          </form>
          {mode === 'login' && <button className="access-card__forgot" type="button">Esqueci minha senha</button>}
          <div className="access-card__switch">
            {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </div>
          <Link className="access-card__artist-link" to="/entrar/artista">Sou artista →</Link>
        </div>
      </section>
      <aside className="access-page__visual">
        <img src={crowdImage} alt="Pessoas celebrando em um show" />
        <blockquote>“Encontrei o som perfeito para uma noite que ninguém esqueceu.”</blockquote>
        <span>Carolina · Contratante Feztival</span>
      </aside>
    </main>
  );
}

export default Login;
