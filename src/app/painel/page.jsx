import { redirect } from 'next/navigation';
import ArtistDashboard from '../../views/ArtistDashboard/ArtistDashboard.jsx';
import { getCurrentUser } from '../../lib/auth.js';
import { fetchArtistDashboard } from '../../lib/bookingQueries.js';
import { formatLongToday, greeting } from '../../lib/bookingDisplay.js';

export const metadata = {
  title: 'Painel do artista',
  description: 'Gerencie seu perfil, seus serviços e as propostas recebidas.',
  robots: { index: false, follow: false },
};

/*
 * Rota dinamica: le a sessao pelos cookies. Sem login, vai para o acesso do
 * artista; logado sem cadastro artistico, vai para as proprias reservas.
 */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar/artista?next=/painel');

  const dashboard = await fetchArtistDashboard(user.id);
  if (!dashboard) redirect('/minhas-reservas');

  return <ArtistDashboard {...dashboard} todayLabel={formatLongToday()} greetingText={greeting()} />;
}
