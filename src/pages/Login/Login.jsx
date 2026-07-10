import { useState } from 'react';
import './Login.css';
import logoSvg from '../../images/1.svg';

function Login({ onNavigate }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    // TODO: integrar com API de autenticação
    console.log('Login:', { email, senha });
  }

  return (
    <section className="login-page">
      <div className="login-form-side">
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="login-btn">login</button>

          <a href="#" className="forgot-link" onClick={(e) => e.preventDefault()}>
            Esqueceu a senha?
          </a>
        </form>

        <p className="register-text">
          Não tem uma conta?{' '}
          <a href="#" onClick={(e) => { e.preventDefault(); }}>
            Registre-se
          </a>
        </p>
      </div>

      <div className="login-logo-side">
        <img src={logoSvg} alt="Feztival logo" className="login-logo" />
      </div>
    </section>
  );
}

export default Login;
