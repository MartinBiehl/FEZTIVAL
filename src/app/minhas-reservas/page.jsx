import ClientBookings from '../../views/ClientBookings/ClientBookings.jsx';

export const metadata = {
  title: 'Minhas reservas',
  description: 'Acompanhe o andamento dos seus pedidos de contratação.',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ClientBookings />;
}
