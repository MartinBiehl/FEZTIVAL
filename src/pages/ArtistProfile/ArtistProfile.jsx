import { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MediaLightbox from '../../components/MediaLightbox/MediaLightbox.jsx';
import { artists } from '../../data/landingContent.js';
import { artistProfileDetails } from '../../data/artistProfileDetails.js';
import './ArtistProfile.css';

function ArtistProfile() {
  const { slug } = useParams();
  const artist = artists.find((item) => item.slug === slug);
  const [activeMediaIndex, setActiveMediaIndex] = useState(null);
  const mediaTriggerRef = useRef(null);

  const closeMedia = useCallback(() => {
    setActiveMediaIndex(null);
  }, []);

  const showPreviousMedia = useCallback(() => {
    setActiveMediaIndex((current) => (
      current === null
        ? null
        : (current - 1 + artistProfileDetails.mediaGallery.length)
          % artistProfileDetails.mediaGallery.length
    ));
  }, []);

  const showNextMedia = useCallback(() => {
    setActiveMediaIndex((current) => (
      current === null
        ? null
        : (current + 1) % artistProfileDetails.mediaGallery.length
    ));
  }, []);

  function openMedia(index, triggerElement) {
    mediaTriggerRef.current = triggerElement;
    setActiveMediaIndex(index);
  }

  if (!artist) return <Navigate to="/explorar" replace />;

  return (
    <div className="profile-page" style={{ '--artist-color': artist.color }}>
      <div className="profile-breadcrumb page-container">
        <Link to="/explorar">Explorar</Link><span>/</span><span>{artist.category}</span><span>/</span><b>{artist.name}</b>
      </div>

      <section className="profile-hero page-container">
        <div className="profile-hero__visual">
          <span>{artist.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
          <small>Foto principal do artista</small>
        </div>
        <div className="profile-hero__copy">
          <div className="profile-hero__status"><span /> Agenda aberta</div>
          <p className="eyebrow">{artist.category} · {artist.location}</p>
          <h1>{artist.name}</h1>
          <p className="profile-hero__genres">{artist.genres.join(' · ')}</p>
          <div className="profile-hero__proof">
            <strong>★ {artist.rating.toFixed(1)}</strong>
            <span>{artist.reviews} avaliações verificadas</span>
            <span>Responde em até 2 horas</span>
          </div>
        </div>
      </section>

      <div className="profile-layout page-container">
        <div className="profile-main">
          <nav className="profile-tabs" aria-label="Seções do perfil">
            <a href="#sobre-artista">Sobre</a>
            <a href="#fotos-videos">Fotos e vídeos</a>
            <a href="#servicos">Serviços</a>
            <a href="#planejamento">Planeje</a>
            <a href="#avaliacoes">Avaliações</a>
            <a href="#perguntas">Perguntas</a>
          </nav>

          <section className="profile-section" id="sobre-artista">
            <h2>Sobre</h2>
            <p>
              {artist.name} leva repertório versátil e presença de palco para eventos de
              todos os tamanhos. Cada apresentação é construída junto com o contratante,
              respeitando o clima da celebração e a identidade do público.
            </p>
            <div className="profile-tags">
              {artist.genres.map((genre) => <span key={genre}>{genre}</span>)}
              <span>Eventos privados</span>
              <span>Eventos corporativos</span>
            </div>
          </section>

          <section className="profile-section profile-media" id="fotos-videos">
            <h2>Fotos e vídeos</h2>

            <div className="profile-media__grid" aria-label="Galeria de fotos e vídeos">
              {artistProfileDetails.mediaGallery.map((item, index) => (
                <button
                  className={item.featured ? 'profile-media-item profile-media-item--featured' : 'profile-media-item'}
                  key={item.id}
                  type="button"
                  aria-label={`Abrir ${item.type === 'video' ? 'vídeo' : 'foto'} ${index + 1} de ${artistProfileDetails.mediaGallery.length}`}
                  aria-haspopup="dialog"
                  onClick={(event) => openMedia(index, event.currentTarget)}
                >
                  <img src={item.src} alt={item.alt} loading="lazy" />
                  {item.type === 'video' && (
                    <span className="profile-media-item__video" aria-hidden="true">▶</span>
                  )}
                </button>
              ))}
            </div>
          </section>

          <section className="profile-section" id="servicos">
            <h2>Serviços</h2>
            <div className="profile-services">
              {artistProfileDetails.services.map((service, index) => (
                <article key={service.title}>
                  <span>0{index + 1}</span>
                  <div>
                    <h3>{service.title}</h3>
                    <p>{service.detail}</p>
                    <small>{service.extra}</small>
                  </div>
                  <strong>
                    R$ {Math.max(artist.price + service.priceAdjustment, 0).toLocaleString('pt-BR')}
                  </strong>
                </article>
              ))}
            </div>
          </section>

          <section className="profile-section profile-planning" id="planejamento">
            <h2>Mais informações</h2>
            <p>
              Consulte os horários, as formas de pagamento e a estrutura necessária
              antes de enviar sua proposta.
            </p>

            <div className="profile-planning__grid">
              <article className="profile-info-card profile-info-card--schedule">
                <div className="profile-info-card__heading">
                  <span aria-hidden="true">□</span>
                  <div>
                    <small>Disponibilidade</small>
                    <h3>Expediente semanal</h3>
                  </div>
                </div>
                <dl className="profile-schedule">
                  {artistProfileDetails.weeklyHours.map((item) => (
                    <div key={item.day} className={item.available ? '' : 'is-unavailable'}>
                      <dt>{item.day}</dt>
                      <dd>{item.hours}</dd>
                    </div>
                  ))}
                </dl>
              </article>

              <article className="profile-info-card">
                <div className="profile-info-card__heading">
                  <span aria-hidden="true">R$</span>
                  <div>
                    <small>Facilidades</small>
                    <h3>Formas de pagamento</h3>
                  </div>
                </div>
                <ul className="profile-payment-list">
                  {artistProfileDetails.paymentMethods.map((method) => (
                    <li key={method.id}>
                      <strong>{method.name}</strong>
                      <span>{method.detail}</span>
                    </li>
                  ))}
                </ul>
              </article>

              <article className="profile-info-card">
                <div className="profile-info-card__heading">
                  <span aria-hidden="true">⌂</span>
                  <div>
                    <small>Tipos de ambiente</small>
                    <h3>Onde se apresenta</h3>
                  </div>
                </div>
                <div className="profile-chip-list">
                  {artistProfileDetails.venueTypes.map((venue) => (
                    <span key={venue}>{venue}</span>
                  ))}
                </div>
              </article>

              <article className="profile-info-card">
                <div className="profile-info-card__heading">
                  <span aria-hidden="true">◎</span>
                  <div>
                    <small>Deslocamento</small>
                    <h3>Regiões atendidas</h3>
                  </div>
                </div>
                <p className="profile-service-area">{artistProfileDetails.serviceAreas.summary}</p>
                <div className="profile-chip-list">
                  {artistProfileDetails.serviceAreas.locations.map((location) => (
                    <span key={location}>{location}</span>
                  ))}
                </div>
              </article>

              <article className="profile-info-card profile-info-card--wide">
                <div className="profile-info-card__heading">
                  <span aria-hidden="true">⚡</span>
                  <div>
                    <small>Montagem</small>
                    <h3>Estrutura e equipamentos</h3>
                  </div>
                </div>
                <div className="profile-infrastructure">
                  {artistProfileDetails.infrastructure.map((item) => (
                    <div key={item.id}>
                      <span>{item.status}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </section>

          <section className="profile-section" id="avaliacoes">
            <div className="profile-reviews__heading">
              <div>
                <h2>Avaliações</h2>
              </div>
              <strong>{artist.rating.toFixed(1)}<span>★★★★★</span></strong>
            </div>
            <div className="profile-review-grid">
              <blockquote>
                “Pontual, profissional e com uma energia incrível. O repertório ficou
                exatamente como imaginamos.”
                <footer><b>Carolina M.</b><span>Casamento · Maio 2026</span></footer>
              </blockquote>
              <blockquote>
                “A pista ficou cheia do início ao fim. Comunicação ótima em todas as etapas.”
                <footer><b>Rafael T.</b><span>Evento corporativo · Abril 2026</span></footer>
              </blockquote>
            </div>
          </section>

          <section className="profile-section profile-questions" id="perguntas">
            <h2>Pergunte antes de contratar</h2>
            <p>As respostas ficam visíveis no perfil e ajudam outros contratantes.</p>
            <form onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="question">Sua pergunta</label>
              <textarea id="question" placeholder="Ex.: Você leva equipamento de som?" rows="3" />
              <button type="submit">Enviar pergunta</button>
            </form>
          </section>
        </div>

        <aside className="profile-booking">
          <span>A partir de</span>
          <strong>R$ {artist.price.toLocaleString('pt-BR')}</strong>
          <small>por apresentação</small>
          <dl>
            <div><dt>Local</dt><dd>{artist.location}</dd></div>
            <div><dt>Duração</dt><dd>{Math.max(...artist.setMinutes) / 60}h disponíveis</dd></div>
            <div><dt>Avaliação</dt><dd>★ {artist.rating.toFixed(1)}</dd></div>
          </dl>
          <Link to={`/reservar/${artist.slug}`}>Pedir proposta <span>→</span></Link>
          <p>Você não paga nada para enviar uma proposta.</p>
        </aside>
      </div>

      <AnimatePresence>
        {activeMediaIndex !== null && (
          <MediaLightbox
            activeIndex={activeMediaIndex}
            items={artistProfileDetails.mediaGallery}
            key="artist-media-lightbox"
            onClose={closeMedia}
            onNext={showNextMedia}
            onPrevious={showPreviousMedia}
            returnFocusRef={mediaTriggerRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ArtistProfile;
