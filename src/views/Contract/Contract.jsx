'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, CircleAlert } from 'lucide-react';
import ProposalReviewModal from '../../components/ProposalReviewModal/ProposalReviewModal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  NO_RATING_LABEL, formatMoney, formatRating, formatReviewCount, hasRating,
} from '../../lib/artistDisplay.js';
import { createBooking } from '../../lib/bookingActions.js';
import {
  estimatePrice, eventEnd, formatEventTime, formatEventTimeRange, joinEventLocation, nowTimeIso,
  parseFormDate, startsAfterMidnight, todayIso,
} from '../../lib/bookingDisplay.js';
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

/* Os valores precisam bater com EVENT_TYPES de bookingActions.js. */
const EVENT_TYPES = ['Casamento', 'Aniversário', 'Evento corporativo', 'Bar ou restaurante', 'Outro'];

/* Os valores precisam bater com SOUND_STRUCTURE de bookingActions.js. */
const SOUND_OPTIONS = [
  { value: 'local', title: 'O local já tem som', detail: 'Caixas e mesa ficam por conta do espaço.' },
  { value: 'artista', title: 'O artista leva o som', detail: 'Pode alterar o valor final.' },
  { value: 'nao-sei', title: 'Ainda não sei', detail: 'Vocês combinam depois.' },
];

/*
 * Mensagem de cada campo obrigatorio, por motivo de falha (ValidityState).
 * O formulario usa noValidate: o erro aparece embaixo do proprio campo, e nao
 * no balao do navegador, que some sozinho e nao fala de data passada.
 */
const FIELD_MESSAGES = {
  eventType: { valueMissing: 'Escolha o tipo de evento.' },
  date: {
    valueMissing: 'Escolha a data do evento.',
    badInput: 'Essa data não existe.',
    rangeUnderflow: 'Essa data já passou. Escolha hoje ou uma data futura.',
  },
  time: {
    valueMissing: 'Informe o horário de início.',
    badInput: 'Esse horário não existe.',
    past: 'Esse horário já passou. Escolha um horário mais tarde.',
  },
  guestCount: {
    valueMissing: 'Informe quantos convidados.',
    badInput: 'Use só números.',
    rangeUnderflow: 'Precisa ter pelo menos 1 convidado.',
    rangeOverflow: 'O máximo é 100.000 convidados.',
    stepMismatch: 'Use um número inteiro.',
  },
  phone: {
    valueMissing: 'Informe seu WhatsApp com DDD.',
    tooShort: 'Informe o DDD e o número completo.',
  },
  address: {
    valueMissing: 'Informe a rua e o número.',
    tooShort: 'Informe a rua e o número.',
  },
  city: {
    valueMissing: 'Informe a cidade do evento.',
    tooShort: 'Informe o nome completo da cidade.',
  },
};

const VALIDITY_KEYS = ['valueMissing', 'badInput', 'rangeUnderflow', 'rangeOverflow', 'stepMismatch', 'tooShort'];

/* Erro atual de um campo, ou null. Os campos ausentes (ex.: phone) passam. */
function validateField(form, name) {
  const messages = FIELD_MESSAGES[name];
  const field = form.elements.namedItem(name);
  if (!messages || !field) return null;

  // Grupo de radios: vale o valor marcado.
  if (!('validity' in field)) return field.value ? null : messages.valueMissing;
  if (field.required && !field.value.trim() && !field.validity.badInput) return messages.valueMissing;

  /*
   * Data e horario no fuso do produto, nao do navegador. O min do campo de
   * data tambem barra, mas so depois de montar: aqui a regra nao depende dele.
   */
  const today = todayIso();
  if (name === 'date' && field.value && !parseFormDate(field.value)) return messages.badInput;
  if (name === 'date' && field.value && field.value < today) return messages.rangeUnderflow;
  if (name === 'time' && field.value && form.elements.namedItem('date').value === today
    && field.value <= nowTimeIso()) {
    return messages.past;
  }

  const failed = VALIDITY_KEYS.find((key) => field.validity[key]);
  return failed ? (messages[failed] ?? messages.valueMissing) : null;
}

/* Data e horario dependem um do outro: mexer em um revalida os dois. */
const LINKED_FIELDS = { date: ['date', 'time'], time: ['date', 'time'] };

