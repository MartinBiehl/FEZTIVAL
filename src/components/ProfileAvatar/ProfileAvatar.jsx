import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import './ProfileAvatar.css';

function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.slice(0, 1))
    .join('')
    .toUpperCase();
}

function ProfileAvatar({ user }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => setImageFailed(false), [user.avatarUrl]);

  const roleLabel = user.role === 'artist' ? 'painel do artista' : 'minhas reservas';
  const countLabel = user.notificationCount === 1 ? '1 pendência' : `${user.notificationCount} pendências`;

  return (
    <Link
      className="profile-avatar"
      to={user.destination}
      aria-label={`Abrir ${roleLabel}. ${countLabel}.`}
      title={`Abrir ${roleLabel}`}
    >
      <span className="profile-avatar__image">
        {!imageFailed && user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <span className="profile-avatar__fallback" aria-hidden="true">{getInitials(user.name)}</span>
        )}
      </span>
      <span className="profile-avatar__badge" aria-hidden="true">{user.notificationCount}</span>
    </Link>
  );
}

export default ProfileAvatar;

