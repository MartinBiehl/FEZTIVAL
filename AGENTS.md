# AGENTS.md

Este arquivo descreve o projeto como ele existe hoje e orienta mudanças futuras.

## Visão do produto

Feztival é um marketplace web que conecta artistas locais — músicos, DJs e bandas —
a pessoas e empresas que organizam eventos. O mercado inicial é Ivoti e cidades
próximas do Vale do Sinos.

O produto tem dois públicos:

- **Contratantes:** descobrem artistas, comparam perfis e enviam pedidos de contratação.
- **Artistas:** apresentam seu trabalho, serviços e disponibilidade e administram propostas.

O fluxo central é: explorar → conhecer o artista → enviar uma proposta → confirmar →
avaliar. O Feztival não é uma rede social nem um aplicativo de relacionamento.

## Arquitetura atual

O repositório contém uma única aplicação frontend:

```text
Browser
  └── Next.js (App Router) + React 19
      ├── roteamento por arquivo em src/app
      ├── JavaScript/JSX
      ├── CSS modular por componente/página
      ├── Server Actions e Route Handler (escritas e autenticação)
      └── Supabase: Postgres com RLS + Auth
```

Tecnologias em uso:

| Camada | Tecnologia |
|---|---|
| Framework / build | Next.js 16 (App Router, Turbopack) |
| Interface | React |
| Rotas | Roteamento por arquivo do App Router |
| Linguagem | JavaScript + JSX |
| Estilos | CSS puro, mobile-first |
| Dados | PostgreSQL no Supabase, lido em Server Components |
| Cliente do banco | `@supabase/supabase-js` + `@supabase/ssr`, chave publishable |
| Autenticação | Supabase Auth (e-mail e senha), sessão em cookies |
| Escrita | Server Actions; um Route Handler para o link de confirmação |

Não existe backend separado: o Supabase é o backend, e a camada de servidor do
Next (Server Components, Server Actions, Route Handlers) fala com ele. Não há dado
simulado no repositório — `src/data` foi removido. As cores do wordmark, únicas
que restavam ali, vivem no próprio `BrandLogo`, o único consumidor.

Todas as telas leem do banco: as públicas com o cliente anônimo, `/painel` e
`/minhas-reservas` com a sessão do usuário, filtradas pela RLS via `auth.uid()`.

Não há TypeScript, Tailwind ou monorepo neste momento. Não introduza essas
tecnologias como se já fizessem parte do projeto.

`next.config.js` traz `agentRules: false`: sem isso o `next dev` anexa automaticamente
um bloco de instruções ao final deste arquivo, que é mantido à mão. Não remova a flag.

A migração de Vite para Next.js foi aprovada e executada na Fase 1, motivada por SEO:
perfis de artista precisam ser indexáveis, e o Vite entregava HTML praticamente vazio.
O legado do Vite (`index.html`, `src/App.jsx`, `src/main.jsx`, `vite.config.js`, os
scripts `*:vite` e os pacotes `vite`, `@vitejs/plugin-react` e `react-router-dom`) foi
removido após a aprovação da paridade visual. Para consultar o projeto original, use um
worktree no último commit anterior à migração:

```bash
git worktree add ../feztival-vite c0ba3a4
```

## Estrutura

```text
src/
├── app/              # rotas do App Router (layouts, page.jsx, not-found)
├── components/       # componentes compartilhados
├── context/          # AuthContext (usuário logado, no navegador)
├── images/           # imagens locais
├── lib/              # acesso a dados, Server Actions e formatação
├── views/            # uma pasta por página (antes: pages/)
├── styles/           # tokens e estilos globais
├── hooks/            # hooks compartilhados
└── proxy.js          # renova a sessão Supabase a cada requisição
```

`src/lib` concentra o acesso a dados e a formatação:

| Arquivo | Papel |
|---|---|
| `supabaseConfig.js` | URL e chave do projeto, lidas uma vez |
| `supabase.js` | cliente **anônimo**, sem cookies, para as leituras públicas |
| `supabaseServer.js` | cliente com a sessão do usuário (Server Components, Actions, Route Handlers) |
| `supabaseBrowser.js` | cliente do navegador: `AuthContext` e envio de imagens ao Storage |
| `account.js` | `ensureAccount` (cria `profiles` e o rascunho em `artists`), `safeNextPath`, `slugify` |
| `accountActions.js` | Server Actions de login, cadastro e recuperação de senha |
| `bookingActions.js` | Server Actions de proposta, mudança de status e avaliação |
| `bookingQueries.js` | leituras do painel e de "Minhas reservas" |
| `bookingDisplay.js` | rótulos de status, datas no fuso de São Paulo, valores |
| `artistActions.js` | contagem de visualização do perfil |
| `profileEditor.js` | leitura do editor de perfil e catálogos |
| `profileActions.js` | Server Actions do perfil do artista: salvar o formulário, foto principal e galeria |
| `artistMedia.js` | Bucket de imagens: caminhos, URL pública e redução da foto no navegador |
| `artistQueries.js` | leitura de artistas; converte a linha do banco para a forma das telas |
| `artistDisplay.js` | formata campos que podem estar vazios (nota, preço, duração) |
| `artistSeo.js` | título, descrição e JSON-LD dos perfis |
| `dailyShuffle.js` | embaralhamento estável por dia, da ordenação "Recomendados" |
| `site.js` | URL absoluta e metadados do site |

Na raiz, fora de `src/`:

