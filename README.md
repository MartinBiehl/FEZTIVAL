# Feztival

Marketplace web para descobrir e contratar músicos, DJs e bandas locais para eventos
em Ivoti e região.

## Desenvolvimento

Requer Node 22+ e Postgres 17.

### macOS (Terminal)

```bash
brew install postgresql@17 && brew services start postgresql@17
createdb feztival
cp .env.example .env.local   # DATABASE_URL, MEDIA_DIR e SMTP_URL
npm install
npm run db:migrate           # cria o schema e os catálogos
npm run db:seed              # 8 artistas de demonstração (nunca em produção)
npm run dev
```

### Contas de teste

O `npm run db:seed` também cria duas contas que conseguem entrar, ambas com a senha
`feztival123` e o e-mail já confirmado. Use só no ambiente local.

| Tipo | E-mail | Depois de entrar |
|---|---|---|
| Artista (DJ Kauan) | `dj-kauan@seed.feztival.local` | `/painel` |
| Contratante | `contratante@seed.feztival.local` | `/minhas-reservas` |

### Windows (cmd)

O instalador do Postgres pede uma senha para o usuário `postgres` e deixa o serviço
iniciando junto com o Windows. Os comandos do Postgres não entram no PATH, por isso
o `set PATH` abaixo (vale só para aquela janela do cmd).

```bat
winget install PostgreSQL.PostgreSQL.17
set PATH=%PATH%;C:\Program Files\PostgreSQL\17\bin
createdb -U postgres feztival
copy .env.example .env.local
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Sem `winget`, baixe o instalador em <https://www.postgresql.org/download/windows/>.

No `.env.local` do Windows, a URL leva o usuário e a senha escolhidos na instalação:

```
DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/feztival
```

### Windows sem administrador (Postgres portátil)

Sem permissão de administrador, use o zip "binaries" do Postgres 17 da EnterpriseDB
(<https://www.enterprisedb.com/download-postgresql-binaries>), que não precisa de
instalação. Extraia a pasta `pgsql` em `%LOCALAPPDATA%\Programs` e, no cmd, crie o
banco uma única vez (o `initdb` pede a senha do usuário `postgres`):

```bat
set PATH=%PATH%;%LOCALAPPDATA%\Programs\pgsql\bin
initdb -D "%LOCALAPPDATA%\pgdata" -U postgres -W -A scram-sha-256 -E UTF8 --locale=C
pg_ctl -D "%LOCALAPPDATA%\pgdata" -l "%LOCALAPPDATA%\pgdata\postgres.log" start
createdb -h localhost -U postgres feztival
createdb -h localhost -U postgres feztival_test
```

Esse Postgres não é um serviço do Windows: depois de reiniciar o PC, ligue-o antes
do `npm run dev` (troque `start` por `stop` para desligar):

```bat
"%LOCALAPPDATA%\Programs\pgsql\bin\pg_ctl" -D "%LOCALAPPDATA%\pgdata" -l "%LOCALAPPDATA%\pgdata\postgres.log" start
```

Para conectar num cliente (DBeaver, pgAdmin, `psql`): host `localhost`, porta `5432`,
usuário `postgres`, a senha definida no `initdb` e o banco `feztival`. No `.env.local`,
a URL é a mesma do instalador, acima.

Com Node 20, os scripts `npm run db:*` e `npm test` falham com
`bad option: --env-file-if-exists`. Atualize para o Node 22 ou chame o script direto:

```bat
node --env-file=.env.local scripts/db.js migrate
node --env-file=.env.local scripts/db.js seed
```

### Testes no Windows

Para os testes no cmd, defina a variável antes, em vez de prefixar o comando:

```bat
createdb -U postgres feztival_test
set TEST_DATABASE_URL=postgres://postgres:SUA_SENHA@localhost:5432/feztival_test
npm test
```

Sem `SMTP_URL`, os e-mails de confirmação e de recuperação de senha aparecem no
terminal do `npm run dev`.

O projeto é uma aplicação Next.js (App Router), JavaScript e CSS puro, com o próprio
servidor do Next como backend sobre Postgres.
Consulte o [AGENTS.md](./AGENTS.md) para arquitetura, rotas e decisões de produto.
