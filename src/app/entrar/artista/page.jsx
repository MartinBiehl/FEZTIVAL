import { Suspense } from 'react';
import ArtistLogin from '../../../views/ArtistLogin/ArtistLogin.jsx';

export const metadata = {
  title: 'Entrar como artista',
  description: 'Acesse seu perfil de artista para gerenciar propostas e agenda.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ArtistLogin mode="login" />
    </Suspense>
  );
}
