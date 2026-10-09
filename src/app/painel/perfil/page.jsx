import { redirect } from 'next/navigation';
import ProfileEditor from '../../../views/ProfileEditor/ProfileEditor.jsx';
import { getCurrentUser } from '../../../lib/auth.js';
import { fetchProfileEditor } from '../../../lib/profileEditor.js';

export const metadata = {
  title: 'Editar perfil',
  description: 'Atualize as informações do seu perfil de artista.',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/painel/perfil');

  const editor = await fetchProfileEditor(user.id);
  if (!editor) redirect('/minhas-reservas');

  return <ProfileEditor {...editor} />;
}
