/*
 * Formatacao de campos de artista que podem estar vazios.
 *
 * Existe porque o banco permite ausencia onde src/data sempre tinha valor:
 * a nota deriva de avaliacoes reais (artista novo nao tem nenhuma), e o preco
 * e opcional quando o artista escolhe "sob consulta". Sem estes helpers, cada
 * tela repetiria a mesma condicional -- e um `null.toFixed(1)` esquecido
 * derruba o componente inteiro, nao so o trecho da nota.
 */

/* Nota exige media E contagem: media sem avaliacao nao significa nada. */
export function hasRating(artist) {
  return artist.rating != null && artist.reviews > 0;
}

/* "4,9" no formato pt-BR, ou null quando nao ha avaliacao. */
export function formatRating(artist) {
  if (!hasRating(artist)) return null;
  return artist.rating.toFixed(1).replace('.', ',');
}

/* "87 avaliações" / "1 avaliação", ou null. */
export function formatReviewCount(artist) {
  if (!hasRating(artist)) return null;
  return `${artist.reviews} ${artist.reviews === 1 ? 'avaliação' : 'avaliações'}`;
}

/*
 * Rotulo para artista sem avaliacao. "Novo na plataforma" carrega a mesma
 * informacao que "Sem avaliações" sem penalizar quem esta comecando.
 */
export const NO_RATING_LABEL = 'Novo na plataforma';

/* "R$ 2.500", ou "Sob consulta" quando o artista nao publica valor. */
export function formatPrice(artist) {
  if (artist.price == null) return 'Sob consulta';
  return `R$ ${artist.price.toLocaleString('pt-BR')}`;
}

/*
 * Maior duracao de set oferecida, em horas ("3h"), ou null quando o artista
 * nao cadastrou servicos. Math.max() sem argumentos devolve -Infinity, que
 * chegaria na tela como "-Infinity h".
 */
export function formatMaxDuration(artist) {
  const minutes = artist.setMinutes;
  if (!Array.isArray(minutes) || minutes.length === 0) return null;
  return `${Math.max(...minutes) / 60}h`;
}
