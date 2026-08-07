import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './ClientBookings.css';

const bookings = [
  { artist: 'DJ Kauan', initials: 'DK', event: 'Aniversário de 30 anos', date: '02 AGO 2026', status: 'Confirmada', color: '#FFD600' },
  { artist: 'Marina Santos', initials: 'MS', event: 'Recepção de casamento', date: '18 OUT 2026', status: 'Aguardando resposta', color: '#FF3CAC' },
  { artist: 'Banda Nativus', initials: 'BN', event: 'Confraternização da empresa', date: '05 DEZ 2026', status: 'Proposta recebida', color: '#FF6B35' },
];

function ClientBookings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const clientName = user?.role === 'contractor' ? user.name : 'Bernardo';
  const initials = clientName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="bookings-page">
      <header className="bookings-header">
        <BrandLogo />
        <nav><Link to="/explorar">Explorar artistas</Link><Link to="/">Início</Link></nav>
        <div className="bookings-header__user">
          <span>{initials}</span>
          <strong>{clientName}</strong>
          <button type="button" onClick={handleLogout}>Sair</button>
        </div>
      </header>
      <main className="bookings-main page-container">
        <div className="bookings-heading">
          <div><p className="eyebrow">Área do contratante</p><h1>Minhas reservas</h1></div>
          <Link to="/explorar">Encontrar outro artista <span>↗</span></Link>
        </div>
        <div className="bookings-tabs">
          <button className="active" type="button">Em andamento <span>3</span></button>
          <button type="button">Concluídas</button>
          <button type="button">Canceladas</button>
        </div>
        <section className="bookings-list">
          {bookings.map((booking) => (
            <article key={booking.artist}>
              <div className="bookings-list__avatar" style={{ '--booking-color': booking.color }}>{booking.initials}</div>
              <div className="bookings-list__artist"><span>{booking.event}</span><h2>{booking.artist}</h2></div>
              <div><span>Data</span><strong>{booking.date}</strong></div>
              <div><span>Status</span><strong className="bookings-list__status">{booking.status}</strong></div>
              <button type="button">Ver detalhes →</button>
            </article>
          ))}
        </section>
        <section className="bookings-help">
          <div><span>?</span><div><strong>Precisa de ajuda?</strong><p>Nossa equipe acompanha você antes, durante e depois do evento.</p></div></div>
          <button type="button">Falar com a Feztival</button>
        </section>
      </main>
    </div>
  );
}

export default ClientBookings;
