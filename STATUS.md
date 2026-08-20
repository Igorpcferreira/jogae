# STATUS — Jogaê

**Atualizado:** 20/08/2026
**Fase do roadmap:** Fase 0 (Fundação) concluída · Fase 1 (MVP de organização) concluída ·
Fase 1.5 concluída · Bloco J (deploy) concluído — o app está em produção ·
Bloco I (conta de jogador, opção B) concluído em código, agora com **link único
de convidado** pro grupo inteiro ·
**Fase 2 (social e gamificação) — concluída: todo o §27 está em código**
**Verificação nesta data:** `npm test` 299/299 (verde também com `TZ=UTC`) ·
`npm run test:integracao` 81/81 · `npx tsc --noEmit` limpo · `npx eslint .` limpo ·
`npm run build` OK.

**Em produção:** https://jogae-free.vercel.app · Vercel (região `gru1`) + Supabase
(`sa-east-1`). Login com Google funcionando de ponta a ponta.

Smoke de ponta a ponta contra um **Supabase de verdade** (stack local do CLI):
login por link → sessão gravada → `/g/**` abre; sem sessão, o proxy redireciona pro
login; `authId` gravado no usuário do seed **sem duplicar cadastro**; convite aceito no
primeiro acesso cria o vínculo como ASSISTANT, marca o convite como consumido e joga a
pessoa no grupo; assistente recebe 404 em `/membros` e 200 no ao vivo.

---

## 1. Decisões tomadas (fechando itens do §63 do plano)

| Decisão aberta no plano | Escolha | Motivo |
| --- | --- | --- |
| Prisma × Drizzle | **Prisma 7** | Migrations maduras, `prisma migrate dev` já em uso, DX melhor para evoluir schema sozinho |
| Framework | **Next.js 16 + App Router + Turbopack** | Server Actions cobrem toda a camada de mutação sem API REST separada |
| CSS | **Tailwind v4** com tokens em `@theme` | Tokens do design system viram utilitários direto (`bg-canvas`, `text-ink-3`, `text-score-xl`) |
| Banco local | **Docker Compose, Postgres 17 na porta 5433** | 5433 evita conflito com Postgres já instalado |
| Escala de skill | **1–5**, privada, só o balanceador lê | Conforme §13 |
| Estratégias de goleiro no 1º release | **As 4** (`FIXED_PER_TEAM`, `POOL`, `ROTATING`, `BORROWED`) | Já estão no balanceador e cobertas por teste |
| Modo ao vivo | **Entra na v1** | É o que gera retenção e histórico |
| **Auth** | **Supabase Auth: Google + link por e-mail** | O magic link próprio funcionava, mas o produto vai ser lançado aberto: "abre o e-mail e volta" derruba cadastro, e ninguém espera digitar e-mail num app de fut. Google é um toque. Substituiu a implementação própria em 12/08 |
| **Banco em produção** | **Postgres do Supabase** | Já vinha junto da auth; o Prisma continua dono do schema e das migrations |
| **Hospedagem do app** | **Vercel (plano Hobby) por ora; VPS Hostinger continua sendo o plano se houver cobrança** | O deploy de 18/08 foi na Vercel porque é o caminho mais curto pro app existir, e o desempenho ficou bom (ver §2). **A restrição continua de pé: o plano Hobby proíbe uso comercial** — no dia em que o Jogaê cobrar, é Vercel Pro ou a VPS. O `Dockerfile` standalone e o `docs/deploy.md` seguem válidos e testados pra essa virada |
| **Fuso horário** | **Um só, `America/Sao_Paulo`, declarado em `domain/time/fuso.ts`** | Hora de parede entra e sai sempre pelo mesmo fuso. O fuso do processo (UTC na Vercel) nunca é usado — foi essa mistura que gerou o bug do 17:30. Fuso por grupo está mapeado como próximo passo; as funções já recebem o fuso por parâmetro |
| **Papéis** | **OWNER / ADMIN / ASSISTANT**, regra pura em `domain/access` | Assistente apita o jogo, nunca mexe em config nem em sorteio (plano §6 e §55) |
| **Envio de e-mail** | **Do Supabase, com SMTP próprio configurado no painel** | Um lugar só pra template, remetente e entrega. Em dev os e-mails caem no Mailpit local. Substituiu o Resend chamado direto do app |
| **Testes da camada de dados** | **Serviço extraído + Postgres real em schema `teste`** | Mock de Prisma testaria o mock; schema separado dispensa segundo container |
| **Conta de jogador** | **Opção B — link pessoal, sem conta** (`docs/decisao-conta-de-jogador.md`) | Entrega o valor da opção C (presença chega sem o organizador no meio) por uma fração do custo, e não fecha a porta pra conta de verdade depois. Decidido em 19/08 |
| **Escopo do link do jogador** | **Um link por jogador, que não expira** | Link por rodada obrigaria a redistribuir 22 links toda semana no WhatsApp, e esse atrito mata a adoção |
| **Distribuição do link do jogador** | **Um link de convidado por grupo** (`/e/<token>`), que dispensa os 22 links pessoais no privado | Mandar 22 mensagens uma a uma era o custo que travava o bloco I na prática, e ele volta toda vez que alguém troca de celular. O link do grupo não substitui o modelo de acesso: ele mostra a lista de nomes, a pessoa diz quem é e cai no link pessoal dela. Decidido em 19/08 |
| **Quem tem o link do grupo pode responder por qualquer um** | **Sim, aceito** | Em grupo de 22 amigos isso é zoeira, não fraude, e é auto-regulado (o cara vê "não vou" na página dele e desfaz). O antídoto pro dia em que o link vazar é trocar o token, na configuração |
| **Placar ao vivo com mais de um celular apontando** | **Liberado, com pergunta anti-repetição** | O risco não é malandragem, é contagem dupla: sai o gol, duas pessoas apertam o botão. Bloquear custaria gol legítimo; perguntar custa um toque |
| **Votação de MVP** | **Entra, e não substitui o craque calculado** — "Craque da rodada" (número) e "Escolha da galera" (voto) convivem | `mvpDaRodada` usa participação em gol e **por construção nunca premia goleiro nem zagueiro**. A votação não corrige um erro do cálculo, corrige um limite dele. Trocar um pelo outro só mudaria quem fica de fora |
| **Como se vota** | **Pelo link pessoal, voto secreto, um por rodada, 48h, com quórum** | A credencial do bloco I faz "um voto por pessoa" sair de graça. O segredo do voto é a regra que separa prêmio de briga na segunda-feira; o quórum evita coroar alguém com dois votos; a janela curta evita campanha no meio da semana |
| **"Comparação entre amigos" (§27)** | **Vira dupla, não duelo** | É o único item do §27 que empurra contra a regra do próprio plano. Medir o que os dois fizeram **do mesmo lado** usa o mesmo dado virado pro lado que gera resenha. O confronto direto aparece como uma linha entre várias, nunca como placar de quem é melhor |
| **Recordes** | **Sempre superlativo positivo, e sempre recalculados** | Não existe "pior rodada" nem "mês mais fraco" — a decisão está num teste que quebra se alguém adicionar. Recalcular em vez de gravar porque número gravado sobrevive a um "desfazer lance" e passa a mentir |
| **Jogador entra na espera sozinho** | **Sim** | Se a lista está cheia, o clique vira lugar na fila em vez de erro — é o que faz a espera andar sem ninguém no meio |

