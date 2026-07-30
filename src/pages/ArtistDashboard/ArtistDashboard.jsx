import { Link } from 'react-router-dom';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import './ArtistDashboard.css';

const proposals = [
  { client: 'Mariana e Felipe', event: 'Casamento', date: '18 OUT', location: 'Dois Irmãos', value: 'R$ 2.800', status: 'Nova' },
  { client: 'Studio Aurora', event: 'Evento corporativo', date: '24 OUT', location: 'Estância Velha', value: 'R$ 2.200', status: 'Em conversa' },
  { client: 'João Pedro', event: 'Aniversário', date: '02 NOV', location: 'Jardim Panorâmico, Ivoti', value: 'R$ 1.800', status: 'Confirmada' },
];

function ArtistDashboard() {
  return (
    <div className="dashboard">
      <aside className="dashboard-sidebar">
        <BrandLogo />
        <nav>
          <a className="active" href="#visao"><span>⌂</span> Visão geral</a>
          <a href="#propostas"><span>◇</span> Propostas <b>2</b></a>
          <a href="#agenda"><span>□</span> Agenda</a>
          <a href="#perfil"><span>○</span> Meu perfil</a>
          <a href="#avaliacoes"><span>☆</span> Avaliações</a>
        </nav>
        <div className="dashboard-sidebar__user">
          <span>DK</span>
          <div><strong>DJ Kauan</strong><small>Perfil 82% completo</small></div>
        </div>
        <Link to="/">Sair do painel</Link>
      </aside>

      <main className="dashboard-main" id="visao">
        <header className="dashboard-header">
          <div>
            <p>Quinta-feira, 30 de julho</p>
            <h1>Bom dia, Kauan.</h1>
          </div>
          <Link to="/artista/dj-kauan">Ver perfil público ↗</Link>
        </header>

        <section className="dashboard-profile-alert">
          <div>
            <span>82%</span>
            <div><strong>Seu perfil está quase pronto</strong><p>Adicione um vídeo e aumente suas chances de contratação.</p></div>
          </div>
          <button type="button">Completar perfil</button>
        </section>

        <section className="dashboard-metrics">
          <article><span>Visualizações</span><strong>1.284</strong><small>↑ 18% este mês</small></article>
          <article><span>Novas propostas</span><strong>12</strong><small>2 aguardando resposta</small></article>
          <article><span>Shows confirmados</span><strong>04</strong><small>Próximos 30 dias</small></article>
          <article><span>Receita prevista</span><strong>R$ 8,7k</strong><small>Para este mês</small></article>
        </section>

        <section className="dashboard-panel" id="propostas">
          <div className="dashboard-panel__heading">
            <div><p className="eyebrow">Oportunidades</p><h2>Propostas recentes</h2></div>
            <button type="button">Ver todas →</button>
          </div>
          <div className="dashboard-proposals">
            {proposals.map((proposal) => (
              <article key={`${proposal.client}-${proposal.date}`}>
                <time><b>{proposal.date.split(' ')[0]}</b><span>{proposal.date.split(' ')[1]}</span></time>
                <div className="dashboard-proposals__main">
                  <strong>{proposal.client}</strong>
                  <span>{proposal.event} · {proposal.location}</span>
                </div>
                <b>{proposal.value}</b>
                <span className={`dashboard-status dashboard-status--${proposal.status.toLowerCase().replace(' ', '-')}`}>
                  {proposal.status}
                </span>
                <button type="button" aria-label={`Abrir proposta de ${proposal.client}`}>→</button>
              </article>
            ))}
          </div>
        </section>

        <div className="dashboard-bottom-grid">
          <section className="dashboard-panel" id="agenda">
            <div className="dashboard-panel__heading">
              <div><p className="eyebrow">Agenda</p><h2>Próximos shows</h2></div>
            </div>
            <div className="dashboard-next-show">
              <span>02<small>AGO</small></span>
              <div><strong>Festa de aniversário</strong><p>20h · Centro, Ivoti</p></div>
              <b>Confirmado</b>
            </div>
          </section>
          <section className="dashboard-tip">
            <span>♫</span>
            <h3>Dica Feztival</h3>
            <p>Perfis com vídeo recebem até 3× mais propostas.</p>
            <button type="button">Adicionar vídeo</button>
          </section>
        </div>
      </main>
    </div>
  );
}

export default ArtistDashboard;
