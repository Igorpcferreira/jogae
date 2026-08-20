# Jogaê — documentação completa de funcionalidades (para o Claude Design)

> Documento-fonte para criar um material premium no Claude Design apresentando o
> Jogaê **como ele é hoje, no ar e em uso**. Substitui o briefing de 13/08
> (`apresentacao-jogae-claude-design.md`), que descrevia como "futuro" o que
> agora é funcionalidade lançada.

## 1. Objetivo deste documento

Gerar um documento bonito e compartilhável no WhatsApp que faça o pessoal do
grupo entender **tudo o que o sistema faz** — tanto o que o jogador comum usa
quanto o que o organizador ganha. O leitor termina pensando:

> **"Caramba, isso resolve o nosso fut inteiro."**

Público: os jogadores do grupo (maioria), organizadores de outros futs
(possíveis interessados) e qualquer pessoa que receber o link.

---

## 2. O Jogaê em uma frase

**Jogaê organiza o fut, monta times equilibrados, acompanha o jogo ao vivo e
transforma a resenha em histórico — sem tirar a galera do WhatsApp.**

### Tagline principal

> **Seu fut, sem enrolação.**

### Frases de apoio

- Do grupo do WhatsApp ao apito final.
- Colou a lista. Saiu o time.
- A resenha passa. O histórico fica.
- Chamou. Montou. Jogou. Ficou na história.

### Estado atual (importante — mudou desde o briefing anterior)

O Jogaê está **no ar e em produção**: https://jogae-free.vercel.app
Login com Google, jogo real rodando, tudo desta lista é funcionalidade
existente — nada aqui é promessa.

---

## 3. A ideia central

O Jogaê **não substitui o grupo do WhatsApp** — ele é a camada operacional do
fut. A conversa, o meme e a zoeira continuam onde sempre estiveram; o Jogaê
tira da conversa só o trabalho repetitivo:

```text
WhatsApp → confirmar presença → montar times → jogar → registrar → voltar pro WhatsApp
```

Toda tela do produto tem um botão de "copiar pro grupo": o app conversa com o
WhatsApp em vez de competir com ele.

---

## 4. O ciclo de uma semana de fut

1. O organizador cola **um único link** na conversa do grupo.
2. Cada jogador abre, toca no próprio nome e responde **"Tô dentro"** ou
   **"Não vou"** — sem criar conta, sem instalar nada.
3. Lista encheu? Quem confirmar depois entra na **lista de espera** sozinho.
4. Alguém desistiu? **O primeiro da espera sobe automaticamente** (e goleiro
   que sai puxa goleiro da espera).
5. No dia do jogo, o organizador monta os times: sorteio puro ou equilibrado.
6. Os times vão pro grupo com um toque — com card visual na prévia do link.
7. Durante o jogo: placar ao vivo, gol e assistência em dois toques.
8. Apito final: ranking atualizado, craque da rodada, conquistas — e abre a
   **votação secreta** de melhor da rodada, direto no link de cada um.

---

## 5. Pro jogador — sem conta, sem app, sem senha

A parte que faz o Jogaê diferente: **jogador não cria conta**. Ele recebe um
link pessoal que é dele pra sempre.

### O link do grupo

- Um link só, colado na conversa do WhatsApp, serve pro elenco inteiro.
- Abre a lista de nomes → a pessoa toca no seu → o aparelho lembra quem ela é.
- Da segunda vez em diante, o mesmo link **cai direto na página da pessoa**.
- Tocou no nome errado ou emprestou o celular? "Não é você? Escolher outro
  nome" resolve.

### A página pessoal do jogador

Tudo num lugar só, aberto direto do WhatsApp:

- **Responder presença**: "Tô dentro" / "Não vou", com a posição na espera
  quando a lista está cheia.
- **Ver o próprio time** quando o sorteio sai.
- **Votar no melhor da rodada** (a "Escolha da galera") — voto secreto, um por
  rodada, janela de 48h após o apito final.
- **Suas conquistas** (artilheiro do mês, hat-trick, presença de ferro…).
- **Seus números**: gols, assistências, rodadas, vitórias, aproveitamento.
- **Seus recordes pessoais** e **seu melhor mês**.
- **Com quem você mais joga** — as parcerias mais frequentes.
- **Copiar seu card** — um resumo pronto pra colar no grupo e zoar.

### Regras que fazem isso funcionar

- Cancelou → o primeiro da espera sobe na hora, sem ninguém no meio.
- Goleiro que desiste puxa **goleiro** da espera (quando o grupo reserva vaga
  de gol).