Ainda em aberto: **nome definitivo**.

---

## 2. O que está pronto e funcionando

### Fundação
- Projeto Next 16 + TS + Tailwind v4, estrutura de pastas conforme §59 do plano.
- `.npmrc` local apontando pro registry público (a config global da máquina aponta pra um
  repositório privado da Marinha — sem isso, `npm install` quebra).
- Docker Compose com Postgres 17; 5 migrations aplicadas.
- Deploy Docker validado localmente: `.dockerignore` não envia ambiente nem artefatos locais;
  o alvo `migrator` aplica migrations e o alvo padrão serve o Next standalone. A imagem
  constrói sem `DATABASE_URL`, recebe as variáveis públicas no build e sobe com a URL real
  só em runtime.
- Seed completo: grupo "Fut da Quinta", organizador `salles@jogae.app` como OWNER,
  22 jogadores com skill/posição/aliases, rodada anterior encerrada com 6 partidas e gols,
  próxima rodada confirmada com 20 confirmados + 2 na espera.
- PWA: `manifest.webmanifest` com PNG 192/512 e maskable, `apple-touch-icon`,
  service worker, theme color, safe-area do iPhone.
- Vitest em duas suítes (domínio e integração); ESLint limpo.

### Design system → código
`src/app/globals.css` traduz a seção 05 do `Design System Jogae.dc.html`:
cores (canvas/surface/elevated/line + as 4 cores com variantes), tipografia
(Anton display + DM Sans UI, escala `display-xl`→`caption`), raios, sombras,
motion tokens (`120/220/380ms`, `ease-snappy`, `ease-standard`), texturas
(grid técnico, stripe de 4 cores), chanfro de 16px (`.cut-corner`),
foco amarelo 2px, e `prefers-reduced-motion`.

### Domínio (puro, 215 testes)
| Módulo | O que faz | Testes |
| --- | --- | --- |
| `domain/list-parser` | Interpreta lista do WhatsApp: seções, numeração 1/01/001, emojis, traços unicode, prefixo de export, vagas vazias, aliases, duplicatas, capacidade. Detecta o caso real de a seção de goleiros terminar sem cabeçalho quando a numeração reinicia em 01. | 22 |
| `domain/team-balancer` | Sorteio puro e equilibrado, determinístico por seed, serpentina + função de custo (skill, perfil, repetição de duplas, time anterior). Locks, banco, 4 estratégias de goleiro. | 20 |
| `domain/statistics` | Gols, assistências, participações, V/E/D, aproveitamento, saldo, ranking com empate compartilhando posição. | 11 |
| `domain/share` | Mensagens de times, resultado e chamada de rodada pro WhatsApp. | 9 |
| `domain/access` | Matriz de permissão por papel; visitante não pode nada, papel forte contém o fraco. | 6 |
| `domain/groups` | Defaults por modalidade, capacidade, normalização de formato, slug único e reservado. | 11 |
| `domain/roster` | Validação de jogador, nível 1–5, conflito de nome/apelido/alias, busca sem acento. | 11 |
| `domain/schedule` | Próxima data recorrente: hoje ainda dá tempo, virada de semana e de mês, sem recorrência. | 9 |
| `domain/access/membros` | Convite (papel válido, já é membro, convite duplicado), troca de papel e remoção — nunca deixando o grupo sem dono. | 12 |
| `domain/statistics` (MVP) | MVP da rodada por participação em gol, desempate por gols e vitórias; empate total não elege ninguém. | 4 |
| `domain/badges` | Conquistas: artilheiro e garçom do mês, presença de ferro, hat-trick, craque da rodada, estreia. Empate divide a conquista; empate de gente demais não coroa ninguém; nada negativo. | 23 |
| `domain/attendance` | Presença: confirmar, cancelar, **"cancelou → primeiro da espera sobe"**, goleiro que cai puxa goleiro da espera, clique repetido idempotente, lista/espera cheias, rodada fechada a mexida. | 23 |
| `domain/roster/escolha-de-jogador` | Lista de nomes do link de convidado: inativo fora, apelido ganha do nome, apelido repetido volta pro nome completo, ordem sem acento. Só devolve id e nome. | 10 |
| `domain/live/gol-repetido` | Gol do mesmo time dentro da janela vira pergunta: ignora time adversário, lance desfeito e gol antigo; tolera relógio torto nos dois sentidos. | 10 |
| `domain/statistics/recordes` | Recordes pessoais (gols, assistências, participações e vitórias numa rodada; maior sequência de presença) e melhor mês. Todo recorde é superlativo positivo — há teste que quebra se alguém adicionar um "pior". | 17 |
| `domain/statistics/dupla` | Jogos juntos, aproveitamento da dupla, quem serve quem, confronto direto; parcerias mais frequentes e dupla do período. | 14 |
| `domain/statistics/retrospectiva` | Números do período + destaques (artilharia, garçom, presença, craque, escolha da galera), jogo mais movimentado, dupla e estreantes. | 12 |
| `domain/statistics/perfil` | Resumo do card do jogador: separa rodada (presença) de partida (jogo), V/E/D, aproveitamento, craques e escolhas. | 8 |
| `domain/mvp/votacao` | Janela de 48h, quem pode votar, voto em si, quórum, empate divide, empate demais não elege, voto secreto na apuração. | 22 |
| `domain/live/celebracao` | Hat-trick comemora no terceiro gol e não no quarto; gol sem autor nunca é hat-trick. | 4 |
| `domain/text`, `domain/random` | Normalização, Levenshtein, similaridade, PRNG mulberry32 com seed. | (cobertos indiretamente) |

