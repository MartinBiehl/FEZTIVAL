'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import { BookingReviewForm, BookingStatusActions } from '../../components/BookingActions/BookingActions.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  STATUS_LABEL, formatEventTime, formatMoney, formatShortDate, initials,
} from '../../lib/bookingDisplay.js';
import { formatMinutes } from '../../lib/artistDisplay.js';
import { whatsappUrl } from '../../lib/phone.js';
import './ClientBookings.css';

const TABS = [
  { id: 'active', label: 'Em andamento', statuses: ['pending', 'accepted', 'confirmed'] },
  { id: 'completed', label: 'Concluídas', statuses: ['completed'] },
  { id: 'cancelled', label: 'Canceladas', statuses: ['declined', 'cancelled'] },
];

const CONTACT_STATUSES = ['accepted', 'confirmed'];

/* Caminho feliz de uma reserva; recusada e cancelada saem dele. */
const PROGRESS_STEPS = [
  { status: 'pending', label: 'Enviada' },
  { status: 'accepted', label: 'Aceita' },
  { status: 'confirmed', label: 'Confirmada' },
  { status: 'completed', label: 'Realizada' },
];

/* O que acontece agora, do ponto de vista de quem contratou. */
function nextStep(booking) {
  switch (booking.status) {
    case 'pending':
      return 'Aguardando o artista responder. O contato dele aparece aqui quando ele aceitar.';
    case 'accepted':
      return 'O artista aceitou. Combine os detalhes pelo WhatsApp; ele confirma o show em seguida.';
    case 'confirmed':
      return 'Show confirmado. Depois do evento, o artista marca como realizado e você pode avaliar.';
    case 'completed':
      return booking.reviewed ? 'Show realizado. Obrigado pela avaliação!' : 'Show realizado. Conte como foi avaliando o artista.';
    case 'declined':
      return 'O artista não pôde atender este pedido.';
    default:
      return 'Reserva cancelada.';
  }
}

const SOUND_LABEL = {
  unknown: 'Ainda não definida',
  venue: 'O local possui',
  artist: 'O artista leva',
};

function BookingProgress({ booking }) {
  const current = PROGRESS_STEPS.findIndex((step) => step.status === booking.status);

  return (
    <div className="bookings-list__progress">
      {current >= 0 && (
        <ol aria-label="Andamento da reserva">
          {PROGRESS_STEPS.map((step, index) => (
            <li
              key={step.status}
              className={index < current ? 'is-done' : index === current ? 'is-current' : undefined}
              aria-current={index === current ? 'step' : undefined}
            >
              {step.label}
            </li>
          ))}
        </ol>
      )}
      <p>{nextStep(booking)}</p>
    </div>
  );
}

function BookingDetails({ booking }) {
  const rows = [
    ['Convidados', booking.guestCount ? booking.guestCount.toLocaleString('pt-BR') : null],
    ['Duração', formatMinutes(booking.durationMinutes) ?? 'A combinar'],
    ['Estrutura de som', SOUND_LABEL[booking.soundStructure] ?? null],
    ['Valor', formatMoney(booking.agreedPrice)],
  ].filter(([, value]) => value);

  return (
    <details className="bookings-list__details">
      <summary>Ver detalhes do pedido</summary>
      <dl>
        {rows.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
        {booking.message && (
          <div className="bookings-list__message"><dt>Sua mensagem</dt><dd>{booking.message}</dd></div>
        )}
      </dl>
    </details>
  );
}

const EMPTY_MESSAGE = {
  active: 'Nenhum pedido em andamento.',
  completed: 'Nenhuma reserva concluída ainda.',
  cancelled: 'Nenhuma reserva cancelada ou recusada.',
};

function ClientBookings({ clientName, bookings }) {
  const router = useRouter();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('active');
  const name = clientName || 'Contratante';
  const tab = TABS.find((item) => item.id === activeTab);
  const visible = bookings.filter((booking) => tab.statuses.includes(booking.status));

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <div className="bookings-page">
      <header className="bookings-header">
        <BrandLogo />
        <nav><Link href="/explorar">Explorar artistas</Link><Link href="/">Início</Link></nav>
        <div className="bookings-header__user">
          <span>{initials(name)}</span>
          <strong>{name}</strong>
          <button type="button" onClick={handleLogout}>Sair</button>
        </div>
      </header>
      <main className="bookings-main page-container">
        <div className="bookings-heading">
          <div><p className="eyebrow">Área do contratante</p><h1>Minhas reservas</h1></div>
          <Link href="/explorar">Encontrar outro artista <span>↗</span></Link>
        </div>
        <div className="bookings-tabs" role="tablist" aria-label="Filtrar reservas">
          {TABS.map((item) => {
            const count = bookings.filter((booking) => item.statuses.includes(booking.status)).length;
            return (
              <button
                key={item.id}
                className={item.id === activeTab ? 'active' : undefined}
                type="button"
                role="tab"
                aria-selected={item.id === activeTab}
                onClick={() => setActiveTab(item.id)}
              >
                {item.label} {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
        </div>
        <section className="bookings-list" role="tabpanel" aria-label={tab.label}>
          {visible.length === 0 && (
            <div className="bookings-list__empty">
              <p>{EMPTY_MESSAGE[activeTab]}</p>
              <Link href="/explorar">Explorar artistas <span aria-hidden="true">→</span></Link>
            </div>
          )}
          {visible.map((booking) => (
            <article key={booking.id}>
              <div className="bookings-list__avatar" style={{ '--booking-color': booking.artistColor ?? 'var(--yellow)' }}>
                {booking.artistCoverUrl ? <img src={booking.artistCoverUrl} alt="" /> : initials(booking.artistName)}
              </div>
              <div className="bookings-list__artist">
                <span>{[booking.eventType, booking.location].filter(Boolean).join(' · ')}</span>
                <h2>{booking.artistName}</h2>
              </div>
              <div>
                <span>Data</span>
                <strong>{[formatShortDate(booking.eventDate), formatEventTime(booking.eventTime)].filter(Boolean).join(' · ')}</strong>
              </div>
              <div>
                <span>Status · {formatMoney(booking.agreedPrice)}</span>
                <strong className="bookings-list__status">{STATUS_LABEL.client[booking.status]}</strong>
              </div>
              {booking.artistSlug
                ? <Link className="bookings-list__link" href={`/artista/${booking.artistSlug}`}>Ver artista →</Link>
                : <span />}
              <BookingProgress booking={booking} />
              <div className="bookings-list__actions">
                <BookingDetails booking={booking} />
                {/* Mesmo criterio do painel do artista: o contato abre depois do aceite. */}
                {CONTACT_STATUSES.includes(booking.status) && booking.artistPhone && (
                  <a
                    className="bookings-list__contact"
                    href={whatsappUrl(booking.artistPhone)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Falar com {booking.artistName} no WhatsApp ↗
                  </a>
                )}
                <BookingStatusActions booking={booking} side="client" contextLabel={`Pedido para ${booking.artistName}`} />
                {booking.status === 'completed' && !booking.reviewed && <BookingReviewForm booking={booking} />}
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default ClientBookings;
