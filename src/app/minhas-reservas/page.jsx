import { redirect } from 'next/navigation';
import ClientBookings from '../../views/ClientBookings/ClientBookings.jsx';
import { createServerSupabase, getCurrentUser } from '../../lib/supabaseServer.js';
import { fetchClientBookings } from '../../lib/bookingQueries.js';

export const metadata = {
  title: 'Minhas reservas',
  description: 'Acompanhe o andamento dos seus pedidos de contratação.',
  robots: { index: false, follow: false },
};

/* Rota dinamica: le a sessao pelos cookies e exige login. */
export default async function Page() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) redirect('/entrar/contratante?next=/minhas-reservas');

  const { clientName, bookings } = await fetchClientBookings(supabase, user.id);
  return <ClientBookings clientName={clientName} bookings={bookings} />;
}
