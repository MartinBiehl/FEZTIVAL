import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  activityFeed,
  artists,
  categories,
  filterGroups,
  landingContent,
  marqueeText,
  steps,
  testimonials,
  values,
} from '../../data/landingContent.js';
import './Home.css';

const emptyFilters = { distance: [], duration: [], genre: [] };

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => (
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  ));

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = (event) => setReduced(event.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

function useSlidesPerView() {
  const getCount = () => {
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 680) return 3;
    return 2;
  };

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    const update = () => setCount(getCount());
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return count;
}

function useInView() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    const element = ref.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.unobserve(element);
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -40px' });

    observer.observe(element);
    return () => observer.disconnect();
  }, [reducedMotion]);

  return [ref, visible];
}

function Reveal({ children, className = '', delay = 0 }) {
  const [ref, visible] = useInView();

  return (
    <div
      ref={ref}
      className={`reveal${visible ? ' reveal--visible' : ''}${className ? ` ${className}` : ''}`}
      style={{ '--reveal-delay': `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function ArtistVisual({ artist, compact = false }) {
  if (artist.image) {
    return (
      <img
        className={`artist-visual__image${compact ? ' artist-visual__image--compact' : ''}`}
        src={artist.image}
        alt={artist.imageAlt}
      />
    );
  }

  return (
    <div
      className={`artist-visual__placeholder${compact ? ' artist-visual__placeholder--compact' : ''}`}
      style={{ '--artist-color': artist.color }}
      role="img"
      aria-label={`Espaço reservado para a foto de ${artist.name}`}
    >
      <span className="artist-visual__note" aria-hidden="true">♪</span>
      <span>foto do artista</span>
    </div>
  );
}

function ArtistCarousel() {
  const slidesPerView = useSlidesPerView();
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const maxIndex = Math.max(0, artists.length - slidesPerView);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || reducedMotion || maxIndex === 0) return undefined;

    const interval = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, 3400);

    return () => window.clearInterval(interval);
  }, [maxIndex, paused, reducedMotion]);

  function move(direction) {
    setIndex((current) => Math.min(maxIndex, Math.max(0, current + direction)));
  }

  return (
    <div
      className="artist-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-label="Artistas em destaque"
    >
      <div className="artist-carousel__viewport">
        <div
          className="artist-carousel__track"
          style={{
            '--slides-per-view': slidesPerView,
            transform: `translateX(-${index * (100 / slidesPerView)}%)`,
          }}
        >
          {artists.map((artist) => (
            <div className="artist-carousel__slide" key={artist.id}>
              <Link
                className="featured-artist"
                to={`/artista/${artist.slug}`}
                style={{ '--artist-color': artist.color }}
              >
                <ArtistVisual artist={artist} compact />
                <span className="featured-artist__shade" aria-hidden="true" />
                <span className="featured-artist__category">{artist.category}</span>
                <span className="featured-artist__copy">
                  <strong>{artist.name}</strong>
                  <span>{artist.genres.join(' · ')} · ★ {artist.rating.toFixed(1)}</span>
                </span>
              </Link>
            </div>
          ))}
        </div>
      </div>

      <button
        className="artist-carousel__arrow artist-carousel__arrow--previous"
        type="button"
        onClick={() => move(-1)}
        disabled={index === 0}
        aria-label="Ver artistas anteriores"
      >
        ←
      </button>
      <button
        className="artist-carousel__arrow artist-carousel__arrow--next"
        type="button"
        onClick={() => move(1)}
        disabled={index === maxIndex}
        aria-label="Ver próximos artistas"
      >
        →
      </button>

      <div className="artist-carousel__dots" aria-label="Escolher posição do carrossel">
        {Array.from({ length: maxIndex + 1 }, (_, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            className={dotIndex === index ? 'artist-carousel__dot artist-carousel__dot--active' : 'artist-carousel__dot'}
            onClick={() => setIndex(dotIndex)}
            aria-label={`Ir para a posição ${dotIndex + 1}`}
            aria-current={dotIndex === index ? 'true' : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPanel({ filters, onToggle, onClear }) {
  return (
    <div className="search-panel" id="artist-filters">
      {filterGroups.map((group) => (
        <fieldset className="filter-group" key={group.id}>
          <legend>{group.label}</legend>
          <div className="filter-group__options">
            {group.options.map((option) => {
              const checked = filters[group.id].includes(option.value);
              return (
                <label className={checked ? 'filter-option filter-option--checked' : 'filter-option'} key={option.value}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(group.id, option.value)}
                  />
                  <span aria-hidden="true">{checked ? '✓' : ''}</span>
                  {option.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
      <button className="search-panel__clear" type="button" onClick={onClear}>
        Limpar filtros
      </button>
    </div>
  );
}

function AnimatedNumber({ value }) {
  const [ref, visible] = useInView();
  const reducedMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!visible) return undefined;
    if (reducedMotion) {
      setDisplayValue(value);
      return undefined;
    }

    const startedAt = performance.now();
    let frame;

    function tick(now) {
      const progress = Math.min((now - startedAt) / 1400, 1);
      const eased = 1 - ((1 - progress) ** 3);
      setDisplayValue(Math.floor(value * eased));
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    }

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, value, visible]);

  return <span ref={ref}>{displayValue.toLocaleString('pt-BR')}</span>;
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    }

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}

function LiveActivity() {
  const reducedMotion = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const interval = window.setInterval(() => {
      setIndex((current) => (current + 1) % activityFeed.length);
    }, 6500);
    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  const item = activityFeed[index];

  return (
    <aside className="live-activity" aria-live="polite">
      <span className="live-activity__dot" aria-hidden="true" />
      <span><strong>{item.person}</strong> {item.action} <b>{item.artist}</b></span>
    </aside>
  );
}

function Home() {
  const reducedMotion = useReducedMotion();
  const heroRef = useRef(null);
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);
  const selectedFilterCount = Object.values(filters).reduce((total, group) => total + group.length, 0);

  useEffect(() => {
    if (reducedMotion) return undefined;
    const interval = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % landingContent.hero.rotatingTerms.length);
    }, 2300);
    return () => window.clearInterval(interval);
  }, [reducedMotion]);

  const filteredArtists = useMemo(() => artists.filter((artist) => {
    const categoryMatches = activeCategory === 'Todos' || artist.category === activeCategory;
    const distanceMatches = filters.distance.length === 0 || filters.distance.some((distance) => (
      distance === 'any' || artist.distanceKm <= Number(distance)
    ));
    const durationMatches = filters.duration.length === 0 || filters.duration.some((duration) => (
      artist.setMinutes.some((minutes) => minutes >= Number(duration))
    ));
    const genreMatches = filters.genre.length === 0 || filters.genre.some((genre) => artist.genres.includes(genre));

    return categoryMatches && distanceMatches && durationMatches && genreMatches;
  }), [activeCategory, filters]);

  function toggleFilter(groupId, value) {
    setFilters((current) => {
      const group = current[groupId];
      const nextGroup = group.includes(value)
        ? group.filter((item) => item !== value)
        : [...group, value];
      return { ...current, [groupId]: nextGroup };
    });
  }

  function clearFilters() {
    setFilters(emptyFilters);
  }

  function showAllArtists() {
    setActiveCategory('Todos');
    clearFilters();
    document.querySelector('#explorar')?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }

  function handleHeroPointerMove(event) {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    heroRef.current.style.setProperty('--pointer-x', `${x}%`);
    heroRef.current.style.setProperty('--pointer-y', `${y}%`);
  }

  return (
    <>
      <ScrollProgress />
      <LiveActivity />

      <section className="landing-hero" ref={heroRef} onPointerMove={handleHeroPointerMove}>
        <div className="landing-hero__ambient" aria-hidden="true">
          <span className="landing-hero__blob landing-hero__blob--pink" />
          <span className="landing-hero__blob landing-hero__blob--purple" />
          <span className="landing-hero__blob landing-hero__blob--cyan" />
          {['♪', '♫', '♩', '♬', '♭', '♪'].map((note, index) => (
            <i key={`${note}-${index}`} style={{ '--note-index': index }}>{note}</i>
          ))}
        </div>

        <div className="landing-hero__content">
          <Reveal>
            <p className="landing-hero__eyebrow">{landingContent.hero.eyebrow}</p>
            <ArtistCarousel />
          </Reveal>

          <Reveal delay={100} className="hero-search">
            <p className="hero-search__prompt">
              {landingContent.hero.rotatingLead}{' '}
              <span className="hero-search__word" key={landingContent.hero.rotatingTerms[wordIndex]}>
                {landingContent.hero.rotatingTerms[wordIndex]}
              </span>
              ?
            </p>

            <button
              className="hero-search__button"
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="artist-filters"
            >
              <span className="search-icon" aria-hidden="true" />
              {landingContent.hero.searchLabel}
              {selectedFilterCount > 0 && <span className="hero-search__count">{selectedFilterCount}</span>}
            </button>

            {filtersOpen && (
              <FilterPanel filters={filters} onToggle={toggleFilter} onClear={clearFilters} />
            )}
          </Reveal>
        </div>
      </section>

      <div className="genre-marquee" aria-hidden="true">
        <div className="genre-marquee__row">
          <span>{marqueeText} {marqueeText}</span>
          <span>{marqueeText} {marqueeText}</span>
        </div>
        <div className="genre-marquee__row genre-marquee__row--reverse">
          <span>{marqueeText} {marqueeText}</span>
          <span>{marqueeText} {marqueeText}</span>
        </div>
      </div>

      <section className="landing-section catalog-section" id="explorar">
        <Reveal>
          <div className="section-heading section-heading--split">
            <div>
              <p className="section-eyebrow">Seleção local</p>
              <h1>{landingContent.catalog.title}</h1>
              <p>{landingContent.catalog.description}</p>
            </div>
            <div className="catalog-stat" aria-label="Mais de 240 artistas disponíveis">
              <strong><AnimatedNumber value={240} />+</strong>
              <span>artistas locais</span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={60}>
          <div className="category-tabs" role="group" aria-label="Filtrar por categoria">
            {categories.map((category) => (
              <button
                key={category.name}
                className={activeCategory === category.name ? 'category-tab category-tab--active' : 'category-tab'}
                type="button"
                onClick={() => setActiveCategory(category.name)}
                aria-pressed={activeCategory === category.name}
              >
                {category.name} <span>{category.count}</span>
              </button>
            ))}
          </div>
        </Reveal>

        <p className="catalog-results" aria-live="polite">
          {filteredArtists.length === 1 ? '1 artista encontrado' : `${filteredArtists.length} artistas encontrados`}
        </p>

        {filteredArtists.length > 0 ? (
          <div className="artist-grid">
            {filteredArtists.map((artist, index) => (
              <Reveal key={artist.id} delay={Math.min(index * 65, 260)}>
                <Link
                  className="artist-card"
                  to={`/artista/${artist.slug}`}
                  style={{ '--artist-color': artist.color }}
                >
                  <span className="artist-card__accent" aria-hidden="true" />
                  <ArtistVisual artist={artist} />
                  <span className="artist-card__body">
                    <span className="artist-card__meta">
                      <span className="artist-card__category">{artist.category}</span>
                      <span>★ {artist.rating.toFixed(1)} <small>({artist.reviews})</small></span>
                    </span>
                    <strong>{artist.name}</strong>
                    <span className="artist-card__details">{artist.genres.join(' · ')} · {artist.location}</span>
                    <span className="artist-card__footer">
                      <span><b>R$ {artist.price.toLocaleString('pt-BR')}</b> /show</span>
                      <span className="artist-card__profile">Ver perfil</span>
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        ) : (
          <div className="catalog-empty">
            <span aria-hidden="true">♫</span>
            <strong>Nenhum artista combina com esses filtros.</strong>
            <button type="button" onClick={showAllArtists}>Limpar e ver todos</button>
          </div>
        )}

        <div className="catalog-action">
          <button type="button" onClick={showAllArtists}>
            {landingContent.catalog.allArtistsLabel} <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>

      <section className="landing-section how-section" id="como-funciona">
        <Reveal>
          <div className="section-heading">
            <p className="section-eyebrow">{landingContent.howItWorks.eyebrow}</p>
            <h2>{landingContent.howItWorks.title}</h2>
          </div>
        </Reveal>
        <div className="steps-list">
          {steps.map((step, index) => (
            <Reveal key={step.number} delay={index * 90}>
              <article className="step-item" style={{ '--step-color': step.color }}>
                <span className="step-item__number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
                <span className="step-item__dot" aria-hidden="true" />
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section testimonials-section">
        <Reveal>
          <div className="section-heading">
            <p className="section-eyebrow">{landingContent.testimonials.eyebrow}</p>
            <h2>{landingContent.testimonials.title}</h2>
            <p>{landingContent.testimonials.description}</p>
          </div>
        </Reveal>
        <div className="testimonial-grid">
          {testimonials.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 90}>
              <article className="testimonial-card" style={{ '--testimonial-color': testimonial.color }}>
                <span className="testimonial-card__quote" aria-hidden="true">“</span>
                <blockquote>{testimonial.quote}</blockquote>
                <footer>
                  <span className="testimonial-card__avatar" aria-hidden="true">{testimonial.name[0]}</span>
                  <span>
                    <strong>{testimonial.name}</strong>
                    <small>{testimonial.role}</small>
                  </span>
                </footer>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-section about-section" id="para-artistas">
        <Reveal>
          <div className="about-section__copy">
            <p className="section-eyebrow">{landingContent.about.eyebrow}</p>
            <h2>{landingContent.about.title}</h2>
            <p>{landingContent.about.description}</p>
          </div>
        </Reveal>
        <div className="about-values">
          {values.map((value, index) => (
            <Reveal key={value.title} delay={index * 90}>
              <article className="about-value" style={{ '--value-color': value.color }}>
                <span aria-hidden="true" />
                <div>
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="landing-cta">
        <Reveal>
          <p>{landingContent.cta.eyebrow}</p>
          <h2>{landingContent.cta.title}</h2>
          <span>{landingContent.cta.description}</span>
          <Link to="/entrar">{landingContent.cta.button}</Link>
        </Reveal>
      </section>
    </>
  );
}

export default Home;
