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
      └── dados locais simulados em src/data
```

Tecnologias em uso:

| Camada | Tecnologia |
|---|---|
| Framework / build | Next.js 16 (App Router, Turbopack) |
| Interface | React |
| Rotas | Roteamento por arquivo do App Router |
| Linguagem | JavaScript + JSX |
| Estilos | CSS puro, mobile-first |
| Dados atuais | módulos JavaScript locais em `src/data` |
| Banco de dados | PostgreSQL no Supabase — schema criado, **ainda não conectado** |

O schema do banco existe e está versionado em `supabase/`, mas o site **continua lendo
de `src/data`**. Ligar o front ao banco é uma fase própria; até lá as duas fontes
coexistem e `src/data` é a que aparece na tela.

Não há autenticação real, TypeScript, Tailwind ou monorepo neste momento. Não introduza
essas tecnologias como se já fizessem parte do projeto.

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
├── data/             # conteúdo e dados simulados
├── images/           # imagens locais
├── views/            # uma pasta por página (antes: pages/)
├── styles/           # tokens e estilos globais
└── hooks/            # hooks compartilhados
```

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

Vale também para imagens guardadas em módulos de `src/data`: resolva `.src` no próprio
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
| Painel do artista | `/painel` | Gestão de perfil e propostas |
| Reservas do cliente | `/minhas-reservas` | Acompanhamento de pedidos |
| Redirect legado | `/artistas` | Redireciona (307) para `/explorar` |
| Não encontrada | qualquer outra | 404 real, com link para início e catálogo |

São **11 comportamentos de rota**, não 9: as 9 páginas acima mais o redirect de
`/artistas` e o 404. Os dois últimos existiam no `App.jsx` do Vite como `<Navigate>`
e não estavam documentados.

O catch-all antes redirecionava para `/`. Hoje retorna 404 real: redirecionar sinaliza
ao buscador que a URL quebrada é válida e polui o índice — o oposto do objetivo da
migração. Já `/artistas` → `/explorar` é redirect legítimo de URL antiga e continua 307.

Nas rotas dinâmicas (`/artista/[slug]`, `/reservar/[slug]`) o slug é resolvido no
`page.jsx`, que é Server Component: `await params`, busca em `src/data` e `notFound()`
se não existir. `notFound()` não funciona em Client Component, e resolver no servidor
garante o 404 já no HTML inicial. A view recebe o artista por prop.

As duas rotas dinâmicas usam `generateStaticParams`, então os perfis são prerenderizados
como HTML estático no build — o ponto central do SEO.

> **Pendência para quando os dados vierem de API:** com `generateStaticParams`, um artista
> novo não aparece até um novo build. Será necessário ISR (`revalidate`) ou renderização
> sob demanda. Não é problema enquanto os dados estão em `src/data`, mas não pode ser
> esquecido na fase de integração.

## Regras de frontend

- Preserve React, Next.js, JavaScript e CSS puro até que uma migração seja aprovada.
- Não converta para TypeScript nem introduza Tailwind sem decisão explícita.
- Prefira componentes pequenos e reutilizáveis a marcação duplicada.
- `next/link` não marca o item de navegação ativo, como o `NavLink` do React Router
  fazia. O `Header` compara `usePathname()` e aplica a classe `active` à mão, porque
  `Header.css` estiliza `.site-header__nav a.active`.
- Dados simulados devem ficar em `src/data`, não espalhados pelas páginas.
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

- Os dados são demonstrações locais, sem persistência.
- Login e contratação são somente interfaces até existir uma API.
- Pagamentos não estão implementados.
- O produto não inclui chat privado direto; dúvidas podem aparecer como perguntas
  públicas no perfil.
- Não há aplicativo nativo.

## Comandos

```bash
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
marketing inventado: se faltar informação, adicione o campo em `src/data` primeiro.

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

PostgreSQL no Supabase (região São Paulo). O schema está criado e com RLS ativa, mas
**o site ainda lê de `src/data`** — conectar o front é uma fase própria.

Todo o schema vive em `supabase/migrations/`, em arquivos `.sql` versionados. **Não crie
nem altere tabelas pelo Table Editor do painel:** mudança feita por lá não vai para o
Git, não é revisável e não se reproduz em outro ambiente. Migration nova sempre, mesmo
para um `alter table` de uma linha.

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

Leitura pública: `profiles`, `genres`, `reviews`, e as tabelas de artista apenas quando
`is_published`. O dono também vê o próprio rascunho — sem isso o painel do artista não
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

Coberto por `supabase/tests/rls_test.sql`, que simula três usuários.

### Seed

`supabase/seed.sql` popula os 8 artistas que hoje vivem em `src/data`, **preservando os
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

### Campos sem equivalente em src/data

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
- A ordenação "Recomendados" precisa de outro critério, ainda **não decidido**. Num
  marketplace, ordem de exibição é distribuição de oportunidade — merece decisão própria,
  não um `order by` escolhido às pressas.

## Fases seguintes da migração

A Fase 1 cobriu apenas estrutura e rotas. Não junte fases: cada uma tem um tipo de erro
diferente, e misturá-las dificulta identificar a origem do problema.

| Fase | Escopo |
|---|---|
| 2 | ~~SEO: `metadata` por rota, Open Graph, sitemap, JSON-LD~~ — concluída |
| — | ~~Banco de dados: schema, RLS e seed no Supabase~~ — concluída |
| a seguir | Conectar o front ao banco: substituir `src/data`, mover a busca de dados para Server Components (ver a pendência de ISR acima) |
| depois | Pagamentos: Route Handlers para Pagar.me e webhooks |

A ordem original previa Server Components antes do Supabase. O banco veio primeiro, sem
tocar no front — as duas coisas passam a acontecer juntas na fase seguinte, já que ler do
banco em Server Component é o mesmo trabalho.

Pendências abertas da Fase 1:

- Verificação visual do lightbox da galeria em `/artista/[slug]` (só monta no clique).
- 5 imagens órfãs em `src/images/` (`1.svg`, `band-gig.jpg`, `frat-party.jpg`,
  `house-band.jpg`, `house_party_band.jpg`) não são referenciadas por nenhum código;
  já era assim antes da migração.
Pendências abertas do banco de dados:

- O front ainda não lê do banco; `src/data` continua sendo a fonte da tela.
- `rating` e `reviews` não existem no schema — ver a consequência para a interface e o
  SEO na seção do banco.
- Se um perfil pode ter mais de um cadastro de artista segue em aberto.
- Sem `psql` nem Docker no ambiente, os scripts de `supabase/tests/` são executados à mão
  no SQL Editor do painel. `brew install libpq` permitiria rodá-los pela linha de comando.

Pendências abertas da Fase 2:

- `SITE_URL` é placeholder até o domínio real existir.
- Sem `og:image`, à espera da arte de marca.
- `next/font` e a decisão sobre DM Sans seguem em aberto — não entraram na Fase 2,
  que se limitou a metadata.
- Os artistas não têm biografia em `src/data`, o que limita as descriptions a dados
  factuais.

## Momento do projeto

O foco atual é definir e validar a experiência completa do frontend. A landing
institucional e a página de exploração devem deixar clara a diferença entre conhecer
a empresa e usar o marketplace. Integrações reais serão uma etapa posterior.
