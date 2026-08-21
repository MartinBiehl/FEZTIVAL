/*
 * Embaralhamento estavel por dia.
 *
 * A ordenacao "Recomendados" do catalogo e aleatoria, mas precisa ser a mesma
 * durante todo o dia: se mudasse a cada navegacao, o visitante veria o catalogo
 * pular ao voltar de um perfil.
 *
 * Por que aleatorio: nota nao existe no schema, data de cadastro travaria
 * vantagem permanente para quem chegou primeiro, e proximidade exigiria
 * coordenadas que nao temos. Num marketplace, ordem de exibicao e distribuicao
 * de oportunidade -- artista que nunca aparece nunca e contratado, nunca e
 * avaliado e nunca sobe. Decisao de partida, a revisar com volume real.
 *
 * A semente vem da DATA, nao de Math.random(): o resultado tem de ser
 * reproduzivel para que servidor e cliente cheguem a mesma ordem, senao a
 * hidratacao acusa divergencia.
 */

/* Data em Sao Paulo, no formato AAAA-MM-DD. O dia precisa virar no fuso do
 * publico, nao em UTC. */
export function dailySeed(now = new Date()) {
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

/* Hash determinístico de string para inteiro (FNV-1a de 32 bits). */
function hashString(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/*
 * Ordena por uma chave derivada de (semente + identificador do item). Cada
 * artista recebe sempre a mesma posicao relativa dentro do mesmo dia, e uma
 * ordem diferente no dia seguinte.
 *
 * Nao usa Fisher-Yates com PRNG porque ordenar por chave e idempotente: a
 * mesma entrada produz a mesma saida sem depender da ordem de chegada do
 * banco, que nao tem garantia sem ORDER BY.
 */
export function shuffleWithDailySeed(items, getId, seed = dailySeed()) {
  return [...items]
    .map((item) => ({ item, key: hashString(`${seed}:${getId(item)}`) }))
    .sort((a, b) => a.key - b.key || getId(a.item).localeCompare(getId(b.item)))
    .map((entry) => entry.item);
}
