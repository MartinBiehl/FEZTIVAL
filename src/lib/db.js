import 'server-only';
import pg from 'pg';

/*
 * Conexao unica com o Postgres, usada so no servidor (Server Components,
 * Server Actions e Route Handlers). O navegador nunca fala com o banco.
 *
 * Nao ha RLS: quem decide o que cada usuario le e grava e o codigo de
 * src/lib, que sempre filtra pelo usuario da sessao (getCurrentUser) dentro da
 * propria query. Os dois triggers de bookings continuam no banco.
 */

const { Pool, types } = pg;

/*
 * Mantem a forma que as telas ja consumiam: datas como 'AAAA-MM-DD',
 * timestamps como string ISO e numeric como number. Sem isso o pg devolve
 * Date para date (deslocando o dia pelo fuso) e string para numeric.
 */
types.setTypeParser(types.builtins.DATE, (value) => value);
types.setTypeParser(types.builtins.TIMESTAMPTZ, (value) => new Date(value).toISOString());
types.setTypeParser(types.builtins.NUMERIC, (value) => Number(value));
types.setTypeParser(types.builtins.INT8, (value) => Number(value));

if (!process.env.DATABASE_URL) {
  throw new Error('Banco nao configurado: defina DATABASE_URL em .env.local.');
}

/*
 * Limites de tempo: sem eles, com o banco fora do ar ou a rede caindo, a
 * pagina fica carregando para sempre em vez de mostrar um erro.
 *  - connectionTimeoutMillis: desiste de abrir conexao depois de 10 s;
 *  - statement_timeout / query_timeout: nenhuma consulta passa de 15 s;
 *  - idleTimeoutMillis: fecha conexao parada ha 30 s (poolers como o do
 *    Supabase derrubam conexoes ociosas por conta propria).
 */
function createPool() {
  const created = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 15_000,
    query_timeout: 15_000,
  });
  /*
   * Conexao ociosa que cai (banco reiniciou, rede piscou) dispara "error" no
   * pool. Sem ouvinte, o Node trata como excecao nao capturada. O pool ja
   * descarta a conexao quebrada e abre outra na proxima consulta: so registrar.
   */
  created.on('error', (error) => {
    console.error('Postgres: conexao ociosa caiu', error.code ?? error.message);
  });
  return created;
}

/* Reaproveita o pool entre recargas do `next dev`, que reavalia os modulos. */
const pool = globalThis.feztivalPool ?? createPool();
if (process.env.NODE_ENV !== 'production') globalThis.feztivalPool = pool;

/* Todas as linhas. Use sempre parametros ($1, $2...), nunca interpolacao. */
export async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

/* A primeira linha, ou null. */
export async function queryOne(text, params) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}

/*
 * Executa fn com um cliente dentro de BEGIN/COMMIT; qualquer erro desfaz tudo.
 * fn recebe { query, queryOne } com a mesma assinatura das funcoes acima.
 */
export async function transaction(fn) {
  const client = await pool.connect();
  const tx = {
    query: async (text, params) => (await client.query(text, params)).rows,
    queryOne: async (text, params) => (await client.query(text, params)).rows[0] ?? null,
  };

  let broken = false;
  try {
    await client.query('begin');
    const result = await fn(tx);
    await client.query('commit');
    return result;
  } catch (error) {
    // Se a conexao caiu, o rollback tambem falha; o erro que importa e o original.
    try {
      await client.query('rollback');
    } catch {
      broken = true;
    }
    throw error;
  } finally {
    client.release(broken);
  }
}
