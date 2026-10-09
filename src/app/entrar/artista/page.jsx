import { redirectToLogin } from '../../../lib/loginRedirect.js';

/* Endereço antigo: o login agora é único em /entrar. */
export default async function Page({ searchParams }) {
  await redirectToLogin(searchParams);
}
