'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import { Check, ChevronDown } from 'lucide-react';
import ArtistCard from '../../components/ArtistCard/ArtistCard.jsx';
import ArtistPreviewModal from '../../components/ArtistPreviewModal/ArtistPreviewModal.jsx';
import './Explore.css';

/*
 * O filtro de distancia saiu: dependia de distanceKm, que nao existe no banco
 * por ser calculo entre duas localizacoes, e nao atributo do artista. Volta
 * quando houver busca por proximidade.
 */
const initialFilters = { duration: [], genre: [] };

/*
 * Faixas, e nao duracoes exatas: o editor oferece 1h30 e 5h, que nenhuma
 * opcao exata encontrava. O artista entra se algum servico cair na faixa.
 */
const DURATION_OPTIONS = [
  { label: 'Até 1h', value: 'ate-1h', min: 0, max: 60 },
  { label: '1h a 2h', value: '1h-2h', min: 61, max: 120 },
  { label: '2h a 3h', value: '2h-3h', min: 121, max: 180 },
  { label: 'Mais de 3h', value: 'mais-3h', min: 181, max: Infinity },
];

const SORT_VALUES = ['recommended', 'price-low', 'price-high'];

/* Busca sem acento e sem caixa: "musico" encontra "Músico". */
function normalize(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('pt-BR');
}

/*
 * Estado do catalogo <-> URL (?q=&categoria=&genero=&duracao=&ordem=), para
 * o voltar do navegador e links compartilhados manterem a busca. Lido no
 * navegador depois de montar: useSearchParams exigiria Suspense, e o HTML
 * estatico desta pagina (indexado) sairia vazio.
 */
function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  const list = (name) => (params.get(name) ?? '').split(',').filter(Boolean);
  return {
    search: params.get('q') ?? '',
    category: params.get('categoria') ?? '',
    filters: { duration: list('duracao'), genre: list('genero') },
    sort: SORT_VALUES.includes(params.get('ordem')) ? params.get('ordem') : 'recommended',
  };
}

function writeUrlState({ search, category, filters, sort }) {
  const params = new URLSearchParams();
  if (search.trim()) params.set('q', search.trim());
  if (category) params.set('categoria', category);
  if (filters.genre.length) params.set('genero', filters.genre.join(','));
  if (filters.duration.length) params.set('duracao', filters.duration.join(','));
  if (sort !== 'recommended') params.set('ordem', sort);
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  if (url !== `${window.location.pathname}${window.location.search}`) {
    window.history.replaceState(window.history.state, '', url);
  }
}
const fastGlowSpring = { stiffness: 150, damping: 24, mass: 0.45 };
const slowGlowSpring = { stiffness: 65, damping: 20, mass: 0.95 };
const filterDisclosureSpring = { type: 'spring', stiffness: 240, damping: 22, mass: 0.9 };
const filterCheckSpring = { type: 'spring', stiffness: 520, damping: 30, mass: 0.7 };