```text
supabase/
├── migrations/       # schema versionado, aplicado com db push
├── tests/            # scripts de verificação, rodados no SQL Editor
├── seed.sql          # os 8 artistas de demonstração
└── config.toml
```

Cada página mantém seu JSX e CSS juntos em `src/views/NomeDaPagina`. Componentes
reutilizados por mais de uma página ficam em `src/components`.

A pasta foi renomeada de `pages/` para `views/` porque `pages` é nome reservado pelo
Next.js (Pages Router) e colidia com o App Router, quebrando o build.

Os arquivos em `src/app` são apenas roteamento: cada `page.jsx` importa a view
correspondente. Marque `'use client'` somente onde há estado, efeitos, handlers ou
animação (`motion`); o resto permanece Server Component.

As rotas com Header e Footer ficam no Route Group `src/app/(public)/`, que carrega o
shell `site-shell`. As rotas de acesso (`/entrar*`) e as autenticadas (`/painel`,
`/minhas-reservas`) ficam fora do grupo, sem shell — preservando a distinção que o
`App.jsx` do Vite fazia com `PublicLayout`.

### Imagens importadas

No Vite, `import foto from './foto.png'` devolvia uma **string**. No Next devolve um
**objeto** `{ src, width, height }`. Portanto use sempre `foto.src`:

```jsx
<img src={foto.src} />                                  // correto
<div style={{ backgroundImage: `url(${foto.src})` }} />  // correto
<img src={foto} />                                      // vira "[object Object]" e dá 404
```

Vale também para imagens guardadas em módulos de dados: resolva `.src` no próprio
módulo, para que todos os consumidores recebam string. Essa diferença causou uma
regressão em que nenhuma imagem carregava, em 5 rotas e 3 padrões diferentes.

`next/image` **não** é usado: adotá-lo exigiria mudar o CSS das imagens. Decisão a
revisitar em fase futura.

## Rotas do produto

| Página | Rota | Papel |
|---|---|---|
| Landing institucional | `/` | Explica marca, proposta e confiança |
| Explorar artistas | `/explorar` | Catálogo, pesquisa e filtros |
| Perfil do artista | `/artista/:slug` | Portfólio e serviços |
| Pedido de contratação | `/reservar/:slug` | Formulário de proposta |
| Escolha de acesso | `/entrar` | Escolha entre contratante e artista |
| Login contratante | `/entrar/contratante` | Acesso do cliente |
| Login artista | `/entrar/artista` | Acesso do artista |
| Cadastro | `/cadastro/contratante`, `/cadastro/artista` | Criação de conta |
| Recuperação de senha | `/recuperar-senha`, `/codigo`, `/nova-senha` | E-mail → código → nova senha |
| Painel do artista | `/painel` | Propostas recebidas e agenda (exige login) |
| Editor de perfil | `/painel/perfil` | Cadastro público do artista e publicação (exige login) |
| Reservas do cliente | `/minhas-reservas` | Acompanhamento de pedidos (exige login) |
| Confirmação de e-mail | `/auth/confirm` | Route Handler: abre a sessão do link enviado no cadastro |
| Redirect legado | `/artistas` | Redireciona (307) para `/explorar` |
| Não encontrada | qualquer outra | 404 real, com link para início e catálogo |

São **11 comportamentos de rota**, não 9: as 9 páginas acima mais o redirect de
`/artistas` e o 404. Os dois últimos existiam no `App.jsx` do Vite como `<Navigate>`
e não estavam documentados.

O catch-all antes redirecionava para `/`. Hoje retorna 404 real: redirecionar sinaliza
ao buscador que a URL quebrada é válida e polui o índice — o oposto do objetivo da
migração. Já `/artistas` → `/explorar` é redirect legítimo de URL antiga e continua 307.

Nas rotas dinâmicas (`/artista/[slug]`, `/reservar/[slug]`) o slug é resolvido no
`page.jsx`, que é Server Component: `await params`, busca no banco e `notFound()`
se não existir. `notFound()` não funciona em Client Component, e resolver no servidor
garante o 404 já no HTML inicial. A view recebe o artista por prop.

As duas rotas dinâmicas usam `generateStaticParams`, então os perfis são prerenderizados
como HTML estático no build — o ponto central do SEO.

As duas rotas declaram `revalidate = 3600` (ISR): um slug criado depois do build é
renderizado no primeiro acesso, e os perfis já gerados se atualizam em até uma hora.

## Regras de frontend

- Preserve React, Next.js, JavaScript e CSS puro até que uma migração seja aprovada.
- Não converta para TypeScript nem introduza Tailwind sem decisão explícita.
- Prefira componentes pequenos e reutilizáveis a marcação duplicada.
- `next/link` não marca o item de navegação ativo, como o `NavLink` do React Router
  fazia. O `Header` compara `usePathname()` e aplica a classe `active` à mão, porque
  `Header.css` estiliza `.site-header__nav a.active`.
- Não reintroduza dados simulados: o que a tela exibe vem do banco, e o que não
  existe nele é omitido ou tratado como vazio (ver "Campos vazios na interface").
- Toda nova tela deve funcionar em celular e desktop.
- Elementos interativos precisam de estados de foco, rótulos acessíveis e navegação
  por teclado.
- Respeite `prefers-reduced-motion`.
- Não registre senhas, tokens ou dados pessoais no console.
- Não adicione segredos ao repositório.

## Identidade visual atual

A marca combina uma base editorial clara com superfícies escuras e acentos vibrantes:

