import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import heroImage from '../../images/led-zeppelin-at-the-forum-michael-ochs-archives.jpg';
import crowdImage from '../../images/crowd_party.png';
import './Home.css';

const heroSequence = {
  hidden: {},
  visible: {
    transition: {
      delayChildren: 0.12,
      staggerChildren: 0.1,
    },
  },
};

const heroItem = {
  hidden: { opacity: 0, x: -24, filter: 'blur(8px)' },
  visible: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 0.74, bounce: 0 },
  },
};

const heroBackground = {
  hidden: { opacity: 0, scale: 1.045, filter: 'blur(10px)' },
  visible: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: { type: 'spring', duration: 1.05, bounce: 0 },
  },
};

const steps = [
  {
    number: '01',
    title: 'Explore',
    text: 'Escolha o seu artista favorito de acordo ao gosto de seu evento.',
    color: '#FFD600',
  },
  {
    number: '02',
    title: 'Contrate',
    text: 'Conte os detalhes do evento e envie uma proposta sem compromisso.',
    color: '#FF3CAC',
  },
  {
    number: '03',
    title: 'Aproveite',
    text: 'Combine tudo com clareza e faça acontecer um evento memorável.',
    color: '#00BFE7',
  },
];

function Home() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <>
      <section className="home-hero" aria-labelledby="home-hero-title">
        <motion.img
          className="home-hero__background"
          src={heroImage}
          alt=""
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={heroBackground}
        />
        <div className="home-hero__overlay" aria-hidden="true" />

        <motion.div
          className="home-hero__copy"
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
          variants={heroSequence}
        >
  
          <motion.h1 id="home-hero-title" variants={heroItem}>
            Seu evento.<br />
            <span>A música certa.</span>
          </motion.h1>
          <motion.p className="home-hero__lead" variants={heroItem}>
            Feztival aproxima músicos de quem ama música.
            Descubra talentos locais e transforme qualquer encontro em algo inesquecível.
          </motion.p>
          <motion.div className="home-hero__actions" variants={heroItem}>
            <Link className="home-button home-button--primary" to="/explorar">
              Explorar artistas
              <ArrowUpRight aria-hidden="true" size={17} strokeWidth={2.4} />
            </Link>
            <a className="home-button home-button--text" href="#sobre-nos">
              Conheça a Feztival
              <ArrowDown aria-hidden="true" size={17} strokeWidth={2.4} />
            </a>
          </motion.div>
        </motion.div>


      </section>

      <div className="home-marquee" aria-label="Categorias disponíveis">
        <span>DJ ◆ BANDA ◆ MPB ◆ PAGODE ◆ ROCK ◆ SAMBA ◆ VOZ E VIOLÃO ◆</span>
        <span aria-hidden="true">DJ ◆ BANDA ◆ MPB ◆ PAGODE ◆ ROCK ◆ SAMBA ◆ VOZ E VIOLÃO ◆</span>
      </div>

      <section className="home-manifesto" id="sobre-nos">
        <div className="home-manifesto__image">
          <img src={crowdImage} alt="Público celebrando em um show" />
        </div>
        <div className="home-manifesto__copy">
          <h2>A cena está cheia de talento. O que faltava era um lugar comum para anunciar.</h2>
          <p>
            Encontrar música ao vivo ainda depende demais de indicação, conversa 
            espalhada e pouca informação. A Feztival organiza esse caminho sem tirar 
            dele o que importa: a personalidade de cada artista e a emoção de cada evento.
          <br /><br />        
            Somos uma vitrine para o trabalho artístico local e um jeito simples de
            encontrar a trilha certa para casamentos, aniversários, bares, empresas e
            tudo que merece ser vivido com música.
          </p>
          <Link to="/explorar">Conhecer a cena local <span>→</span></Link>
        </div>
      </section>

      <section className="home-steps page-container" id="como-funciona">
        <div className="home-section-heading">
          <div>
            <h2>Simples do início ao bis.</h2>
          </div>

        </div>
        <div className="home-steps__grid">
          {steps.map((step) => (
            <article
              key={step.number}
              tabIndex="0"
              style={{ '--step-color': step.color }}
            >
              <span className="home-steps__number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-artist-callout" id="para-artistas">
        <div>
          <p className="eyebrow">Você vive de música?</p>
          <h2>Seu próximo palco pode começar por aqui.</h2>
          <p>Apresente seu trabalho, receba propostas e seja encontrado por quem valoriza a cena local.</p>
        </div>
        <Link to="/cadastro/artista">Quero fazer parte <span>↗</span></Link>
      </section>

      <section className="home-final page-container">
        <p>Ache o som<br />do seu próximo evento</p>
        <Link to="/explorar">Encontrar agora <span>→</span></Link>
      </section>
    </>
  );
}

export default Home;