function asPercentage(value) {
  return `${value * 100}%`;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function FilterGroupDisclosure({ group, isOpen, onChange, onToggle, selectedValues, shouldReduceMotion }) {
  const triggerId = `filter-trigger-${group.id}`;
  const contentId = `filter-content-${group.id}`;
  const transition = shouldReduceMotion ? { duration: 0 } : filterDisclosureSpring;
  const optionsVariants = shouldReduceMotion
    ? {
        closed: { height: 0, opacity: 0, transition: { duration: 0 } },
        open: { height: 'auto', opacity: 1, transition: { duration: 0 } },
      }
    : {
        closed: {
          height: 0,
          opacity: 0,
          transition: {
            height: { ...filterDisclosureSpring, delay: 0.08 },
            opacity: { duration: 0.12 },
            staggerChildren: 0.025,
            staggerDirection: -1,
          },
        },
        open: {
          height: 'auto',
          opacity: 1,
          transition: {
            height: filterDisclosureSpring,
            opacity: { duration: 0.16 },
            delayChildren: 0.08,
            staggerChildren: 0.045,
          },
        },
      };
  const optionVariants = shouldReduceMotion
    ? { closed: { opacity: 0 }, open: { opacity: 1 } }
    : {
        closed: { opacity: 0, y: 14, scale: 0.97, filter: 'blur(4px)' },
        open: {
          opacity: 1,
          y: 0,
          scale: 1,
          filter: 'blur(0px)',
          transition: filterDisclosureSpring,
        },
      };

  return (
    <motion.fieldset
      className={`explore-filter-group${isOpen ? ' is-open' : ''}`}
      layout={!shouldReduceMotion}
      transition={transition}
    >
      <legend className="sr-only">{group.label}</legend>
      <motion.button
        id={triggerId}
        className="explore-filter-group__trigger"
        type="button"
        aria-controls={contentId}
        aria-expanded={isOpen}
        onClick={() => onToggle(group.id)}
        whileHover={shouldReduceMotion ? undefined : { scale: 1.015 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
        transition={transition}
      >
        <span>{group.label}</span>
        <AnimatePresence initial={false} mode="popLayout">
          {selectedValues.length > 0 && (
            <motion.b
              key={selectedValues.length}
              aria-label={`${selectedValues.length} selecionado${selectedValues.length > 1 ? 's' : ''}`}
              initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.55, y: 7 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55, y: -7 }}
              transition={shouldReduceMotion ? { duration: 0 } : filterCheckSpring}
            >
              {selectedValues.length}
            </motion.b>
          )}
        </AnimatePresence>
        <motion.span
          className="explore-filter-group__chevron"
          aria-hidden="true"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={transition}
        >
          <ChevronDown size={18} strokeWidth={2.2} />
        </motion.span>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={contentId}
            className="explore-filter-group__options"
            role="group"
            aria-labelledby={triggerId}
            initial="closed"
            animate="open"
            exit="closed"
            variants={optionsVariants}
          >
            <div>
              {group.options.map((option) => {
                const selected = selectedValues.includes(option.value);

                return (
                  <motion.label
                    className={selected ? 'is-selected' : ''}
                    key={option.value}
                    variants={optionVariants}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onChange(group.id, option.value)}
                    />
                    <motion.span
                      className="explore-filter-group__checkbox"
                      aria-hidden="true"
                      animate={{
                        backgroundColor: selected ? '#111111' : '#fffef9',
                        borderColor: selected ? '#111111' : 'rgba(17, 17, 17, 0.25)',
                      }}
                      transition={shouldReduceMotion ? { duration: 0 } : filterCheckSpring}
                    >
                      <AnimatePresence initial={false}>
                        {selected && (
                          <motion.span
                            className="explore-filter-group__check"
                            initial={shouldReduceMotion ? false : { opacity: 0, scale: 0, rotate: -45 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0, rotate: 35 }}
                            transition={shouldReduceMotion ? { duration: 0 } : filterCheckSpring}
                          >
                            <Check size={12} strokeWidth={3} />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.span>
                    {option.label}
                    {option.count != null && <small>{option.count}</small>}
                  </motion.label>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.fieldset>
  );
}

function Explore({ artists = [], genres = [] }) {
  const [search, setSearch] = useState('');
  // Valor do banco (dj, band, solo); vazio = todas.
  const [activeCategory, setActiveCategory] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState('recommended');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [openFilterGroups, setOpenFilterGroups] = useState([]);
  const [urlRead, setUrlRead] = useState(false);
  const [selectedArtist, setSelectedArtist] = useState(null);
  const previewTriggerRef = useRef(null);
  const shouldReduceMotion = useReducedMotion();
  const pinkTargetX = useMotionValue(0.78);
  const pinkTargetY = useMotionValue(0.3);
  const blueTargetX = useMotionValue(0.62);
  const blueTargetY = useMotionValue(0.85);
  const pinkX = useSpring(pinkTargetX, fastGlowSpring);
  const pinkY = useSpring(pinkTargetY, fastGlowSpring);
  const blueX = useSpring(blueTargetX, slowGlowSpring);
  const blueY = useSpring(blueTargetY, slowGlowSpring);
  const pinkTranslateX = useTransform(pinkX, asPercentage);
  const pinkTranslateY = useTransform(pinkY, asPercentage);
  const blueTranslateX = useTransform(blueX, asPercentage);
  const blueTranslateY = useTransform(blueY, asPercentage);

  const activeFilterCount = Object.values(filters).flat().length;

  /*
   * Categorias e contagens vem dos artistas reais. O banco tem 3 categorias
   * (dj, band, solo), nao as 5 de antes: "Cantor" e "Musico Solo" eram ambos
   * solo e nao podiam ser separados por query, e "Pagode" e genero, nao
   * categoria -- continua disponivel no filtro de generos.
   */
  const categories = useMemo(() => {
    const counts = new Map();
    for (const artist of artists) {
      const current = counts.get(artist.categoryValue) ?? { name: artist.category, count: 0 };
      counts.set(artist.categoryValue, { ...current, count: current.count + 1 });
    }
    return [
      { value: '', name: 'Todos', count: artists.length },
      ...[...counts.entries()]
        .sort((a, b) => b[1].count - a[1].count || a[1].name.localeCompare(b[1].name, 'pt-BR'))
        .map(([value, { name, count }]) => ({ value, name, count })),
    ];
  }, [artists]);

  /*
   * Generos vem do catalogo do banco, nao de uma lista fixa. So entram os que
   * tem artista: escolher um genero vazio levaria direto a zero resultados.
   */
  const filterGroups = useMemo(() => {
    const genreCounts = new Map();
    for (const artist of artists) {
      for (const genre of artist.genres) genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1);
    }
    return [
      { id: 'duration', label: 'Tempo de set', options: DURATION_OPTIONS },
      {
        id: 'genre',
        label: 'Gênero musical',
        options: genres
          .filter((genre) => genreCounts.has(genre.name))
          .map((genre) => ({ label: genre.name, value: genre.name, count: genreCounts.get(genre.name) })),
      },
    ];
  }, [artists, genres]);

  useEffect(() => {
    const state = readUrlState();
    setSearch(state.search);
    setActiveCategory(state.category);
    setFilters(state.filters);
    setSort(state.sort);
    setUrlRead(true);
  }, []);

  useEffect(() => {
    // Antes de ler a URL, o estado ainda e o padrao e apagaria os parametros.
    if (!urlRead) return;
    writeUrlState({ search, category: activeCategory, filters, sort });
  }, [activeCategory, filters, search, sort, urlRead]);

  const results = useMemo(() => {
    const query = normalize(search.trim());
    const filtered = artists.filter((artist) => {
      const searchMatches = !query || [
        artist.name,
        artist.category,
        artist.location,
        ...artist.genres,
      ].filter(Boolean).some((value) => normalize(value).includes(query));
      const categoryMatches = !activeCategory || artist.categoryValue === activeCategory;
      const durationMatches = !filters.duration.length || filters.duration.some((value) => {
        const range = DURATION_OPTIONS.find((option) => option.value === value);
        return range && artist.setMinutes.some((minutes) => minutes >= range.min && minutes <= range.max);
      });
      const genreMatches = !filters.genre.length || filters.genre.some(
        (genre) => artist.genres.includes(genre),
      );
      return searchMatches && categoryMatches && durationMatches && genreMatches;
    });

    /*
     * "Recomendados" preserva a ordem que o servidor entregou -- embaralhada
     * com semente diaria. Ordenar aqui por nota nao funciona mais: nenhum
     * artista tem avaliacao, entao a comparacao daria sempre zero.
     *
     * Preco nulo ("sob consulta") vai para o fim das duas ordenacoes de preco,
     * em vez de ser tratado como zero.
     */
    const byPrice = (a, b, direction) => {
      if (a.price == null && b.price == null) return 0;
      if (a.price == null) return 1;
      if (b.price == null) return -1;
      return direction * (a.price - b.price);
    };

    if (sort === 'price-low') return [...filtered].sort((a, b) => byPrice(a, b, 1));
    if (sort === 'price-high') return [...filtered].sort((a, b) => byPrice(a, b, -1));
    return filtered;
  }, [activeCategory, artists, filters, search, sort]);

  function toggleFilter(group, value) {
    setFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  }

  function toggleFilterGroup(groupId) {
    setOpenFilterGroups((current) => (
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    ));
  }

  function clearAll() {
    setSearch('');
    setActiveCategory('');
    setFilters(initialFilters);
  }

  const openPreview = useCallback((artist, triggerElement) => {
    previewTriggerRef.current = triggerElement;
    setSelectedArtist(artist);
  }, []);

  const closePreview = useCallback(() => {
    setSelectedArtist(null);
  }, []);

  function followPointer(event) {
    const hasPreciseHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (shouldReduceMotion || event.pointerType !== 'mouse' || !hasPreciseHover) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    const x = clamp((event.clientX - bounds.left) / bounds.width);
    const y = clamp((event.clientY - bounds.top) / bounds.height);

    pinkTargetX.set(x);
    pinkTargetY.set(y);
    blueTargetX.set(clamp(x - 0.07));
    blueTargetY.set(clamp(y + 0.1));
  }

  return (
    <div className="explore-page">
      <section className="explore-hero" onPointerMove={followPointer}>
        <motion.span
          className="explore-hero__glow explore-hero__glow--pink"
          aria-hidden="true"
          style={{ x: pinkTranslateX, y: pinkTranslateY }}
        />
        <motion.span
          className="explore-hero__glow explore-hero__glow--blue"
          aria-hidden="true"
          style={{ x: blueTranslateX, y: blueTranslateY }}
        />
        <div className="page-container">
          <h1>Encontre o som<br /><span>do seu momento.</span></h1>
          <form className="explore-search" onSubmit={(event) => event.preventDefault()}>
            <span aria-hidden="true">⌕</span>
            <label className="sr-only" htmlFor="artist-search">Buscar artistas</label>
            <input
              id="artist-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busque por artista, gênero ou região"
            />
            <button type="submit">Buscar</button>
          </form>
          <div className="explore-suggestions">
            <span>Experimente:</span>
            {['DJ', 'MPB', 'Pagode', 'Rock'].map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setSearch(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="explore-content page-container">
        <div className="explore-categories" role="group" aria-label="Categorias de artistas">
          {categories.map((category) => (
            <button
              className={category.value === activeCategory ? 'active' : ''}
              key={category.value || 'todos'}
              type="button"
              aria-pressed={category.value === activeCategory}
              onClick={() => setActiveCategory(category.value)}
            >
              {category.name} <span>{category.count}</span>
            </button>
          ))}
        </div>

        <div className="explore-toolbar">
          <div>
            <strong>
              {results.length === 1 ? '1 artista encontrado' : `${results.length} artistas encontrados`}
            </strong>
            <span>em Ivoti e região</span>
          </div>
          <button
            className="explore-mobile-filter"
            type="button"
            aria-controls="explore-filters-panel"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            Filtros {activeFilterCount > 0 && <b>{activeFilterCount}</b>}
          </button>
          <label>
            <span>Ordenar por</span>
            <select value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="recommended">Recomendados</option>
              {/*
                "Melhor avaliação" saiu: nenhum artista tem nota ainda, então a
                opção não reordenaria nada. Volta quando houver avaliações.
              */}
              <option value="price-low">Menor preço</option>
              <option value="price-high">Maior preço</option>
            </select>
          </label>
        </div>

        <div className="explore-layout">
          <aside
            id="explore-filters-panel"
            className={`explore-filters${filtersOpen ? ' explore-filters--open' : ''}`}
          >
            <div className="explore-filters__heading">
              <strong>Filtros</strong>
              <button type="button" onClick={clearAll}>Limpar tudo</button>
            </div>
            {filterGroups.map((group) => (
              <FilterGroupDisclosure
                group={group}
                isOpen={openFilterGroups.includes(group.id)}
                key={group.id}
                onChange={toggleFilter}
                onToggle={toggleFilterGroup}
                selectedValues={filters[group.id]}
                shouldReduceMotion={shouldReduceMotion}
              />
            ))}
            <button
              className="explore-filters__apply"
              type="button"
              onClick={() => setFiltersOpen(false)}
            >
              {results.length === 1 ? 'Ver 1 resultado' : `Ver ${results.length} resultados`}
            </button>
          </aside>

          <div>
            {results.length ? (
              <div className="explore-grid">
                {results.map((artist) => (
                  <ArtistCard
                    artist={artist}
                    key={artist.id}
                    onPreview={openPreview}
                  />
                ))}
              </div>
            ) : (
              <div className="explore-empty">
                <span aria-hidden="true">♫</span>
                <h2>Nenhum artista por aqui ainda.</h2>
                <p>Tente remover algum filtro ou buscar por outro estilo.</p>
                <button type="button" onClick={clearAll}>Ver todos os artistas</button>
              </div>
            )}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedArtist && (
          <ArtistPreviewModal
            artist={selectedArtist}
            key={selectedArtist.id}
            onClose={closePreview}
            returnFocusRef={previewTriggerRef}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Explore;
