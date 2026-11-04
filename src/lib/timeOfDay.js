/*
 * Horario digitado no formato HH:MM, usado pelo campo TimeInput e pela
 * validacao das Server Actions. Sem banco: roda no navegador e no servidor.
 */

/* Tambem vai no atributo pattern do campo. */
export const TIME_PATTERN = '([01][0-9]|2[0-3]):[0-5][0-9]';

const TIME_OF_DAY = new RegExp(`^${TIME_PATTERN}$`);

export const TIME_LENGTH = 5;

export function isTimeOfDay(value) {
  return TIME_OF_DAY.test(value ?? '');
}

/*
 * Formata enquanto se digita: "2230" -> "22:30", "22h3" -> "22:3". Nenhuma hora
 * comeca com 3 ou mais, entao esse digito ja e a hora inteira: "7" -> "07". Um
 * digito seguido de separador tambem: "1:30" -> "01:30", e nao "13:0".
 */
export function shapeTime(value) {
  const text = String(value ?? '');
  let digits = text.replace(/\D/g, '');
  if (digits && (digits[0] > '2' || /^\D*\d\D/.test(text))) digits = `0${digits}`;
  digits = digits.slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits;
}

/* Completa ao terminar de digitar: "22" -> "22:00", "2" -> "02:00", "22:3" -> "22:30". */
export function completeTime(value) {
  const digits = shapeTime(value).replace(':', '');
  if (!digits) return '';
  return `${digits.slice(0, 2).padStart(2, '0')}:${digits.slice(2).padEnd(2, '0')}`;
}
