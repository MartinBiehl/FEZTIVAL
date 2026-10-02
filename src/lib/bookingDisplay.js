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
