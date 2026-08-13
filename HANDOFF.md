# HANDOFF — Jogaê

Documento para retomar o desenvolvimento em outra sessão sem reconstruir contexto.
Leia junto com [STATUS.md](STATUS.md).

---

## Prompt para a próxima sessão

Copie o bloco abaixo inteiro como primeira mensagem.

````text
Projeto: Jogaê (C:\Users\user\Documents\AAA_PROGRAMMING\jogae) — PWA mobile-first para
organizar futebol amador. Next.js 16 + React 19 + TypeScript + Tailwind v4 + Prisma 7 +
PostgreSQL. Português do Brasil em código, comentários e UI.

Antes de escrever qualquer código, leia nesta ordem:
1. STATUS.md — o que está pronto, o que não está, decisões já tomadas, notas de ambiente
2. HANDOFF.md — este arquivo, seção "Convenções" e "Armadilhas"
3. docs/jogae_plano_produto_refatorado.md — o PRD (referência; não releia inteiro, consulte
   as seções citadas)

O design system está em docs/prototipo/Design System Jogae.dc.html e já foi traduzido para
tokens em src/app/globals.css. NÃO invente valores visuais: use os tokens existentes
(bg-canvas, bg-surface, text-ink/ink-2/ink-3, border-line, text-green/yellow/red/pink,
text-display-l, text-score-xl, text-h1/h2/h3, text-body/body-s, text-label, text-caption,
rounded-sm/md/lg/xl/pill, .cut-corner, .texture-grid, animate-score-pop/rise/bounce-in).
Se precisar de um valor novo, adicione ao @theme e diga por quê.

Suba o ambiente antes de começar:
  npm install && npm run db:up && npm run auth:up && npm run db:migrate && npm run db:seed && npm run dev
`auth:up` sobe o Supabase local (identidade); o banco do app continua no Docker Compose.
Entre com salles@jogae.app — o e-mail do link cai no Mailpit: http://127.0.0.1:54324

Tarefa desta sessão: <ESCOLHA UM BLOCO DA SEÇÃO "PRÓXIMOS PASSOS" DO HANDOFF>

Regras de trabalho:
- Regra de negócio vive em src/domain/ (puro, sem React/Next/Prisma) e é coberta por teste.
  Componente React não decide nada.
- Toda mutação passa por server action em src/features/<área>/actions.ts, e a action só
  autoriza + revalida: o I/O vive em src/features/<área>/service.ts.
- Toda mutação começa com requireGroupAccess/requireRoundAccess/requirePlayerAccess/
  requireMatchAccess. Sem exceção.
- Antes de dar por concluído: npm test && npm run test:integracao && npm run typecheck
  && npx eslint . && npm run build. Reporte o resultado real, incluindo falhas.
- Ao terminar, atualize STATUS.md (seções 2 e 3) e a seção "Próximos passos" deste HANDOFF.
````

### Esforço sugerido

| Bloco da próxima sessão | Esforço | Por quê |
| --- | --- | --- |
| **J — Deploy (VPS Hostinger + Supabase)** | **Opus medium + você** | Arquitetura decidida e documentada em `docs/deploy.md`; falta criar o projeto Supabase, o OAuth do Google e o domínio. |
| **H — QA em aparelho real** | **você, com o app na mão** | Não é trabalho de modelo: precisa de iPhone e Android de verdade. |
| **I — Conta de jogador** | **decisão sua, depois Opus medium** | `docs/decisao-conta-de-jogador.md` tem as três saídas; a recomendação é a opção B. |
| **Fase 2 — badges, recordes, retrospectiva** | **Opus medium** | Base de estatística pronta; falta definir a lista de badges. |
| **Fase 3 — financeiro** | **Opus high + decisão sua** | O PRD só lista tópicos; precisa de regra antes de virar schema. |

**Se for pegar só um:** **J**. O produto está funcional de ponta a ponta e o que falta pra
ele existir de verdade é sair do localhost — inclusive porque o login com Google e o SMTP
de produção nunca rodaram contra um projeto Supabase na nuvem.

---

## Sessão de 12/08 — autenticação migrada pro Supabase

A implementação própria de magic link foi substituída por **Supabase Auth (Google +
link por e-mail)**. O motivo é de produto, não de segurança: o esquema anterior era
sólido, mas "abre o e-mail e volta" derruba cadastro num app que vai ser lançado aberto.

