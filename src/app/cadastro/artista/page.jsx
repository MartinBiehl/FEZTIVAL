import { Suspense } from 'react';
import { connection } from 'next/server';
import ArtistLogin from '../../../views/ArtistLogin/ArtistLogin.jsx';
import { googleConfigured } from '../../../lib/googleAuth.js';

export const metadata = {
  title: 'Criar perfil de artista',
  description: 'Cadastre seu perfil para receber propostas de contratação.',
  robots: { index: false, follow: false },
};

/*
 * Renderizada a cada acesso, e nao no build: o botao do Google depende das
 * variaveis GOOGLE_* do servidor em execucao, nao das da maquina do build.
 */
export default async function Page() {
  await connection();
  return (
    <Suspense fallback={null}>
      <ArtistLogin mode="register" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
