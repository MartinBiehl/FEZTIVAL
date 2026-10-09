import { Suspense } from 'react';
import Login from '../../views/Login/Login.jsx';

export const metadata = {
  title: 'Entrar',
  description: 'Acesse sua conta Feztival: reservas, propostas ou painel de artista.',
  // Área de acesso, não conteúdo público de descoberta.
  robots: { index: false, follow: false },
};

/*
 * Login único: artista e contratante entram pelo mesmo formulário, e o destino
 * sai da conta (destinationFor). O tipo só é escolhido no cadastro (/cadastro).
 */
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Login role="any" mode="login" />
    </Suspense>
  );
}