O que a migração provou sobre a arquitetura: **cinco arquivos** tocavam sessão, e
`src/domain/`, os `service.ts` e os 57 testes de integração passaram intactos, porque
serviço recebe o `db` por parâmetro e não sabe o que é sessão.

Decisões que valem lembrar:

- **`User.authId` em vez de usar o id do Supabase como chave.** O domínio mantém os
  próprios ids; trocar de provedor não reescreveria `Membership`.
- **Convite deixou de ter token.** A capacidade é controlar o e-mail, e quem verifica
  isso é o provedor — mais simples e mais forte que um link secreto encaminhável.
- **Duas rotas de volta, de propósito:** `/auth/callback` (OAuth, troca código por
  sessão) e `/auth/confirm` (link de e-mail, `verifyOtp` com `token_hash`). A segunda
  existe porque PKCE guarda um verificador em cookie, e cookie não atravessa aparelho:
  quem pede o link no computador e abre no celular ficaria de fora.

Foi verificado contra um Supabase real (stack local), não só compilado — e o teste
pegou um bug de redirect que o build não pegaria (o slug do grupo virava caminho).

---

## O que foi feito na sessão de 11/08 (blocos G, K e dívidas)

- **G — membros e papéis: concluído.** `/g/[slug]/membros`, convite por e-mail no mesmo
  `LoginToken` (agora com `groupId` + `role`, 7 dias), troca de papel, remoção, revogar
  convite. `domain/access/membros.ts` garante que o grupo nunca fica sem dono.
- **K — Fase 1.5: concluído** no que estava nomeado (repetir rodada, nome/cor de time,
  imagem dos times/share card, MVP da rodada). Badges e financeiro **não** entraram — são
  Fase 2 e 3 no plano e o financeiro não tem regra definida.
- **Dívidas: as três quitadas.** `Sheet` com foco preso, nomenclatura convergida pro
  português nas actions e queries, sorteio com `createManyAndReturn` + `createMany`.
- **H — só a parte auditável em código.** Ver abaixo.
- **Achado sério:** os testes de integração rodavam no schema `public` e apagavam o banco
  de desenvolvimento (armadilha 16).

---

## Próximos passos (ordenados)

### H. QA em iPhone e Android — *segue sem teste em aparelho*
Foi corrigido por auditoria de código, sem aparelho na mão:
- Indicador de sincronização ficava atrás do bottom nav em tela com notch — agora conta
  `env(safe-area-inset-bottom)`.
- Botão `size="sm"` tinha 36px, abaixo do mínimo de 44px do design system.
- Respiro do rodapé do `main` agora soma a safe area.

Continua faltando, e **não dá pra fazer sem o aparelho**:
- Instalar o PWA no Android e conferir o ícone maskable de verdade.
- Registrar gol com o avião ligado e confirmar que o lance sobe ao voltar a conexão.
- Validar o service worker e a página `/offline` fora do `next start` local.
- Ficha do jogador e sheet de gol em tela pequena, com teclado aberto.
- Safe area do iPhone conferida no aparelho, não só no CSS.

### I. Conta de jogador — decisão pendente
`docs/decisao-conta-de-jogador.md`. Três saídas: (A) manter a lista do WhatsApp,
(B) confirmação por link pessoal sem conta — **recomendada**, (C) conta de jogador de
verdade. Nada foi implementado de propósito: cada opção mexe em schema e rota de um jeito
diferente. **Nível técnico continua invisível pro jogador em qualquer cenário.**

### J. Deploy — pronto pra executar
Arquitetura decidida: **app na VPS Hostinger (Docker) + Supabase Cloud** para
identidade, banco e storage. `docs/deploy.md` tem as variáveis, a configuração do
Supabase (Google, Redirect URLs, SMTP, RLS), o passo a passo da VPS e o smoke test.
O `Dockerfile` já foi validado localmente: `.dockerignore` não envia `.env`; o alvo
`migrator` aplica as 5 migrations e o alvo padrão sobe o standalone (rota `/offline` 200).

Falta o que depende de conta sua: criar o projeto Supabase em São Paulo, configurar o
OAuth do Google, apontar o domínio e ligar um SMTP. Nada disso é código.

