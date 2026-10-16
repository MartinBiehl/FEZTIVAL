/*
 * Rotulos e formatacao de reservas, compartilhados pelo painel do artista e
 * por "Minhas reservas". Datas do banco sao `date` sem fuso; o fuso de
 * referencia do produto e o de Sao Paulo.
 */

export const TIME_ZONE = 'America/Sao_Paulo';

/* Rotulo de cada status, do ponto de vista de quem le. */
export const STATUS_LABEL = {
  artist: {
    pending: 'Nova',
    accepted: 'Aceita',
    confirmed: 'Confirmada',
    completed: 'Concluída',
    declined: 'Recusada',
    cancelled: 'Cancelada',
  },
  client: {
    pending: 'Aguardando resposta',
    accepted: 'Aceita pelo artista',
    confirmed: 'Confirmada',
    completed: 'Concluída',
    declined: 'Recusada',
    cancelled: 'Cancelada',
  },
};

/* "2026-10-01" no fuso de Sao Paulo. */
export function todayIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/* "14:05" no fuso de Sao Paulo: com todayIso, diz se um horario de hoje ja passou. */
export function nowTimeIso(now = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now);
}

/*
 * Data digitada no formulario ("2026-12-19") como Date, ou null. O campo de
 * data aceita ano com 5 ou 6 digitos enquanto se digita, e Intl.DateTimeFormat
 * lanca RangeError com data invalida: formatar sem esta checagem derruba a tela.
 */
export function parseFormDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* Soma dias a uma data ISO sem passar por fuso. */
export function addDaysIso(iso, days) {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseIsoDate(iso) {
  return new Date(`${iso}T12:00:00Z`);
}

/* { day: '18', month: 'OUT' } para o bloco de data dos cartoes. */
export function dateParts(iso) {
  const date = parseIsoDate(iso);
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'short', timeZone: 'UTC' })
    .format(date)
    .replace('.', '')
    .toUpperCase();
  return { day: String(date.getUTCDate()).padStart(2, '0'), month };
}

/* "18 OUT 2026" */
export function formatShortDate(iso) {
  const { day, month } = dateParts(iso);
  return `${day} ${month} ${iso.slice(0, 4)}`;
}

/* "Quinta-feira, 1 de outubro" */
export function formatLongToday(now = new Date()) {
  const text = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long',
  }).format(now);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* Saudacao pela hora em Sao Paulo. */
export function greeting(now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE, hour: 'numeric', hourCycle: 'h23',
  }).format(now));
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

/* "20:00:00" -> "20h"; "20:30:00" -> "20h30"; nulo -> null */
export function formatEventTime(value) {
  if (!value) return null;
  const [hour, minute] = value.split(':');
  return minute === '00' ? `${hour}h` : `${hour}h${minute}`;
}

const DAY_MINUTES = 24 * 60;

/*
 * Horario de termino a partir do inicio ("23:00" ou "23:00:00" do banco) e da
 * duracao. Show que passa da meia-noite termina no dia seguinte: 23h + 3h
 * acaba as 2h, com nextDay. Sem duracao nao ha termino a mostrar.
 */
export function eventEnd(time, durationMinutes) {
  const duration = Number(durationMinutes);
  if (!/^\d{2}:\d{2}/.test(time ?? '') || !Number.isInteger(duration) || duration <= 0) return null;
  const [hour, minute] = time.split(':').map(Number);
  const total = hour * 60 + minute + duration;
  const end = total % DAY_MINUTES;
  const pad = (value) => String(value).padStart(2, '0');
  return { time: `${pad(Math.floor(end / 60))}:${pad(end % 60)}`, nextDay: total > DAY_MINUTES };
}

/* "23h às 2h do dia seguinte"; sem duracao, so o inicio ("23h"). */
export function formatEventTimeRange(time, durationMinutes) {
  const start = formatEventTime(time);
  const end = eventEnd(time, durationMinutes);
  if (!start || !end) return start;
  return `${start} às ${formatEventTime(end.time)}${end.nextDay ? ' do dia seguinte' : ''}`;
}

/* Inicio entre meia-noite e 6h: a data do evento e a do dia que comeca depois da meia-noite. */
export function startsAfterMidnight(time) {
  return /^0[0-5]:/.test(time ?? '');
}

/* "R$ 2.800", ou "A combinar" quando ainda nao ha valor. */
export function formatMoney(value) {
  if (value == null) return 'A combinar';
  return Number(value).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL', maximumFractionDigits: 2, minimumFractionDigits: 0,
  });
}

/* "R$ 8,7k" para as metricas do painel. */
export function formatCompactMoney(value) {
  if (value < 1000) return formatMoney(value);
  return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
}

export function initials(name) {
  return (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

/*
 * Estimativa exibida no formulario de proposta: preco do servico com a
 * duracao escolhida, senao o preco inicial. E a mesma regra que createBooking
 * grava em agreed_price -- mude as duas juntas.
 */
export function estimatePrice(artist, durationMinutes) {
  const service = (artist.services ?? []).find((item) => item.durationMinutes === Number(durationMinutes));
  return service?.price ?? artist.price ?? null;
}

/*
 * Local do evento como fica gravado em bookings.event_location: o formulario
 * pede nome do local (opcional), endereco e cidade separados, e a reserva
 * guarda uma linha so ("Salao Aurora, Rua A, 123, Ivoti"). Usado pelo envio
 * (bookingActions.js) e pela previa do formulario, para os dois baterem.
 */
export function joinEventLocation({ venueName, address, city }) {
  return [venueName, address, city]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean)
    .join(', ');
}
