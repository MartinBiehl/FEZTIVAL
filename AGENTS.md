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
| Dados atuais | módulos JavaScript locais |

Não há backend, banco de dados, autenticação real, TypeScript, Tailwind ou monorepo
neste momento. Não introduza essas tecnologias como se já fizessem parte do projeto.
Uma API futura deve ser discutida e planejada antes de alterar a estrutura.

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

## Fases seguintes da migração

A Fase 1 cobriu apenas estrutura e rotas. Não junte fases: cada uma tem um tipo de erro
diferente, e misturá-las dificulta identificar a origem do problema.

| Fase | Escopo |
|---|---|
| 2 | ~~SEO: `metadata` por rota, Open Graph, sitemap, JSON-LD~~ — concluída |
| 3 | Server Components: mover a busca de dados para o servidor |
| 4 | Supabase: substituir `src/data` por banco real (ver a pendência de ISR acima) |
| 5 | Pagamentos: Route Handlers para Pagar.me e webhooks |

Pendências abertas da Fase 1:

- Verificação visual do lightbox da galeria em `/artista/[slug]` (só monta no clique).
- 5 imagens órfãs em `src/images/` (`1.svg`, `band-gig.jpg`, `frat-party.jpg`,
  `house-band.jpg`, `house_party_band.jpg`) não são referenciadas por nenhum código;
  já era assim antes da migração.
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
