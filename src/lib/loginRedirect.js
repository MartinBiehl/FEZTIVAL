import { redirect } from 'next/navigation';

/*
 * /entrar/artista e /entrar/contratante viraram /entrar. Os endereços antigos
 * continuam em links e e-mails já enviados, então redirecionam mantendo a
 * query (?next=, ?senhaRedefinida=, ?erro=).
 */
export async function redirectToLogin(searchParams) {
  const params = new URLSearchParams();
  Object.entries((await searchParams) ?? {}).forEach(([key, value]) => {
    [].concat(value).forEach((item) => params.append(key, item));
  });
  const query = params.toString();
  redirect(query ? `/entrar?${query}` : '/entrar');
}
