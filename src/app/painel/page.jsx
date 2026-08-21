import ArtistDashboard from '../../views/ArtistDashboard/ArtistDashboard.jsx';

export const metadata = {
  title: 'Painel do artista',
  description: 'Gerencie seu perfil, seus serviços e as propostas recebidas.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ArtistDashboard />;
}
