import { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Link, Navigate, useParams } from 'react-router-dom';
import ProposalReviewModal from '../../components/ProposalReviewModal/ProposalReviewModal.jsx';
import { artists } from '../../data/landingContent.js';
import './Contract.css';

function Contract() {
  const { slug } = useParams();
  const artist = artists.find((item) => item.slug === slug);
  const [sent, setSent] = useState(false);
  const [reviewData, setReviewData] = useState(null);
  const reviewTriggerRef = useRef(null);

  const closeReview = useCallback(() => {
    setReviewData(null);
  }, []);

  const confirmProposal = useCallback(() => {
    setReviewData(null);
    setSent(true);
  }, []);

  function reviewProposal(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setReviewData(Object.fromEntries(formData.entries()));
  }

  if (!artist) return <Navigate to="/explorar" replace />;

  if (sent) {
    return (
      <section className="contract-success page-container">
        <span aria-hidden="true">✓</span>
        <p className="eyebrow">Proposta enviada</p>
        <h1>Agora é com<br />{artist.name}.</h1>
        <p>Você receberá uma resposta assim que o artista analisar os detalhes do evento.</p>
        <div>
          <Link to="/minhas-reservas">Acompanhar proposta</Link>
          <Link to="/explorar">Continuar explorando</Link>
        </div>
      </section>
    );
  }

  return (
    <div className="contract-page page-container">
      <div className="contract-heading">
        <Link to={`/artista/${artist.slug}`}>← Voltar ao perfil</Link>
        <p className="eyebrow">Pedido de contratação</p>
        <h1>Conte como vai ser<br /><span>esse momento.</span></h1>
        <p>Envie os detalhes para receber a confirmação e o valor final do artista.</p>
      </div>

      <div className="contract-layout">
        <form className="contract-form" onSubmit={reviewProposal}>
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
                <input name="date" type="date" required />
              </label>
              <label>
                Horário
                <input name="time" type="time" required />
              </label>
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
              <label>
                Duração desejada
                <select name="duration" defaultValue={artist.setMinutes[0]}>
                  {artist.setMinutes.map((minutes) => (
                    <option key={minutes} value={minutes}>{minutes / 60}h de apresentação</option>
                  ))}
                </select>
              </label>
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
            <legend><span>03</span> Conte um pouco mais</legend>
            <label>
              Mensagem para o artista
              <textarea
                name="message"
                rows="5"
                placeholder="Clima do evento, músicas importantes, observações..."
              />
            </label>
          </fieldset>

          <button ref={reviewTriggerRef} className="contract-form__submit" type="submit">
            Revisar proposta para {artist.name} <span>→</span>
          </button>
          <small>Você poderá revisar os dados antes do envio. Nenhuma cobrança será feita.</small>
        </form>

        <aside className="contract-summary">
          <div className="contract-summary__artist" style={{ '--artist-color': artist.color }}>
            <span>{artist.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
          </div>
          <p>{artist.category}</p>
          <h2>{artist.name}</h2>
          <div className="contract-summary__rating">★ {artist.rating.toFixed(1)} · {artist.reviews} avaliações</div>
          <dl>
            <div><dt>Valor inicial</dt><dd>R$ {artist.price.toLocaleString('pt-BR')}</dd></div>
            <div><dt>Região</dt><dd>{artist.location}</dd></div>
            <div><dt>Resposta média</dt><dd>Até 2 horas</dd></div>
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
            returnFocusRef={reviewTriggerRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Contract;