**Invariantes garantidas por teste:** o balanceador não perde nem duplica jogador,
respeita capacidade e locks, e a mesma seed sempre dá o mesmo resultado.

### Camada de dados (81 testes de integração contra Postgres)
`features/rounds/service.ts` e `features/live/service.ts` recebem o client por parâmetro e
não sabem de sessão nem de `revalidatePath`. O que está coberto:
importar lista cria jogador novo · aprende alias confirmado · substitui presenças em vez de
somar · recusa jogador de outro grupo · promover da espera · sortear preserva lock e grava o
rastro · mesma seed, mesmo resultado · troca manual conta edição · gol incrementa · desfazer
decrementa e não conta no ranking · reenvio da fila offline não duplica placar ·
encerrar rodada fecha a partida em andamento e alimenta a vitória no ranking ·
convite guarda só o hash e recusa duplicado · aceitar convite não rebaixa quem já é membro ·
último dono não é rebaixado nem removido · assistente não sorteia nem edita config ·
voto de craque grava um por pessoa e recusa o segundo · recusa voto em si, em
quem não jogou, de quem não jogou, fora do prazo e em rodada de outro grupo ·
sem quórum não elege ninguém · apuração não devolve quem votou em quem ·
link de convidado troca o nome escolhido pelo link pessoal · recusa jogador de outro
grupo e jogador inativo com a mesma mensagem · token de grupo nasce UUID v4 ·
duplicar rodada repete a lista sem trazer inativo nem quem faltou · renomear time
não mexe no elenco dele · cancelar pelo link pessoal promove o primeiro da espera na
mesma transação · goleiro que cai é substituído por goleiro · confirmar com a lista cheia
cria presença na espera · clique repetido não duplica · jogador de outro grupo é recusado ·
rodada ao vivo não aceita mudança.

### Autenticação e autorização
- **Identidade é do Supabase Auth**: Google (caminho principal) e link por e-mail
  (alternativa, e o que resolve convite em e-mail corporativo). Sem senha em lugar nenhum.
- **Identidade × domínio são separados de propósito.** O Supabase é dono de "quem é
  você"; o `User` daqui é dono de "o que você é neste app" (nome, grupos, papéis). A
  ponte é `User.authId` = `sub` do JWT. Isso é o que permitiria trocar de provedor sem
  reescrever `Membership` nem mexer nos ids do domínio.
- `lerIdentidade()` usa **`getClaims()`**, que valida a assinatura do JWT — com chave
  assimétrica, localmente contra o JWKS em cache. `getSession()` **nunca** é usado no
  servidor: ele lê o cookie sem verificar, e cookie é entrada do usuário.
- `getUsuarioAtual` busca por `authId`, não por e-mail. O e-mail só é chave dentro do
  `/auth/callback`, onde o provedor acabou de confirmá-lo.
- `src/proxy.ts` (o antigo middleware — Next 16 renomeou) renova o token e barra
  `/g/**` e `/novo`; `/r/**` continua público. A renovação mora aqui porque Server
  Component não grava cookie — sem isso a pessoa cai fora quando o access token vence.
- `features/auth/queries.ts` é o DAL: `requireGroupAccess`, `requireRoundAccess`,
  `requirePlayerAccess`, `requireMatchAccess`, `requireTeamAccess`. **Toda** mutação
  passa por um deles.
- **Convite de membro não tem token.** A capacidade é controlar o e-mail, e quem
  verifica isso é o provedor: quem entra com um e-mail convidado recebe o vínculo no
  callback. É mais simples e mais forte do que um link secreto que pode ser encaminhado.
  Quem já é membro mantém o papel que tem — convite antigo não rebaixa ninguém.
- Tela que o papel não alcança some do caminho: `/membros` responde 404 pro assistente;
  `/config`, `/elenco` e `/rodada/importar` mostram recado em vez do editor; a tela de
  times aparece sem os controles de sorteio.
- Página de grupo que não é seu responde 404, não 403 — 403 confirmaria que o grupo existe.
- Ids vindos do client são validados contra o grupo (jogador, time da partida).

