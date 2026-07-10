import './ChooseLogin.css';
import crowdImg from '../../images/crowd_party.png';
import stageImg from '../../images/concert_stage.png';

function ChooseLogin({ onNavigate }) {
  return (
    <section className="choose-login-page">
      {/* Card Contratante */}
      <div className="choose-card choose-card--contratante" onClick={() => onNavigate('login')}>
        <div className="choose-card__image" style={{ backgroundImage: `url(${crowdImg})` }}>
          <div className="choose-card__icon choose-card__icon--yellow">
            {/* Person icon */}
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="32" cy="20" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
              <path d="M12 52c0-11.046 8.954-20 20-20s20 8.954 20 20" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>
        <button className="choose-btn choose-btn--yellow">CONTRATANTE</button>
      </div>

      {/* "ou" divider */}
      <div className="choose-divider">
        <span>ou</span>
      </div>

      {/* Card Músico */}
      <div className="choose-card choose-card--musico" onClick={() => onNavigate('artistLogin')}>
        <div className="choose-card__image" style={{ backgroundImage: `url(${stageImg})` }}>
          <div className="choose-card__icon choose-card__icon--blue">
            {/* Microphone icon */}
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="22" y="6" width="20" height="32" rx="10" stroke="currentColor" strokeWidth="3" fill="none" />
              <path d="M16 30c0 8.837 7.163 16 16 16s16-7.163 16-16" stroke="currentColor" strokeWidth="3" strokeLinecap="round" fill="none" />
              <line x1="32" y1="46" x2="32" y2="56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              <line x1="24" y1="56" x2="40" y2="56" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <button className="choose-btn choose-btn--blue">MÚSICO</button>
      </div>
    </section>
  );
}

export default ChooseLogin;