function FieldError({ name, message }) {
  if (!message) return null;
  return (
    <small className="contract-field__error" id={`${name}-error`}>
      <CircleAlert size={15} strokeWidth={2.25} aria-hidden="true" />
      {message}
    </small>
  );
}

/*
 * Dica abaixo do horario para show que atravessa a meia-noite. Comecar de
 * madrugada costuma vir com a data errada (a noite de sabado, 0h30, e domingo).
 */
function TimeHint({ time, duration }) {
  if (startsAfterMidnight(time)) {
    return <small>Começa de madrugada: escolha a data do dia depois da meia-noite.</small>;
  }
  const end = eventEnd(time, duration);
  if (!end?.nextDay) return null;
  return <small>Termina às {formatEventTime(end.time)} do dia seguinte.</small>;
}

/* Props de acessibilidade de um campo com erro. */
function errorProps(name, message) {
  return message
    ? { 'aria-invalid': true, 'aria-describedby': `${name}-error` }
    : {};
}

function formatMinutes(minutes) {
  if (minutes < 60) return `${minutes} min`;
  return `${(minutes / 60).toLocaleString('pt-BR')}h`;
}

function formatEventDate(value) {
  const date = parseFormDate(value);
  if (!date) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: 'numeric', month: 'short',
  }).format(date);
}

function initials(name) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2);
}

/* Ingresso que se preenche enquanto o formulario e digitado. */
function ProposalTicket({ artist, draft }) {
  const estimate = estimatePrice(artist, draft.duration);
  const rows = [
    ['Evento', draft.eventType],
    ['Data', formatEventDate(draft.date)],
    ['Horário', formatEventTimeRange(draft.time, draft.duration)],
    ['Local', joinEventLocation(draft)],
    ['Duração', draft.duration ? formatMinutes(Number(draft.duration)) : null],
    ['Convidados', draft.guestCount],
  ];

  return (
    <aside className="proposal-ticket" style={{ '--artist-color': artist.color || 'var(--yellow)' }} aria-label="Resumo da proposta">
      <div className="proposal-ticket__head">
        <div className="proposal-ticket__media" aria-hidden="true">
          {artist.coverUrl ? <img src={artist.coverUrl} alt="" /> : <span>{initials(artist.name)}</span>}
        </div>
        <div>
          <p>{artist.category}{artist.location ? ` em ${artist.location}` : ''}</p>
          <h2>{artist.name}</h2>
          <small>
            {hasRating(artist) ? `★ ${formatRating(artist)} (${formatReviewCount(artist)})` : NO_RATING_LABEL}
          </small>
        </div>
      </div>

      <dl className="proposal-ticket__rows">
        {rows.map(([label, value]) => (
          <div key={label} className={value ? 'is-filled' : undefined}>
            <dt>{label}</dt>
            <dd>{value || 'A preencher'}</dd>
          </div>
        ))}
      </dl>

      <div className="proposal-ticket__price">
        <span>Valor estimado</span>
        <strong>{formatMoney(estimate)}</strong>
        <small>O artista confirma o valor final ao aceitar.</small>
      </div>
    </aside>
  );
}

