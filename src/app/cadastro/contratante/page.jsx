import { Suspense } from 'react';
import { connection } from 'next/server';
import Login from '../../../views/Login/Login.jsx';
import { googleConfigured } from '../../../lib/googleAuth.js';

export const metadata = {
  title: 'Criar conta de contratante',
  description: 'Cadastre-se para enviar propostas aos artistas da sua região.',
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
      <Login mode="register" googleEnabled={googleConfigured()} />
    </Suspense>
  );
}
