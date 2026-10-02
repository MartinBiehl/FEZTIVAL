'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  const count = user.notificationCount ?? 0;
  const countLabel = count === 1 ? '1 pendência' : `${count} pendências`;

  return (
    <Link
      className="profile-avatar"
      href={user.destination}
      aria-label={count > 0 ? `Abrir ${roleLabel}. ${countLabel}.` : `Abrir ${roleLabel}.`}
      title={`Abrir ${roleLabel}`}
    >
      <span className="profile-avatar__image">
        {!imageFailed && user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" onError={() => setImageFailed(true)} />
        ) : (
          <span className="profile-avatar__fallback" aria-hidden="true">{getInitials(user.name)}</span>
        )}
      </span>
      {count > 0 && <span className="profile-avatar__badge" aria-hidden="true">{count}</span>}
    </Link>
  );
}

export default ProfileAvatar;

