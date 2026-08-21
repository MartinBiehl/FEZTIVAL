import { Suspense } from 'react';
import Login from '../../../views/Login/Login.jsx';

export const metadata = {
  title: 'Criar conta de contratante',
  description: 'Cadastre-se para enviar propostas aos artistas da sua região.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Login mode="register" />
    </Suspense>
  );
}