- Clique repetido não bagunça nada — o link vive no WhatsApp e vai ser clicado
  de novo sem querer.
- Depois que a bola rola, a lista trava: mudança é com o organizador.

---

## 6. Pro organizador — a rodada em poucos toques

### O grupo

- Criar grupo com nome, modalidade (society, futsal, campo…), formato
  (quantos times, quantos na linha, quantos no gol), dia, hora e local.
- 4 estratégias de goleiro: fixo por time, pool, revezamento ou emprestado.
- Papéis: **dono**, **admin** e **assistente** (assistente apita o jogo, mas
  não mexe em configuração nem sorteio). Convite por e-mail.

### O elenco

- Cadastro com nome, apelido, aliases ("Igão", "Igao" e "Igor" são a mesma
  pessoa), posição e se pega no gol.
- Nível técnico de 1 a 5 — **privado**: só o sorteio equilibrado lê. Nenhum
  jogador vê nota de ninguém, nunca.
- Inativar mantém o histórico; excluir só quem nunca jogou.
- Link pessoal de cada um na ficha, com "Copiar recado" pronto pro privado —
  e **"Gerar link novo"** se o link vazar ou a pessoa trocar de celular.

### A rodada

- Criar do zero, ou **repetir a última** (mesma lista, sem trazer inativo nem
  quem faltou).
- **Importar a lista do WhatsApp**: cola a lista real — com emoji, numeração
  1/01/001, traços diferentes, seção de goleiros, vagas vazias — e o sistema
  entende, sugere correspondência de apelidos e deixa revisar antes de gravar.
