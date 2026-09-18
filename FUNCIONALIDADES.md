# Funcionalidades do Feztival

Marketplace que conecta artistas locais — músicos, DJs e bandas — a quem organiza
eventos. Mercado inicial: Ivoti e cidades do Vale do Sinos.

Este documento descreve **o que o sistema faz hoje**, não o que está planejado.
Cada funcionalidade traz seu estado real:

- ✅ **Funcionando** — implementado e ligado ao banco
- ⚠️ **Só interface** — a tela existe, mas não persiste nada
- ❌ **Ausente** — ainda não existe

O fluxo central do produto é: **explorar → conhecer o artista → enviar proposta →
confirmar → avaliar.**

---

## 1. Descoberta de artistas

### Landing institucional (`/`) ✅

Apresenta a marca, a proposta de valor e os elementos de confiança. Separa
deliberadamente "conhecer a empresa" de "usar o marketplace".

### Catálogo (`/explorar`) ✅

Lista os artistas publicados, lendo do banco em Server Component.

**Busca textual** — campo único que casa, sem diferenciar acento ou caixa, com:
nome, categoria, localização e gêneros musicais.

**Filtro por categoria** — abas (`Todos`, `DJ`, `Banda`, `Cantor`…) com a
contagem real de artistas em cada uma, calculada a partir do banco.

**Filtros combináveis** — acumulativos entre si:

| Filtro | Opções |
|---|---|
| Tempo de set | 30 min, 1h, 2h, 3h, 4h+ |
| Gênero musical | vem do catálogo de gêneros do banco |

**Ordenação** — três critérios:

- **Recomendados** (padrão) — ordem embaralhada com semente diária: muda a cada
  dia, mas permanece estável dentro do mesmo dia, para o catálogo não "pular"
  entre navegações. Num marketplace, ordem de exibição é distribuição de
  oportunidade: sem avaliações e sem volume, o que importa é que nenhum artista
  fique invisível.
- **Menor preço** / **Maior preço** — artistas "sob consulta" (sem preço) vão
  para o fim das duas ordenações, em vez de serem tratados como zero.

**Prévia rápida** — modal que mostra o essencial do artista sem sair da listagem.

> **Ausentes por decisão:** o filtro de distância saiu (dependia de um cálculo
> entre duas localizações, não de um atributo do artista) e a ordenação "Melhor
> avaliação" também (nenhum artista tem nota, então não reordenaria nada).

### Perfil do artista (`/artista/:slug`) ✅

Página completa, prerenderizada como HTML estático para ser indexável. Seções:

| Seção | Conteúdo |
|---|---|
| **Sobre** | Apresentação do artista |
| **Fotos e vídeos** | Galeria com lightbox navegável |
| **Serviços** | Pacotes ofertados, com preço e duração |
| **Mais informações** | Formas de pagamento, tipos de local atendidos, área de atuação, infraestrutura (o que leva, negocia ou exige) e horários |
| **Avaliações** | Notas de contratações concluídas |
| **Pergunte antes de contratar** | Perguntas públicas no perfil |

---

## 2. Contratação

### Formulário de proposta (`/reservar/:slug`) ⚠️

Três etapas, com resumo antes do envio:

1. **Sobre o evento** — tipo, número de convidados, data e horário
2. **Local e duração** — endereço, tempo de set e estrutura de som disponível
3. **Observações** — mensagem livre para o artista

**Limitação:** o formulário valida e exibe a tela de "Proposta enviada", mas
**nada é gravado no banco**. Depende da autenticação.

### Ciclo de vida da reserva ✅ *(no banco)*

O fluxo de estados é imposto pelo banco, não só pela aplicação:

```
pending   → accepted | declined | cancelled
accepted  → confirmed | cancelled
confirmed → completed | cancelled
```

`completed`, `declined` e `cancelled` são **terminais**: uma reserva nunca
retrocede nem sai de um desfecho definitivo.

**Separação de papéis:** o artista aceita, recusa, confirma e conclui; o
contratante apenas cancela. Sem isso, o contratante marcaria a própria reserva
como concluída — transição válida, papel errado.