- amarelo `#FFD600`
- laranja `#FF6B35`
- rosa `#FF3CAC`
- roxo `#B36AFF`
- azul `#00D4FF`
- texto principal `#111111`
- fundo quente `#F5F4F0`

Tipografia: **Syne** para títulos e marca; **Inter** para interface e texto.
(DM Sans foi a intenção original de design e não chegou a ser implementada —
decisão pendente para fase futura.)

Inter é declarada em `body` (`global.css`) e herdada por todo o resto — inclusive por
botões e campos, graças à regra `body, button, input, select, textarea { font: inherit }`.
Syne é sempre declarada explicitamente, por ser a exceção. Por isso há ~47 declarações
de Syne e apenas 5 de Inter.

> **Bug pré-existente, não corrigido:** `src/views/ArtistProfile/ArtistProfile.css:468`
> declara `font-family: sans-serif` em vez de `'Inter', system-ui, sans-serif`, então
> esse trecho cai na sans-serif genérica do navegador. Vem de antes da migração;
> corrigir alteraria o visual, o que estava fora do escopo da Fase 1.

## Limites atuais

- Os artistas do catálogo são o seed de demonstração (`supabase/seed.sql`).
- O editor envia só fotos: vídeo e áudio (`artist_media.type`) e a agenda por data
  (`availability`) ainda não têm tela.
- O formulário "Pergunte antes de contratar" do perfil não grava nada. As tabelas
  `questions` e `answers` existem no banco remoto, mas não neste repositório (ver
  "Banco remoto fora do repositório").
- Pagamentos não estão implementados.
- O produto não inclui chat privado direto; dúvidas podem aparecer como perguntas
  públicas no perfil.
- Não há aplicativo nativo.

## Comandos

```bash
cp .env.example .env.local   # URL e publishable key do Supabase
npm install
npm run dev      # Next.js em http://localhost:3000
npm run build
npm run start    # serve o build de produção
```

Banco de dados (a CLI roda via `npx`, não está instalada globalmente):

```bash
npx supabase migration new <nome>   # cria migration vazia em supabase/migrations
npx supabase db push                # aplica as migrations pendentes no remoto
npx supabase db push --include-seed  # aplica também o supabase/seed.sql
npx supabase migration list         # compara migrations locais e remotas
```

## SEO e metadata

Implementado na Fase 2. O objetivo é que cada página se identifique: antes, a metadata
era global e os 8 perfis de artista eram indistinguíveis para o buscador.

`src/lib/site.js` é o **único** lugar onde a URL absoluta é definida (`SITE_URL`). Não
repita o domínio em outros arquivos — o layout raiz declara `metadataBase`, então URLs
relativas de Open Graph e canonical se resolvem sozinhas.

> **O valor atual de `SITE_URL` é um placeholder** (`https://feztival.example.com`),
> porque o site ainda não foi publicado. Trocar por lá quando houver domínio real.

O layout raiz define `title.template` (`%s | Feztival`): cada rota declara só o próprio
título. A landing usa `title.default`, para não duplicar a marca.

`src/lib/artistSeo.js` monta título, descrição e JSON-LD dos perfis a partir dos dados
reais. Os registros **não têm campo de biografia**, então a descrição usa só categoria,
gêneros, cidade, nota, número de avaliações e preço inicial. Não escreva texto de
marketing inventado: se faltar informação, adicione o campo no banco (migration) primeiro.

Dois cuidados na redação, que valem para textos futuros:

- A categoria abre a frase como rótulo, em vez de `é ${categoria}`. Como `category` não
  tem flexão de gênero, "Marina Santos é cantor" sairia errado, e "Samba Ivoti é pagode"
  descreveria o grupo como se fosse o gênero.
- `location` mistura bairro e cidade (`'Centro, Ivoti'`); use só a cidade.

### Rotas fora do índice

`/entrar`, `/entrar/contratante`, `/entrar/artista`, `/painel`, `/minhas-reservas` e
`/reservar/[slug]` declaram `robots: { index: false, follow: false }` na metadata, e as
mesmas rotas estão em `Disallow` no `robots.txt`. As duas coisas resolvem problemas
diferentes: o robots.txt evita o rastreamento, a metadata evita a indexação caso a URL
seja alcançada por um link.

### Sitemap

`src/app/sitemap.js` gera as 10 URLs públicas: a landing, `/explorar` e os 8 perfis.
Ficam fora as rotas privadas e também `/artistas`, que é redirect para `/explorar` —
listar as duas sinalizaria conteúdo duplicado.

Não há `lastModified`: os dados não têm data, e usar a hora do build diria ao buscador
que todas as páginas mudaram a cada deploy. Quando os dados vierem do banco e tiverem
`updated_at`, o campo passa a fazer sentido.

### Dados estruturados (JSON-LD)

Os perfis renderizam JSON-LD no servidor. O tipo depende da categoria:

| Categoria | Schema |
|---|---|
| `Banda`, `Pagode` | `MusicGroup` |
| `DJ`, `Cantor`, `Músico Solo` | `Person` (com `jobTitle`) |

Schema.org não tem tipo próprio para DJ; usamos `Person` por serem indivíduos com nome
artístico. `Samba Ivoti` é `MusicGroup` pelo nome, ainda que a categoria descreva o
gênero — não há campo que informe a formação.

