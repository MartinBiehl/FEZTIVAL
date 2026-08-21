import { redirect } from 'next/navigation';

/* Equivalente ao <Navigate to="/explorar" replace /> do App.jsx original. */
export default function Page() {
  redirect('/explorar');
}
