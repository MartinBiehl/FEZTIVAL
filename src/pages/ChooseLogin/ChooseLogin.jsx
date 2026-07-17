import { Link } from 'react-router-dom';
import './ChooseLogin.css';
import crowdImg from '../../images/crowd_party.png';
import stageImg from '../../images/concert_stage.png';

function ChooseLogin() {
  return (
    <section className="choose-login-page">
      <Link className="choose-card choose-card--contratante" to="/entrar/contratante">
        <div className="choose-card__image" style={{ backgroundImage: `url(${crowdImg})` }}>
          <div className="choose-card__icon choose-card__icon--yellow" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="20" r="10" stroke="currentColor" strokeWidth="3" />
              <path d="M12 52c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <span className="choose-btn choose-btn--yellow">CONTRATANTE</span>
      </Link>

      <div className="choose-divider" aria-hidden="true">
        <span>ou</span>
      </div>

      <Link className="choose-card choose-card--musico" to="/entrar/artista">
        <div className="choose-card__image" style={{ backgroundImage: `url(${stageImg})` }}>
          <div className="choose-card__icon choose-card__icon--blue" aria-hidden="true">
            <svg viewBox="0 0 64 64" fill="none">
              <rect x="22" y="6" width="20" height="32" rx="10" stroke="currentColor" strokeWidth="3" />
              <path d="M16 30c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="32" y1="46" x2="32" y2="56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="56" x2="40" y2="56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <span className="choose-btn choose-btn--blue">MÚSICO</span>
      </Link>
    </section>
  );
}

export default ChooseLogin;