A nota agregada fica dentro do `Service` ofertado, **não** no `Person`/`MusicGroup`:
schema.org não define `aggregateRating` nesses dois tipos. E não declaramos se o preço
inclui impostos, porque essa informação não existe nos dados.

`JSON.stringify` é seguido de `.replace(/</g, '\\u003c')` para evitar injeção de HTML,
conforme a documentação do Next. Hoje os dados são locais, mas na Fase 4 virão do banco.

### Open Graph

Configurado no layout raiz e herdado pelas rotas; `/explorar` e os perfis sobrescrevem
título e descrição — sem isso, um link de `/explorar` compartilhado mostraria o título
da home.

> **Não há `og:image`.** O repositório não tem arte de marca (a identidade é tipográfica,
> montada em JSX pelo `BrandLogo`) e todos os artistas têm `image: null`. Para ativar:
> coloque a arte em `public/og-default.png` (1200×630) e descomente `OG_IMAGE` em
> `src/lib/site.js`. O `twitter:card` passa de `summary` para `summary_large_image`
> automaticamente.

## Banco de dados

PostgreSQL no Supabase (região São Paulo). O schema está criado, com RLS ativa, e é a
única fonte de dados do site.

Todo o schema vive em `supabase/migrations/`, em arquivos `.sql` versionados. **Não crie
nem altere tabelas pelo Table Editor do painel:** mudança feita por lá não vai para o
Git, não é revisável e não se reproduz em outro ambiente. Migration nova sempre, mesmo
para um `alter table` de uma linha.

### Banco remoto fora do repositório

> **Situação em 02/10/2026.** O projeto remoto recebeu em 11/09 quatro migrations
> aplicadas fora do Git: `fix_rls_security`, `add_questions_and_payments`,
> `harden_policy_commands` e `support_booking_duration`. Os arquivos foram trazidos
> para `supabase/migrations/` com `supabase migration fetch` (as cinco anteriores
> conferem com o repositório, a menos de formatação).
> Entre outras coisas, elas moveram as funções de trigger para o schema `private`,
> removeram `owns_artist` e `artist_is_published` (as policies passaram a usar
> `exists (...)` direto), criaram `questions`, `answers` e as tabelas de pagamento e
> instalaram um trigger `handle_new_user` em `auth.users`. Esse trigger contraria a
> decisão de não ter trigger em `auth.users` (ver "Contas") e motivou o passo do
> telefone em `ensureAccount`.
>
> Além disso, `20261001120000_private_contacts_and_artist_ratings` aparece como não
> aplicada no histórico, embora tudo o que ela cria já exista no remoto (conferido:
> funções, permissões e a policy de `profiles`). Antes do próximo `db push`, marque-a
> como aplicada — senão o push tenta rodá-la de novo e falha no `drop policy`:
>
> ```bash
> npx supabase migration repair --linked --status applied 20261001120000
> npx supabase db push --dry-run   # deve listar só as migrations novas
> ```
>
> Migrations novas não devem depender de `owns_artist`.

### Tabelas

| Tabela | Papel |
|---|---|
| `profiles` | Estende `auth.users` 1:1. A PK **é** o `auth.users.id`, para as policies compararem direto com `auth.uid()` |
| `artists` | Cadastro artístico. `slug` único alimenta `/artista/[slug]` |
| `genres`, `artist_genres` | Catálogo de gêneros e o vínculo N:N |
| `artist_media` | Fotos, áudios e vídeos do portfólio |
| `artist_services` | Serviços ofertados, com preço e duração |
| `availability` | Uma linha por data declarada pelo artista |
| `bookings` | Propostas de contratação e seu ciclo de vida |
| `reviews` | Uma avaliação por reserva (`booking_id` é único) |
| `payment_methods` + `artist_payment_methods` | Formas de pagamento aceitas |
| `venue_types` + `artist_venue_types` | Tipos de local que o artista atende |
| `artist_service_areas` | Cidades atendidas (o resumo em texto fica em `artists.service_area_summary`) |
| `artist_infrastructure` | O que o artista leva, negocia ou exige do local |
| `artist_weekly_hours` | Horário recorrente por dia da semana |

As cinco últimas nasceram de uma varredura nos componentes: eram estruturas escritas no
JSX, iguais nos 8 perfis, que o artista vai declarar no cadastro. Catálogo mais vínculo
N:N para listas fechadas que ele seleciona; tabela direta para o que ele escreve.

