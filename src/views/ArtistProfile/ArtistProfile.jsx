'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Building2, CalendarDays, ChevronDown, CreditCard, MapPin, Zap } from 'lucide-react';
import Link from 'next/link';
import MediaLightbox from '../../components/MediaLightbox/MediaLightbox.jsx';
import { recordArtistView } from '../../lib/artistActions.js';
import {
  NO_RATING_LABEL, formatMaxDuration, formatPrice, formatRating, formatReviewCount,
  hasRating,
} from '../../lib/artistDisplay.js';
import './ArtistProfile.css';

/* "outubro de 2026", fixo em UTC para servidor e navegador renderizarem igual. */
const REVIEW_DATE = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

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

function ArtistProfile({ artist }) {
  const [activeMediaIndex, setActiveMediaIndex] = useState(null);
  const [openInfoId, setOpenInfoId] = useState(null);
  const mediaTriggerRef = useRef(null);

  // A pagina e estatica: a visualizacao e contada pelo navegador, uma vez por visita.
  useEffect(() => {
    recordArtistView(artist.slug).catch(() => {});
  }, [artist.slug]);

  const closeMedia = useCallback(() => {
    setActiveMediaIndex(null);
  }, []);

  const showPreviousMedia = useCallback(() => {
    setActiveMediaIndex((current) => (
      current === null
        ? null
        : (current - 1 + artist.mediaGallery.length)
          % artist.mediaGallery.length
    ));
  }, [artist.mediaGallery.length]);

  const showNextMedia = useCallback(() => {
    setActiveMediaIndex((current) => (
      current === null
        ? null
        : (current + 1) % artist.mediaGallery.length
    ));
  }, [artist.mediaGallery.length]);

  function openMedia(index, triggerElement) {
    mediaTriggerRef.current = triggerElement;
    setActiveMediaIndex(index);
  }

  function toggleInfoPanel(id) {
    setOpenInfoId((current) => (current === id ? null : id));
  }

  return (
    <div className="profile-page" style={{ '--artist-color': artist.color }}>
      <div className="profile-breadcrumb page-container">
        <Link href="/explorar">Explorar</Link><span>/</span><span>{artist.category}</span><span>/</span><b>{artist.name}</b>
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
            {hasRating(artist) ? (
              <>
                <strong>★ {formatRating(artist)}</strong>
                <span>{formatReviewCount(artist)} verificadas</span>
              </>
            ) : (
              <span>{NO_RATING_LABEL}</span>
            )}
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
              {artist.mediaGallery.map((item, index) => (
                <button
                  className={item.featured ? 'profile-media-item profile-media-item--featured' : 'profile-media-item'}
                  key={item.id}
                  type="button"
                  aria-label={`Abrir ${item.type === 'video' ? 'vídeo' : 'foto'} ${index + 1} de ${artist.mediaGallery.length}`}
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
            <ul className="profile-services">
              {artist.services.map((service) => (
                <li key={service.title}>
                  <div>
                    <h3>{service.title}</h3>
                    <p>{service.detail}</p>
                  </div>
                  <strong>
                    {service.price == null
                      ? 'Sob consulta'
                      : `R$ ${service.price.toLocaleString('pt-BR')}`}
                  </strong>
                </li>
              ))}
            </ul>
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
                  {artist.weeklyHours.map((item) => (
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
                  {artist.paymentMethods.map((method) => (
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
                  {artist.venueTypes.map((venue) => (
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
                <p className="profile-service-area">{artist.serviceAreas.summary}</p>
                <div className="profile-chip-list">
                  {artist.serviceAreas.locations.map((location) => (
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
                  {artist.infrastructure.map((item) => (
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
              {hasRating(artist) && (
                <strong>{formatRating(artist)}<span>★★★★★</span></strong>
              )}
            </div>
            {!hasRating(artist) && (
              <p className="profile-reviews__empty">Ainda não há avaliações.</p>
            )}
            {/*
              Só quem contratou avalia, a partir de "Minhas reservas", depois do
              show concluído. Por isso aqui não há formulário.
            */}
            {artist.reviewList.length > 0 && (
              <ul className="profile-reviews__list">
                {artist.reviewList.map((review) => (
                  <li key={review.createdAt}>
                    <div>
                      <strong aria-label={`Nota ${review.rating} de 5`}>
                        {'★'.repeat(review.rating)}<span aria-hidden="true">{'★'.repeat(5 - review.rating)}</span>
                      </strong>
                      <small>
                        {[review.eventType, REVIEW_DATE.format(new Date(review.createdAt))].filter(Boolean).join(' · ')}
                      </small>
                    </div>
                    {review.comment && <p>{review.comment}</p>}
                    <small>Contratação verificada pela Feztival</small>
                  </li>
                ))}
              </ul>
            )}
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
          <strong>{formatPrice(artist)}</strong>
          <small>por apresentação</small>
          <dl>
            <div><dt>Local</dt><dd>{artist.location}</dd></div>
            {formatMaxDuration(artist) && (
              <div><dt>Duração</dt><dd>{formatMaxDuration(artist)} disponíveis</dd></div>
            )}
            {hasRating(artist) && (
              <div><dt>Avaliação</dt><dd>★ {formatRating(artist)}</dd></div>
            )}
          </dl>
          <Link href={`/reservar/${artist.slug}`}>Pedir proposta <span>→</span></Link>
          <p>Você não paga nada para enviar uma proposta.</p>
        </aside>
      </div>

      <AnimatePresence>
        {activeMediaIndex !== null && (
          <MediaLightbox
            activeIndex={activeMediaIndex}
            items={artist.mediaGallery}
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