function Contract({ artist }) {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [sent, setSent] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const [draft, setDraft] = useState({ duration: artist.setMinutes[0] ?? '', soundStructure: 'nao-sei' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
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
    const saved = readDraft(artist.slug);
    const form = formRef.current;
    if (!saved || !form) return;
    Object.entries(saved).forEach(([name, value]) => {
      if (name === 'phone') {
        setPhone(formatPhone(String(value)));
        return;
      }
      // Radios (tipo, duracao, som) chegam como RadioNodeList, que tambem aceita value.
      const field = form.elements.namedItem(name);
      if (field && 'value' in field) field.value = value;
    });
    setDraft(Object.fromEntries(new FormData(form).entries()));
    setRestored(true);
  }, [artist.slug]);
  const loginPath = `/entrar?next=${encodeURIComponent(`/reservar/${artist.slug}`)}`;

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

  function revalidate(form, names) {
    setFieldErrors((current) => {
      const next = { ...current };
      names.forEach((name) => {
        next[name] = validateField(form, name);
      });
      return next;
    });
  }

  /*
   * Enquanto digita, so limpa erro ja mostrado; data e horario avisam na hora,
   * porque o seletor entrega o valor pronto.
   */
  function updateDraft(event) {
    const form = event.currentTarget;
    setDraft(Object.fromEntries(new FormData(form).entries()));
    const { name } = event.target;
    if (LINKED_FIELDS[name]) {
      // O vizinho (data <-> horario) so e revalidado se ja foi preenchido ou acusado.
      const partners = LINKED_FIELDS[name].filter((linked) => linked !== name
        && (form.elements.namedItem(linked).value || fieldErrors[linked]));
      revalidate(form, [name, ...partners]);
    } else if (fieldErrors[name]) {
      revalidate(form, [name]);
    }
  }

  // Ao sair de um campo preenchido, ele ja diz o que falta.
  function checkField(event) {
    const { name, value } = event.target;
    if (!FIELD_MESSAGES[name] || (!value && !fieldErrors[name])) return;
    revalidate(event.currentTarget, [name]);
  }

  function reviewProposal(event) {
    event.preventDefault();
    setError('');
    const form = event.currentTarget;
    const errors = Object.fromEntries(Object.keys(FIELD_MESSAGES).map((name) => [name, validateField(form, name)]));
    setFieldErrors(errors);

    const firstInvalid = Object.keys(FIELD_MESSAGES).find((name) => errors[name]);
    if (firstInvalid) {
      const field = form.elements.namedItem(firstInvalid);
      // Grupo de radios nao recebe foco: vai para a primeira opcao.
      (field.focus ? field : field[0])?.focus();
      return;
    }
    setReviewData(Object.fromEntries(new FormData(form).entries()));
  }

  if (sent) {
    return (
      <section className="contract-success page-container">
        <span aria-hidden="true"><Check size={28} strokeWidth={2.5} /></span>
        <h1>Proposta enviada para {artist.name}.</h1>
        <p>
          O artista vê os detalhes do evento e responde com o valor final. Você acompanha tudo
          em Minhas reservas.
        </p>
        <div>
          <Link href="/minhas-reservas">Acompanhar proposta</Link>
          <Link href="/explorar">Continuar explorando</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="contract-page page-container">
      <Link className="contract-back" href={`/artista/${artist.slug}`}>
        <ArrowLeft size={16} aria-hidden="true" />
        Perfil de {artist.name}
      </Link>

      <header className="contract-heading">
        <h1>Pedir proposta</h1>
        <p>
          Conte como vai ser o evento. {artist.name} recebe o pedido e responde com o valor
          final. Enviar não gera cobrança.
        </p>
      </header>

      {restored ? (
        <div className="contract-notice" role="status">
          <p>Recuperamos o que você tinha preenchido. Confira e envie.</p>
        </div>
      ) : !user && (
        <div className="contract-notice">
          <p>Pode preencher sem conta: ao enviar, pedimos que você entre ou se cadastre e guardamos o que você digitou.</p>
          <Link href={loginPath}>Entrar ou criar conta</Link>
        </div>
      )}

      <div className="contract-layout">
        <form
          ref={formRef}
          className="contract-form"
          noValidate
          onSubmit={reviewProposal}
          onChange={updateDraft}
          onBlur={checkField}
        >
          <fieldset className="contract-step">
            <legend><span aria-hidden="true">1</span>Sobre o evento</legend>

            <fieldset
              className={`contract-field${fieldErrors.eventType ? ' has-error' : ''}`}
              aria-describedby={fieldErrors.eventType ? 'eventType-error' : undefined}
            >
              <legend>Tipo de evento</legend>
              <div className="contract-chips">
                {EVENT_TYPES.map((type, index) => (
                  <label key={type}>
                    <input type="radio" name="eventType" value={type} required={index === 0} />
                    <span>{type}</span>
                  </label>
                ))}
              </div>
              <FieldError name="eventType" message={fieldErrors.eventType} />
            </fieldset>

            <div className="contract-grid">
              <label className="contract-field">
                <span>Data</span>
                <input name="date" type="date" min={minDate} max="9999-12-31" required {...errorProps('date', fieldErrors.date)} />
                <FieldError name="date" message={fieldErrors.date} />
              </label>
              <label className="contract-field">
                <span>Horário de início</span>
                <input name="time" type="time" required {...errorProps('time', fieldErrors.time)} />
                {fieldErrors.time
                  ? <FieldError name="time" message={fieldErrors.time} />
                  : <TimeHint time={draft.time} duration={draft.duration} />}
              </label>
              <label className="contract-field">
                <span>Convidados</span>
                <input
                  name="guestCount"
                  type="number"
                  min="1"
                  max="100000"
                  step="1"
                  inputMode="numeric"
                  placeholder="Ex.: 120"
                  required
                  {...errorProps('guestCount', fieldErrors.guestCount)}
                />
                <FieldError name="guestCount" message={fieldErrors.guestCount} />
              </label>
            </div>

            {/*
              Contas antigas de contratante nao tem WhatsApp: sem ele o artista
              nao consegue responder depois do aceite. Pedido uma vez so.
            */}
            {user && !user.hasPhone && (
              <label className="contract-field">
                <span>Seu WhatsApp</span>
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
                  {...errorProps('phone', fieldErrors.phone)}
                />
                {fieldErrors.phone
                  ? <FieldError name="phone" message={fieldErrors.phone} />
                  : <small>O artista recebe seu contato quando aceitar a proposta.</small>}
              </label>
            )}
          </fieldset>

          <fieldset className="contract-step">
            <legend><span aria-hidden="true">2</span>Local e apresentação</legend>

            <fieldset className="contract-field contract-address">
              {/* O titulo da etapa ja diz o assunto; a legenda fica para leitor de tela. */}
              <legend className="sr-only">Local do evento</legend>
              <div className="contract-address__grid">
                <label className="contract-field">
                  <span>Endereço</span>
                  <input
                    name="address"
                    type="text"
                    autoComplete="address-line1"
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="Rua, número e bairro"
                    {...errorProps('address', fieldErrors.address)}
                  />
                  <FieldError name="address" message={fieldErrors.address} />
                </label>
                <label className="contract-field">
                  <span>Cidade</span>
                  <input
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    required
                    minLength={2}
                    maxLength={60}
                    placeholder="Ex.: Ivoti"
                    {...errorProps('city', fieldErrors.city)}
                  />
                  <FieldError name="city" message={fieldErrors.city} />
                </label>
              </div>
              <label className="contract-field">
                <span>Nome do local <em>opcional</em></span>
                <input
                  name="venueName"
                  type="text"
                  autoComplete="organization"
                  maxLength={80}
                  placeholder="Ex.: Salão Aurora, Sítio da família"
                />
              </label>
            </fieldset>

            {artist.setMinutes.length > 0 && (
              <fieldset className="contract-field">
                <legend>Duração da apresentação</legend>
                <div className="contract-chips">
                  {artist.setMinutes.map((minutes, index) => {
                    const price = estimatePrice(artist, minutes);
                    return (
                      <label key={minutes}>
                        <input type="radio" name="duration" value={minutes} defaultChecked={index === 0} />
                        <span>
                          {formatMinutes(minutes)}
                          {price != null && <small>{formatMoney(price)}</small>}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <fieldset className="contract-field">
              <legend>Equipamento de som</legend>
              <div className="contract-options">
                {SOUND_OPTIONS.map((option) => (
                  <label key={option.value}>
                    <input type="radio" name="soundStructure" value={option.value} defaultChecked={option.value === 'nao-sei'} />
                    <span>
                      <strong>{option.title}</strong>
                      <small>{option.detail}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          <fieldset className="contract-step">
            <legend><span aria-hidden="true">3</span>Recado para o artista</legend>
            <label className="contract-field">
              <span>Mensagem <em>opcional</em></span>
              <textarea
                name="message"
                rows="5"
                maxLength={2000}
                placeholder="Clima do evento, músicas que não podem faltar, horário de chegada…"
              />
            </label>
          </fieldset>

          <div className="contract-submit">
            {error && <p className="contract-submit__error" role="alert">{error}</p>}
            {Object.values(fieldErrors).some(Boolean) && (
              <p className="contract-submit__error" role="alert">Corrija os campos marcados em vermelho.</p>
            )}
            <button ref={reviewTriggerRef} type="submit">Revisar proposta</button>
            <small>Você confere tudo antes de enviar.</small>
          </div>
        </form>

        <ProposalTicket artist={artist} draft={draft} />
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
