import { Suspense } from 'react';
import { connection } from 'next/server';
import Login from '../../views/Login/Login.jsx';
import { googleConfigured } from '../../lib/googleAuth.js';

export const metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta Feztival: reservas, propostas ou painel de artista.',
  // Área de acesso, não conteúdo público de descoberta.
  robots: { index: false, follow: false },
};

/*
 * Login único: artista e contratante entram pelo mesmo formulário, e o destino
 * sai da conta (destinationFor). O tipo só é escolhido no cadastro (/cadastro).
 *
 * Renderizada a cada acesso, e nao no build: o botao do Google depende das
 * variaveis GOOGLE_* do servidor em execucao, nao das da maquina do build.
 */
export default async function Page() {
  await connection();
  return (
    <Suspense fallback={null}>
      <Login role="any" mode="login" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
