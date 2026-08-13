# STATUS — Jogaê

**Atualizado:** 12/08/2026
**Fase do roadmap:** Fase 0 (Fundação) concluída · Fase 1 (MVP de organização) concluída ·
Fase 1.5 concluída (falta só o que depende de aparelho e de deploy)
**Verificação nesta data:** `npm test` 115/115 · `npm run test:integracao` 57/57 ·
`npx tsc --noEmit` limpo · `npx eslint .` limpo · `npm run build` OK.

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
| **Hospedagem do app** | **VPS Hostinger (Docker)** | O plano Hobby da Vercel proíbe uso comercial, e a VPS já existe. `Dockerfile` standalone pronto |
| **Papéis** | **OWNER / ADMIN / ASSISTANT**, regra pura em `domain/access` | Assistente apita o jogo, nunca mexe em config nem em sorteio (plano §6 e §55) |
| **Envio de e-mail** | **Do Supabase, com SMTP próprio configurado no painel** | Um lugar só pra template, remetente e entrega. Em dev os e-mails caem no Mailpit local. Substituiu o Resend chamado direto do app |
| **Testes da camada de dados** | **Serviço extraído + Postgres real em schema `teste`** | Mock de Prisma testaria o mock; schema separado dispensa segundo container |

Ainda em aberto: **conta de jogador** (hoje só organizador tem login) e **nome definitivo**.

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

### Domínio (puro, 99 testes)
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
| `domain/text`, `domain/random` | Normalização, Levenshtein, similaridade, PRNG mulberry32 com seed. | (cobertos indiretamente) |

**Invariantes garantidas por teste:** o balanceador não perde nem duplica jogador,
respeita capacidade e locks, e a mesma seed sempre dá o mesmo resultado.

### Camada de dados (53 testes de integração contra Postgres)
`features/rounds/service.ts` e `features/live/service.ts` recebem o client por parâmetro e
não sabem de sessão nem de `revalidatePath`. O que está coberto:
importar lista cria jogador novo · aprende alias confirmado · substitui presenças em vez de
somar · recusa jogador de outro grupo · promover da espera · sortear preserva lock e grava o
rastro · mesma seed, mesmo resultado · troca manual conta edição · gol incrementa · desfazer
decrementa e não conta no ranking · reenvio da fila offline não duplica placar ·
encerrar rodada fecha a partida em andamento e alimenta a vitória no ranking ·
convite guarda só o hash e recusa duplicado · aceitar convite não rebaixa quem já é membro ·
último dono não é rebaixado nem removido · assistente não sorteia nem edita config ·
duplicar rodada repete a lista sem trazer inativo nem quem faltou · renomear time
não mexe no elenco dele.

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
| `/g/[slug]/ranking` | Abas rodada/mês/geral × gols/assistências/participações/vitórias/presença |
| `/g/[slug]/elenco` | CRUD de jogador: busca, adicionar, editar (nome, apelido, aliases, posição, goleiro, nível), inativar, excluir quem nunca jogou |
| `/g/[slug]/config` | Edita formato, recorrência e local do grupo |
| `/g/[slug]/membros` | Só do dono: convidar por e-mail, trocar papel, tirar do grupo, revogar convite |
| `/g/[slug]/mais` | Resumo do grupo, atalhos pra elenco, membros e config, histórico, conta e sair |
| `/r/[token]` | Página pública: times, placares, espera, MVP da rodada, regra do dia — sem login, sem dado privado |
| `/r/[token]/imagem` | Card PNG 1200×630 dos times (share card e `og:image` do link no WhatsApp) |
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

---

## 3. O que NÃO está pronto

**Importante:**
1. **Nada foi testado em aparelho de verdade.** A auditoria de código desta sessão
   corrigiu o que dava pra ver lendo (safe area do indicador de sincronização, alvo de
   44px no botão compacto, respiro do rodapé com notch), mas iPhone e Android continuam
   sem QA real. O service worker nunca rodou fora do `next start` local.
2. **Nada rodou contra um projeto Supabase na nuvem** — só contra o stack local do CLI,
   onde login por link e aceite de convite funcionaram de ponta a ponta. Falta exercitar
   o **Google** (que o stack local não tem) e o **SMTP de produção**. O que costuma
   falhar aí é configuração, não código: redirect URI no Google Cloud e Redirect URLs
   no Supabase.
3. **Deploy não foi feito.** A arquitetura está decidida (VPS Hostinger + Supabase Cloud)
  e o artefato foi validado localmente: o `migrator` encontrou as 5 migrations, a imagem
  standalone iniciou e `/offline` respondeu 200. Falta o que depende de conta: criar o
  projeto Supabase, configurar o OAuth do Google, apontar o domínio e ligar SMTP.
4. **Conta de jogador** segue em aberto por decisão de produto, não por falta de código:
   `docs/decisao-conta-de-jogador.md` tem as três saídas e a recomendação.
5. Sem rate limit fora do login; erro de action ainda aparece só como mensagem inline.
6. **Fase 2 e 3 do plano não entraram**: badges, recordes e retrospectivas (Fase 2, o MVP
   da rodada foi o único item antecipado) e todo o financeiro (Fase 3 — valor da rodada,
   pago/pendente, painel). O financeiro não tem regra definida no PRD além da lista de
   tópicos; precisa de decisão de produto antes de virar schema.

**Dívidas menores:**
7. A imagem dos times sai na fonte padrão: a Anton exigiria o `.ttf` embutido e o
   `next/font` não expõe o arquivo. Se `public/fonts/Anton-Regular.ttf` existir, a rota
   usa — é só colocar lá.
8. `/g/[slug]/ranking` e o histórico ainda não mostram o MVP; só a página pública mostra.

---

## 4. Notas de ambiente

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
