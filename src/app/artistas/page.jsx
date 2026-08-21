import { redirect } from 'next/navigation';

/* Redirect de URL antiga: /artistas passou a ser /explorar. */
export default function Page() {
  redirect('/explorar');
}
