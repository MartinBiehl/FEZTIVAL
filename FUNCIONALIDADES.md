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
| **Sobre** | Biografia escrita pelo artista e gêneros |
| **Fotos** | Galeria enviada pelo artista, com lightbox navegável |
| **Serviços** | Pacotes ofertados, com preço e duração |
| **Mais informações** | Formas de pagamento, tipos de local atendidos, área de atuação, infraestrutura (o que leva, negocia ou exige) e horários |
| **Avaliações** | Notas de contratações concluídas |
| **Pergunte antes de contratar** | Perguntas e respostas públicas; perguntar exige login |

---

## 2. Contratação

### Formulário de proposta (`/reservar/:slug`) ✅

Três etapas, com resumo antes do envio:

1. **Sobre o evento** — tipo, número de convidados, data e horário
2. **Local e duração** — endereço, tempo de set e estrutura de som disponível
3. **Observações** — mensagem livre para o artista

A proposta é gravada no banco como "aguardando resposta", com o valor estimado
exibido ao contratante. Enviar exige conta: sem login, o formulário avisa e leva ao
acesso, voltando depois para o mesmo artista. Não é possível pedir proposta ao
próprio perfil nem para data passada.

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

### Editor de perfil (`/painel/perfil`) ✅

O artista edita nome artístico, categoria, cidade, cor, resumo, biografia,
preço ou "sob consulta", gêneros, serviços (título, duração, preço,
descrição), formas de pagamento, tipos de evento, área de atendimento, estrutura (o
que leva, negocia ou exige) e horário semanal — e publica ou despublica o perfil.
Publicar exige cidade, ao menos um gênero e preço ou "sob consulta". O endereço do
perfil não muda depois de criado.

Na seção **Fotos** o artista envia a foto principal (aparece no topo do perfil, no
catálogo e na prévia) e até 12 fotos de galeria, em JPG, PNG ou WEBP. As fotos são
reduzidas no navegador antes do envio, e a localização gravada pelo celular é
descartada. Enviar ou remover vale na hora, sem precisar salvar o perfil.

### Painel do artista (`/painel`) ✅

Propostas em aberto (cliente, evento, data, local, convidados, estrutura de som,
mensagem e valor) e próximos shows confirmados. Em cada proposta o artista:

- **aceita**, informando o valor final — a comissão de 12% e o repasse são
  calculados e congelados nesse momento — ou **recusa**;
- depois **confirma** o show e, por fim, **marca como realizado**; pode cancelar
  antes disso.

Depois do aceite aparece o link de WhatsApp do contratante. Telefones não são
públicos: cada usuário só vê o contato da outra parte de uma reserva.

As perguntas feitas no perfil público aparecem em "Perguntas sem resposta", onde o
artista responde. A resposta fica pública no perfil, junto da pergunta.

Métricas reais: visualizações do perfil, propostas aguardando resposta, shows
confirmados nos próximos 30 dias e repasse previsto no mês. Exige login; quem não
tem cadastro artístico é levado para "Minhas reservas".

### Minhas reservas (`/minhas-reservas`) ✅

Pedidos do contratante em três abas — em andamento, concluídas e canceladas —
com artista, evento, data, valor e status. O contratante pode cancelar um pedido
ainda não concluído e avaliar uma reserva concluída. Exige login.

> As duas telas leem com a sessão do usuário: a segurança por linha (RLS) só
> devolve as reservas em que ele é contratante ou dono do artista.

---

## 4. Acesso

Telas existentes: escolha de perfil (`/entrar`), login de contratante e de
artista, cadastro para os dois públicos e recuperação de senha em três passos
(pedido → código → nova senha).

**Estado: ✅ funcionando**, com Supabase Auth (e-mail e senha).

- **Cadastro de contratante:** nome completo, e-mail e senha.
- **Cadastro de artista:** nome artístico, nome completo, WhatsApp e categoria
  (DJ, banda, músico solo). Cria o perfil artístico como **rascunho**, fora do
  catálogo até ser publicado.
- Se a confirmação de e-mail estiver ligada no Supabase, a conta só entra depois
  do clique no link.
- **Recuperação de senha:** código de 6 dígitos por e-mail, depois a nova senha.
- "Continuar com Google" segue desativado.

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

**Estado: ✅ funcionando.** O contratante avalia em "Minhas reservas"; a média
aparece no catálogo, no perfil e no Google (JSON-LD), e o perfil lista as avaliações
com nota, comentário, tipo de evento e mês — sem o nome de quem avaliou.

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
| **Upload de vídeos e áudios** | Só fotos são enviadas; `artist_media` já prevê os outros tipos |
| **Agenda por data** | Só o horário semanal é editável; datas livres específicas não |
| **Pagamentos** | Fase posterior |
| **Login com Google** | Botão desativado |
| **Chat privado** | Fora do escopo — dúvidas são perguntas públicas no perfil |
| **Aplicativo nativo** | Não previsto |
| **Busca por proximidade** | Exigiria coordenadas que ainda não temos |

---

## Estado geral

**Funciona hoje:** o lado público (landing, catálogo, perfis), o acesso (cadastro,
login, recuperação de senha) e o ciclo da contratação — proposta, aceite, confirmação,
conclusão, cancelamento e avaliação — gravando no banco real.

**Não funciona:** envio de vídeos e áudios.

O próximo passo são os **pagamentos**.
