import { Suspense } from 'react';
import PasswordRecovery from '../../views/PasswordRecovery/PasswordRecovery.jsx';

export const metadata = {
  title: 'Recuperar senha',
  description: 'Informe seu e-mail para receber o código de recuperação.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PasswordRecovery step="email" />
    </Suspense>
  );
}