- Presenças, goleiros e espera na tela; promover da espera em um toque.
- **"Copiar chamada pro grupo"**: a mensagem pronta ("18 confirmados. Faltam 2
  pra fechar." + link público) pra colar no grupo sempre que a lista mexer.

### Os times

- **Sorteio aleatório** ou **equilibrado** (nível, perfil de jogo, goleiros,
  quem caiu junto nas últimas rodadas, times anteriores).
- **Travas**: fixar jogador em time antes de sortear.
- Mesma configuração, mesmo resultado — o sorteio é auditável, com
  "transparência do sorteio" pra mostrar que não teve mão.
- Troca manual por toque duplo depois do sorteio.
- Nome e cor de cada time (verde, amarelo, vermelho, rosa).
- Animação de sorteio (pulável) e "Copiar pro WhatsApp" com a escalação.

---

## 7. Ao vivo — feito pro campo

- Placar **gigante** (número de 96px), legível com sol na tela.
- Gol em dois toques: "Gol de quem?" → "Teve assistência?".
- **Desfazer** o último lance.
- Cronômetro e timeline da partida.
- **Hat-trick tem festa**: no terceiro gol do jogador na rodada, a tela
  comemora. (Só no terceiro — festa rara é festa de verdade.)
- **Dois celulares marcando o mesmo gol?** O sistema percebe gol repetido do
  mesmo time em segundos e **pergunta** ("Já marcaram esse gol?") em vez de
  bloquear.
- **Funciona sem internet**: o gol entra numa fila no aparelho e sobe quando a
  conexão volta — sem duplicar placar. É PWA: instala na tela do celular.

---

## 8. Social e gamificação — leve e positiva, por regra

A regra de produto: **nada que gere briga**. Isso está no código, não no
discurso:

- **Não existe conquista negativa.** Sem "pior do mês", sem ranking de falta.
- **Empate divide a conquista.** Dois artilheiros são resenha; escolher um por
  critério obscuro é briga.
- **Medalha que todo mundo tem não é medalha.** Acima de 3 empatados, ninguém
  leva.

### As conquistas

| Conquista | Critério | Cor |
| --- | --- | --- |
| Artilheiro do mês | Mais gols no mês | vermelho |
| Garçom do mês | Mais assistências no mês | amarelo |
| Presença de ferro | 4+ rodadas seguidas | verde |
| Hat-trick | 3+ gols numa rodada | vermelho |
| Craque da rodada | Melhor participação em gol | rosa |
| Estreia | Primeira rodada | rosa |

### Dois prêmios por rodada, de propósito

- **Craque da rodada** — calculado pelos números (participação em gol).
- **Escolha da galera** — votado pelos que jogaram, no link pessoal.

Por que os dois? O cálculo nunca premia goleiro nem zagueiro — a votação
conserta exatamente isso. No primeiro teste real, o craque calculado foi um
atacante e a galera elegeu **o goleiro**.

A votação é séria: **voto secreto** (não existe consulta que responda "quem
votou em quem"), um voto por pessoa, não pode votar em si, 48h de janela,
quórum mínimo — e **parcial não aparece** enquanto a urna está aberta.

### Rankings e histórico

- Abas por **rodada / mês / geral** × **gols / assistências / participações /
  vitórias / presença**. Empate compartilha posição.
- **Card do jogador**: temporada, conquistas, recordes, melhor mês, parcerias.
- **Recordes pessoais**: sempre superlativo positivo, com piso mínimo
  ("recorde de 1 gol" não é recorde, é constrangimento).
- **Duplas**: quantos jogos juntos, aproveitamento da dupla, quem serve quem.
  Parceria, não duelo — ordenado por frequência, nunca por "quem carrega quem".
- **Retrospectiva mensal e anual**: números do período, destaques, dupla do
  período, jogo mais movimentado, estreantes.

---

## 9. Compartilhar — o app conversa com o WhatsApp

- **Página pública da rodada** (link sem login): times, placares, espera,
  craque — pra quem quiser acompanhar sem entrar em nada.
- **Card visual dos times** (imagem gerada na hora): a prévia do link no
  WhatsApp mostra a escalação bonita.
- **Card de conquistas da rodada** (imagem): a festa pronta pra colar.
- **Mensagens prontas em um toque**: chamada da rodada, escalação dos times,
  resultado com artilharia, conquista individual, card do jogador.

---

## 10. Privacidade e confiança (pode virar uma página "coisas que o Jogaê nunca faz")

- O **nível técnico é privado**. Não aparece pra jogador, não sai em tela
  pública, não entra em imagem.
- O **voto é secreto** por arquitetura: o sistema não tem como mostrar quem
  votou em quem.
- **Link pessoal é credencial**: cada um responde só por si. Vazou? Troca-se o
  link daquela pessoa (ou o do grupo inteiro) e o antigo morre na hora.
- Jogador **não cria conta e não dá dado nenhum** — nem e-mail.
- Página de grupo que não é seu simplesmente não existe pra você (404).

---

## 11. Feito pro celular no campo

- Mobile-first de verdade: alvo de toque generoso (mínimo 44px, 56px no ao
  vivo), placar legível sob sol, ações críticas em poucos toques.
- Funciona **antes mesmo de carregar o JavaScript** — a primeira tela que 21
  pessoas abrem do 4G do estacionamento responde no primeiro toque.
- PWA instalável (ícone na tela inicial, abre como app).
- Animação nunca atrasa dado: o sorteio roda em paralelo com a animação.
- Acessibilidade: estado nunca é só cor (cor + ícone ou rótulo), foco visível,
  respeita "reduzir movimento" do aparelho.

---

## 12. O que vem depois (seção honesta — separar claramente do que existe)

- **Aviso automático de "você subiu da espera"** (notificação push no celular).
  Hoje quem sobe vê ao abrir o link; o WhatsApp não permite bot legítimo
  mandar mensagem no grupo.
- **Financeiro**: diária/mensalidade, quem pagou, saldo da rodada — registro
  manual primeiro, Pix depois. Só entra quando o uso semanal estiver rodando.
- **Domínio próprio** (identidade, não funcionalidade).

> **Primeiro, fazer a organização do fut ficar excelente. Depois, evoluir o resto.**

---

## 13. Direção visual obrigatória

O documento deve parecer o próprio Jogaê: esportivo, urbano, rápido, divertido
e premium. Nunca dashboard corporativo, consultoria ou site de aposta.

### Personalidade

Placar esportivo + streetwear + tecnologia esportiva + interface de game +
app social moderno.

### Paleta (uso semântico — nunca todas juntas na mesma área)

| Cor | Uso semântico | Hex |
| --- | --- | --- |
| Verde | ação principal, presença confirmada, vitória | `#35E878` |
| Amarelo | destaque, assistência, ranking | `#FFD84A` |
| Vermelho | ao vivo, gol, placar, intensidade | `#FF4D4D` |
| Rosa | marca, social, conquistas | `#FF4FA3` |
| Grafite profundo | fundo e superfícies | `#090A0C`, `#111317`, `#1A1D22` |
| Branco frio | texto principal | `#ECEFF3` |

### Tipografia

- Títulos, números e placares: condensada, alta energia, caixa alta (espírito
  da **Anton**).
- Texto de apoio: sans-serif limpa e legível (espírito da **DM Sans**).
- Números grandes como protagonistas: `20`, `4 TIMES`, `2 × 1`, `12 GOLS`.

### Elementos gráficos

Grid técnico de campo, linhas de marcação, faixa com as quatro cores, badges e
chips, cards de escalação, cantos chanfrados em placares e destaques, textura
leve de grão.

### Evitar completamente

Grama fotográfica, bola 3D em excesso, neon exagerado, gradientes aleatórios,
glassmorphism pesado, ilustração infantil, estética de site de aposta, página
lotada de texto.

### Microcopy real do produto (usar como voz)

- "Bora montar os times?"
- "20 confirmados. Fechou."
- "Falta 1 pra fechar."
- "Tô dentro" / "Não vou"
- "Gol de quem?" / "Teve assistência?"
- "Já marcaram esse gol?"
- "Toca no seu nome. Da próxima vez esse link já abre direto na sua página."
- "Este link é seu. Não repassa pro grupo — quem abrir responde no seu lugar."

---

## 14. Estrutura recomendada (12–14 páginas, PDF vertical, leitura no celular)

| Página | Título | Conteúdo |
| --- | --- | --- |
| 1 | **Jogaê — Seu fut, sem enrolação.** | Capa: marca, faixa 4 cores, energia. |
| 2 | **Todo fut começa no WhatsApp.** | O problema: lista copiada, contagem, espera, goleiro. |
| 3 | **Um link resolve.** | O ciclo da semana (seção 4) como linha do tempo visual. |
| 4 | **Você, jogador: sem conta, sem app.** | Link do grupo → "sou eu" → Tô dentro/Não vou. |
| 5 | **Sua página, seu histórico.** | Card pessoal: números, conquistas, recordes, parcerias. |
| 6 | **Desistiu? A espera anda sozinha.** | Cancelou → primeiro sobe; goleiro puxa goleiro. |
| 7 | **Colou a lista. Saiu o time.** | Importação da lista real do WhatsApp. |
| 8 | **Sorteio ou equilíbrio — sem mão.** | Modos, travas, transparência, troca por toque. |
| 9 | **No campo, o jogo continua organizado.** | Placar ao vivo, gol em 2 toques, offline, hat-trick. |
| 10 | **Dois prêmios por rodada.** | Craque calculado × Escolha da galera (voto secreto). |
| 11 | **A resenha vira histórico.** | Rankings, conquistas, retrospectiva, duplas. |
| 12 | **O que o Jogaê nunca faz.** | Privacidade: nota privada, voto secreto, sem conta. |
| 13 | **O que vem pela frente.** | Push da espera, financeiro — claramente "futuro". |
| 14 | **Menos organização. Mais bola rolando.** | Fechamento + link do app. |

---

## 15. Prompt pronto para o Claude Design

```text
Crie um documento editorial premium em PDF vertical sobre o Jogaê, em português
do Brasil, usando este arquivo como fonte de verdade para conteúdo e direção de
arte.

Objetivo: fazer os jogadores de um grupo de futebol amador entenderem TUDO que
o sistema já faz — a experiência do jogador (sem conta, link pessoal, votação,
conquistas) e a do organizador (lista, sorteio, ao vivo, ranking). O produto
está NO AR e em uso: nada das seções 4 a 11 é futuro. Somente a seção "O que
vem depois" é roadmap, e deve aparecer claramente separada.

Frase principal: "Seu fut, sem enrolação."
Tom: esportivo, brasileiro, urbano, social, divertido, tecnológico e premium.
Sem linguagem corporativa e sem promessa irreal.

Direção visual: sports tech + streetwear + placar esportivo + interface de
game. Fundo grafite profundo (#090A0C, #111317, #1A1D22), texto #ECEFF3,
verde #35E878 (confirmação/vitória), amarelo #FFD84A (assistência/destaque),
vermelho #FF4D4D (gol/ao vivo), rosa #FF4FA3 (social/conquista). Títulos em
fonte condensada caixa alta (espírito Anton), apoio em sans limpa (DM Sans).
Números grandes como protagonistas. Grid técnico sutil, faixa das 4 cores,
cantos chanfrados. Nunca: grama fotográfica, bola 3D, neon exagerado, visual
de site de aposta.

Use a microcopy real do produto listada no documento ("Tô dentro", "20
confirmados. Fechou.", "Gol de quem?"). Crie mockups conceituais de telas
mobile. Pouco texto por página. Siga a estrutura de 14 páginas da seção
"Estrutura recomendada". Não invente funcionalidades além das descritas.
```

---

## 16. Fechamento recomendado

> **Menos organização. Mais bola rolando.**
>
> O Jogaê transforma a bagunça da resenha em uma experiência que a galera quer
> abrir toda semana.

Alternativa curta:

> **Chamou. Montou. Jogou. Ficou na história.**
