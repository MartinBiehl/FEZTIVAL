/*
 * Migrations e seed do banco, sem ferramenta externa.
 *
 *   npm run db:migrate   aplica, em ordem, as migrations de db/migrations
 *                        ainda nao registradas em schema_migrations
 *   npm run db:seed      roda db/seed.sql (dados de demonstracao)
 *   npm run db:test      roda os scripts de db/tests numa transacao desfeita no fim
 *
 * Cada migration roda numa transacao: se falhar, nada dela fica no banco.
 * Migration ja aplicada nunca e editada -- mudanca sempre em arquivo novo.
 * Le DATABASE_URL de .env.local (ou do ambiente).
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const ROOT = path.resolve(import.meta.dirname, '..');
const MIGRATIONS_DIR = path.join(ROOT, 'db', 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('Defina DATABASE_URL em .env.local.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )`);
  const applied = new Set((await client.query('select name from schema_migrations')).rows.map((row) => row.name));
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback');
      throw new Error(`${file}: ${error.message}`);
    }
    console.log(`aplicada ${file}`);
    count += 1;
  }
  console.log(count ? `${count} migration(s) aplicada(s).` : 'Nenhuma migration pendente.');
}

async function seed() {
  if (process.env.NODE_ENV === 'production') throw new Error('O seed e de demonstracao: nao rode em producao.');
  await client.query(await readFile(path.join(ROOT, 'db', 'seed.sql'), 'utf8'));
  console.log('Seed aplicado.');
}

/* Os testes levantam excecao ao falhar; o rollback garante que nada fica gravado. */
async function test() {
  const dir = path.join(ROOT, 'db', 'tests');
  for (const file of (await readdir(dir)).filter((name) => name.endsWith('.sql')).sort()) {
    await client.query('begin');
    try {
      await client.query(await readFile(path.join(dir, file), 'utf8'));
      console.log(`ok   ${file}`);
    } catch (error) {
      console.error(`FALHOU ${file}: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await client.query('rollback');
    }
  }
}

const commands = { migrate, seed, test };
const command = commands[process.argv[2]];
if (!command) {
  console.error(`Uso: node scripts/db.js <${Object.keys(commands).join('|')}>`);
  process.exit(1);
}

await client.connect();
client.on('notice', (notice) => console.log(`  ${notice.message}`));
try {
  await command();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
