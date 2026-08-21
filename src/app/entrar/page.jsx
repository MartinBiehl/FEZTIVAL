import ChooseLogin from '../../views/ChooseLogin/ChooseLogin.jsx';

export const metadata = {
  title: 'Entrar',
  description: 'Acesse o Feztival como contratante ou como artista.',
  // Área de acesso, não conteúdo público de descoberta.
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ChooseLogin />;
}