**`artist_weekly_hours` não é `availability`.** A primeira é a rotina ("segundas, 9h às
18h"), a segunda é uma data específica ("dia 15 estou livre"). Não confunda as duas.

Decisões que não se leem no schema:

- **Não existe coluna `role` em `profiles`.** Quem tem linha em `artists` é artista, e a
  mesma pessoa pode contratar e ser contratada. Não introduza um campo de papel.
- **`artists.slug` é imutável na prática.** A URL já está publicada e no sitemap; mudar
  um slug quebra o que o buscador indexou. Há CHECK de formato, mas a imutabilidade é
  responsabilidade da aplicação.
- **`base_price` é nullable com `price_on_request`**: o artista escolhe entre exibir
  valor ou "sob consulta". A exigência de ter um dos dois vale **só para perfis
  publicados** — rascunho pode ficar incompleto enquanto é preenchido.
- **`artists.profile_id` tem índice NÃO único**, de propósito. Se um perfil pode ter mais
  de um cadastro (atuar como DJ solo e também integrar uma banda) é decisão de produto
  ainda aberta. Adicionar a restrição depois é trivial; removê-la com dados duplicados
  já existentes, não.
- **`agreed_price`, `platform_fee` e `artist_payout` são gravados na reserva**, não
  derivados do serviço em tempo de leitura. Se o artista mudar o preço depois, o
  histórico e o repasse já acordado não mudam junto. A comissão é de 12%, aplicada no
  aceite.
- **`updated_at` com trigger compartilhado** (`set_updated_at`) nas tabelas mutáveis.
  Também é o campo que permite preencher o `lastModified` do sitemap, hoje ausente.
- **`artists.color`** guarda o token `--artist-color`, usado em seis componentes. É
  identidade do artista, não decoração aleatória.
- **`artists.view_count`** é contador simples, incrementado por
  `increment_artist_view_count` (`security definer`, porque a RLS não concede `UPDATE`
  anônimo em `artists` e conceder exporia todas as colunas). É chamada por
  `recordArtistView` ao abrir o perfil, no máximo uma vez por visitante a cada 24h
  (cookie `fz_view_<slug>`). Sem histórico por data, não há como calcular variação
  mensal — o painel perdeu o "↑ 18% este mês".
- **`artist_services.price` é valor absoluto**, não um delta sobre `base_price`. A
  interface antiga usava `priceAdjustment`; a modelagem do banco venceu.

### As duas regras de negócio que vivem no banco

Por decisão explícita, **apenas duas** regras de negócio são impostas pelo banco. Todo o
resto fica na aplicação. O critério: lógica no banco é invisível para quem lê só o
JavaScript, então só entra onde o erro custa dinheiro ou confiança.

**1. `enforce_booking_amounts_immutable`** — trigger `before update` em `bookings`.

Enquanto a reserva está `pending`, os três valores financeiros podem ser ajustados
(negociação). No instante em que ela sai de `pending`, ficam congelados: qualquer
`UPDATE` que tente alterá-los levanta exceção.

Existe porque esses campos são a base do repasse ao artista. Regra só na aplicação
protege contra erro; constraint no banco protege contra tudo, inclusive código futuro
que atualize `bookings` por um caminho que ninguém previu.

A comparação usa `is distinct from`, e não `<>`: com `<>`, qualquer comparação
envolvendo `NULL` resulta em `NULL` em vez de `true`, e a alteração passaria sem ser
detectada.

**2. `enforce_booking_status_transition`** — trigger `before update` em `bookings`.

Valida o fluxo:

```
pending   -> accepted | declined | cancelled
accepted  -> confirmed | cancelled
confirmed -> completed | cancelled
```

`completed`, `declined` e `cancelled` são **terminais**. Uma reserva nunca retrocede de
estado nem sai de um desfecho definitivo.

Existe porque uma reserva que volta de `completed` para `pending` destrói a confiança no
histórico — e no repasse já calculado.

Os dois triggers são cobertos por `supabase/tests/booking_triggers_test.sql`.

### RLS

RLS está habilitada nas **9 tabelas, sem exceção**. Tabela sem RLS no Supabase fica
legível e gravável por qualquer portador da chave pública. Ao criar tabela nova, habilite
RLS na mesma migration.

Leitura pública: `genres`, `reviews`, os catálogos, e as tabelas de artista apenas quando
`is_published`. `profiles` **não** é público: guarda nome e WhatsApp, então cada um lê o
próprio perfil e o da outra parte de uma reserva (`is_booking_counterparty`). O dono também vê o próprio rascunho — sem isso o painel do artista não
teria como editar um perfil não publicado. Escrita sempre restrita ao dono.

`genres` não tem policy de escrita: o catálogo é mantido por administração, via painel ou
`service_role`, que ignora RLS.

Duas policies merecem destaque:

- **Avaliação é imutável.** `reviews` tem policy de `SELECT` e `INSERT`, e **nenhuma** de
  `UPDATE` ou `DELETE`. Como o status permanece `completed` para sempre, permitir
  `UPDATE` daria ao contratante o direito de reescrever a avaliação indefinidamente.
- **`UPDATE` de `bookings` é separado por papel.** O artista aceita, recusa, confirma e
  conclui; o contratante apenas cancela. Os triggers validam *se a transição é legal*;
  as policies controlam *quem pode disparar*. Sem essa separação, o contratante marcaria
  a própria reserva como `completed` — transição válida, papel errado.

Verificar posse exige consultar `artists` de dentro da policy de outra tabela, o que
seria filtrado pela RLS de `artists` e causaria recursão. As funções `owns_artist` e
`artist_is_published` são `security definer` com `search_path` fixo para resolver isso.

A nota pública dos artistas vem de duas funções `security definer`,
`artist_review_summary()` (média e contagem) e `artist_reviews(slug)` (nota, comentário,
tipo de evento e data). Elas existem porque a nota deriva de `bookings`, que o público não
lê — e não deve ler: ali estão endereço, valores e mensagens. Nenhuma devolve quem
avaliou nem outro dado da reserva.

Coberto por `supabase/tests/rls_test.sql`, que simula três usuários.

### Seed

`supabase/seed.sql` popula os 8 artistas que viviam no antigo `src/data`, **preservando os
slugs exatos** — as URLs já estão no sitemap.

É dado de demonstração, identificável de três formas: e-mails em
`@seed.feztival.local` (domínio reservado, nunca será real), UUIDs fixos começando em
`5eed0000` / `5eed1111`, e `raw_app_meta_data` com `{"provider":"seed"}`. Para remover
tudo, sem risco de tocar em cadastro legítimo:

```sql
delete from auth.users where email like '%@seed.feztival.local';
```

O seed é idempotente (`on conflict do nothing`) e **não deve rodar em produção com
cadastros reais**.

### Campos sem equivalente no antigo src/data

O seed deixa nulo o que não tem origem, em vez de inventar. Não preencha esses campos com
dado plausível:

| Campo | Por que está nulo |
|---|---|
| `profiles.full_name`, `phone` | `src/data` só tem nome artístico, que pertence a `artists.stage_name` |
| `artists.bio_short`, `bio_long` | Os registros não têm biografia |
| `artists.cover_url` | Todos os artistas têm `image: null` |
| `artist_media`, `artist_services`, `availability` | Não há mídia, catálogo de serviços nem agenda declarada |

> **`full_name` e `phone` precisam ser obrigatórios no formulário de cadastro real:**
> artista sem nome e sem telefone não é contratável, e WhatsApp é o canal de contato
> efetivo no Brasil. As colunas são nullable de propósito — o seed não tem esses dados, e
> um cadastro em rascunho também não teria — então a obrigatoriedade é da aplicação, não
> da coluna.

**`distanceKm` de `src/data` não tem equivalente no banco, e não deve ganhar um.** É a
distância do artista até quem está olhando: um cálculo entre duas localizações, não um
atributo do artista. Quando a busca por proximidade entrar, vira cálculo em tempo de
query. `artists.service_radius_km` é outra coisa — o raio que o artista aceita atender —
e está nulo porque `src/data` não informa isso.

**`rating` e `reviews` também não entram no banco.** No schema a nota deriva de `reviews`
amarradas a `bookings` reais, e reproduzir "4,9 em 87 avaliações" exigiria inventar 87
reservas. Artista semeado começa sem avaliação.

Isso tem consequência visível quando o front conectar ao banco. `rating` aparece hoje em
7 lugares: o card do catálogo, o modal de prévia, três pontos do perfil, o resumo do
formulário de proposta, e a ordenação do `/explorar` — cuja opção padrão
("Recomendados") é `rating × reviews`. Além disso, a meta description e o
`aggregateRating` do JSON-LD usam os dois campos. Todos os usos chamam
`artist.rating.toFixed(1)` **sem verificação de nulo**, então a página quebra se o campo
vier vazio.

Decisões já tomadas para quando isso for tratado:

- Artista sem avaliação exibe **"Novo na plataforma"**, não "Sem avaliações" — mesma
  informação, enquadramento que não penaliza quem está começando.
- O `aggregateRating` do JSON-LD é **omitido** quando não há avaliação. `aggregateRating`
  sem avaliação é dado inválido, e o buscador pode penalizar.
- A ordenação "Recomendados" passa a ser **aleatória com semente diária**: ordem
  embaralhada, mas estável dentro do mesmo dia, para o visitante não ver o catálogo
  pulando entre navegações.

  Num marketplace, ordem de exibição é distribuição de oportunidade. Os outros critérios
  disponíveis foram descartados: nota não existe (ver acima), data de cadastro trava
  vantagem permanente para quem chegou primeiro, e proximidade exigiria coordenadas que
  não temos. Com 8 artistas e nenhum lançamento, o que importa é que ninguém fique
  invisível — artista que nunca aparece nunca é contratado, nunca é avaliado, e nunca
  sobe.

  É **decisão de partida**, a ser revista quando houver avaliações e volume real.

  Ao implementar, atenção a dois detalhes:

  - A semente tem de vir da **data**, não de `Math.random()` por requisição, senão a
    ordem muda a cada navegação e o catálogo "pula".
  - Embaralhar durante a renderização quebra a hidratação: servidor e cliente
    produziriam ordens diferentes. Ordene **no servidor** (na query ou no Server
    Component) e entregue a lista já embaralhada, ou derive a ordem de um valor que os
    dois lados calculem igual. Em rota estática (`generateStaticParams`, prerender no
    build), a "data" congela no momento do build — então `/explorar` precisa revalidar
    pelo menos uma vez por dia para a semente virar.

### Leitura de dados nas telas

As queries ficam em `src/lib/artistQueries.js` e rodam em **Server Component**. A view
correspondente segue Client Component e recebe os dados por prop — o mesmo padrão que a
migração adotou nos perfis.

`toArtist` e `toArtistDetail` convertem a linha do banco para a forma que as telas já
consumiam. Isso mantém os componentes iguais e concentra num só lugar o que muda quando
o schema muda.

A listagem (`ARTIST_LIST_COLUMNS`) traz só o que o cartão e o modal de prévia precisam;
o perfil (`ARTIST_DETAIL_COLUMNS`) traz tudo em **uma consulta com joins**, para não
disparar uma cascata de requisições.

Toda leitura passa pela RLS com a chave publishable, então **só retorna artistas com
`is_published = true`**. Não há caminho que ignore isso no front — e não introduza um.

### Campos vazios na interface

O banco permite ausência onde `src/data` sempre tinha valor. `src/lib/artistDisplay.js`
centraliza o tratamento; use-o em vez de repetir a condicional:

- Sem avaliação → **"Novo na plataforma"** (não "Sem avaliações": mesma informação,
  enquadramento que não penaliza quem começa)
- Sem preço → **"Sob consulta"**
- Sem serviços → a linha de duração é **omitida**
- Listas vazias → a seção correspondente é **ocultada**, não preenchida com texto

> **Nunca chame `.toFixed()` ou `.toLocaleString()` direto num campo do banco.**
> `null.toFixed(1)` lança `TypeError` e derruba o componente inteiro, não só o trecho.
> Uma varredura encontrou 11 usos desprotegidos antes de o banco entrar — o pior deles,
> `artist.price + service.priceAdjustment`, não quebrava: exibia um preço inventado.

### Textos removidos, e por quê

Estes textos existiam escritos no JSX, iguais para os 8 artistas, e **foram removidos de
propósito**. Se alguém os reintroduzir sem dado por trás, precisa saber que foi decisão:

| Texto | Por que saiu |
|---|---|
| Dois depoimentos ("Carolina M.", "Rafael T.") | Avaliações inventadas exibidas como reais |
| "Disponível esta semana" | Nenhum dado de agenda sustentava |
| "Responde em até 2 horas" / "Resposta média" | Contratante forma expectativa; se o artista some por três dias, quem perde credibilidade é a plataforma |
| Contagens de categoria (240, 89, 52) | Números fictícios; agora vêm do banco |
| "Melhor avaliação" na ordenação | Sem nota, não reordenava nada |
| Filtro de distância | Dependia de `distanceKm`, que não existe no banco |

O CSS de `.artist-result-card__available` ficou órfão com a remoção do "Disponível esta
semana". Não foi apagado para não mexer em estilos.

## Autenticação e escrita

### Sessão

Supabase Auth com e-mail e senha. A sessão fica em cookies (`@supabase/ssr`), lidos
pelos três lados:

- **`src/proxy.js`** (o antigo `middleware` do Next 16) renova o token a cada
  requisição. Server Component não grava cookie; sem o proxy, a sessão expiraria.
  Não autoriza nada.
- **Servidor** (`createServerSupabase`): `/painel`, `/minhas-reservas`, as Server
  Actions e `/auth/confirm`. Sempre `getUser()`, que valida o token no Auth — nunca
  confie em `getSession()` no servidor.
- **Navegador** (`AuthContext`): só para o Header saber quem está logado.

**O layout raiz não lê cookies, de propósito.** Ler a sessão ali tornaria todas as
rotas dinâmicas e o prerender dos perfis — o motivo da migração para Next — se
perderia. Por isso o usuário do Header é carregado no navegador, e as telas de login
chamam `refresh()` do contexto antes de navegar.

As páginas públicas continuam usando o cliente anônimo de `supabase.js`, sem cookies,
pelo mesmo motivo.

### Contas

`signUp` grava os dados do formulário em `user_metadata`; `ensureAccount` cria a linha
de `profiles` (e, no cadastro de artista, o rascunho em `artists`) quando a sessão
existe — no primeiro login ou em `/auth/confirm`. Não é feito no próprio `signUp`
porque, com confirmação de e-mail ligada, ainda não há sessão e a RLS recusaria o
INSERT. Nenhum trigger em `auth.users`: mantém a regra de só duas regras no banco.

`user_metadata.signup_as` é só a intenção do cadastro, **não** um papel. Quem tem linha
em `artists` vai para `/painel`; os demais, para `/minhas-reservas`.

O cadastro de artista exige nome artístico, nome completo, WhatsApp e categoria. O
slug é gerado uma única vez, a partir do nome artístico; em colisão recebe um sufixo
curto. O artista nasce com `is_published = false`.

`?next=` só aceita caminho interno (`safeNextPath`): `//site.com` e URLs absolutas são
descartados, para o login não virar redirecionamento aberto.

### Recuperação de senha

Três passos: `resetPasswordForEmail` → `verifyOtp({ type: 'recovery' })` com o código
de 6 dígitos → `updateUser({ password })`, seguido de `signOut` para pedir login com a
senha nova. A resposta ao pedir o código é sempre a mesma, exista ou não a conta.

> **Configuração no painel do Supabase:** o template de e-mail "Reset Password" precisa
> exibir `{{ .Token }}` — o conteúdo pronto está em `supabase/templates/recovery.html`
> (o ambiente local já o lê pelo `config.toml`). O padrão envia só um link. O
> tamanho do código (`otp_length`) precisa ser 6, igual a `CODE_LENGTH` em
> `PasswordRecovery.jsx`. Em **Authentication → URL Configuration**, inclua
> `<domínio>/auth/confirm` nas Redirect URLs.

### Propostas e reservas

`createBooking` grava a proposta como `pending`, com `agreed_price` igual à estimativa
exibida (preço do serviço da duração escolhida, ou `base_price`, ou nulo). No aceite o
artista informa o valor final, e `updateBookingStatus` grava junto a comissão (12%) e o
repasse — depois disso o trigger congela os três valores.

As Server Actions validam para dar mensagem clara, mas **não são a proteção**: a chave
publishable permite chamar o PostgREST direto. Quem barra é a RLS (papel) e os triggers
(transição e valores). Não duplique essas regras no JavaScript.

O contratante avalia uma reserva `completed` uma única vez (`createReview`), em
"Minhas reservas". O perfil público só lista as avaliações; não há formulário ali.

### Editor de perfil (`/painel/perfil`)

`saveArtistProfile` grava o cadastro do artista do usuário logado — o formulário não
envia id de artista. O slug não é editável.

As listas são sincronizadas **por diferença** (apaga o que saiu, grava o que entrou), e
não apagando tudo para regravar: se uma etapa falhar no meio, o perfil não fica sem
gêneros ou serviços, e salvar de novo completa. Não é transacional — são várias chamadas
ao PostgREST. Serviços e itens de estrutura mantêm o id, porque `bookings.service_id`
aponta para o serviço escolhido na proposta.

Publicar exige cidade, ao menos um gênero e preço ou "sob consulta". O banco só impõe a
última; as duas primeiras são da aplicação, porque sem elas o artista não aparece na
busca nem no filtro. Horário semanal sem nenhum dia marcado é tratado como não
declarado (as linhas são apagadas), em vez de "não atende" nos sete dias.

Ao salvar, o perfil, o formulário de proposta, `/explorar` e o sitemap são revalidados.

### Fotos (Supabase Storage)

Foto principal (`artists.cover_url`) e galeria (`artist_media`, tipo `photo`, até 12)
são enviadas na seção "Fotos" do editor, que fica **fora** do formulário: cada envio ou
remoção vale na hora.

- O arquivo vai do navegador **direto ao Storage**, no bucket público `artist-media`,
  em `<artists.id>/<uuid>.jpg`. Não passa pelo servidor do Next (Server Action tem
  limite de corpo de 1 MB).
- Antes do envio, `prepareImage` reduz a foto a 2000 px e regrava como JPEG. Isso
  mantém o arquivo abaixo de 5 MB e **descarta o EXIF, inclusive o GPS** — não
  remova esse passo.
- Depois do envio, `setArtistCover` / `addArtistPhoto` recebem **só o caminho**,
  conferem que ele está na pasta do artista do usuário e gravam a URL pública. Se o
  registro falhar, o navegador apaga o arquivo enviado.
- Trocar ou remover uma foto apaga o arquivo antigo do bucket. Foto principal antiga
  que era link externo é só desvinculada.
- Quem barra é o banco: o bucket limita tamanho (5 MiB) e tipo (JPEG, PNG, WEBP), e as
  policies de `storage.objects` só deixam gravar e apagar na pasta de um artista do
  próprio usuário (migration `artist_media_storage`).

### Formulários

Os formulários com Server Action usam `onSubmit` via `useActionSubmit`, e não
`<form action={...}>`: com `action`, o React 19 limpa os campos ao fim do envio, e um
login com senha errada apagaria o e-mail digitado.

## Fases seguintes da migração

A Fase 1 cobriu apenas estrutura e rotas. Não junte fases: cada uma tem um tipo de erro
diferente, e misturá-las dificulta identificar a origem do problema.

| Fase | Escopo |
|---|---|
| 2 | ~~SEO: `metadata` por rota, Open Graph, sitemap, JSON-LD~~ — concluída |
| — | ~~Banco de dados: schema, RLS e seed no Supabase~~ — concluída |
| — | ~~Conectar as telas públicas ao banco, em Server Components~~ — concluída |
| — | ~~Autenticação e escrita: login, cadastro, propostas, painel e reservas~~ — concluída |
| — | ~~Editor de perfil, privacidade de `profiles` e nota pública~~ — concluída |
| — | ~~Upload de fotos (Supabase Storage): foto principal e galeria~~ — concluída |
| a seguir | Pagamentos: Route Handlers para Pagar.me e webhooks |

A ordem original previa Server Components antes do Supabase. O banco veio primeiro, sem
tocar no front — as duas coisas passam a acontecer juntas na fase seguinte, já que ler do
banco em Server Component é o mesmo trabalho.

A ordem importou: os campos vazios foram tratados **antes** de trocar a fonte de dados,
ainda lendo de `src/data`. Fazer o inverso significaria depurar erro de query e erro de
campo nulo ao mesmo tempo.

Pendências abertas da Fase 1:

- Verificação visual do lightbox da galeria em `/artista/[slug]` (só monta no clique).
- 5 imagens órfãs em `src/images/` (`1.svg`, `band-gig.jpg`, `frat-party.jpg`,
  `house-band.jpg`, `house_party_band.jpg`) não são referenciadas por nenhum código;
  já era assim antes da migração.
Pendências abertas:

- **A métrica "Perfil X% completo" saiu do painel.** Não havia critério definido; o
  painel mostra só se o perfil está publicado ou em rascunho.
- **`Samba Ivoti` aparece como "Banda"**, não "Pagode": o enum tem 3 categorias e
  `Pagode` mapeia para `band`. O gênero segue correto no perfil e no filtro.
- `rating` e `reviews` não são colunas: vêm de `artist_review_summary` — ver a interface e o
  SEO na seção do banco.
- Se um perfil pode ter mais de um cadastro de artista segue em aberto.
- Sem `psql` nem Docker no ambiente, os scripts de `supabase/tests/` são executados à mão
  no SQL Editor do painel. `brew install libpq` permitiria rodá-los pela linha de comando.

Pendências abertas da Fase 2:

- `SITE_URL` é placeholder até o domínio real existir.
- Sem `og:image`, à espera da arte de marca.
- `next/font` e a decisão sobre DM Sans seguem em aberto — não entraram na Fase 2,
  que se limitou a metadata.
- Os artistas do seed não têm biografia, o que limita as descriptions a dados
  factuais.

## Momento do projeto

O fluxo central está ligado ao banco: explorar, cadastrar, enviar
proposta, aceitar, confirmar, concluir e avaliar, com fotos enviadas pelo artista. O que
falta para lançar são os pagamentos. A landing institucional e a página de exploração
devem deixar clara a diferença entre conhecer a empresa e usar o marketplace.
