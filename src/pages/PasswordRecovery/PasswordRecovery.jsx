import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import InputOtp8 from '../../components/ui/InputOtp8/InputOtp8.jsx';
import './PasswordRecovery.css';

const stepContent = {
  email: {
    icon: Mail,
    step: 'Etapa 1 de 3',
    title: 'Recupere sua senha',
    description: 'Informe o e-mail usado na Feztival para continuar.',
  },
  code: {
    icon: KeyRound,
    step: 'Etapa 2 de 3',
    title: 'Confira seu e-mail',
    description: 'Digite o código de quatro dígitos para confirmar sua identidade.',
  },
  password: {
    icon: CheckCircle2,
    step: 'Etapa 3 de 3',
    title: 'Crie uma nova senha',
    description: 'Escolha uma senha com pelo menos seis caracteres.',
  },
};

function maskEmail(email) {
  const [localPart = '', domain = ''] = email.split('@');
  if (!localPart || !domain) return 'seu e-mail';
  return `${localPart.slice(0, 1)}${'*'.repeat(Math.max(3, localPart.length - 1))}@${domain}`;
}

function PasswordRecovery({ step = 'email' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const profile = searchParams.get('perfil') === 'artista' ? 'artist' : 'contractor';
  const profileParam = profile === 'artist' ? 'artista' : 'contratante';
  const query = `?perfil=${profileParam}`;
  const loginPath = `/entrar/${profileParam}`;
  const content = stepContent[step];
  const Icon = content.icon;
  const [email, setEmail] = useState(location.state?.email || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [resendMessage, setResendMessage] = useState('');

  const backPath = step === 'email'
    ? loginPath
    : step === 'code'
      ? `/recuperar-senha${query}`
      : `/recuperar-senha/codigo${query}`;

  const handleEmailSubmit = (event) => {
    event.preventDefault();
    navigate(`/recuperar-senha/codigo${query}`, { state: { email } });
  };

  const handleCodeSubmit = (event) => {
    event.preventDefault();
    if (code.length !== 4) return;
    navigate(`/recuperar-senha/nova-senha${query}`, { state: { email } });
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();
    if (password !== confirmation) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    setError('');
    navigate(loginPath, { replace: true, state: { passwordReset: true } });
  };

  const handleResend = () => {
    setCode('');
    setResendMessage('Novo código simulado gerado. Use qualquer combinação de quatro dígitos.');
  };

  return (
    <main className={`recovery-page recovery-page--${profile}`} style={{ '--recovery-accent': profile === 'artist' ? '#00bfe7' : '#ff3cac' }}>
      <header className="recovery-page__header">
        <BrandLogo />
        <Link to={backPath} state={step === 'password' ? { email } : undefined}>
          <ArrowLeft size={15} aria-hidden="true" />
          Voltar
        </Link>
      </header>

      <motion.section
        className="recovery-card"
        aria-labelledby="recovery-title"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 230, damping: 24 }}
      >
        <span className="recovery-card__icon" aria-hidden="true"><Icon size={21} strokeWidth={1.9} /></span>
        <small className="recovery-card__step">{content.step}</small>
        <h1 id="recovery-title">{content.title}</h1>
        <p className="recovery-card__description">{content.description}</p>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit}>
            <label htmlFor="recovery-email">
              <span>E-mail</span>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
              />
            </label>
            <button className="recovery-card__submit" type="submit">
              <span>Enviar código</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={handleCodeSubmit}>
            <p className="recovery-card__destination">Código destinado a <strong>{maskEmail(email)}</strong></p>
            <InputOtp8 value={code} onChange={setCode} />
            <p className="recovery-card__demo">
              Demonstração: nenhum e-mail real será enviado. Use qualquer código de quatro dígitos.
            </p>
            <button className="recovery-card__submit" type="submit" disabled={code.length !== 4}>
              <span>Confirmar código</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="recovery-card__secondary" type="button" onClick={handleResend}>Enviar outro código</button>
            <p className="recovery-card__live" aria-live="polite">{resendMessage}</p>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit}>
            <label htmlFor="recovery-password">
              <span>Nova senha</span>
              <input
                id="recovery-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo de 6 caracteres"
              />
            </label>
            <label htmlFor="recovery-password-confirmation">
              <span>Confirmar nova senha</span>
              <input
                id="recovery-password-confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="Digite a senha novamente"
              />
            </label>
            {error && <p className="recovery-card__error" role="alert">{error}</p>}
            <button className="recovery-card__submit" type="submit">
              <span>Salvar nova senha</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        )}

        <Link className="recovery-card__login" to={loginPath}>Voltar para o login</Link>
      </motion.section>
    </main>
  );
}

export default PasswordRecovery;