### Telas
| Rota | Estado |
| --- | --- |
| `/` | Landing; deslogado mostra "Entrar", logado lista só os grupos do usuário (um grupo vai direto) |
| `/entrar` | "Entrar com Google" em destaque; e-mail atrás de um clique. Sem chave configurada, explica o que falta em vez de estourar |
| `/auth/callback` | Volta do provedor: troca o código pela sessão, garante o `User` e transforma convite aberto em vínculo |
| `/novo` | Onboarding: nome → modalidade → formato → dia/hora/local; já cria a primeira rodada |
| `/g/[slug]` | Home: saudação, próxima rodada com contadores, artilharia do mês, placar ao vivo assume a tela quando há partida |
| `/g/[slug]/rodada` | Presenças: goleiros, confirmados, espera com promover, toggle de goleiro |
| `/g/[slug]/rodada/importar` | Colar → interpretar → revisar → confirmar |
| `/g/[slug]/rodada/times` | Modo aleatório/equilibrado, sorteio com animação pulável, troca por toque duplo, transparência do sorteio, copiar pro WhatsApp |
| `/g/[slug]/ao-vivo` | Escolher confronto, placar 96px, gol por time, sheet "Gol de quem? → Teve assistência?", desfazer, cronômetro, timeline |
| `/g/[slug]/ranking` | Abas rodada/mês/geral × gols/assistências/participações/vitórias/presença; conquistas do mês com "copiar pro grupo"; nome leva ao card |
| `/g/[slug]/jogador/[id]` | **Card do jogador**: temporada, melhor mês, conquistas, recordes, com quem mais joga e a ficha da dupla (`?dupla=<id>`) |
| `/g/[slug]/retrospectiva` | **Retrospectiva** mensal e anual: números, destaques, dupla do período, jogo mais movimentado, estreantes |
| `/g/[slug]/elenco` | CRUD de jogador: busca, adicionar, editar (nome, apelido, aliases, posição, goleiro, nível), inativar, excluir quem nunca jogou |
| `/g/[slug]/config` | Edita formato, recorrência e local do grupo; mostra e troca o **link de convidado** |
| `/g/[slug]/membros` | Só do dono: convidar por e-mail, trocar papel, tirar do grupo, revogar convite |
| `/g/[slug]/mais` | Resumo do grupo, atalhos pra elenco, membros e config, histórico, conta e sair |
| `/e/[token]` | **Link de convidado do grupo**: um link só, pro WhatsApp. Lista de nomes → "sou eu" → cookie → cai no link pessoal. `?trocar=1` mostra a lista de novo |
| `/p/[token]` | **Link pessoal do jogador**: "Tô dentro" / "Não vou", posição na espera, o time dele quando saiu o sorteio. Sem login, sem conta — e sem nível técnico |
| `/r/[token]` | Página pública: times, placares, espera, MVP da rodada, regra do dia — sem login, sem dado privado |
| `/r/[token]/imagem` | Card PNG 1200×630 dos times (share card e `og:image` do link no WhatsApp) |
| `/r/[token]/conquistas/imagem` | Card PNG 1200×630 das conquistas da rodada — o share card do §27 |
| `/offline` | Fallback do service worker |

### Fase 1.5 — o que entrou nesta sessão
- **Repetir a última rodada**: copia a lista da rodada anterior numa data nova, sem
  trazer jogador inativo nem quem faltou; espera continua espera. A rodada já nasce
  confirmada, então pula a importação e vai direto pro sorteio.
- **Nome e cor do time**: toque no cabeçalho do card abre a ficha. As quatro cores
  continuam sendo as do design system.
- **Card dos times em PNG** (`/r/[token]/imagem`), servido também como `og:image`:
  colar o link da rodada no WhatsApp mostra os times na prévia.
- **MVP da rodada** na página pública, só depois do apito final.
- `components/ui/dialog.tsx` (`Sheet`): foco preso, Escape fecha, foco volta pro
  gatilho, scroll do fundo travado. Ficha do jogador, sheet de gol, convite, ficha de
  membro e ficha de time usam todos ele.

### Bloco I — conta de jogador (opção B), sessão de 19/08
O jogador confirma presença sozinho, **sem conta**. O que entrou:

- **`Player.selfToken`** (UUID v4, único, não expira) — o link pessoal `/p/<token>`.
  UUID e não `cuid()` como os outros tokens porque este *muda presença*: cuid carrega
  contador e fingerprint da máquina, então dois gerados em sequência são parentes.
  A migration preenche as linhas antigas com `gen_random_uuid()` antes de exigir
  `NOT NULL`. O default é do **banco** (`@default(dbgenerated(...))`) e não do Prisma:
  a migration roda antes do deploy, e o código que está no ar criaria jogador sem a
  coluna nova — importar lista cria jogador, então a janela não era teórica.
- **`Attendance.origin`** (`ORGANIZER` | `PLAYER`) — separa "ele confirmou sozinho" de
  "o organizador colou a lista". Sem isso a sequência de presença da Fase 2 seria mérito
  de quem organiza. A origem marca quem **escolheu** o status: quem sobe da espera não
  escolheu nada e mantém a que tinha.
- **`src/domain/attendance/presenca.ts`** (23 testes) — a regra que faltava. Cancelou →
  o primeiro da espera sobe, por `order` crescente. Quem entra na lista vai sempre pro
  fim (`order = maior + 1`), sem a colisão de ordem que o `promoverDaEspera` do organizador
  ainda produz (ele grava `order = contagem de confirmados`, que bate com quem já está na
  lista — dívida conhecida, não tocada nesta sessão). Clique repetido é `ok` sem escrita nenhuma — o link
  mora no WhatsApp e vai ser clicado de novo.
- **Goleiro fura a fila.** Se quem saiu era goleiro e o grupo reserva vaga de gol, sobe o
  primeiro goleiro da espera; sem goleiro esperando, sobe o primeiro mesmo assim e sai o
  aviso `sem-goleiro-na-espera`. Grupo em revezamento (`vagasDeGoleiro = 0`) é FIFO puro.
- **`requireAcessoPorLinkPessoal`** em `features/auth/queries.ts`: o token **é** a
  credencial e autoriza um jogador só. A action nunca aceita `playerId` nem `roundId`
  vindo do client — senão o link de um viraria a presença de outro. Token inválido,
  revogado ou de jogador inativo responde **404**.
- **Distribuição um a um.** Na ficha do jogador (`/g/[slug]/elenco`) tem "Copiar link" e
  "Copiar recado" (`buildLinkPessoalMessage`). Não existe versão "manda no grupo" de
  propósito: colar 22 links numa conversa de grupo entrega a presença de cada um pra todo
  mundo, e a própria mensagem avisa isso.
- **Invariante mantida e verificada:** o nível técnico não entra na função de domínio
  (a entrada não tem `skillLevel`), não é selecionado pela consulta da página e não
  aparece no HTML servido — conferido no `next start` com o seed real.

### Fase 2 — conquistas, sessão de 19/08
Primeiro recorte de gamificação, o que o HANDOFF recomendava. Seis conquistas em
`src/domain/badges/conquistas.ts` (23 testes), todas deriváveis do que já era calculado:

