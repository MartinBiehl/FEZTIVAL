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
  └── React 19
      ├── React Router
      ├── JavaScript/JSX
      ├── CSS modular por componente/página
      └── dados locais simulados em src/data
```

Tecnologias em uso:

| Camada | Tecnologia |
|---|---|
| Build/dev server | Vite 6 |
| Interface | React |
| Rotas | React Router DOM |
| Linguagem | JavaScript + JSX |
| Estilos | CSS puro, mobile-first |
| Dados atuais | módulos JavaScript locais |

Não há backend, banco de dados, autenticação real, TypeScript, Next.js, Tailwind ou
monorepo neste momento. Não introduza essas tecnologias como se já fizessem parte do
projeto. Uma API futura deve ser discutida e planejada antes de alterar a estrutura.

## Estrutura

```text
src/
├── components/       # componentes compartilhados
├── data/             # conteúdo e dados simulados
├── images/           # imagens locais
├── pages/            # uma pasta por página
├── styles/           # tokens e estilos globais
├── App.jsx           # composição das rotas
└── main.jsx          # bootstrap do React
```

Cada página mantém seu JSX e CSS juntos em `src/pages/NomeDaPagina`. Componentes
reutilizados por mais de uma página ficam em `src/components`.

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

## Regras de frontend

- Preserve React, Vite, JavaScript e CSS puro até que uma migração seja aprovada.
- Prefira componentes pequenos e reutilizáveis a marcação duplicada.
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

Tipografia: **Syne** para títulos e marca; **DM Sans** para interface e texto.

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
npm run dev
npm run build
npm run preview
```

## Momento do projeto

O foco atual é definir e validar a experiência completa do frontend. A landing
institucional e a página de exploração devem deixar clara a diferença entre conhecer
a empresa e usar o marketplace. Integrações reais serão uma etapa posterior.