### Fase 2 — social e gamificação
Badges, recordes, retrospectivas e share cards avançados. O MVP da rodada já saiu e vive em
`domain/statistics/aggregate.ts` (`mvpDaRodada`); falta levá-lo pro ranking e pro histórico.

### Fase 3 — financeiro
Valor da rodada, pago/pendente, histórico, painel. O plano só lista os tópicos: quem cobra,
o que acontece com quem falta, mensalidade × diária. Precisa de regra antes de virar schema.

### Dívidas conhecidas (baratas, boas de pegar de carona)
- A imagem dos times sai na fonte padrão; basta colocar `public/fonts/Anton-Regular.ttf`
  que a rota passa a usar a Anton.
- Ainda há nomes em inglês em `queries.ts` de rodada e ranking (`getCurrentRound`,
  `splitAttendances`, `getRoundHistory`) e nos tipos de view (`TeamsViewTeam`).
  Convergir quando tocar em cada arquivo.
- Erro de action ainda aparece só como mensagem inline; não há toast.

---

## Convenções do projeto

**Idioma.** Código, comentários, commits e UI em português do Brasil. Microcopy curta e
natural (plano §45): "Bora montar os times?", "20 confirmados. Fechou.", "Gol de quem?".
Nunca "Processamento concluído com sucesso".

**Camadas.**
- `src/domain/**` — puro. Não importa React, Next nem Prisma. É o que os testes cobrem.
- `src/features/<área>/queries.ts` — leitura, `"server-only"` + `cache()` do React.
- `src/features/<área>/service.ts` — I/O. Recebe o client Prisma **por parâmetro** (`Db`),
  não usa `revalidatePath`, não sabe de sessão. É o que os testes de integração exercitam.
- `src/features/<área>/actions.ts` — mutação, `"use server"`. Casca fina: autoriza com
  `require*Access`, valida com Zod, chama o serviço, revalida.
- `src/features/auth/queries.ts` — o DAL. Único lugar que lê a sessão.
- `src/components/ui/**` — primitivos genéricos. `src/components/football/**` — específicos.
- `src/app/**` — Server Components por padrão; `"use client"` só onde há interação.

**Autorização.** Toda mutação começa com `requireGroupAccess` (ou a variante por rodada,
jogador ou partida). Toda página de `/g/[slug]` começa com `requireGrupoPorSlug`.
Grupo que não é do usuário responde **404**, não 403. Id que vem do client é sempre
conferido contra o grupo antes de virar escrita.

**Comentários.** Explicam *por quê*, não *o quê*. Referenciam a seção do plano quando a
decisão vem de lá (`// plano §35 — transparência do sorteio`).

**Cores.** Uso semântico, nunca decorativo (plano §42): verde = ação positiva e confirmação;
amarelo = assistência, ranking, aviso; vermelho = ao vivo, gol, destrutivo; rosa = social,
badge, marca. Nunca dois botões verdes primários na mesma tela.

**Acessibilidade.** Estado nunca só por cor — sempre cor + ícone ou cor + rótulo. Alvo
mínimo 44px (56px no ao vivo). Foco amarelo de 2px. `prefers-reduced-motion` já corta
animação globalmente no `globals.css`; em animação controlada por JS, checar
`window.matchMedia` (exemplo em `teams-view.tsx`).

**Motion.** Nunca atrasa dado. No sorteio, a action roda em paralelo com a animação e a
espera só completa o tempo que faltou (`handleDraw` em `teams-view.tsx`) — repita esse
padrão em qualquer animação de espera. Stagger: 40ms nos cards de time, 60ms no pódio.

---

## Armadilhas conhecidas

1. **Registry npm.** A config global da máquina aponta pro repositório privado da Marinha.
   O `.npmrc` do projeto força `registry.npmjs.org`. Não apague; se `npm install` der 404,
   é isso.
2. **`create-next-app` recusa diretório com qualquer arquivo extra** — inclusive `.npmrc`.
   Já foi feito; só importa se for recriar do zero.
3. **Prisma 7 exige driver adapter.** `new PrismaClient()` sem `adapter` lança erro em
   runtime. Ver `src/db/client.ts` e `prisma/seed.ts`.
4. **Prisma 7 não lê `.env` sozinho.** `prisma.config.ts` faz `import "dotenv/config"`.
5. **Client gerado em `src/db/generated/`** e gitignored. Depois de clonar, `npm install`
   dispara o `postinstall` que gera; se editar o schema, rode `npx prisma generate`.
