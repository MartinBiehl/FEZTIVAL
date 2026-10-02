'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import useActionSubmit from '../../hooks/useActionSubmit.js';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import InputOtp8 from '../../components/ui/InputOtp8/InputOtp8.jsx';
import {
  requestPasswordReset, updatePassword, verifyRecoveryCode,
} from '../../lib/accountActions.js';
import './PasswordRecovery.css';

/*
 * Igual a auth.email.otp_length do Supabase (6 em supabase/config.toml). O
 * template "Reset Password" do projeto precisa exibir {{ .Token }}; o padrao
 * envia so um link.
 */
const CODE_LENGTH = 6;

const stepActions = {
  email: requestPasswordReset,
  code: verifyRecoveryCode,
  password: updatePassword,
};

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
    description: 'Digite o código de seis dígitos que enviamos para confirmar sua identidade.',
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const profile = searchParams.get('perfil') === 'artista' ? 'artist' : 'contractor';
  const profileParam = profile === 'artist' ? 'artista' : 'contratante';
  const query = `?perfil=${profileParam}`;
  const loginPath = `/entrar/${profileParam}`;
  const content = stepContent[step];
  const Icon = content.icon;
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [state, formAction, isPending] = useActionState(stepActions[step], null);
  const submit = useActionSubmit(formAction);
  const [isResending, startResend] = useTransition();
  const error = state?.error ?? '';

  const backPath = step === 'email'
    ? loginPath
    : step === 'code'
      ? `/recuperar-senha${query}`
      : `/recuperar-senha/codigo${query}`;

  useEffect(() => {
    if (!state?.ok) return;
    const emailParam = `&email=${encodeURIComponent(email)}`;
    if (step === 'email') router.push(`/recuperar-senha/codigo${query}${emailParam}`);
    if (step === 'code') router.push(`/recuperar-senha/nova-senha${query}${emailParam}`);
    if (step === 'password') router.replace(`${loginPath}?senhaRedefinida=1`);
  }, [email, loginPath, query, router, state, step]);

  const handleResend = () => {
    setCode('');
    startResend(async () => {
      const formData = new FormData();
      formData.set('email', email);
      const result = await requestPasswordReset(null, formData);
      setResendMessage(result.error ?? 'Se o e-mail estiver cadastrado, um novo código chegará em instantes.');
    });
  };

  return (
    <main className={`recovery-page recovery-page--${profile}`} style={{ '--recovery-accent': profile === 'artist' ? '#00bfe7' : '#ff3cac' }}>
      <header className="recovery-page__header">
        <BrandLogo />
        <Link href={backPath}>
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
          <form onSubmit={submit}>
            <label htmlFor="recovery-email">
              <span>E-mail</span>
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@email.com"
              />
            </label>
            {error && <p className="recovery-card__error" role="alert">{error}</p>}
            <button className="recovery-card__submit" type="submit" disabled={isPending} aria-busy={isPending}>
              <span>Enviar código</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submit}>
            <input type="hidden" name="email" value={email} />
            <input type="hidden" name="code" value={code} />
            <p className="recovery-card__destination">Código destinado a <strong>{maskEmail(email)}</strong></p>
            <InputOtp8 length={CODE_LENGTH} value={code} onChange={setCode} />
            {error && <p className="recovery-card__error" role="alert">{error}</p>}
            <button
              className="recovery-card__submit"
              type="submit"
              disabled={code.length !== CODE_LENGTH || isPending}
              aria-busy={isPending}
            >
              <span>Confirmar código</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button className="recovery-card__secondary" type="button" onClick={handleResend} disabled={isResending}>
              Enviar outro código
            </button>
            <p className="recovery-card__live" aria-live="polite">{resendMessage}</p>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={submit}>
            <label htmlFor="recovery-password">
              <span>Nova senha</span>
              <input
                id="recovery-password"
                name="password"
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
                name="confirmation"
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
            <button className="recovery-card__submit" type="submit" disabled={isPending} aria-busy={isPending}>
              <span>Salvar nova senha</span>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </form>
        )}

        <Link className="recovery-card__login" href={loginPath}>Voltar para o login</Link>
      </motion.section>
    </main>
  );
}

export default PasswordRecovery;

