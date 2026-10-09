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
