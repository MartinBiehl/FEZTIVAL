import Login from '../../../views/Login/Login.jsx';

export const metadata = {
  title: 'Entrar como contratante',
  description: 'Acesse sua conta para acompanhar propostas e reservas.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <Login />;
}
