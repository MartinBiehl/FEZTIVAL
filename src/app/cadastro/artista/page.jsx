import { Suspense } from 'react';
import ArtistLogin from '../../../views/ArtistLogin/ArtistLogin.jsx';
import { googleConfigured } from '../../../lib/googleAuth.js';

export const metadata = {
  title: 'Criar perfil de artista',
  description: 'Cadastre seu perfil para receber propostas de contratação.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ArtistLogin mode="register" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
