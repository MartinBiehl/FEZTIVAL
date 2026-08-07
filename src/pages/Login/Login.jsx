import { useId, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import crowdImage from '../../images/crowd_party.png';
import stageImage from '../../images/concert_stage.png';
import './Login.css';

const pageContent = {
  contractor: {
    loginTitle: 'Que bom ter você de volta.',
    loginDescription: 'Acesse suas propostas, reservas e artistas favoritos.',
    registerTitle: 'Seu próximo evento começa aqui.',
    registerDescription: 'Crie sua conta gratuitamente e encontre o som certo.',
    nameLabel: 'Nome completo',
    namePlaceholder: 'Como podemos chamar você?',
    image: crowdImage,
    imageAlt: 'Pessoas celebrando em um show',
    quote: 'Encontrei o som perfeito para uma noite que ninguém esqueceu.',
    quoteAuthor: 'Carolina · Contratante Feztival',
    accent: '#ff3cac',
  },
  artist: {
    loginTitle: 'O próximo palco está chamando.',
    loginDescription: 'Entre para administrar seu perfil e suas propostas.',
    registerTitle: 'Faça seu talento circular.',
    registerDescription: 'Crie seu perfil profissional e seja encontrado.',
    nameLabel: 'Nome artístico',
    namePlaceholder: 'Como o público conhece você?',
    image: stageImage,
    imageAlt: 'Artista se apresentando em um palco iluminado',
    quote: 'Mais visibilidade para o seu som. Mais tempo para fazer música.',
    quoteAuthor: 'Feztival para artistas',
    accent: '#00bfe7',
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { delayChildren: 0.1, staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 25 },
  },
};

function GoogleIcon(props) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09A6.2 6.2 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.07H2.16A11 11 0 0 0 1 12c0 1.78.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function Login({ role = 'contractor', mode = 'login' }) {
  const content = pageContent[role];
  const isRegister = mode === 'register';
  const isArtist = role === 'artist';
  const shouldReduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const { completeAuth } = useAuth();
  const [name, setName] = useState('');
  const idPrefix = useId().replace(/:/g, '');

  const loginRoute = `/entrar/${isArtist ? 'artista' : 'contratante'}`;
  const registerRoute = `/cadastro/${isArtist ? 'artista' : 'contratante'}`;
  const alternateRoute = `${isRegister ? '/cadastro' : '/entrar'}/${isArtist ? 'contratante' : 'artista'}`;

  const handleSubmit = (event) => {
    event.preventDefault();
    const session = completeAuth({ role, name: isRegister ? name : undefined });
    navigate(session.destination);
  };

  return (
    <main className={`access-page${isArtist ? ' access-page--artist' : ''}`} style={{ '--access-accent': content.accent }}>
      <section className="access-page__form-panel" aria-labelledby={`${idPrefix}-title`}>
        <header className="access-page__brand">
          <BrandLogo />
          <Link to={isRegister ? '/' : '/entrar'}>
            <ArrowLeft size={15} aria-hidden="true" />
            {isRegister ? 'Voltar ao início' : 'Trocar perfil'}
          </Link>
        </header>

        <div className="access-page__form">
          <motion.div
            className="access-card"
            variants={containerVariants}
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
          >
            <motion.div className="access-card__heading" variants={itemVariants}>
              <h1 id={`${idPrefix}-title`}>
                {isRegister ? content.registerTitle : content.loginTitle}
              </h1>
              <p>{isRegister ? content.registerDescription : content.loginDescription}</p>
            </motion.div>

            {location.state?.passwordReset && !isRegister && (
              <motion.div className="access-card__success" role="status" variants={itemVariants}>
                <CheckCircle2 size={17} aria-hidden="true" />
                Senha atualizada. Entre com sua nova senha.
              </motion.div>
            )}

            <motion.button
              className="access-card__google"
              type="button"
              disabled
              aria-label="Continuar com Google — em breve"
              variants={itemVariants}
            >
              <GoogleIcon aria-hidden="true" />
              <span>Continuar com Google</span>
              <small>Em breve</small>
            </motion.button>

            <motion.div className="access-card__divider" variants={itemVariants} aria-hidden="true">
              <span />
              <small>ou</small>
              <span />
            </motion.div>

            <form onSubmit={handleSubmit}>
              {isRegister && (
                <motion.label htmlFor={`${idPrefix}-name`} variants={itemVariants}>
                  <span>{content.nameLabel}</span>
                  <input
                    id={`${idPrefix}-name`}
                    type="text"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={content.namePlaceholder}
                  />
                </motion.label>
              )}

              <motion.label htmlFor={`${idPrefix}-email`} variants={itemVariants}>
                <span>E-mail</span>
                <input
                  id={`${idPrefix}-email`}
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={isArtist ? 'artista@email.com' : 'voce@email.com'}
                />
              </motion.label>

              <motion.label htmlFor={`${idPrefix}-password`} variants={itemVariants}>
                <span>Senha</span>
                <input
                  id={`${idPrefix}-password`}
                  type="password"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                  placeholder="Mínimo de 6 caracteres"
                />
              </motion.label>

              {isRegister && (
                <motion.label className="access-card__terms" htmlFor={`${idPrefix}-terms`} variants={itemVariants}>
                  <input id={`${idPrefix}-terms`} type="checkbox" required />
                  <span>Concordo com os Termos de Uso e a Política de Privacidade.</span>
                </motion.label>
              )}

              {!isRegister && (
                <motion.div variants={itemVariants}>
                  <Link className="access-card__forgot" to={`/recuperar-senha?perfil=${isArtist ? 'artista' : 'contratante'}`}>
                    Esqueci minha senha
                  </Link>
                </motion.div>
              )}

              <motion.button className="access-card__submit" type="submit" variants={itemVariants}>
                <span>{isRegister ? (isArtist ? 'Criar perfil artístico' : 'Criar minha conta') : (isArtist ? 'Entrar no painel' : 'Entrar')}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </motion.button>
            </form>

            <motion.div className="access-card__footer" variants={itemVariants}>
              <p>
                {isRegister ? 'Já tem uma conta?' : 'Ainda não tem uma conta?'}{' '}
                <Link to={isRegister ? loginRoute : registerRoute}>
                  {isRegister ? 'Entrar' : 'Cadastre-se'}
                </Link>
              </p>
              <Link className="access-card__role-link" to={alternateRoute}>
                {isArtist ? 'Sou contratante' : 'Sou artista'} <span>→</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <motion.aside
        className="access-page__visual"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <img src={content.image} alt={content.imageAlt} />
        <div className="access-page__visual-copy">
          <blockquote>“{content.quote}”</blockquote>
          <span>{content.quoteAuthor}</span>
        </div>
      </motion.aside>
    </main>
  );
}

export default Login;
