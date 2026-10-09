/*
 * WhatsApp: mascara de digitacao e link de conversa.
 *
 * O banco guarda so os digitos com DDD (10 ou 11), sem o 55 do pais.
 */

/*
 * Mascara progressiva de telefone com DDD: (51) 9999-9999 ou (51) 99999-9999.
 * Corta em 11 digitos; o servidor descarta a pontuacao antes de validar.
 */
export function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  const ddd = digits.slice(0, 2);
  if (digits.length <= 6) return `(${ddd}) ${digits.slice(2)}`;
  const split = digits.length === 11 ? 7 : 6;
  return `(${ddd}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

/* Digitos validos para gravar, ou null. */
export function normalizePhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11 ? digits : null;
}

export function whatsappUrl(phone) {
  return `https://wa.me/55${phone}`;
}
