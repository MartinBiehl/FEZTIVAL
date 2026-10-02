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
import './ClientBookings.css';

const TABS = [
  { id: 'active', label: 'Em andamento', statuses: ['pending', 'accepted', 'confirmed'] },
  { id: 'completed', label: 'Concluídas', statuses: ['completed'] },
  { id: 'cancelled', label: 'Canceladas', statuses: ['declined', 'cancelled'] },
];

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
          {visible.length === 0 && <p className="bookings-list__empty">{EMPTY_MESSAGE[activeTab]}</p>}
          {visible.map((booking) => (
            <article key={booking.id}>
              <div className="bookings-list__avatar" style={{ '--booking-color': booking.artistColor ?? 'var(--yellow)' }}>
                {initials(booking.artistName)}
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
              <div className="bookings-list__actions">
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