**Valores congelados:** preço acordado, taxa da plataforma (12%) e repasse ao
artista podem ser negociados enquanto a reserva está `pending`; depois disso
ficam imutáveis. Se o artista mudar o preço de tabela, o histórico e o repasse
já acordado não mudam junto.

---

## 3. Áreas autenticadas

### Painel do artista (`/painel`) ⚠️

Reúne propostas recebidas (com cliente, evento, data, local, valor e status),
próximos shows confirmados e métricas de desempenho.

**Limitação:** os dados são exemplos escritos no componente. As métricas
(visualizações, receita prevista, completude do perfil) são fixas.

### Minhas reservas (`/minhas-reservas`) ⚠️

Acompanhamento dos pedidos do contratante, com artista, evento, data e status
(`Confirmada`, `Aguardando resposta`, `Proposta recebida`).

**Limitação:** mesma situação — dados de exemplo no componente.

> Ambas as telas só podem ler do banco quando houver autenticação: a segurança
> por linha (RLS) filtra tudo pelo usuário logado, e sem sessão não retorna nada.

---

## 4. Acesso

Telas existentes: escolha de perfil (`/entrar`), login de contratante e de
artista, cadastro para os dois públicos e recuperação de senha em três passos
(pedido → código → nova senha).

**Estado: ⚠️ só interface.** Não há uma única chamada de autenticação no código.
O login usa uma sessão simulada que apenas redireciona.

Uma decisão de modelagem que vale registrar: **não existe campo de "papel"**.
Quem tem cadastro artístico é artista, e a mesma pessoa pode contratar e ser
contratada.

---

## 5. Avaliações

**Uma avaliação por reserva concluída**, e ela é **imutável**: pode ser criada e
lida, nunca editada ou apagada. Como a reserva permanece concluída para sempre,
permitir edição daria ao contratante o direito de reescrever a avaliação
indefinidamente.

Artista sem avaliação exibe **"Novo na plataforma"** — mesma informação que "sem
avaliações", com enquadramento que não penaliza quem está começando.

---

## 6. SEO ✅

O motivo declarado da migração para Next.js: perfis de artista precisam ser
encontrados no Google.

- Título e descrição próprios por página
- Os 8 perfis e as páginas de reserva gerados como HTML estático no build
- **Dados estruturados (JSON-LD)** — bandas e grupos como `MusicGroup`, DJs e
  cantores como `Person`. A nota agregada é omitida quando não há avaliação:
  declará-la vazia é dado inválido e pode ser penalizado
- **Sitemap** com as 10 URLs públicas
- **Open Graph** para compartilhamento em redes e mensageiros
- Áreas privadas (login, painel, reservas) ficam fora do índice, por duas vias:
  `robots.txt` evita o rastreamento, a metadata evita a indexação

---

## 7. Acessibilidade e experiência ✅

- **Mobile-first**: toda tela funciona em celular e desktop
- Navegação por teclado, rótulos acessíveis e estados de foco visíveis
- Respeita `prefers-reduced-motion`: quem configurou o sistema para reduzir
  animações recebe a interface sem movimento
- Campos vazios têm tratamento próprio — sem preço vira "Sob consulta", listas
  vazias ocultam a seção em vez de exibir texto de preenchimento

---

## O que ainda não existe ❌

| Funcionalidade | Situação |
|---|---|
| **Autenticação real** | Bloqueia painel, reservas e envio de propostas |
| **Envio de proposta ao banco** | O formulário não persiste |
| **Pagamentos** | Fase posterior |
| **Chat privado** | Fora do escopo — dúvidas são perguntas públicas no perfil |
| **Aplicativo nativo** | Não previsto |
| **Contagem de visualizações** | Coluna e função existem, a chamada não está ligada |
| **Busca por proximidade** | Exigiria coordenadas que ainda não temos |

---

## Estado geral

**Funciona hoje:** todo o lado público — landing, catálogo com busca e filtros,
perfis e formulário de proposta, lendo do banco real.

**Não funciona:** qualquer coisa que exija estar logado ou gravar dados.

O próximo passo que destrava o resto é a **autenticação**.