| Conquista | Critério | Cor |
| --- | --- | --- |
| Artilheiro do mês | Mais gols no mês | vermelho (gol) |
| Garçom do mês | Mais assistências no mês | amarelo (assistência) |
| Presença de ferro | 4+ rodadas seguidas sem faltar | verde (confirmação) |
| Hat-trick | 3+ gols numa rodada | vermelho |
| Craque da rodada | O `mvpDaRodada` que já existia | rosa (conquista) |
| Estreia | Primeira rodada de quem jogou | rosa |

As três regras que a exigência do plano ("leve e positiva, sem gerar conflito") impôs:

- **Nada negativo.** Não existe "pior do mês" nem ranking de gol contra, e não vai
  existir — a decisão está escrita no cabeçalho do módulo.
- **Empate divide a conquista.** Dois artilheiros é resenha; escolher um por ordem
  alfabética é briga. (O MVP continua a exceção: empate total não elege ninguém, porque
  craque é singular por desenho.)
- **Conquista que muita gente tem não é conquista.** Acima de 3 empatados, ninguém leva.
  Isso apareceu **testando com dado real**: na primeira rodada da vida do grupo, os 20
  jogadores são estreantes, e 20 medalhas iguais não são medalha. Vale pro topo do
  ranking (`MAXIMO_EMPATADOS`) e pra estreia (`MAXIMO_ESTREANTES`).

Onde aparece: **ranking** ("Conquistas do mês"), **link pessoal do jogador**
(`/p/<token>` → "Suas conquistas") e o **craque de cada rodada no histórico** da tela
Mais — que era a dívida barata anotada no HANDOFF (o `mvpDaRodada` existia e só saía na
página pública).

O recorte das conquistas é **sempre o mês**, mesmo quando a aba do ranking está em
"Geral": o rótulo diz "do mês", e rótulo que mente é pior que aba a menos.

### Fase 2 completa — sessão de 19/08 (parte 4)

O que faltava do §27 entrou inteiro. O que já existia (6 conquistas, craque
calculado, sequência de presença) continua igual; o que entrou agora:

| Item do §27 | Onde |
| --- | --- |
| Votação de MVP | `domain/mvp/votacao.ts` · `features/mvp/` · urna em `/p/<token>` |
| Cards de jogador | `/g/<slug>/jogador/<id>` e a versão do próprio em `/p/<token>` |
| Recordes pessoais | `domain/statistics/recordes.ts` |
| "Melhor mês" | `melhorMesDoJogador`, no card |
| Retrospectiva mensal e anual | `domain/statistics/retrospectiva.ts` · `/g/<slug>/retrospectiva` |
| Comparação entre amigos | `domain/statistics/dupla.ts` — como parceria |
| Share cards | `/r/<token>/conquistas/imagem` (PNG) + 4 mensagens novas em `domain/share` |
| Animação de hat-trick | `domain/live/celebracao.ts` + `animate-hat-trick` no ao vivo |

**As decisões de produto que a implementação obrigou a tomar:**

- **Dois prêmios, não um.** "Craque da rodada" continua sendo o calculado;
  "Escolha da galera" é o votado. No smoke com o seed os dois caíram em pessoas
  diferentes — o craque foi um jogador de linha com 3 participações em gol, e a
  galera elegeu o **goleiro**. É exatamente a injustiça estrutural que a votação
  existe pra consertar, e ela apareceu no primeiro teste com dado real.
- **O voto é secreto, e isso é arquitetura.** O par votante→votado existe na
  tabela (é o que garante um voto por pessoa) e **não sai dela**: `apurarVotacao`
  recebe os pares e devolve só o vencedor e a contagem dele. Não existe consulta
  no app que responda "quem votou em quem", e um teste verifica que a apuração
  não devolve o placar completo.
- **Parcial não aparece.** Com a urna aberta, `getEscolhaDaGalera` devolve
  `null`. Mostrar quem está ganhando no meio da votação transforma o prêmio em
  campanha e faz o voto de quem falta ser sobre o placar, não sobre o jogo.
- **Nada de comparação "eu × você".** A tela de dupla ordena por **frequência**
  ("vocês jogaram 18 vezes juntos"), não por aproveitamento — ordenar por quem
  ganha mais viraria, na prática, uma lista de quem carrega quem.
- **A animação de hat-trick sai no terceiro gol e não sai mais.** O quarto volta
  a ser "Goool". Uma animação que ocupa a tela inteira só se sustenta sendo
  rara, e a contagem é **por rodada** — a mesma da conquista, senão a tela
  comemora o que o histórico não registra.

**O que a implementação exigiu de infraestrutura:**

- **`features/rankings/historico.ts`** — o histórico do grupo numa forma só
  (`RodadaCompleta`). Cinco coisas (conquistas, recordes, melhor mês,
  retrospectiva, dupla) faziam a mesma pergunta ao banco; cinco consultas
  parecidas é como duas telas passam a mostrar números diferentes pro mesmo
  jogador. `getConquistas` foi migrado pra ele e ganhou a conquista nova de
  graça.
- **`Round.finishedAt`** (migration `20260819180000_votacao_de_craque`) — o
  apito final de verdade. `endsAt` não servia: aquele é o fim **previsto**,
  calculado do formato do grupo. Rodada encerrada antes da coluna existir cai na
  data da rodada, o que deixa a votação dela já fechada — o comportamento certo.
- **`MvpVote`**, com `@@unique([roundId, voterPlayerId])`: um voto por pessoa é
  regra do banco, não só da action. O link vive no WhatsApp e o clique repetido
  no 4G do estacionamento chega duas vezes.
- **`components/og/base.ts`** — cor, tamanho e fonte dos cards PNG num lugar só,
  agora que existem dois.

**Mês e ano nunca saem de `getMonth()`.** `melhorMesDoJogador` e o recorte da
retrospectiva usam `partesNoFuso`/`instanteDoFuso`: uma rodada de 31 de janeiro
às 20:30 de Brasília cairia em fevereiro na Vercel (UTC), e o melhor mês trocaria
de lugar. Mesma armadilha do bug do 17:30.

### Link de convidado do grupo — sessão de 19/08 (parte 3)

O bloco I estava em código e **não estava em uso**: faltavam as 22 mensagens no
privado. Este recorte mata esse custo sem trocar o modelo de acesso.

