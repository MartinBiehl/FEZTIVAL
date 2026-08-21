import { Suspense } from 'react';
import PasswordRecovery from '../../../views/PasswordRecovery/PasswordRecovery.jsx';

export const metadata = {
  title: 'Definir nova senha',
  description: 'Escolha uma nova senha para a sua conta.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PasswordRecovery step="password" />
    </Suspense>
  );
}
