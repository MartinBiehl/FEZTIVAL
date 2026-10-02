import { redirect } from 'next/navigation';
import ProfileEditor from '../../../views/ProfileEditor/ProfileEditor.jsx';
import { createServerSupabase, getCurrentUser } from '../../../lib/supabaseServer.js';
import { fetchProfileEditor } from '../../../lib/profileEditor.js';

export const metadata = {
  title: 'Editar perfil',
  description: 'Atualize as informações do seu perfil de artista.',
  robots: { index: false, follow: false },
};

export default async function Page() {
  const supabase = await createServerSupabase();
  const user = await getCurrentUser(supabase);
  if (!user) redirect('/entrar/artista?next=/painel/perfil');

  const editor = await fetchProfileEditor(supabase, user.id);
  if (!editor) redirect('/minhas-reservas');

  return <ProfileEditor {...editor} />;
}
