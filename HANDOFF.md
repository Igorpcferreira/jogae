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
- Data e hora NUNCA pelo relógio do processo. Nada de new Date(a,m,d,h,min), getHours(),
  getDate(), getDay(), getMonth(). Use src/domain/time/fuso.ts. A Vercel roda em UTC e a
  sua máquina em horário do Brasil: teste que usa esses getters passa aqui e mente sobre
  produção. Foi exatamente assim que o bug do 17:30 chegou em produção.
- Antes de dar por concluído: npm test && TZ=UTC npm test && npm run test:integracao
  && npm run typecheck && npx eslint . && npm run build. Reporte o resultado real,
  incluindo falhas.
- O app está EM PRODUÇÃO (https://jogae-free.vercel.app). Mudança em migration, em
  regra de presença ou em placar mexe em dado de gente de verdade.
- Ao terminar, atualize STATUS.md (seções 2 e 3) e a seção "Próximos passos" deste HANDOFF.
````

### Esforço sugerido

| Bloco da próxima sessão | Esforço | Por quê |
| --- | --- | --- |
| ~~**J — Deploy**~~ | — | **Concluído em 18/08.** Está no ar na Vercel + Supabase. Sobrou só SMTP e domínio (configuração, não código). |
| ~~**I — Conta de jogador**~~ | — | **Concluído em 19/08** (opção B, link pessoal). Sobrou migration em produção e distribuir os links — operação, não código. |
| **Fase 2 — social e gamificação** | **parcial: conquistas feitas em 19/08** | As 6 conquistas do recorte inicial estão no ar em código. O que sobra do §27 (votação de MVP, recordes, retrospectivas, card de jogador, share card) continua dependendo de decisão de produto. |
| **Fase 3 — financeiro** | **Opus high + decisão sua** | O PRD (§28) lista funcionalidades mas não as regras. Precisa de regra antes de virar schema. |
| **H — QA em aparelho real** | **você, com o app na mão** | Não é trabalho de modelo: precisa de iPhone e Android de verdade. |

**Se for pegar só um:** **rodar o grupo de verdade por algumas semanas** antes de escrever
mais código. O bloco I e as conquistas saíram no mesmo dia e nenhum dos dois foi tocado por
gente real: "presença de ferro" precisa de 4 rodadas pra existir, e o link pessoal precisa
das 22 mensagens. Depois disso, o resto da Fase 2 (retrospectiva, recordes, card de
jogador) tem dado pra se apoiar — hoje não tem.

**Ordem recomendada:** ~~I~~ → ~~conquistas~~ → uso real → resto da Fase 2 → Fase 3. Financeiro por último não é acaso: o §28 do
plano é explícito que ele só entra "depois que a aplicação já estiver sendo usada
naturalmente", porque aumenta responsabilidade, suporte e caso de exceção.

---

## Sessão de 19/08 (parte 2) — Fase 2: conquistas

Seis conquistas, o recorte que este próprio arquivo recomendava. Detalhe no STATUS §2;
o que vale registrar do caminho:

- **A regra difícil não era calcular, era não constranger.** O plano manda "leve e
  positiva", e isso vira decisão de código em três lugares: nada de conquista negativa,
  empate divide em vez de escolher, e conquista que muita gente tem não é dada a ninguém.
- **O dado real achou o bug que o teste não achou.** Com o seed, a primeira rodada da vida
  do grupo deu "Estreia" pros 20 jogadores. Os testes passavam porque eu tinha escrito o
  caso do novato entrando num grupo rodado — não o do grupo nascendo. Virou
  `MAXIMO_ESTREANTES` e dois testes novos. **Vale o hábito: subir o `next start` com o
  seed e abrir a tela, mesmo com a suíte verde.**
- **Servidor de smoke test morre mal.** `npm run start` parado pelo agente deixou o
  processo segurando a porta 3000, e o `start` seguinte falhou em silêncio — passei um
  tempo achando que o código estava errado quando o build servido é que era velho.
  Confira com `netstat -ano | grep ":3000"` antes de acreditar no que a tela mostra.
- **Rótulo não pode mentir.** "Artilheiro do mês" na aba "Geral" seria errado, então a
  seção de conquistas é sempre do mês, independente do período do ranking.

## Sessão de 19/08 — bloco I: o jogador confirma sozinho

Opção B implementada de ponta a ponta: `Player.selfToken` → `/p/<token>` → dois botões.
O que ficou de aprendizado, além do que está no STATUS:

- **A regra que faltava não era "cancelar", era "quem sobe".** `cancelou → primeiro da
  espera sobe` parece uma linha, mas carrega quatro casos que só aparecem escrevendo
  teste: sair da espera não abre vaga pra ninguém; lista estourada (organizador colou mais
  gente que cabe) não promove; goleiro que cai deixa o time sem quem pega bola; e o
  "primeiro" é por `order`, não pela ordem que o banco devolveu.
- **Ordem monotônica em vez de recontagem.** `promoverDaEspera` gravava
  `order = contagem de confirmados`, que colide com quem já está lá. Quem entra agora vai
  pro fim (`maior + 1`) — sem colisão, sem renumerar a lista inteira a cada clique.
- **`@default` do Prisma não é default do banco.** `@default(uuid(4))` é gerado no client,
  então `ADD COLUMN ... NOT NULL` estoura em tabela com dado. A migration foi escrita à
  mão em três passos (anulável → `UPDATE` com `gen_random_uuid()` → `SET NOT NULL`).
- **Idempotência é requisito de UX aqui, não refinamento.** O link vive no WhatsApp e vai
  ser clicado de novo, sem querer, semanas depois. Clique repetido devolve `ok` com zero
  escritas.
- **Link pessoal é credencial, e credencial não se manda pro grupo.** Por isso não existe
  botão "copiar todos os links": a ficha copia um, com um recado que já avisa pra não
  repassar.

## Sessão de 18/08 — deploy, desempenho e o bug do fuso

**O app foi pro ar** (Vercel + Supabase Cloud) e a sessão virou caça a lentidão. O que
ficou de aprendizado, além do que já está no STATUS:

- **A lentidão não era da hospedagem.** A função subiu em `iad1` e o banco está em
  `sa-east-1`: ~150ms por query, e as telas faziam 6 a 8 em série. `regions: ["gru1"]`
  no `vercel.json` resolveu quase tudo. **Diagnostique medindo**, não por palpite: o
  header `X-Vercel-Id` mostra `entrada::execução`, e comparar uma rota com query
  (`/r/xxx`) contra uma sem (`/entrar`) isola o custo do banco sem precisar de login.
- **`loading.tsx` não é enfeite.** Sem ele o clique na navegação fica sem resposta
  nenhuma até o servidor terminar, e o `prefetch` do `<Link>` não tem o que pré-carregar
  numa rota dinâmica. Metade da sensação de "travado" era isso.
- **O bug do 17:30 passou porque os testes eram cúmplices.** A suíte asseria com
  `getHours()`/`getDate()`, que leem o fuso do processo — verde na máquina do dev
  (horário do Brasil), mentira sobre a Vercel (UTC). Hoje a regra é rodar
  `TZ=UTC npm test` junto do `npm test`, e as duas ficam verdes.
- **Armadilha de operação:** o `[YOUR-PASSWORD]` que o Supabase mostra na tela de
  conexão é texto de exemplo. Colado literal, derruba o app inteiro com 500 (`[` e `]`
  são reservados em URI). Senha com caractere especial precisa ir percent-encoded.

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

### I. Conta de jogador — **concluído em código (19/08)**
Opção B: link pessoal, sem conta. Schema, regra de domínio, rota, action e distribuição
estão prontos e testados (ver STATUS §2, "Bloco I"). O que **sobrou**, e não é código:

- **Rodar a migration em produção.** `20260819120000_link_pessoal_do_jogador` só foi
  aplicada no banco local e no schema `teste`. Em produção vai pelo `DIRECT_URL`
  (porta 5432): o pooler da 6543 não tem advisory lock nem prepared statement.
- **Distribuir os links.** 22 mensagens no privado, uma por jogador (ficha do jogador em
  `/g/[slug]/elenco` → "Copiar recado"). Não existe atalho "mandar no grupo" de propósito.
- **Colar os templates de e-mail** (abaixo) antes de convidar ninguém: convite no spam é a
  adoção morrendo na porta.
- **Ninguém de verdade clicou ainda.** O fluxo foi verificado com o seed no `next start`,
  não com o grupo.

O que **não** entrou, por escopo:
- Prazo pra cancelar (hoje dá pra cancelar até o apito inicial). Vira parâmetro do grupo
  se o dono do fut pedir.
- Notificação de "subiu da espera" — quem sobe só descobre abrindo o link. Depende de
  push, que não existe ainda.
- Revogar/trocar o link de um jogador: o schema aguenta (é só gravar um `selfToken` novo),
  mas não tem botão.

### J. Deploy — **concluído em 18/08**
No ar em **https://jogae-free.vercel.app**: Vercel (região `gru1`) + Supabase Cloud
(`sa-east-1`), Google OAuth validado em produção. Sobrou só configuração de painel:

- ~~**SMTP no Supabase**~~ — **feito em 18/08.** Hostinger (`smtp.hostinger.com:465`,
  usuário `igor@somoskyber.com.br`). Testado: o link de login chega e loga.
  SPF, DKIM (`hostingermail-a/b/c`) e DMARC (`p=none`) do domínio estão todos válidos.
- **Os e-mails: HTML pronto, falta colar.** `docs/emails/magic-link.html` e
  `docs/emails/convite.html` estão escritos (português, identidade do Jogaê, tabela com
  estilo inline, preheader, link também em texto, `{{ .ConfirmationURL }}` intocado);
  `docs/emails/README.md` diz onde colar, o assunto sugerido e como testar. O passo que
  falta é manual: Supabase → Authentication → Emails → Templates. Detalhe que vale saber:
  **quem é convidado pro grupo recebe o Magic Link**, não o "Invite user" — o convite do
  Jogaê não tem token, a verificação do e-mail é do provedor.
- **Reputação de domínio** melhora com uso; `jogae.com.br` próprio resolveria de vez o
  descasamento entre a marca "Jogaê" e o domínio `somoskyber.com.br`.
- **Domínio próprio** — não muda desempenho, muda identidade.
- **`CRON_SECRET`** na Vercel, pra fechar `/api/manter-vivo`.

O caminho da VPS **não foi descartado**: `Dockerfile` standalone e `docs/deploy.md`
continuam válidos e testados. Ele volta a ser necessário se o Jogaê cobrar, porque o
plano Hobby da Vercel proíbe uso comercial.

---

## Os três blocos que o dono quer atacar

Ordem recomendada: **I → Fase 2 → Fase 3**. Cada um abaixo tem o que já existe, o que
falta decidir e onde o código encosta — leia antes de abrir qualquer arquivo.

### I. Conta de jogador — *decisão de produto, depois uma sessão de código*

**Estado:** nada implementado, **de propósito**. O levantamento completo está em
`docs/decisao-conta-de-jogador.md`, com três saídas e a recomendação.

**A recomendação é a opção B — confirmação por link pessoal, sem conta.** Cada jogador
ganha um link não previsível (`/p/<token>`) que abre uma tela com dois botões: "Tô
dentro" / "Não vou". Sem senha, sem cadastro, sem app.

Por que B e não C (conta de verdade): B entrega o valor que C promete — presença chegando
sem o organizador no meio — por uma fração do custo, e não fecha a porta pra C depois. O
token do jogador vira o convite natural pra conta, no dia em que ela existir. C obriga a
decidir o que o jogador vê do grupo, quem edita o quê, o que acontece quando ele sai, e
reabre autorização em toda tela. Além disso o plano coloca isso na **Fase 6**, não na v1,
e o §65 avisa pra não virar "um sistema para administrar futebol".

**O que a opção B custa, concretamente:**
- Schema: um token por jogador (`Player.selfToken`, único, não previsível). Migration nova.
- Rota: `/p/[token]` pública, mesmo espírito de `/r/[token]` — sem login, sem dado privado.
- Action: confirmar e desconfirmar presença, com `require*Access` próprio (o token **é** a
  credencial; ele autoriza só aquele jogador, só aquela rodada).
- Domínio: a regra que hoje não existe — **"cancelou → primeiro da espera sobe"**. Tem que
  nascer em `src/domain/` com teste, como todo o resto.
- Provavelmente: um jeito de o organizador distribuir os links (mensagem pro WhatsApp com
  o link de cada um — `domain/share/whatsapp.ts` já é o lugar).

**Invariante que vale nas três saídas:** o **nível técnico (1–5) nunca aparece pro
jogador**. É privado do balanceador (plano §13). A tela do jogador mostra presença, time
e estatística — nunca a nota.

**O que decidir antes de codar:** (1) confirma a opção B? (2) o link é por jogador
(vale pra sempre) ou por jogador+rodada (expira)? (3) jogador pode se colocar na espera
sozinho quando a lista estiver cheia?

---

### Fase 2 — social e gamificação

**Estado:** a base de estatística está pronta e testada; o que falta é **decisão de
produto**, não código.

O que já existe pra construir em cima, tudo em `src/domain/statistics/aggregate.ts`
(11 + 4 testes): gols, assistências, participações, V/E/D, aproveitamento, saldo,
ranking com empate compartilhando posição, e `mvpDaRodada` (participação em gol, desempate
por gols e vitórias, empate total não elege ninguém).

**O que o plano pede (§27):** cards de jogador · "craque da rodada" · votação de MVP ·
sequência de presenças · badges · recordes pessoais · "melhor mês" · retrospectiva mensal
· retrospectiva anual · comparação entre amigos · share cards para WhatsApp/Instagram ·
animações especiais para hat-trick · conquistas divertidas.

**A regra que o plano impõe, e que é a parte difícil:** *"Gamificação deve ser leve e
positiva. Evitar mecânicas que gerem conflito desnecessário."* Isso descarta, por exemplo,
badge de "pior do mês", ranking de faltas ou qualquer coisa que exponha quem joga mal —
e reforça a invariante do nível técnico privado.

**A lista de badges foi decidida e implementada em 19/08** — exatamente o recorte que
estava sugerido aqui: artilheiro do mês, garçom do mês, presença de ferro, hat-trick,
estreia e craque da rodada. Está em `src/domain/badges/conquistas.ts`, com os critérios e
os limites (`MINIMO_SEQUENCIA`, `MAXIMO_EMPATADOS`, `MAXIMO_ESTREANTES`) num lugar só —
mudar um número é mudar a regra, e os testes cobrem cada um.

~~**Dívida barata:** `mvpDaRodada` só aparece na página pública.~~ **Quitada:** o craque
sai no histórico da tela Mais e como conquista no ranking.

**O que continua aberto do §27, e cada um é decisão de produto:**
- **Votação de MVP.** Hoje o craque é *calculado* por participação em gol. Votação é outro
  produto: quem vota, quando fecha, o que acontece com empate, e o risco de virar
  popularidade em vez de futebol.
- **Recordes pessoais e "melhor mês".** Precisa decidir o que é recorde (mais gols numa
  rodada? maior sequência de todos os tempos?) e onde isso mora — hoje tudo é recalculado
  na hora, e recorde histórico provavelmente quer coluna.
- **Retrospectiva mensal e anual, comparação entre amigos, card de jogador, share card de
  conquista, animação de hat-trick.**

**Dependência real, e ela agora é concreta:** "presença de ferro" só existe depois de 4
rodadas seguidas, e a presença só é do jogador depois que ele usar o link pessoal
(`Attendance.origin = PLAYER`). Enquanto o grupo não rodar algumas semanas com o bloco I no
ar, essa conquista não tem como aparecer pra ninguém.

---

### Fase 3 — financeiro

**Estado:** o PRD (§28) lista funcionalidades mas **não define nenhuma regra**. É o bloco
mais perigoso e o que o próprio plano manda deixar por último.

**O que o plano pede (§28):** valor da diária/mensalidade · status pago/pendente/isento ·
marcação manual em um toque · histórico por jogador · total arrecadado · custo do campo ·
saldo da rodada/mês · lembrete de pendência · exportação simples.

**Por que fica depois, nas palavras do plano:** financeiro aumenta responsabilidade,
segurança, regras de negócio, suporte e casos de exceção — *"o produto deve provar valor
primeiro na organização do futebol"*.

**O que decidir antes de virar schema** (nada disso está no PRD, e cada resposta muda o
modelo de dados):
- **Mensalidade × diária × os dois?** Um grupo pode ter mensalista e avulso na mesma
  rodada? Mensalista que falta paga?
- **Quem falta, deve?** Confirmou e não foi — cobra? Cancelou com antecedência — cobra?
  Essa é a regra que mais gera briga em grupo de fut e o app vai ter que ter opinião.
- **Quem cobra?** Só OWNER, ou ADMIN também? (`domain/access/permissions.ts` vai precisar
  de capacidade nova.)
- **O custo do campo** é do grupo ou da rodada? Rateia entre confirmados ou entre presentes?
- **Isento** é atributo do jogador ou da rodada?
- **O dinheiro entra no app?** O §29 (Fase 4) trata Pix/comprovante/webhook como módulo
  próprio e posterior. Na Fase 3 o registro é **manual** — o app anota, não recebe.

**Aviso de arquitetura:** a armadilha 14 (nunca cachear HTML de `/g/**` no service worker)
e a regra de autorização por grupo ficam mais críticas aqui — dado financeiro vazado entre
contas no mesmo aparelho é outro patamar de problema. O plano já registra "cuidado extra
quando financeiro entrar".

---

## Dívidas conhecidas (baratas, boas de pegar de carona)
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

24. **Nunca leia data pelo relógio do processo.** `new Date(ano, mês, dia, h, min)`,
    `getHours()`, `getDate()`, `getDay()`, `getMonth()` usam o fuso de quem está
    rodando — UTC na Vercel, horário do Brasil na sua máquina. Hora de parede entra e
    sai por `src/domain/time/fuso.ts` (`instanteDoFuso`, `partesNoFuso`,
    `diaDaSemanaNoFuso`, `inicioDoDiaNoFuso`, `inicioDoMesNoFuso`). Foi essa mistura que
    fez a tela mostrar 17:30 pra um grupo configurado às 20:30. **Teste que assere com
    esses getters não vale**: rode `TZ=UTC npm test` também.
25. **Fuso é um só (`America/Sao_Paulo`) e isso é limitação conhecida.** Grupo fora de
    Brasília (o Fut Manus é UTC−4) vê o horário de Brasília em "hoje/amanhã" e na
    fronteira da artilharia. As funções de fuso já aceitam o fuso por parâmetro: dar
    fuso próprio ao grupo é coluna em `FootballGroup` e trocar os `FUSO_PADRAO` por
    `grupo.fuso`.
26. **Rodada gravada antes de 18/08 pode estar com hora torta.**
    `scripts/corrigir-fuso-das-rodadas.ts` relata por padrão e só grava com `--aplicar`.
    A detecção é exata (hora de parede em UTC igual ao `defaultStartTime` do grupo), então
    rodada criada em máquina de dev não é tocada.
    **Ele fala com o banco do `.env`, que é o Docker local.** Rodar e ver "0 com a marca
    do bug" não significa que produção está limpa — significa que o Docker está. Para
    produção, force a URL no ambiente (o `dotenv` não sobrescreve o que já existe, então
    a variável do shell vence). PowerShell:
    `$env:DATABASE_URL = '...:6543/postgres'` → rode → `Remove-Item Env:\DATABASE_URL`.
    A primeira linha da saída diz sempre contra qual banco ele está falando; confira
    antes de usar `--aplicar`.
27. **`staleTimes` deixa dado velho por até 30s.** O cache de navegação do cliente está
    ligado em `next.config.ts`. Mutação própria não sofre (toda action chama
    `revalidatePath("/g", "layout")`), mas mudança feita por **outro** organizador demora
    isso pra aparecer. Se o placar ao vivo começar a atrasar, é esse número que baixa.
28. **`regions: ["gru1"]` no `vercel.json` não é opcional.** Sem ele a Vercel sobe a
    função em `iad1` e cada query paga ~150ms de travessia até o banco em `sa-east-1`.
29. **`@default(...)` do Prisma não vira default no Postgres.** `cuid()`, `uuid(4)` e
    companhia são gerados no client. Duas consequências, e a segunda é a que morde:
    (a) `ADD COLUMN "x" TEXT NOT NULL` numa tabela com dado **estoura** mesmo com
    `@default` no schema — coluna obrigatória em tabela viva é sempre em três passos:
    anulável → `UPDATE` de backfill → `SET NOT NULL`;
    (b) **o código que já está no ar não conhece a coluna nova** e vai mandar `INSERT`
    sem ela, tomando violação de `NOT NULL` na janela entre `migrate deploy` e o deploy
    do código. Em `Player` isso não é teórico: importar lista cria jogador. A saída é
    `@default(dbgenerated("..."))`, que põe o default no banco — ver
    `20260819133000_default_do_link_no_banco`. **Migration sempre roda antes do deploy,
    então ela precisa ser compatível com o código velho.**
30. **`Player.selfToken` é credencial, não identificador.** Quem tem o link responde a
    presença daquele jogador. Nunca liste vários links numa tela de copiar/compartilhar,
    nunca mande pro grupo, e nunca coloque `/p/**` num `og:image` ou metadado indexável —
    a página já sai com `robots: noindex`. Revogar é gravar um `selfToken` novo.

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
| Conquistas: quais existem e quem ganha | `src/domain/badges/conquistas.ts` |
| Conquista desenhada (ícone e cor) | `src/components/football/conquista-card.tsx` |
| Presença: confirmar, cancelar, quem sobe da espera | `src/domain/attendance/presenca.ts` |
| Tela do jogador (link pessoal) | `src/app/p/[token]/` |
| Leitura e mutação do link pessoal | `src/features/presenca/` |
| Gravar presença passando pela regra | `mudarPresenca` em `src/features/rounds/service.ts` |
| Templates de e-mail do Supabase | `docs/emails/` (colar no painel) |
| Próxima data da rodada | `src/domain/schedule/recurrence.ts` |
| Fuso horário (hora de parede ↔ instante) | `src/domain/time/fuso.ts` |
| Formatação de data e hora na UI | `src/lib/dates.ts` |
| Consertar rodada com hora torta | `scripts/corrigir-fuso-das-rodadas.ts` |
| Região, cron e config da Vercel | `vercel.json` |
| Cache de navegação e flags do Next | `next.config.ts` |
| Batida anti-pausa do Supabase | `src/app/api/manter-vivo/route.ts` |
| Casca de espera das telas do grupo | `src/app/g/[slug]/loading.tsx` |
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
