'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import useActionSubmit from '../../hooks/useActionSubmit.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { completeGoogleSignup } from '../../lib/accountActions.js';
import { formatPhone } from '../../lib/phone.js';
import crowdImage from '../../images/crowd_party.png';
import stageImage from '../../images/concert_stage.png';
import '../Login/Login.css';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 25 } },
};

/*
 * /cadastro/completar: quem voltou do Google sem conta informa o que falta.
 * Mesmo visual das telas de acesso (Login.css). Sem tipo vindo da tela de
 * origem (a pessoa clicou no Google em /entrar), ela escolhe aqui.
 */
function CompleteSignup({ email, fullName, signupAs }) {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();
  const { refresh } = useAuth();
  const [state, formAction, isPending] = useActionState(completeGoogleSignup, null);
  const submit = useActionSubmit(formAction);
  const idPrefix = useId().replace(/:/g, '');
  const [type, setType] = useState(signupAs ?? '');
  const [phone, setPhone] = useState('');
  const isArtist = type === 'artist';

  // Igual ao Login: o AuthContext precisa reler a sessao antes de navegar.
  useEffect(() => {
    if (!state?.ok || !state.destination) return;
    refresh().then(() => router.push(state.destination));
  }, [refresh, router, state]);

  return (
    <main
      className={`access-page${isArtist ? ' access-page--artist' : ''}`}
      style={{ '--access-accent': isArtist ? '#00bfe7' : '#ff3cac' }}
    >
      <section className="access-page__form-panel" aria-labelledby={`${idPrefix}-title`}>
        <header className="access-page__brand">
          <BrandLogo />
        </header>

        <div className="access-page__form">
          <motion.div
            className="access-card"
            variants={containerVariants}
            initial={shouldReduceMotion ? false : 'hidden'}
            animate="visible"
          >
            <motion.div className="access-card__heading" variants={itemVariants}>
              <h1 id={`${idPrefix}-title`}>Falta pouco.</h1>
              <p>Sua conta Google foi confirmada. Complete seu cadastro para continuar.</p>
            </motion.div>

            <form onSubmit={submit}>
              <motion.label htmlFor={`${idPrefix}-email`} variants={itemVariants}>
                <span>E-mail</span>
                <input id={`${idPrefix}-email`} type="email" value={email} readOnly disabled />
              </motion.label>

              {!signupAs && (
                <motion.label htmlFor={`${idPrefix}-type`} variants={itemVariants}>
                  <span>Como você vai usar o Feztival?</span>
                  <select
                    id={`${idPrefix}-type`}
                    required
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                  >
                    <option value="" disabled>Selecione</option>
                    <option value="contractor">Quero contratar artistas</option>
                    <option value="artist">Sou artista</option>
                  </select>
                </motion.label>
              )}
              <input type="hidden" name="signupAs" value={type} />

              {isArtist && (
                <>
                  <motion.label htmlFor={`${idPrefix}-stage-name`} variants={itemVariants}>
                    <span>Nome artístico</span>
                    <input
                      id={`${idPrefix}-stage-name`}
                      name="stageName"
                      type="text"
                      autoComplete="off"
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Como o público conhece você?"
                    />
                  </motion.label>
                  <motion.label htmlFor={`${idPrefix}-category`} variants={itemVariants}>
                    <span>Categoria</span>
                    <select id={`${idPrefix}-category`} name="category" required defaultValue="">
                      <option value="" disabled>Selecione</option>
                      <option value="dj">DJ</option>
                      <option value="band">Banda</option>
                      <option value="solo">Músico solo</option>
                    </select>
                  </motion.label>
                </>
              )}

              <motion.label htmlFor={`${idPrefix}-full-name`} variants={itemVariants}>
                <span>Nome completo</span>
                <input
                  id={`${idPrefix}-full-name`}
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={120}
                  defaultValue={fullName}
                  placeholder={isArtist ? 'Responsável pelas contratações' : 'Como podemos chamar você?'}
                />
              </motion.label>

              <motion.label htmlFor={`${idPrefix}-phone`} variants={itemVariants}>
                <span>WhatsApp</span>
                <input
                  id={`${idPrefix}-phone`}
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  inputMode="numeric"
                  required
                  minLength={14}
                  maxLength={15}
                  value={phone}
                  onChange={(event) => setPhone(formatPhone(event.target.value))}
                  placeholder="(51) 99999-9999"
                />
              </motion.label>

              <motion.label className="access-card__terms" htmlFor={`${idPrefix}-terms`} variants={itemVariants}>
                <input id={`${idPrefix}-terms`} name="terms" type="checkbox" required />
                <span>Concordo com os Termos de Uso e a Política de Privacidade.</span>
              </motion.label>

              {state?.error && (
                <p className="access-card__error" role="alert">{state.error}</p>
              )}

              <motion.button className="access-card__submit" type="submit" disabled={isPending} aria-busy={isPending} variants={itemVariants}>
                <span>{isArtist ? 'Criar perfil artístico' : 'Criar minha conta'}</span>
                <ArrowRight size={18} aria-hidden="true" />
              </motion.button>
            </form>
          </motion.div>
        </div>
      </section>

      <motion.aside
        className="access-page__visual"
        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.985 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <img
          src={(isArtist ? stageImage : crowdImage).src}
          alt={isArtist ? 'Artista se apresentando em um palco iluminado' : 'Pessoas celebrando em um show'}
        />
        <div className="access-page__visual-copy">
          <blockquote>“Talento local para momentos que ficam.”</blockquote>
          <span>Feztival</span>
        </div>
      </motion.aside>
    </main>
  );
}

export default CompleteSignup;
