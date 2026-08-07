import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, CalendarHeart, Mic2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import BrandLogo from '../../components/BrandLogo/BrandLogo.jsx';
import crowdImage from '../../images/crowd_party.png';
import stageImage from '../../images/concert_stage.png';
import './ChooseLogin.css';

const cards = [
  {
    title: 'Quero contratar',
    label: 'Contratante',
    description: 'Encontre artistas e acompanhe suas reservas.',
    to: '/entrar/contratante',
    image: crowdImage,
    icon: CalendarHeart,
    accent: '#ffd600',
  },
  {
    title: 'Sou artista',
    label: 'Artista',
    description: 'Administre seu perfil, agenda e propostas.',
    to: '/entrar/artista',
    image: stageImage,
    icon: Mic2,
    accent: '#00bfe7',
  },
];

const containerVariants = {
  hidden: {},
  visible: { transition: { delayChildren: 0.14, staggerChildren: 0.11 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', stiffness: 210, damping: 23 },
  },
};

function ChooseLogin() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <main className="choose-login-page">
      <header className="choose-login__header">
        <BrandLogo />
        <Link to="/">
          <ArrowLeft size={15} aria-hidden="true" />
          Voltar ao início
        </Link>
      </header>

      <section className="choose-login__content" aria-label="Escolha seu tipo de acesso">
        <motion.div
          className="choose-login__grid"
          variants={containerVariants}
          initial={shouldReduceMotion ? false : 'hidden'}
          animate="visible"
        >
          {cards.map(({ title, label, description, to, image, icon: Icon, accent }) => (
            <motion.div key={to} className="choose-card-wrap" variants={cardVariants}>
              <Link className="choose-card" to={to} style={{ '--card-accent': accent }}>
                <img src={image} alt="" />
                <span className="choose-card__overlay" aria-hidden="true" />
                <span className="choose-card__topline">
                  <span className="choose-card__label">{label}</span>
                  <span className="choose-card__icon" aria-hidden="true"><Icon size={22} strokeWidth={1.8} /></span>
                </span>
                <span className="choose-card__copy">
                  <strong>{title}</strong>
                  <small>{description}</small>
                </span>
                <span className="choose-card__arrow" aria-hidden="true">
                  <ArrowUpRight size={20} />
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>
    </main>
  );
}

export default ChooseLogin;