- **`/e/<publicToken>`** — um link só, pro organizador colar na conversa do
  grupo. Abre a lista de nomes do elenco, a pessoa toca no seu, e o servidor
  grava um cookie e a redireciona pro link pessoal dela (`/p/<selfToken>`). O
  `requireAcessoPorLinkPessoal` e as 23 regras de presença **não mudaram**: o
  link do grupo é um distribuidor, não um modelo de autorização novo.
- **`FootballGroup.publicToken` virou credencial.** Ele existia desde o init e
  nunca tinha sido usado por rota nenhuma. Como agora abre a lista do elenco,
  deixou de ser `cuid()` (contador + fingerprint da máquina, tokens de grupos
  criados em sequência são parentes) e passou a UUID v4 gerado pelo banco —
  mesmo raciocínio de `Player.selfToken`. A migration troca o default e
  regrava os existentes, o que é seguro justamente porque nenhum link com o
  valor antigo tinha sido publicado.
- **Os `selfToken` não aparecem no HTML da lista.** O botão manda o `playerId`
  e o servidor resolve o token. Se os 22 tokens saíssem na página, um print
  daria link permanente de todo mundo e trocar o link do grupo não adiantaria
  mais nada. Conferido no `next start` com o seed: 22 nomes na tela, zero
  tokens no HTML.
- **Funciona antes da hidratação.** É um `<form action={...}>` com um botão por
  nome: no `next start` o POST sem JS nenhum devolve 303 pro link pessoal com
  o cookie no cabeçalho. É a primeira tela que 21 pessoas vão abrir, do 4G do
  estacionamento — toque que não responde ali é adoção perdida.
- **"Não é você?"** aparece em `/p/<token>` **só** se o aparelho tem o cookie,
  ou seja, só pra quem chegou pelo link do grupo. Mostrar sempre transformaria
  um link pessoal vazado em acesso ao elenco inteiro.
- **Trocar o link** fica na configuração do grupo, com confirmação. O que a
  troca não desfaz, e a tela diz: quem já entrou continua com o link pessoal
  dele — que é outro token.
- **Desambiguação de nome** (`domain/roster/escolha-de-jogador.ts`): dois "Rafa"
  na lista viram "Rafael Souza" e "Rafael Lima". Tocar no nome errado é
  responder a presença de outra pessoa.
- **Pergunta anti-gol-duplo** (`domain/live/gol-repetido.ts`): com mais gente
  acompanhando o jogo, dois celulares marcam o mesmo gol. O `clientEventId`
  da fila offline cobre o reenvio do mesmo aparelho, não isso. Gol do mesmo
  time dentro de 20s abre "Já marcaram esse gol?" com o autor e há quantos
  segundos — **pergunta, não bloqueia**: gol fantasma contamina o ranking, mas
  gol legítimo recusado também não tem conserto. O relógio do servidor viaja
  junto na página porque a checagem compara carimbo do banco com o "agora" do
  celular, e celular com hora errada faria a checagem sumir em silêncio.

### Sessão de 20/08 — varredura de lançamento
O que entrou no dia de colar o link no grupo de verdade:

- **O crédito "Desenvolvido por Igor de Castro" não fica mais atrás do bottom
  nav.** No mobile das telas do grupo o nav é fixo e cobria o rodapé — ele só
  aparecia no fim do scroll, cortado. Agora um `body:has([data-nav-fixa])` no
  `globals.css` dá o respiro só quando o nav está na tela (no `lg` ele vira
  sidebar e o respiro some). Navegador sem `:has()` fica como era.
- **Trocar o link pessoal de UM jogador ganhou tela** (era o item 5b desta
  lista): "Gerar link novo" na ficha do elenco, com confirmação, via
  `regenerarLinkPessoalAction`. Vazou o link ou a pessoa trocou de celular,
  gera outro — o antigo responde 404 na hora, sem tirar ninguém do elenco.
- **`public/fonts/Anton-Regular.ttf` entrou no repositório** (dívida 7): os
  três cards PNG saem com a tipografia do produto. Junto vieram dois consertos:
  a rota de conquistas dizia `fontFamily: "Anton"` sem nunca registrar a fonte
  no `ImageResponse` (caía na padrão em silêncio), e
  `outputFileTracingIncludes` garante o `.ttf` no bundle serverless da Vercel —
  sem isso o `readFile` em runtime não acha o arquivo em produção.
- **Card OG padrão do app** (`src/app/opengraph-image.tsx`): toda rota sem card
  próprio — a landing e principalmente o link de convidado `/e/<token>`, que é
  colado na conversa do grupo — ganha prévia com a marca no WhatsApp. De
  propósito sem dado nenhum: nome de grupo e elenco não entram em imagem que o
  WhatsApp cacheia.

### Offline (plano §40)
- `public/sw.js`: cache-first nos assets versionados do Next, network-first na navegação com
  fallback pra `/offline`. **Não** cacheia POST, `/api/**` nem HTML de `/g/**` — isso vazaria
  dado de grupo entre contas no mesmo aparelho.
- Fila de gols em IndexedDB (`src/lib/fila-offline.ts`): o lance é gravado **antes** de tentar
  a rede e só sai da fila quando o servidor confirma.
- `MatchEvent.clientEventId` (único) torna o reenvio idempotente — sincronizar duas vezes não
  duplica placar. Coberto por teste de integração.
- `POST /api/gols` descarrega a fila com a mesma autorização das actions. Sessão vencida
  devolve 401 e a fila espera; erro definitivo (partida encerrada) descarta o lance.
- Indicador em `components/shell/offline-sync.tsx` só aparece quando há o que dizer.

### Produção e desempenho — sessão de 18/08
- **Deploy feito na Vercel**, com o banco e a auth no Supabase Cloud (`sa-east-1`).
  Google OAuth validado em produção; login funcionando.
