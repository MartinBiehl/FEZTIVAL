import { Suspense } from 'react';
import PasswordRecovery from '../../../views/PasswordRecovery/PasswordRecovery.jsx';

export const metadata = {
  title: 'Confirmar código',
  description: 'Digite o código enviado para o seu e-mail.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PasswordRecovery step="code" />
    </Suspense>
  );
}