6. **`include` do Prisma com array precisa de `satisfies Prisma.XInclude`**, não `as const`
   — `as const` deixa o array `readonly` e o Prisma rejeita. Ver `features/rounds/queries.ts`.
7. **Postgres na porta 5433.**
8. **ESLint do Next 16 proíbe `setState` síncrono dentro de `useEffect`.** Se precisar
   resetar estado ao abrir algo, monte/desmonte o componente em vez de resetar por efeito
   (foi assim no `DrawOverlay` e na ficha do jogador, que usa `key={editando}`). Para estado
   que vem do navegador — conexão online, por exemplo — use `useSyncExternalStore`
   (`components/shell/offline-sync.tsx`).
9. **Página `/` é `force-dynamic`** de propósito: lê sessão e banco.
10. **Tailwind v4 não resolve classe montada em runtime.** Cores de time vivem como classes
    literais em `src/lib/team-colors.ts`.
11. **Next 16 renomeou `middleware.ts` para `proxy.ts`** e o export virou `proxy`.
    O arquivo é `src/proxy.ts` e faz **só** checagem otimista de cookie — nada de banco,
    porque roda em toda navegação, inclusive prefetch.
12. **`prisma migrate dev` trava sem terminal interativo** quando a migration gera aviso
    (índice único novo, por exemplo). Escreva o `migration.sql` na mão em
    `prisma/migrations/<timestamp>_<nome>/` e rode `prisma migrate deploy`.
13. **Vitest 4 removeu `poolOptions`.** Serializar teste é `fileParallelism: false` +
    `maxWorkers: 1` no nível de `test` (ver `vitest.integration.mts`).
14. **Nunca cacheie HTML de `/g/**` no service worker.** Dois organizadores no mesmo
    aparelho veriam dados um do outro. O `sw.js` só cacheia asset versionado e a página
    `/offline`.
15. **Gol offline é idempotente por `clientEventId`.** Se mexer em `registrarGol`, mantenha
    a checagem no começo — sem ela, uma sincronização repetida duplica placar.
16. **`getSession()` não vale nada no servidor.** Ele lê o cookie sem verificar, e
    cookie é entrada do usuário. No servidor é sempre `getClaims()`, que confere a
    assinatura do JWT. Vale pro proxy e pro DAL.
17. **Server Component não grava cookie.** Por isso a renovação do token do Supabase
    mora em `src/proxy.ts`, e o `setAll` do client de servidor engole o erro em
    silêncio — não é bug, é o desenho. Se o proxy parar de rodar numa rota, a pessoa
    é deslogada quando o access token vence.
18. **Redirect no proxy perde cookie renovado** se você criar um `NextResponse` novo
    sem copiar os cookies do anterior. Ver o laço em `src/proxy.ts`.
19. **O pooler do Supabase (6543) não roda migration.** PgBouncer em modo transação não
    tem advisory lock nem prepared statement. `prisma.config.ts` usa `DIRECT_URL`
    (porta 5432) quando ela existe; `scripts/migrar-banco-de-teste.mjs` **apaga**
    `DIRECT_URL` do ambiente de propósito, senão rodar teste com `.env` de produção
    migraria o banco errado.
20. **O driver adapter do Prisma ignora o `?schema=` da URL.** O CLI lê, o `PrismaPg` não.
    Por causa disso os testes de integração rodavam no `public` e o `limparBanco` apagava o
    banco de desenvolvimento no meio da suíte. O schema vai por opção:
    `new PrismaPg({ connectionString }, { schema })` — ver `src/test/db.ts`, que também
    recusa rodar se o schema resolvido for `public`.
21. **`ImageResponse` (rota `/r/[token]/imagem`) é Satori, não é o browser.** Só flexbox —
    `display: grid` não funciona — e **toda `div` com mais de um filho precisa de
    `display: flex` explícito**, senão a resposta morre com "failed to pipe response".
    Texto com interpolação (`{a}{b}`) conta como vários filhos: monte a string antes.
22. **Componente não lê relógio no render.** `Date.now()` dentro de um componente quebra o
    ESLint (`react-hooks/purity`). Conta no servidor e passe pronto — foi o que
    `ConviteAberto.expiraEmDias` faz.
