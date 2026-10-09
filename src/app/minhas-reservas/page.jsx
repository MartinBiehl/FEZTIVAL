import { redirect } from 'next/navigation';
import ClientBookings from '../../views/ClientBookings/ClientBookings.jsx';
import { getCurrentUser } from '../../lib/auth.js';
import { fetchClientBookings } from '../../lib/bookingQueries.js';

export const metadata = {
  title: 'Minhas reservas',
  description: 'Acompanhe o andamento dos seus pedidos de contratação.',
  robots: { index: false, follow: false },
};

/* Rota dinamica: le a sessao pelos cookies e exige login. */
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/minhas-reservas');

  const { clientName, bookings } = await fetchClientBookings(user.id);
  return <ClientBookings clientName={clientName} bookings={bookings} />;
}
