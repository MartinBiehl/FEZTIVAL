'use client';

import { useActionState, useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useActionSubmit from '../../hooks/useActionSubmit.js';
import { answerQuestion } from '../../lib/questionActions.js';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import { BookingStatusActions } from '../../components/BookingActions/BookingActions.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { whatsappUrl } from '../../lib/phone.js';
import {
  STATUS_LABEL, dateParts, formatCompactMoney, formatEventTimeRange, formatMoney, initials,
} from '../../lib/bookingDisplay.js';
import './ArtistDashboard.css';

/* Classe de cor do status; "Nova" usa o amarelo padrao de .dashboard-status. */
const STATUS_CLASS = {
  accepted: 'dashboard-status--em-conversa',
  confirmed: 'dashboard-status--confirmada',
};

const SOUND_LABEL = {
  venue: 'som do local',
  artist: 'artista leva o som',
};

function proposalSummary(proposal) {
  return [
    proposal.eventType,
    formatEventTimeRange(proposal.eventTime, proposal.durationMinutes),
    proposal.location,
    proposal.guestCount ? `${proposal.guestCount} convidados` : null,
    SOUND_LABEL[proposal.soundStructure],
  ].filter(Boolean).join(' · ');
}

/* Resposta a uma pergunta do perfil. Ao responder, o painel recarrega sem ela. */
function AnswerForm({ question }) {
  const [state, formAction, isPending] = useActionState(answerQuestion, null);
  const submit = useActionSubmit(formAction);
  const answerId = useId();

  return (
    <form className="booking-actions" onSubmit={submit} aria-label="Responder pergunta">
      <input type="hidden" name="questionId" value={question.id} />
      <label className="booking-actions__comment" htmlFor={answerId}>
        <span>Sua resposta (pública no perfil)</span>
        <textarea id={answerId} name="body" rows="2" required minLength={2} maxLength={2000} />
      </label>
      <div className="booking-actions__buttons">
        <button className="booking-actions__primary" type="submit" disabled={isPending}>
          {isPending ? 'Enviando…' : 'Responder'}
        </button>
      </div>
      {state?.error && <p className="booking-actions__error" role="alert">{state.error}</p>}
    </form>
  );
}

function ArtistDashboard({
  artist, proposals, nextShows, openQuestions, answeredQuestions = [], metrics, todayLabel, greetingText,
}) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <BrandLogo />
        <nav>
          <Link href="/painel/perfil"><span>○</span> Meu perfil</Link>
        </nav>
        <div className="dashboard-sidebar__user">
          <span>{initials(artist.name)}</span>
          <div><strong>{artist.name}</strong><small>{artist.isPublished ? 'Perfil publicado' : 'Perfil em rascunho'}</small></div>
        </div>
      </aside>

      <main className="dashboard-main" id="visao">
        <header className="dashboard-header">
          <div>
            <p>{todayLabel}</p>
            <h1>{greetingText}, {artist.name}.</h1>
          </div>
          <div className="dashboard-header__actions">
            <Link href="/painel/perfil">Editar perfil</Link>
            {artist.isPublished && <Link href={`/artista/${artist.slug}`}>Ver perfil público ↗</Link>}
            <button type="button" onClick={handleLogout}>Sair</button>
          </div>
        </header>

        {!artist.isPublished && (
          <section className="dashboard-profile-alert">
            <div>
              <span>!</span>
              <div>
                <strong>Seu perfil ainda é um rascunho</strong>
                <p>Complete as informações e publique para aparecer no catálogo e receber propostas.</p>
              </div>
            </div>
            <Link className="dashboard-profile-alert__action" href="/painel/perfil">Completar perfil</Link>
          </section>
        )}

        <section className="dashboard-metrics">
          <article><span>Visualizações</span><strong>{artist.viewCount.toLocaleString('pt-BR')}</strong><small>{artist.isPublished ? 'Desde a publicação' : 'Publique o perfil para começar a contar'}</small></article>
          <article><span>Novas propostas</span><strong>{metrics.pending}</strong><small>Aguardando sua resposta</small></article>
          <article><span>Shows confirmados</span><strong>{String(metrics.confirmedNext30).padStart(2, '0')}</strong><small>Próximos 30 dias</small></article>
          <article><span>Receita prevista</span><strong>{formatCompactMoney(metrics.payoutThisMonth)}</strong><small>Repasse deste mês</small></article>
        </section>

        <section className="dashboard-panel" id="propostas">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">Oportunidades</p><h2>Propostas em aberto</h2></div>
          </div>
          <div className="dashboard-proposals">
            {proposals.length === 0 && <p className="dashboard-empty">Nenhuma proposta em aberto no momento.</p>}
            {proposals.map((proposal) => {
              const { day, month } = dateParts(proposal.eventDate);
              return (
                <article key={proposal.id}>
                  <time dateTime={proposal.eventDate}><b>{day}</b><span>{month}</span></time>
                  <div className="dashboard-proposals__main">
                    <strong>{proposal.clientName}</strong>
                    <span>{proposalSummary(proposal)}</span>
                    {proposal.message && <p className="dashboard-proposals__message">“{proposal.message}”</p>}
                    {proposal.status !== 'pending' && (proposal.clientPhone ? (
                      <a className="dashboard-proposals__contact" href={whatsappUrl(proposal.clientPhone)} target="_blank" rel="noreferrer">
                        WhatsApp do contratante ↗
                      </a>
                    ) : (
                      <small className="dashboard-proposals__hint">Contratante sem WhatsApp cadastrado.</small>
                    ))}
                    {/* Show que ja passou: sem este aviso a reserva fica parada e o contratante nao pode avaliar. */}
                    {proposal.isPast && (
                      <small className="dashboard-proposals__hint dashboard-proposals__hint--due">
                        {proposal.status === 'confirmed'
                          ? 'O show já aconteceu? Marque como realizado para liberar a avaliação.'
                          : 'A data já passou. Confirme se o show aconteceu ou cancele a reserva.'}
                      </small>
                    )}
                  </div>
                  <b>{formatMoney(proposal.agreedPrice)}</b>
                  <span className={`dashboard-status ${STATUS_CLASS[proposal.status] ?? ''}`}>
                    {STATUS_LABEL.artist[proposal.status]}
                  </span>
                  <div className="dashboard-proposals__actions">
                    <BookingStatusActions
                      booking={proposal}
                      side="artist"
                      contextLabel={`Proposta de ${proposal.clientName}`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="dashboard-panel" id="perguntas">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">Perfil público</p><h2>Perguntas sem resposta</h2></div>
          </div>
          {openQuestions.length === 0 && <p className="dashboard-empty">Nenhuma pergunta aguardando resposta.</p>}
          <div className="dashboard-questions">
            {openQuestions.map((question) => (
              <article key={question.id}>
                <p>“{question.body}”</p>
                <AnswerForm question={question} />
              </article>
            ))}
          </div>
          {answeredQuestions.length > 0 && (
            <details className="dashboard-answered">
              <summary>Perguntas respondidas ({answeredQuestions.length})</summary>
              <ul>
                {answeredQuestions.map((question) => (
                  <li key={question.id}>
                    <p>“{question.body}”</p>
                    <p><strong>Sua resposta:</strong> {question.answer}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <div className="dashboard-bottom-grid">
          <section className="dashboard-panel" id="agenda">
            <div className="dashboard-panel__heading">
              <div><p className="eyebrow">Agenda</p><h2>Próximos shows</h2></div>
            </div>
            {nextShows.length === 0 && <p className="dashboard-empty">Nenhum show confirmado ainda.</p>}
            {nextShows.map((show) => {
              const { day, month } = dateParts(show.eventDate);
              return (
                <div className="dashboard-next-show" key={show.id}>
                  <span>{day}<small>{month}</small></span>
                  <div>
                    <strong>{show.eventType ?? 'Show'}</strong>
                    <p>{[formatEventTimeRange(show.eventTime, show.durationMinutes), show.location].filter(Boolean).join(' · ')}</p>
                  </div>
                  <b>Confirmado</b>
                </div>
              );
            })}
          </section>
          <section className="dashboard-tip">
            <span>♫</span>
            <h3>Dica Feztival</h3>
            <p>Responda rápido: quem organiza um evento costuma pedir proposta a mais de um artista.</p>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ArtistDashboard;