- **Região da função fixada em `gru1`** (`vercel.json`). O deploy inicial subiu em
  `iad1` (Washington) com o banco em São Paulo: cada query atravessava o continente.
  Medido antes e depois, em produção, com 10 amostras intercaladas:

  | Rota | Antes (`iad1`) | Depois (`gru1`) |
  | --- | --- | --- |
  | `/entrar` (0 queries) | ~300ms | **146ms** |
  | `/r/xxx` (1 query) | ~450ms morno · 2,4s frio | **145ms** morno · ~1s frio |

  Uma ida ao banco custava ~150ms e passou a ser indistinguível de zero.
- **Cascata de queries desfeita.** A casca pedia a rodada inteira (presenças, times,
  partidas, lances) pra derivar o booleano "tem jogo ao vivo" — virou `temRodadaAoVivo`,
  uma coluna. `getCurrentRound` fazia até três buscas em série com o `include` gordo pra
  descartar duas — virou três buscas paralelas de `id` mais um detalhe. Grupo e
  identidade agora resolvem em paralelo na autorização.
- **`loading.tsx` no grupo.** Sem esse boundary o clique na navegação ficava sem
  resposta nenhuma até o servidor terminar a página inteira, e rota dinâmica sem ele não
  tem casca pro `prefetch` do `<Link>` pré-carregar. É o que fez a navegação *parecer*
  instantânea, além de ser.
- **Cache de navegação ligado** (`staleTimes: { dynamic: 30, static: 180 }`): voltar
  pra uma aba visitada nos últimos 30s não custa ida ao servidor.
- **Cron diário anti-pausa** (`/api/manter-vivo`, 12:00 UTC). O plano Free do Supabase
  pausa projeto com uma semana sem atividade **no banco**, e religar é manual — o site
  ficaria fora do ar até alguém abrir o painel. A rota faz `select 1` de verdade.

### Fuso horário — bug corrigido na sessão de 18/08
A tela mostrava **17:30** para um grupo configurado às **20:30**. Causa:
`proximaDataRecorrente` montava a data com `new Date(ano, mês, dia, hora, minuto)`, que
usa o relógio do processo. Na Vercel isso é UTC, então "20:30" virava 20:30 **UTC**, e a
exibição, que formata em Brasília, mostrava 17:30.

O que mudou:
- `src/domain/time/fuso.ts` (novo, puro): `instanteDoFuso`, `partesNoFuso`,
  `diaDaSemanaNoFuso`, `inicioDoDiaNoFuso`, `inicioDoMesNoFuso`. Hora de parede entra e
  sai sempre pelo fuso declarado.
- `recurrence.ts` ancora o horário no fuso do app e aceita fuso por parâmetro.
- `dates.ts`: `weekdayName`, `relativeDay` e `startOfMonth` liam o relógio do processo —
  todos corrigidos. `startOfMonth` deslocado significava artilharia do mês com fronteira
  errada. Novo `nomeDoDiaDaSemana(indice)` substitui o truque `new Date(2024, 0, 7 + dia)`,
  que só acertava porque construção e leitura usavam o mesmo fuso errado.
- **Os testes eram cúmplices:** asseriam com `getHours`/`getDate`, que leem o fuso do
  processo. Passavam na máquina do dev (horário do Brasil) e mentiam sobre a Vercel.
  Foram reescritos para asserir em ISO/UTC ou pelo relógio de Brasília explícito, e a
  suíte agora roda verde **nos dois fusos** — `npm test` e `TZ=UTC npm test`.
- `scripts/corrigir-fuso-das-rodadas.ts` conserta as rodadas já gravadas torto. Relata
  por padrão; só grava com `--aplicar`. A impressão digital do bug é exata (hora de
  parede em UTC igual ao `defaultStartTime` do grupo), então rodada criada em máquina
  de dev não é tocada.

---

## 3. O que NÃO está pronto

**Importante:**
1. **Nada foi testado em aparelho de verdade.** A auditoria de código desta sessão
   corrigiu o que dava pra ver lendo (safe area do indicador de sincronização, alvo de
   44px no botão compacto, respiro do rodapé com notch), mas iPhone e Android continuam
   sem QA real. O service worker nunca rodou fora do `next start` local.
2. **Os e-mails de autenticação continuam em inglês em produção — mas o HTML já existe.**
   O SMTP funciona (Hostinger, testado de ponta a ponta em 18/08) e SPF/DKIM/DMARC do
   domínio estão válidos; o que faltava era o template. `docs/emails/magic-link.html` e
   `docs/emails/convite.html` estão prontos (português, identidade do Jogaê, tabela com
   estilo inline, preheader, link também em texto) e `docs/emails/README.md` diz onde
   colar e como testar. **Falta a ação manual:** colar no painel do Supabase
   (Authentication → Emails → Templates) — eles não vivem no repositório.
3. **Domínio próprio.** O app responde em `jogae-free.vercel.app`. Domínio não muda nada
   de desempenho; é questão de identidade e de mandar o link no grupo sem vergonha.
4. **O bloco I está em código, mas ainda não em uso.** Três migrations
   (`20260819120000_link_pessoal_do_jogador`, `20260819133000_default_do_link_no_banco`
   e `20260819160000_link_de_convidado_do_grupo`) foram aplicadas no banco local e no
   schema `teste`; **falta rodar em produção** (`prisma migrate deploy` pelo
   `DIRECT_URL`, porta 5432 — o pooler da 6543 não roda migration). Com o link de
   convidado, o passo humano deixou de ser 22 mensagens e virou uma: copiar o link em
   `/g/<slug>/config` e colar no grupo. **Nenhum jogador de verdade clicou ainda.**
5. Sem rate limit fora do login; erro de action ainda aparece só como mensagem inline.
   O `/e/<token>` também não tem: um token errado custa uma consulta indexada e
   responde 404, mas nada impede tentar em volume. UUID v4 torna a força bruta
   irrelevante; rate limit continua sendo o certo a fazer.
5b. ~~Revogar o link pessoal de uma pessoa só não tem tela.~~ **Resolvido em
   20/08:** "Gerar link novo" na ficha do jogador (elenco), com confirmação.
