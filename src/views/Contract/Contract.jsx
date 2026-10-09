'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProposalReviewModal from '../../components/ProposalReviewModal/ProposalReviewModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  NO_RATING_LABEL, formatMinutes, formatPrice, formatRating, formatReviewCount, hasRating, priceLabel,
} from '../../lib/artistDisplay.js';
import { createBooking } from '../../lib/bookingActions.js';
import { todayIso } from '../../lib/bookingDisplay.js';
import { formatPhone } from '../../lib/phone.js';
import './Contract.css';

/*
 * Rascunho da proposta para quem ainda nao entrou: o envio leva ao login, e
 * sem isto a pessoa voltaria com o formulario em branco. sessionStorage
 * porque o rascunho so interessa a esta aba; pode falhar (modo privado,
 * armazenamento bloqueado), entao todo acesso e protegido.
 */
const draftKey = (slug) => `feztival:proposta:${slug}`;

function readDraft(slug) {
  try {
    return JSON.parse(window.sessionStorage.getItem(draftKey(slug)) ?? 'null');
  } catch {
    return null;
  }
}

function writeDraft(slug, data) {
  try {
    if (data) window.sessionStorage.setItem(draftKey(slug), JSON.stringify(data));
    else window.sessionStorage.removeItem(draftKey(slug));
  } catch {
    // Sem armazenamento a proposta so nao e recuperada; o envio segue normal.
  }
}

