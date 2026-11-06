'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import BrandLogo from '../BrandLogo/BrandLogo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import './AccountBar.css';

/*
 * Navegacao unica da area logada (painel, editor de perfil e minhas
 * reservas). Antes cada tela tinha a sua: o painel uma lateral com um link
 * so, o editor um cabecalho com "voltar", as reservas outro menu.
 *
 * isArtist vem do servidor, e nao do AuthContext: a sessao do contexto chega
 * depois de montar, e os links do artista "piscariam" na tela.
 */
const ARTIST_LINKS = [
  { href: '/painel', label: 'Painel' },
  { href: '/painel/perfil', label: 'Meu perfil' },
  { href: '/minhas-reservas', label: 'Minhas reservas' },
];

const CLIENT_LINKS = [
  { href: '/minhas-reservas', label: 'Minhas reservas' },
  { href: '/explorar', label: 'Explorar artistas' },
];

function AccountBar({ isArtist = false, publicProfileSlug = null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const links = isArtist ? ARTIST_LINKS : CLIENT_LINKS;

  const handleLogout = async () => {
    await logout();
    router.push('/');
    router.refresh();
  };

  return (
    <header className="account-bar">
      <div className="account-bar__content page-container">
        <BrandLogo />
        <nav className="account-bar__nav" aria-label="Área da conta">
          {links.map(({ href, label }) => {
            const isCurrent = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={isCurrent ? 'active' : undefined}
                aria-current={isCurrent ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
          {publicProfileSlug && (
            <Link href={`/artista/${publicProfileSlug}`} target="_blank">
              Ver perfil público<ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          )}
        </nav>
        <button className="account-bar__logout" type="button" onClick={handleLogout}>Sair</button>
      </div>
    </header>
  );
}

export default AccountBar;