23. **Diálogo novo usa `components/ui/dialog.tsx` (`Sheet`).** Ele já prende o foco, fecha
    no Escape, devolve o foco e trava o scroll do fundo. Não refaça na mão; o campo que
    deve receber o foco leva `data-foco-inicial`.

---

## Mapa rápido de arquivos

| Preciso mexer em… | Vá para |
| --- | --- |
| Tokens visuais, cores, tipografia, motion | `src/app/globals.css` |
| Cores e nomes de time | `src/lib/team-colors.ts` |
| Botão, card, chip, avatar, estado vazio | `src/components/ui/` |
| Input, select, chip de escolha, stepper | `src/components/ui/form.tsx` |
| Card de time, placar, linha de jogador | `src/components/football/` |
| Formulário de grupo (criar e editar) | `src/components/football/grupo-form.tsx` |
| Navegação (bottom nav + sidebar) | `src/components/shell/navigation.tsx` |
| Indicador de offline e sincronização | `src/components/shell/offline-sync.tsx` |
| Quem pode o quê | `src/domain/access/permissions.ts` |
| Convite, troca de papel, "não fica sem dono" | `src/domain/access/membros.ts` |
| Membros: convite, papel, remoção | `src/features/members/` |
| Diálogo/sheet com foco preso | `src/components/ui/dialog.tsx` |
| URL pública (link de acesso, convite, og:image) | `src/lib/base-url.ts` |
| Card PNG dos times | `src/app/r/[token]/imagem/route.tsx` |
| Deploy e checklist de produção | `docs/deploy.md` |
| Defaults de modalidade, slug, capacidade | `src/domain/groups/setup.ts` |
| Regras do elenco (nome, nível, conflito) | `src/domain/roster/roster.ts` |
| Próxima data da rodada | `src/domain/schedule/recurrence.ts` |
| Interpretação da lista do WhatsApp | `src/domain/list-parser/parser.ts` |
| Regra do sorteio e do equilíbrio | `src/domain/team-balancer/balancer.ts` |
| Ranking e estatística | `src/domain/statistics/aggregate.ts` |
| Mensagens pro WhatsApp | `src/domain/share/whatsapp.ts` |
| Identidade do Supabase → `User` do domínio | `src/features/auth/session.ts` |
| Clients do Supabase (navegador, servidor, admin) | `src/lib/supabase/` |
| Volta do login | `src/app/auth/callback/` (Google) e `src/app/auth/confirm/` (e-mail) |
| `getUsuarioAtual` e os `require*Access` | `src/features/auth/queries.ts` |
| Envio de e-mail (login e convite) | É do Supabase — configure SMTP no painel dele |
| Leitura de rodada/grupo/ranking | `src/features/*/queries.ts` |
| I/O de rodada e de partida | `src/features/rounds/service.ts`, `src/features/live/service.ts` |
| Mutações (casca fina) | `src/features/*/actions.ts` |
| Fila offline de gols | `src/lib/fila-offline.ts` + `src/app/api/gols/route.ts` |
| Service worker | `public/sw.js` |
| Ícones do PWA | `scripts/gerar-icones.mjs` (`npm run icones`) |
| Fixtures e banco de teste | `src/test/` |
| Modelo de dados | `prisma/schema.prisma` |
| Dados de demonstração | `prisma/seed.ts` |

---

## Estado do banco de demonstração

Depois de `npm run db:seed`:

- Organizador **salles@jogae.app**, papel OWNER. É com esse e-mail que se entra em dev.
- Grupo **Fut da Quinta** (`/g/fut-da-quinta`), society 5, 4 times, 4 na linha + 1 no gol,
  capacidade 20, quinta 20:30, Arena Farofa · Campo 03.
- 22 jogadores (4 goleiros), com skill, posição e aliases — "Igão"/"Igao"/"Igor" resolvem
  para Igor de Castro.
- Rodada da semana passada **encerrada**, com 6 partidas e gols/assistências: alimenta o
  ranking do mês e o histórico.
- Próxima rodada **confirmada** com 20 confirmados e 2 na espera (Carlão, Juliel),
  **de propósito sem times sorteados** — é o estado que demonstra o fluxo "Montar times".

Para demonstrar o produto do zero: entrar (Google ou link no Mailpit) → home → Montar times →
animação → 4 times → Copiar pro WhatsApp → Começar jogo → registrar gol → ranking.