function Contract({ artist }) {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [sent, setSent] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [error, setError] = useState('');
  const [phone, setPhone] = useState('');
  const [restored, setRestored] = useState(false);
  const formRef = useRef(null);
  const [isSending, startSending] = useTransition();
  // Definida apos montar: a pagina e prerenderizada, e a data do build divergiria da do visitante.
  const [minDate, setMinDate] = useState(undefined);
  const reviewTriggerRef = useRef(null);
  useEffect(() => setMinDate(todayIso()), []);

  // Devolve ao formulario o que foi preenchido antes do login.
  useEffect(() => {
    const draft = readDraft(artist.slug);
    const form = formRef.current;
    if (!draft || !form) return;
    Object.entries(draft).forEach(([name, value]) => {
      if (name === 'phone') {
        setPhone(formatPhone(String(value)));
        return;
      }
      const field = form.elements.namedItem(name);
      if (field && 'value' in field) field.value = value;
    });
    setRestored(true);
  }, [artist.slug]);
  const loginPath = `/entrar/contratante?next=${encodeURIComponent(`/reservar/${artist.slug}`)}`;

  const closeReview = useCallback(() => {
    setReviewData(null);
  }, []);

  const confirmProposal = useCallback(() => {
    startSending(async () => {
      const formData = new FormData();
      Object.entries(reviewData ?? {}).forEach(([key, value]) => formData.set(key, value));
      formData.set('slug', artist.slug);

      const result = await createBooking(formData);
      if (result.needsAuth) {
        writeDraft(artist.slug, reviewData);
        router.push(loginPath);
        return;
      }
      setReviewData(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      writeDraft(artist.slug, null);
      setSent(true);
      refresh();
    });
  }, [artist.slug, loginPath, refresh, reviewData, router]);

  function reviewProposal(event) {
    event.preventDefault();
    setError('');
    const formData = new FormData(event.currentTarget);
    setReviewData(Object.fromEntries(formData.entries()));
  }

  if (sent) {
    return (
      <section className="contract-success page-container">
        <span aria-hidden="true">✓</span>
        <p className="eyebrow">Proposta enviada</p>
        <h1>Agora é com<br />{artist.name}.</h1>
        <p>Você receberá uma resposta assim que o artista analisar os detalhes do evento.</p>
        <div>
          <Link href="/minhas-reservas">Acompanhar proposta</Link>
          <Link href="/explorar">Continuar explorando</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="contract-page page-container">
      <div className="contract-heading">
        <Link className="contract-back" href={`/artista/${artist.slug}`}>
          <span aria-hidden="true">←</span>
          Voltar ao perfil de {artist.name}
        </Link>
      </div>

      <div className="contract-layout">
        <form ref={formRef} className="contract-form" onSubmit={reviewProposal}>
          {restored ? (
            <p className="contract-form__notice" role="status">
              Recuperamos o que você tinha preenchido. Confira e envie.
            </p>
          ) : !user && (
            <p className="contract-form__notice">
              Pode preencher sem conta: ao enviar, pedimos que você{' '}
              <Link href={loginPath}>entre ou se cadastre</Link> e guardamos o que você digitou.
            </p>
          )}

          <fieldset>
            <legend><span>01</span> Sobre o evento</legend>
            <div className="contract-form__grid">
              <label>
                Tipo de evento
                <select name="eventType" required defaultValue="">
                  <option value="" disabled>Selecione</option>
                  <option>Casamento</option>
                  <option>Aniversário</option>
                  <option>Evento corporativo</option>
                  <option>Bar ou restaurante</option>
                  <option>Outro</option>
                </select>
              </label>
              <label>
                Número de convidados
                <input name="guestCount" type="number" min="1" placeholder="Ex.: 120" required />
              </label>
              <label>
                Data
                <input name="date" type="date" min={minDate} required />
              </label>
              <label>
                Horário
                <input name="time" type="time" required />
              </label>
              {/*
                Contas antigas de contratante nao tem WhatsApp: sem ele o artista
                nao consegue responder depois do aceite. Pedido uma vez so.
              */}
              {user && !user.hasPhone && (
                <label className="contract-form__full">
                  Seu WhatsApp
                  <input
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
                  <small>O artista recebe seu contato quando aceitar a proposta.</small>
                </label>
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend><span>02</span> Local e duração</legend>
            <div className="contract-form__grid">
              <label className="contract-form__full">
                Endereço ou nome do local
                <input
                  name="location"
                  type="text"
                  placeholder="Ex.: Salão de Eventos, Ivoti"
                  required
                />
              </label>
              {/*
                O servico vai pelo id, e nao pela duracao: dois servicos podem ter
                a mesma duracao com precos diferentes, e a revisao precisa mostrar
                exatamente o valor que o servidor vai gravar.
              */}
              {artist.services.length > 0 && (
                <label>
                  Formato
                  <select name="serviceId" defaultValue={artist.services[0].id}>
                    {artist.services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {[service.title, formatMinutes(service.durationMinutes)].filter(Boolean).join(' · ')}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Estrutura de som
                <select name="soundStructure" defaultValue="nao-sei">
                  <option value="nao-sei">Ainda não sei</option>
                  <option value="local">O local possui</option>
                  <option value="artista">Preciso que o artista leve</option>
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend><span>03</span> Alguma observação?</legend>
            <label>
              Mensagem para o artista
              <textarea
                name="message"
                rows="5"
                placeholder="Clima do evento, músicas importantes, observações..."
              />
            </label>
          </fieldset>

          {error && <p className="contract-form__error" role="alert">{error}</p>}

          <button ref={reviewTriggerRef} className="contract-form__submit" type="submit">
            Revisar proposta para {artist.name} <span>→</span>
          </button>
          <small>Você poderá revisar os dados antes do envio. Nenhuma cobrança será feita.</small>
        </form>

        <aside className="contract-summary">
          <div className="contract-summary__artist" style={{ '--artist-color': artist.color }}>
            {artist.coverUrl
              ? <img src={artist.coverUrl} alt="" />
              : <span>{artist.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>}
          </div>
          <p>{artist.category}</p>
          <h2>{artist.name}</h2>
          <div className="contract-summary__rating">
            {hasRating(artist)
              ? `★ ${formatRating(artist)} · ${formatReviewCount(artist)}`
              : NO_RATING_LABEL}
          </div>
          <dl>
            <div><dt>{priceLabel(artist)}</dt><dd>{formatPrice(artist)}</dd></div>
            <div><dt>Região</dt><dd>{artist.location}</dd></div>
          </dl>
          <small>O valor final pode variar conforme duração, deslocamento e estrutura.</small>
        </aside>
      </div>

      <AnimatePresence>
        {reviewData && (
          <ProposalReviewModal
            artist={artist}
            key="proposal-review"
            proposal={reviewData}
            onClose={closeReview}
            onConfirm={confirmProposal}
            isSending={isSending}
            returnFocusRef={reviewTriggerRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Contract;