5c. **A troca do link de convidado não foi exercitada pela interface.** O smoke
   confirmou o efeito no banco (token novo → link antigo responde 404, novo responde
   200) e a tela renderiza o card com o botão, mas ninguém clicou nele num navegador:
   remontar o protocolo de Server Action no `curl` não valia o esforço. Mesma coisa
   pra pergunta "Já marcaram esse gol?" — a regra tem 10 testes, a montagem passou no
   `tsc` e no build, e a interação em si só existe em aparelho.
6. **A Fase 2 está completa em código, e vazia de dado real.** Todos os itens do §27
   existem, mas quase nenhum tem o que mostrar hoje: recorde precisa de rodadas,
   "melhor mês" precisa de meses, a retrospectiva anual só faz sentido em dezembro, e a
   votação nunca teve um voto de gente de verdade. O que dá pra afirmar é que a
   mecânica funciona com o seed — o resto é tempo. **A Fase 3 (financeiro) não entrou
   nada** — não tem regra definida no PRD além da lista de tópicos; precisa de decisão
   de produto antes de virar schema.
6b. **A interação da Fase 2 não foi tocada por dedo nenhum.** O smoke cobriu o que o
   servidor renderiza (retrospectiva, card, urna com 19 candidatos, resultado com a urna
   fechada, PNG de conquistas). O que só existe em aparelho: **o toque no nome pra
   votar** (a action tem 12 testes de integração, mas o clique em si não) e **a animação
   de hat-trick** (a regra tem 4 testes; a animação nunca rodou fora do CSS).
6c. **O custo do card do jogador cresce com o grupo.** `getCardDoJogador` lê o
   histórico inteiro pra calcular recorde e parceria. Num grupo de dois anos são ~100
   rodadas, o `cache()` do React resolve a repetição dentro da mesma renderização, e
   `/p/<token>` passou a pagar isso também. Se a home ou uma lista um dia exibir card,
   aí sim vira coluna.

9. **Fuso é um só pro app inteiro** (`America/Sao_Paulo`). O Fut Manus joga em UTC−4 e
   vê horário de Brasília — uma hora a mais. O bug do 17:30 está corrigido (o que o
   organizador digita é o que aparece), mas "hoje/amanhã" e a fronteira da artilharia
   ainda usam Brasília pra todo mundo. A correção é dar fuso próprio ao grupo; as
   funções de `domain/time/fuso.ts` já aceitam o fuso por parâmetro.
10. **Cold start de ~1s** no primeiro acesso após ociosidade — inerente ao serverless.
   Pesa mais no Jogaê que na média porque o app é usado uma ou duas vezes por semana.
   Mitigações não exploradas: Fluid Compute no painel da Vercel; a VPS elimina.
11. **`CRON_SECRET` não configurada.** Sem ela `/api/manter-vivo` fica aberta. O que a
   rota expõe é um `select 1`, mas vale configurar.

**Dívidas menores:**
7. ~~A imagem dos times sai na fonte padrão.~~ **Resolvido em 20/08:** o `.ttf`
   está em `public/fonts/` e o tracing da Vercel o inclui no bundle.
8. ~~`/g/[slug]/ranking` e o histórico ainda não mostram o MVP.~~ **Resolvido em 19/08:**
   o craque aparece no histórico da tela Mais e como conquista no ranking.

---

## 4. Notas de ambiente

- **Fuso: nunca use o relógio do processo.** `new Date(ano, mês, dia, hora, min)`,
  `getHours()`, `getDate()`, `getDay()` e `getMonth()` leem o fuso de quem está
  rodando — UTC na Vercel, horário do Brasil na sua máquina. Para hora de parede use
  `src/domain/time/fuso.ts`. Teste que assere com esses getters passa aqui e mente
  sobre produção; rode `TZ=UTC npm test` antes de dar qualquer data por correta.
- **Produção:** Vercel, região `gru1` fixada em `vercel.json`. **Não tire** — o banco
  está em `sa-east-1` e sem isso a função sobe em `iad1`, somando ~150ms por query.
- **`DATABASE_URL` de produção é o pooler na porta 6543.** A 5432 é sessão/direta e
  só serve pra migration (`DIRECT_URL`). O `?pgbouncer=true` que o Supabase inclui é
  flag do query engine em Rust e o `@prisma/adapter-pg` a ignora — quem resolve é a porta.
- Env var na Vercel só entra em vigor no **próximo deploy**: editar e não redeployar
  não muda nada.
- Registry npm global aponta pro repositório privado da Marinha. O `.npmrc` do projeto
  corrige isso — **não apague**.
- Postgres roda em **5433** (não 5432).
- Prisma 7 exige driver adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`.
  O client é gerado em `src/db/generated/` (gitignored) — rode `npm install` ou
  `npx prisma generate` depois de clonar.
- `prisma.config.ts` carrega o `.env` via `dotenv/config`; o Prisma 7 não lê `.env` sozinho.
- `prisma migrate dev` **não roda sem terminal interativo** quando a migration gera aviso
  (índice único novo, por exemplo). Nesse caso escreva o `migration.sql` na mão e rode
  `prisma migrate deploy`.
- **Autenticação em dev roda no Supabase local**: `npm run auth:up` sobe o stack do CLI
  (uns 10 contêineres, ~3 GB na primeira vez) e `npm run auth:down` derruba. As chaves
  do `.env.local` são as fixas do CLI — iguais em qualquer máquina, não são segredo e
  não valem em produção. Os e-mails do login caem no Mailpit em `http://127.0.0.1:54324`.
  O banco do app **continua** sendo o Postgres do Docker Compose (porta 5433); o
  Supabase local serve só de provedor de identidade.
- Testes de integração usam o schema `teste` do mesmo banco (`DATABASE_URL_TESTE`).
  Sem a variável eles se declaram pulados e `npm test` continua verde.
- **O `?schema=` da URL não chega ao driver adapter.** O CLI do Prisma lê o parâmetro,
  mas o `PrismaPg` ignora: até esta sessão os testes de integração rodavam no schema
  `public` e o `limparBanco` apagava o banco de desenvolvimento no meio da suíte.
  `src/test/db.ts` agora passa `{ schema }` pro adapter e recusa rodar se o schema for
  `public`. Se aparecer outro client apontando pra banco alternativo, repita o cuidado.
