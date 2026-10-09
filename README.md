# Feztival

Marketplace web para descobrir e contratar músicos, DJs e bandas locais para eventos
em Ivoti e região.

## Desenvolvimento

Requer Node 22+ e Postgres 17.

```bash
brew install postgresql@17 && brew services start postgresql@17
createdb feztival
cp .env.example .env.local   # DATABASE_URL, MEDIA_DIR e SMTP_URL
npm install
npm run db:migrate           # cria o schema e os catálogos
npm run db:seed              # 8 artistas de demonstração (nunca em produção)
npm run dev
```

Sem `SMTP_URL`, os e-mails de confirmação e de recuperação de senha aparecem no
terminal do `npm run dev`.

O projeto é uma aplicação Next.js (App Router), JavaScript e CSS puro, com o próprio
servidor do Next como backend sobre Postgres.
Consulte o [AGENTS.md](./AGENTS.md) para arquitetura, rotas e decisões de produto.
