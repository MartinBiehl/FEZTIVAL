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
Os arquivos do Vite (`index.html`, `src/App.jsx`, `src/main.jsx`, `vite.config.js` e os
scripts `*:vite`) seguem no repositório temporariamente como rede de segurança, e serão
removidos depois que a paridade visual for aprovada. Note que o Vite não roda mais
in-place: as views agora importam `next/link`, então a conferência visual exige um
worktree no commit anterior à migração.

## Estrutura

```text
src/
├── app/              # rotas do App Router (layouts, page.jsx, not-found)
├── components/       # componentes compartilhados
├── data/             # conteúdo e dados simulados
├── images/           # imagens locais
├── views/            # uma pasta por página (antes: pages/)
├── styles/           # tokens e estilos globais
├── App.jsx           # legado Vite — a remover
└── main.jsx          # legado Vite — a remover
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
`App.jsx` fazia com `PublicLayout`.

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
`/artistas` e o 404. Os dois últimos existiam no `App.jsx` como `<Navigate>` e não
estavam documentados.

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

# scripts legados do Vite (build:vite, dev:vite) ainda existem, mas `dev:vite`
# NÃO roda mais: as views importam next/link e next/navigation, que quebram fora
# do Next ("process is not defined"). Para comparar com o visual original, use um
# worktree no último commit anterior à migração:
#   git worktree add ../feztival-vite c0ba3a4
```

## Fases seguintes da migração

A Fase 1 cobriu apenas estrutura e rotas. Não junte fases: cada uma tem um tipo de erro
diferente, e misturá-las dificulta identificar a origem do problema.

| Fase | Escopo |
|---|---|
| 2 | SEO: `metadata` por rota, Open Graph, sitemap. Também `next/font` e a decisão sobre DM Sans. |
| 3 | Server Components: mover a busca de dados para o servidor |
| 4 | Supabase: substituir `src/data` por banco real (ver a pendência de ISR acima) |
| 5 | Pagamentos: Route Handlers para Pagar.me e webhooks |

Pendências abertas da Fase 1:

- Verificação visual do lightbox da galeria em `/artista/[slug]` (só monta no clique).
- Remover o legado do Vite (`index.html`, `src/App.jsx`, `src/main.jsx`, `vite.config.js`,
  scripts `*:vite`, `@vitejs/plugin-react`, `vite` e `react-router-dom`) após aprovação.
- 5 imagens órfãs em `src/images/` (`1.svg`, `band-gig.jpg`, `frat-party.jpg`,
  `house-band.jpg`, `house_party_band.jpg`) não são referenciadas por nenhum código;
  já era assim antes da migração.
- `metadata` hoje é global, definida só no layout raiz. Cada rota ainda não tem título
  nem descrição próprios — é o objetivo da Fase 2.

## Momento do projeto

O foco atual é definir e validar a experiência completa do frontend. A landing
institucional e a página de exploração devem deixar clara a diferença entre conhecer
a empresa e usar o marketplace. Integrações reais serão uma etapa posterior.
