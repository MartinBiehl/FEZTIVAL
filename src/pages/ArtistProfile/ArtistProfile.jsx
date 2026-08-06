import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Building2, CalendarDays, ChevronDown, CreditCard, MapPin, Zap } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import MediaLightbox from '../../components/MediaLightbox/MediaLightbox.jsx';
import { artists } from '../../data/landingContent.js';
import { artistProfileDetails } from '../../data/artistProfileDetails.js';
import './ArtistProfile.css';

function ProfileInfoPanel({ category, children, icon: Icon, id, isOpen, onToggle, title, wide = false }) {
  const shouldReduceMotion = useReducedMotion();
  const triggerId = `profile-info-trigger-${id}`;
  const contentId = `profile-info-content-${id}`;
  const transition = shouldReduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

  return (
    <article className={`profile-info-card${wide ? ' profile-info-card--wide' : ''}${isOpen ? ' is-open' : ''}`}>
      <button
        id={triggerId}
        className="profile-info-card__trigger"
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => onToggle(id)}
      >
        <span className="profile-info-card__icon" aria-hidden="true"><Icon size={19} strokeWidth={2} /></span>
        <span className="profile-info-card__title">
          <small>{category}</small>
          <strong>{title}</strong>
        </span>
        <motion.span
          className="profile-info-card__chevron"
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={transition}
        >
          <ChevronDown size={19} strokeWidth={2.2} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            className="profile-info-card__content"
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={transition}
          >
            <div className="profile-info-card__content-inner">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

function ArtistProfile() {
  const { slug } = useParams();
  const artist = artists.find((item) => item.slug === slug);
  const [activeMediaIndex, setActiveMediaIndex] = useState(null);
  const [openInfoId, setOpenInfoId] = useState(null);
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

  function toggleInfoPanel(id) {
    setOpenInfoId((current) => (current === id ? null : id));
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
              <ProfileInfoPanel
                category="Disponibilidade"
                icon={CalendarDays}
                id="schedule"
                isOpen={openInfoId === 'schedule'}
                onToggle={toggleInfoPanel}
                title="Expediente semanal"
              >
                <dl className="profile-schedule">
                  {artistProfileDetails.weeklyHours.map((item) => (
                    <div key={item.day} className={item.available ? '' : 'is-unavailable'}>
                      <dt>{item.day}</dt>
                      <dd>{item.hours}</dd>
                    </div>
                  ))}
                </dl>
              </ProfileInfoPanel>

              <ProfileInfoPanel
                category="Facilidades"
                icon={CreditCard}
                id="payments"
                isOpen={openInfoId === 'payments'}
                onToggle={toggleInfoPanel}
                title="Formas de pagamento"
              >
                <ul className="profile-payment-list">
                  {artistProfileDetails.paymentMethods.map((method) => (
                    <li key={method.id}>
                      <strong>{method.name}</strong>
                      <span>{method.detail}</span>
                    </li>
                  ))}
                </ul>
              </ProfileInfoPanel>

              <ProfileInfoPanel
                category="Tipos de ambiente"
                icon={Building2}
                id="venues"
                isOpen={openInfoId === 'venues'}
                onToggle={toggleInfoPanel}
                title="Onde se apresenta"
              >
                <div className="profile-chip-list">
                  {artistProfileDetails.venueTypes.map((venue) => (
                    <span key={venue}>{venue}</span>
                  ))}
                </div>
              </ProfileInfoPanel>

              <ProfileInfoPanel
                category="Deslocamento"
                icon={MapPin}
                id="service-areas"
                isOpen={openInfoId === 'service-areas'}
                onToggle={toggleInfoPanel}
                title="Regiões atendidas"
              >
                <p className="profile-service-area">{artistProfileDetails.serviceAreas.summary}</p>
                <div className="profile-chip-list">
                  {artistProfileDetails.serviceAreas.locations.map((location) => (
                    <span key={location}>{location}</span>
                  ))}
                </div>
              </ProfileInfoPanel>

              <ProfileInfoPanel
                category="Montagem"
                icon={Zap}
                id="infrastructure"
                isOpen={openInfoId === 'infrastructure'}
                onToggle={toggleInfoPanel}
                title="Estrutura e equipamentos"
                wide
              >
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
              </ProfileInfoPanel>
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
            <form className="profile-review-form" onSubmit={(event) => event.preventDefault()}>
              <div>
                <label htmlFor="review">Conte como foi o show</label>
              </div>
              <textarea
                id="review"
                name="review"
                placeholder="Escreva sua avaliação sobre a apresentação..."
                rows="4"
                required
              />
              <button type="submit">Enviar avaliação</button>
            </form>
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
