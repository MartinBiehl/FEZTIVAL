import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import CompleteSignup from '../../../views/CompleteSignup/CompleteSignup.jsx';
import { SIGNUP_COOKIE, findGoogleSignup } from '../../../lib/googleAuth.js';

export const metadata = {
  title: 'Complete seu cadastro',
  robots: { index: false, follow: false },
};

/*
 * Segunda etapa do cadastro pelo Google: o Google ja confirmou nome e e-mail;
 * aqui a pessoa informa o que ele nao fornece (WhatsApp, termos e, se for
 * artista, nome artistico e categoria). Sem cadastro pendente valido no cookie,
 * volta para /entrar.
 */
export default async function Page() {
  const token = (await cookies()).get(SIGNUP_COOKIE)?.value;
  const pending = await findGoogleSignup(token);
  if (!pending) redirect('/entrar?erro=google-expirado');

  return (
    <CompleteSignup
      email={pending.email}
      fullName={pending.full_name ?? ''}
      signupAs={pending.signup_as}
    />
  );
}
