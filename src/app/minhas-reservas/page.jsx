import { redirect } from 'next/navigation';
import ClientBookings from '../../views/ClientBookings/ClientBookings.jsx';
import { getCurrentUser } from '../../lib/auth.js';
import { fetchClientBookings } from '../../lib/bookingQueries.js';
import { queryOne } from '../../lib/db.js';

export const metadata = {
  title: 'Minhas reservas',
  description: 'Acompanhe o andamento dos seus pedidos de contratação.',
  robots: { index: false, follow: false },
};

/* Rota dinamica: le a sessao pelos cookies e exige login. */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/minhas-reservas');

  const [{ bookings }, artist] = await Promise.all([
    fetchClientBookings(user.id),
    // Quem tem cadastro artistico tambem contrata: a navegacao mostra o painel.
    queryOne('select 1 from artists where profile_id = $1 limit 1', [user.id]),
  ]);
  return <ClientBookings bookings={bookings} isArtist={Boolean(artist)} />;
}
