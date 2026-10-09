import { Suspense } from 'react';
import ChooseLogin from '../../views/ChooseLogin/ChooseLogin.jsx';

export const metadata = {
  title: 'Criar conta',
  description: 'Crie sua conta no Feztival como contratante ou como artista.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ChooseLogin />
    </Suspense>
  );
}
