# PLANO DE PRODUTO — Plataforma para organizar qualquer fut

**Documento de produto / PRD refatorado**  
**Data:** 11/08/2026  
**Status:** planejamento inicial  
**Nome de trabalho recomendado:** **Jogaê** *(provisório; validar domínio, redes e marca antes de fechar)*

---

# 1. Visão em uma frase

> **Organizar o fut, montar times equilibrados, acompanhar o jogo e transformar a resenha em histórico — sem tirar a galera do WhatsApp.**

A aplicação deve ser uma plataforma genérica para **qualquer grupo de futebol**, e não um sistema feito especificamente para um único fut de quinta-feira.

Ela precisa funcionar para:

- fut semanal entre amigos;
- society;
- futsal;
- campo;
- grupos com 2, 3, 4 ou mais times;
- grupos com goleiros fixos ou revezamento;
- grupos gratuitos ou com mensalidade/diária;
- grupos com organização simples ou com estatísticas completas.

A arquitetura, o banco e a experiência devem nascer com esse princípio.

---

# 2. O problema que o produto resolve

Em muitos grupos, quase toda a organização acontece no WhatsApp:

- alguém abre a lista;
- os jogadores copiam e adicionam o próprio nome;
- a lista fecha;
- alguém confere quem entrou e quem ficou na espera;
- os times são sorteados ou montados manualmente;
- goleiros precisam ser distribuídos;
- a mensagem dos times é enviada novamente no grupo;
- durante o jogo, gols e assistências são lembrados “de cabeça”;
- depois ninguém sabe exatamente quem foi artilheiro, quem mais venceu ou quem ainda não pagou.

O problema não é a falta de funcionalidades. O problema é a **fricção**.

O produto precisa eliminar tarefas repetitivas sem criar uma burocracia nova.

---

# 3. Princípios do produto

## 3.1. WhatsApp continua sendo o centro social

O objetivo não é obrigar 20 ou 30 jogadores a trocar o grupo por outro aplicativo.

O sistema deve funcionar como a **camada operacional do fut**:

```text
WhatsApp → organizar → jogar → registrar → compartilhar no WhatsApp
```

## 3.2. Mobile first

O organizador estará muitas vezes:

- no campo;
- com uma mão no celular;
- conversando com outras pessoas;
- com pouco tempo;
- precisando resolver algo em segundos.

Portanto, ações críticas precisam funcionar com poucos toques.

## 3.3. Configurável, não específico

Nada importante deve ficar hardcoded como:

- quinta-feira;
- 20 jogadores;
- 4 times;
- 5 na linha;
- Campo 03;
- um formato único de lista.

Esses valores devem ser configurações de cada grupo.

## 3.4. Diversão também é funcionalidade

A aplicação deve ser útil, mas também transmitir a energia do futebol:

- animações rápidas;
- sorteio visual;
- ranking com personalidade;
- cards de jogadores;
- microinterações;
- placar ao vivo;
- celebrações discretas;
- interface com identidade própria.

## 3.5. O sistema nunca deve atrapalhar o jogo

Se registrar um gol demorar mais que alguns segundos, a funcionalidade falhou.

---

# 4. Plataforma recomendada

## PWA Web Mobile-First

A recomendação é construir como **aplicação web responsiva + PWA**.

Isso permite:

- uma única base de código;
- uso no iPhone, Android, notebook e desktop;
- instalação na tela inicial;
- abertura por link;
- atualização instantânea sem App Store/Play Store;
- evolução futura para notificações;
- testes simples no seu próprio iPhone e no Windows.

### Direção técnica

- Frontend e backend no mesmo projeto inicialmente;
- arquitetura preparada para multi-grupo;
- banco PostgreSQL;
- deploy web simples;
- recursos em tempo real apenas onde realmente agregarem valor.

Não existe necessidade de começar com app Android/iOS nativo.

---

# 5. Conceito central: “Grupo de Fut”

A principal entidade do sistema será um **Grupo de Fut**.

Exemplos:

- Fut da Firma
- Resenha de Quinta
- Fut dos Amigos
- Arena Central
- Society do Condomínio

Cada grupo possui suas próprias configurações.

## Configurações principais

- nome;
- logo/avatar opcional;
- descrição;
- modalidade: society, futsal, campo ou personalizada;
- dia(s) recorrente(s);
- horário;
- duração;
- local;
- link de localização;
- número padrão de times;
- jogadores de linha por time;
- quantidade de goleiros;
- goleiros fixos ou rotativos;
- limite de jogadores confirmados;
- limite de espera;
- forma de montagem dos times;
- regras de pontuação/ranking;
- visibilidade do grupo;
- cores/nome dos times, quando desejado.

Assim, a mesma aplicação atende grupos completamente diferentes.

---

# 6. Perfis de acesso

## Organizador / Admin

Pode:

- criar e configurar grupo;
- cadastrar jogadores;
- criar rodada;
- importar lista;
- ajustar presença;
- montar/sortear times;
- editar times manualmente;
- iniciar o modo jogo;
- registrar placares, gols e assistências;
- corrigir eventos;
- gerenciar permissões;
- futuramente administrar pagamentos.

## Assistente / Mesário

Permissão opcional para:

- registrar placar;
- registrar gol/assistência;
- controlar partidas;
- sem acesso a configurações sensíveis.

## Jogador

No início, não precisa necessariamente criar conta.

Pode acessar um link compartilhado para visualizar:

- rodada atual;
- times;
- agenda;
- placares;
- ranking;
- artilharia;
- assistências;
- histórico.

Conta individual pode ser adicionada depois.

---

# 7. Estrutura do produto por fases

A divisão abaixo é intencional: primeiro entregar algo muito bom e usado toda semana; depois adicionar complexidade.

---

# PARTE I — MVP FORTE

# 8. Objetivo do MVP

O MVP precisa resolver perfeitamente este fluxo:

```text
Criar grupo
→ Criar rodada da semana
→ Colar lista do WhatsApp
→ Sistema interpreta
→ Organizador revisa
→ Gerar times
→ Ajustar se quiser
→ Compartilhar no WhatsApp
→ Abrir modo jogo
→ Registrar placar/gols rapidamente
→ Ranking básico atualizado
```

A primeira versão já deve parecer um produto bonito e completo, não um formulário administrativo genérico.

---

# 9. MVP — Onboarding e criação do grupo

Fluxo inicial:

```text
Criar meu fut
→ Nome do grupo
→ Modalidade
→ Quantos times normalmente?
→ Quantos jogadores de linha por time?
→ Como funciona o gol?
→ Dia / horário
→ Local
→ Criar grupo
```

Deve existir configuração rápida com defaults inteligentes.

### Exemplo

```text
4 times
5 jogadores de linha por time
2 goleiros fixos
Quinta 20:30–22:00
```

O sistema calcula automaticamente a capacidade padrão.

---

# 10. MVP — Rodadas / encontros

Cada dia de futebol é uma **Rodada**.

Uma rodada contém:

- data;
- horário;
- local;
- jogadores confirmados;
- goleiros;
- lista de espera;
- times gerados;
- partidas;
- gols;
- assistências;
- status: aberta, confirmada, em andamento, encerrada.

O grupo mantém todo o histórico de rodadas.

---

# 11. MVP — Importação da lista do WhatsApp

Esta é uma das funcionalidades principais.

A tela deve ter um grande campo:

> **Cole aqui a lista do WhatsApp**

O usuário cola algo como:

```text
Goleiros🧤
01-
02-

01-salles
02-guilherme
03-Marcos manus
...
20-Agnaldo

LISTA DE ESPERA⏰
01-Carlão
02-juliel
```

O parser tenta identificar:

- título;
- data;
- horário;
- local;
- link;
- goleiros;
- confirmados;
- lista de espera;
- posições vazias;
- possíveis nomes duplicados.

Depois mostra uma tela de revisão.

### Exemplo de feedback

```text
20 confirmados
2 na espera
0 goleiros confirmados

⚠ “Marcos manus” pode ser “Marcos Manus” já cadastrado.

[ Revisar ] [ Confirmar lista ]
```

---

# 12. Parser: simples, confiável e editável

No MVP, não depender de IA para interpretar uma lista comum.

Usar:

- regex;
- detecção de seções;
- normalização de caracteres;
- remoção de numeração;
- trim;
- comparação por nome;
- aliases;
- fuzzy matching apenas para sugerir correspondências.

## Aliases

Exemplo:

```text
Igão
Igao
Igor
Igor de Castro
```

Podem representar a mesma pessoa.

O organizador confirma uma vez e o sistema aprende o alias no grupo.

## Regra importante

O parser nunca deve “inventar” silenciosamente.

Quando houver dúvida, ele pergunta na tela de revisão.

---

# 13. MVP — Cadastro de jogadores

Campos básicos:

- nome exibido;
- apelido;
- aliases;
- foto opcional;
- posição/perfil opcional;
- goleiro: sim/não;
- nível técnico interno opcional;
- ativo/inativo;
- observações internas.

## Nível técnico

Escala simples de 1 a 5, visível apenas para organizadores.

Não deve aparecer no perfil público para evitar constrangimento.

Serve exclusivamente para o balanceador.

---

# 14. MVP — Montagem dos times

O motor deve funcionar para diferentes configurações.

Exemplos:

```text
2 times × 6 jogadores
3 times × 5 jogadores
4 times × 5 jogadores
5 times × 4 jogadores
```

## Modo 1 — Sorteio puro

Distribui aleatoriamente.

Ideal para grupos que gostam de sorteio tradicional.

## Modo 2 — Equilibrado

Usa parâmetros como:

- nível técnico;
- posição/perfil;
- goleiros;
- histórico de companheiros;
- repetição dos times anteriores.

O objetivo não é criar “o time perfeito matematicamente”, mas reduzir discrepâncias óbvias.

## Modo 3 — Manual assistido

O organizador pode:

- arrastar jogador entre times;
- bloquear jogador em um time;
- sortear novamente apenas os demais;
- desfazer;
- restaurar sorteio anterior.

---

# 15. MVP — Experiência visual do sorteio

O sorteio deve ser um momento marcante da aplicação.

Fluxo visual sugerido:

1. jogadores aparecem como cards/chips;
2. ao tocar em **Montar times**, os cards entram em movimento;
3. uma bola atravessa discretamente a tela ou existe uma animação de formação;
4. jogadores “encaixam” em cada time;
5. times surgem com uma revelação rápida;
6. pequenas partículas/confete aparecem somente no fim;
7. resultado fica imediatamente legível.

Duração ideal da animação: rápida o suficiente para não irritar em uso recorrente.

Adicionar opção **“Reduzir animações”**.

---

# 16. MVP — Goleiros

Goleiro precisa ser uma entidade tratada corretamente, não um jogador de linha “sobrando”.

Cada grupo escolhe uma estratégia:

### A. Goleiros fixos

Goleiros cadastrados participam de uma fila/pool próprio.

### B. Goleiro por time

Cada time recebe um goleiro.

### C. Empréstimo do time que descansa

Quando há mais times do que campos/partidas simultâneas, um jogador/goleiro do time de fora pode atuar no gol.

### D. Revezamento

O sistema apenas exibe quem deve ir para o gol em cada período/partida.

Tudo deve ser configurável por grupo.

---

# 17. MVP — Resultado e compartilhamento

Após gerar os times, oferecer:

- **Copiar para WhatsApp**;
- **Compartilhar link da rodada**;
- **Gerar imagem dos times** *(pode entrar no MVP+ se atrasar o core)*;
- editar nomes dos times;
- escolher emojis/cores.

Exemplo de mensagem:

```text
⚽ TIMES DE HOJE

🟢 TIME VERDE
1. Salles
2. Guilherme
3. Heitor
4. Pablo
5. Juan

🟡 TIME AMARELO
...

🔴 TIME VERMELHO
...

🩷 TIME ROSA
...

📍 Arena X
🕣 20:30

Times montados no Jogaê.
```

---

# 18. MVP — Link público da rodada

Cada rodada pode gerar uma página bonita e compartilhável.

Ela mostra:

- data e horário;
- local;
- status;
- jogadores;
- times;
- goleiros;
- placares, quando iniciados;
- ranking resumido.

O jogador não precisa instalar nada para visualizar.

---

# 19. MVP — Modo Jogo / Ao Vivo

Para o produto ser divertido e gerar histórico, a primeira versão deve ter um modo ao vivo **simples**.

Tela otimizada para uso no campo:

```text
TIME VERDE  2 × 1  TIME ROSA

[ + Gol Verde ]
[ + Gol Rosa ]

07:42
```

## Registrar gol

```text
+ Gol
→ tocar no autor
→ “Teve assistência?”
→ escolher jogador ou “sem assistência”
→ salvar
```

Objetivo: 2–3 toques.

## Correção rápida

Mostrar os últimos eventos com botão desfazer.

---

# 20. MVP — Partidas e rodízio

O sistema deve permitir registrar partidas entre os times da rodada.

Campos:

- time A;
- time B;
- início;
- fim;
- placar;
- vencedor;
- próximo confronto.

O sistema pode sugerir o próximo jogo com base na regra configurada, mas o organizador consegue sobrescrever.

Regras mais complexas de “ganhou fica”, tempo máximo e filas entram depois se necessário.

---

# 21. MVP — Estatísticas básicas

Com os eventos registrados, gerar automaticamente:

- gols;
- assistências;
- participações em gols;
- jogos disputados;
- vitórias;
- aproveitamento;
- saldo de gols do time na rodada;
- presença.

---

# 22. MVP — Rankings

Abas simples:

- **Rodada**;
- **Semana**;
- **Mês**;
- **Temporada / Geral**.

Rankings principais:

- artilharia;
- assistências;
- participações em gols;
- vitórias;
- presença.

Não criar uma fórmula excessivamente complexa de “melhor jogador” no começo.

---

# 23. MVP — Home / Dashboard

A home deve priorizar o que está acontecendo agora.

Exemplo:

```text
Boa noite 👋

Fut da Firma
QUINTA • 20:30

Próxima rodada
18 confirmados de 20
2 vagas

[ Importar lista ]
[ Montar times ]

Artilharia do mês
1. Lucas — 12
2. Igor — 10
3. Juan — 9
```

Se houver partida em andamento, o placar ao vivo vira o elemento principal.

---

# 24. Navegação do MVP

Mobile bottom navigation:

```text
Início | Rodada | Ao vivo | Ranking | Mais
```

Administração e jogadores ficam dentro de **Mais**.

No desktop, usar sidebar compacta.

---

# 25. O que NÃO entra no MVP

Para proteger o projeto de escopo excessivo, deixar explicitamente fora da primeira entrega:

- leitura automática do WhatsApp;
- automação de comprovante de Pix;
- integração bancária;
- mensalidades;
- cobrança automática;
- notificações complexas;
- chat próprio;
- marketplace;
- votação social avançada;
- algoritmo de IA obrigatório;
- reconhecimento de jogadores por foto/vídeo;
- aplicativo nativo;
- fantasy game;
- sistema completo de campeonatos;
- arbitragem digital;
- transmissão de vídeo.

---

# 26. Critério de sucesso do MVP

O MVP está realmente bom quando um organizador novo consegue:

1. criar o grupo;
2. configurar quantidade de times/jogadores;
3. colar a lista;
4. revisar jogadores;
5. montar os times;
6. compartilhar no WhatsApp;

em poucos minutos, sem tutorial.

E um organizador recorrente deve conseguir fazer o fluxo semanal principal em **menos de 1 minuto**, desconsiderando decisões humanas.

---

# PARTE II — EVOLUÇÕES APÓS O MVP

# 27. Fase 2 — Experiência social e gamificação

Depois do core estabilizado:

- cards de jogador;
- “craque da rodada”;
- votação de MVP;
- sequência de presenças;
- badges;
- recordes pessoais;
- “melhor mês”;
- retrospectiva mensal;
- retrospectiva anual;
- comparação entre amigos;
- share cards para WhatsApp/Instagram;
- animações especiais para hat-trick;
- conquistas divertidas.

Gamificação deve ser leve e positiva.

Evitar mecânicas que gerem conflito desnecessário.

---

# 28. Fase 3 — Financeiro / pagamentos

Somente depois que a aplicação já estiver sendo usada naturalmente.

## Funcionalidades

- valor da diária/mensalidade;
- status: pago / pendente / isento;
- marcação manual em um toque;
- histórico por jogador;
- total arrecadado;
- custo do campo;
- saldo da rodada/mês;
- lembrete de pendência;
- exportação simples.

## Por que fica depois

Financeiro aumenta:

- responsabilidade;
- segurança;
- regras de negócio;
- suporte;
- casos de exceção.

O produto deve provar valor primeiro na organização do futebol.

---

# 29. Fase 4 — Pix mais inteligente

Evolução possível:

### Opção A — upload de comprovante

Jogador envia comprovante pelo sistema e organizador confirma.

### Opção B — OCR/IA como apoio

Extrair:

- valor;
- data;
- nome;
- identificador.

Sempre como sugestão, nunca como única fonte de verdade.

### Opção C — Pix Cobrança / provedor com webhook

É o fluxo mais robusto no futuro:

```text
Cobrança individual
→ pagamento
→ provedor confirma
→ webhook
→ status atualizado automaticamente
```

Essa etapa depende de integração financeira e deve ser tratada como módulo próprio.

---

# 30. Fase 5 — WhatsApp

## Primeiro nível: integração sem API

Muito valor já existe com:

- copiar lista do grupo;
- colar no sistema;
- copiar times;
- compartilhar link;
- compartilhar ranking;
- compartilhar card de resultado.

Esse é o fluxo recomendado inicialmente.

## Segundo nível: geração de mensagens

Templates automáticos:

- abertura da lista;
- lista fechada;
- times;
- chamada de goleiro;
- aviso de vaga;
- resultado da rodada;
- ranking mensal;
- cobrança pendente.

## Terceiro nível: automações oficiais quando fizer sentido

Investigar futuramente possibilidades compatíveis com a plataforma oficial do WhatsApp e o modelo de negócio.

A aplicação **não deve nascer dependente de leitura automática do grupo pessoal**.

---

# 31. Fase 6 — Presença e lista de espera inteligente

Possibilidades:

- abrir inscrições da rodada;
- jogador confirmar por link;
- cancelamento libera vaga;
- primeiro da espera sobe automaticamente;
- prazo de confirmação;
- histórico de no-show;
- recorrência semanal;
- aviso de “faltam 2 vagas”.

Esse módulo pode eventualmente reduzir até a necessidade de copiar listas do WhatsApp, mas sem obrigar o grupo a mudar imediatamente.

---

# 32. Fase 7 — Regras avançadas de jogo

Configurações opcionais:

- ganhou fica;
- perdeu sai;
- empate sai ambos;
- empate favorece quem entrou depois;
- tempo máximo de partida;
- partida termina em X gols;
- limite de sequência;
- fila de times;
- múltiplos campos;
- tabela automática de confrontos.

A interface deve esconder configurações avançadas até serem necessárias.

---

# 33. Fase 8 — Produto SaaS

Se o projeto mostrar aderência fora do próprio grupo:

- múltiplos grupos por usuário;
- convites;
- roles mais robustos;
- onboarding público;
- página de preços;
- plano gratuito;
- plano Pro;
- recursos premium;
- analytics de produto;
- suporte;
- termos e privacidade;
- observabilidade;
- limites de uso;
- billing.

Não construir isso antes de validar uso real.

---

# 34. Balanceamento de times — estratégia

O balanceador deve ser determinístico quando houver uma seed e flexível por grupo.

## Variáveis possíveis

- skill de 1–5;
- perfil: defesa, meio, ataque, versátil;
- goleiro;
- quantidade de vezes que dois jogadores caíram juntos recentemente;
- força total estimada;
- distribuição de perfis.

## Função de custo conceitual

```text
score =
  diferença_de_skill * peso_skill
+ desequilíbrio_de_perfis * peso_perfil
+ repetição_de_duplas * peso_repetição
+ repetição_do_time_anterior * peso_histórico
```

Gerar várias combinações válidas e escolher uma das melhores.

Não é necessário machine learning.

---

# 35. Transparência do sorteio

Para evitar a sensação de manipulação:

- mostrar modo usado: Aleatório / Equilibrado;
- permitir “sortear novamente”;
- registrar horário do sorteio;
- opcionalmente registrar seed;
- indicar se houve edição manual depois.

Exemplo:

> Times gerados no modo **Equilibrado** às 20:14. Ajuste manual: 1 troca.

---

# 36. Modelo de dados conceitual

Entidades principais:

## User

- id
- name
- email
- avatar

## FootballGroup

- id
- name
- slug
- sportType
- timezone
- defaultVenue
- recurringSchedule
- teamCount
- fieldPlayersPerTeam
- goalkeeperMode
- settings

## Membership

- userId
- groupId
- role

## Player

- id
- groupId
- displayName
- nickname
- aliases
- avatar
- skillLevel
- preferredRole
- isGoalkeeper
- active

## Session / Round

- id
- groupId
- date
- startsAt
- endsAt
- venue
- status

## Attendance

- roundId
- playerId
- status: confirmed | waiting | absent
- order

## Team

- id
- roundId
- name
- color

## TeamPlayer

- teamId
- playerId
- goalkeeperAssignment

## Match

- id
- roundId
- teamA
- teamB
- scoreA
- scoreB
- startsAt
- endsAt

## MatchEvent

- id
- matchId
- type: goal | assist | correction
- playerId
- relatedPlayerId
- timestamp

## Payment

Adicionar somente na fase financeira.

---

# 37. Arquitetura recomendada

Começar como **monólito modular**.

Não usar microserviços.

```text
Next.js / TypeScript
│
├── UI / PWA
├── API / Server Actions / Route Handlers
├── Auth
├── Domain
│   ├── groups
│   ├── rounds
│   ├── players
│   ├── list-parser
│   ├── team-balancer
│   ├── matches
│   └── rankings
│
├── PostgreSQL
└── Jobs simples quando necessário
```

Vantagens:

- rápido de desenvolver;
- fácil de manter sozinho;
- fácil de testar;
- fácil de deployar;
- modular o suficiente para crescer.

---

# 38. Stack sugerida

## Core

- Next.js
- React
- TypeScript
- PostgreSQL
- Prisma ou Drizzle
- Zod

## UI

- Tailwind CSS
- biblioteca de primitives acessíveis como base, sem aceitar aparência padrão “shadcn genérica” como resultado final;
- Framer Motion ou Motion para microinterações;
- ícones consistentes;
- charts leves apenas onde ajudarem.

## Infra

Duas opções válidas:

### Opção A — Vercel + banco gerenciado

Mais simples operacionalmente.

### Opção B — VPS Hostinger

Pode rodar:

- app em container;
- PostgreSQL;
- reverse proxy;
- backups;
- jobs.

Para um produto pequeno, ambas funcionam. A escolha pode ser feita pela experiência operacional desejada.

---

# 39. Segurança e privacidade

Mesmo sendo um projeto de futebol, existem dados pessoais.

Regras básicas:

- senha nunca armazenada em texto puro;
- autenticação segura;
- autorização por grupo;
- links públicos com IDs não previsíveis ou token de compartilhamento;
- nível técnico do jogador privado;
- logs para alterações administrativas importantes;
- backup do banco;
- rate limit em endpoints sensíveis;
- validação server-side;
- cuidado extra quando financeiro entrar.

---

# 40. PWA e offline

A PWA deve poder ser instalada.

Evolução desejada:

- cache do shell da aplicação;
- rodada atual acessível mesmo com internet instável;
- fila local para registrar evento e sincronizar quando conexão voltar;
- indicador claro de sincronização.

Offline completo pode entrar depois do MVP, mas a arquitetura não deve impedir essa evolução.

---

# 41. Direção visual do produto

A interface precisa fugir completamente do “painel SaaS corporativo sem personalidade”.

## Personalidade

- esportiva;
- rápida;
- urbana;
- divertida;
- competitiva;
- tecnológica;
- premium;
- jovem sem ser infantil.

## Paleta obrigatória

Quatro cores de alta energia:

- **Verde** — ação positiva, campo, sucesso;
- **Amarelo** — destaque, assistência, atenção positiva;
- **Vermelho** — intensidade, ao vivo, placar, urgência;
- **Rosa** — social, ranking, momentos especiais, identidade visual.

Sugestão inicial de tons para exploração no design system:

```text
Green  : #35E878
Yellow : #FFD84A
Red    : #FF4D4D
Pink   : #FF4FA3
```

A base visual deve usar neutros escuros e claros para que as quatro cores não disputem atenção o tempo inteiro.

### Base sugerida

```text
Ink 950   #090A0C
Ink 900   #111317
Ink 800   #1A1D22
Cloud 50  #F7F8FA
White     #FFFFFF
```

Os hex exatos devem ser refinados no design system, preservando contraste e acessibilidade.

---

# 42. Uso semântico das quatro cores

As cores não devem ser usadas aleatoriamente.

## Verde

- CTA principal;
- confirmação;
- jogador confirmado;
- vitória;
- ação positiva.

## Amarelo

- destaque;
- assistência;
- aviso não crítico;
- medalha;
- posição em ranking.

## Vermelho

- live;
- gol/placar quando precisa chamar atenção;
- erro;
- remoção;
- evento competitivo.

## Rosa

- conquistas;
- social;
- perfil;
- momentos especiais;
- elementos de branding.

Na tela de times, as quatro cores também podem representar os quatro primeiros times quando essa configuração existir.

---

# 43. Linguagem visual

Referências conceituais, sem copiar nenhum produto:

> **placar esportivo + streetwear + interface de game + app social moderno + sports tech**

Elementos que podem aparecer:

- linhas de campo extremamente sutis;
- grid esportivo;
- círculos de meio-campo abstratos;
- trajetória de bola;
- cards de jogador inspirados em escalação, mas minimalistas;
- números grandes;
- tipografia condensada para placar;
- animações cinéticas;
- pequenas texturas/grain;
- badges;
- chips com energia visual;
- sombras e glow muito controlados.

Evitar:

- grama fotográfica como fundo;
- excesso de bolas 3D;
- interface infantil;
- neon exagerado;
- cards iguais a dashboards corporativos;
- gradiente arco-íris constante;
- excesso de glassmorphism;
- estética de site de apostas.

---

# 44. Motion design

Animação deve comunicar ação.

## Exemplos

### Ao gerar times

Cards dos jogadores se movimentam e entram nos times.

### Ao registrar gol

- placar incrementa com spring;
- pequena onda/ripple;
- texto “GOOOL” por menos de 1s;
- partícula rápida;
- evento entra na timeline.

### Ao abrir ranking

Top 3 entra com stagger curto.

### Ao trocar de aba

Transições rápidas, 150–250 ms.

### Ao confirmar presença

Chip muda de estado com bounce mínimo.

### Loading

Evitar spinner genérico sempre que possível.

Pode existir uma animação abstrata baseada em uma bola percorrendo linhas de campo.

## Regra

Motion nunca pode atrasar uma ação essencial.

---

# 45. Microcopy

A linguagem deve ser curta e natural.

Preferir:

- “Bora montar os times?”
- “20 confirmados. Fechou.”
- “2 na espera.”
- “Times prontos.”
- “Começar jogo”
- “Gol de quem?”
- “Teve assistência?”
- “Desfazer último lance”

Evitar texto excessivamente corporativo como:

- “Processamento concluído com sucesso”;
- “Cadastro efetuado”;
- “Gerenciamento de participantes”.

---

# 46. Acessibilidade

Visual forte não pode significar baixa usabilidade.

Garantir:

- contraste adequado;
- área de toque grande;
- estados não dependentes apenas de cor;
- suporte a reduced motion;
- textos legíveis no sol;
- feedback visual em todas as ações;
- placar e botões utilizáveis rapidamente.

---

# 47. Possíveis nomes

O nome não deve ficar preso a:

- quinta-feira;
- um campo;
- um grupo;
- quantidade fixa de jogadores.

## Shortlist — mais fortes

### 1. Jogaê

**Personalidade:** brasileira, social, divertida, fácil de falar.  
**Tagline:** “Seu fut, sem enrolação.”  
**Ponto forte:** vira marca e não descreve apenas uma feature.

### 2. FutFlow

**Personalidade:** moderna, produto/SaaS.  
**Tagline:** “Do grupo pro jogo.”  
**Ponto forte:** comunica organização e fluxo.

### 3. BoraFut

**Personalidade:** direta, popular, amigável.  
**Tagline:** “Chamou, montou, jogou.”

### 4. NaBola

**Personalidade:** simples e memorável.  
**Tagline:** “Tudo do seu fut num só lugar.”

### 5. FutSync

**Personalidade:** tech.  
**Tagline:** “Seu fut em sintonia.”

### 6. BateBola

**Personalidade:** esportiva e social.  
**Tagline:** “Organiza a resenha. Joga o jogo.”

### 7. TimeUp

**Personalidade:** produto moderno.  
**Tagline:** “Seu time pronto em segundos.”

### 8. Escalaê

**Personalidade:** brasileira e funcional.  
**Tagline:** “Colou a lista, saiu o time.”

### 9. PartiuFut

**Personalidade:** casual e clara.  
**Tagline:** “Do convite ao apito final.”

### 10. FutHub

**Personalidade:** ampla, escalável.  
**Tagline:** “A casa do seu fut.”

## Recomendação atual

### **Jogaê**

É o nome que mais combina com a direção desejada de produto:

- divertido;
- moderno;
- brasileiro;
- social;
- não preso a um único grupo;
- permite uma identidade visual forte.

Antes de fechar o nome, validar:

- domínio;
- @ nas redes;
- busca de marca;
- conflitos com apps existentes.

Por enquanto, usar **Jogaê** apenas como codename do projeto.

---

# 48. Telas principais

## Área pública / jogador

1. Landing / entrar em grupo
2. Rodada atual
3. Times
4. Ao vivo
5. Ranking
6. Jogadores
7. Histórico

## Área do organizador

8. Dashboard
9. Criar rodada
10. Importar lista
11. Revisar lista
12. Montar times
13. Editor de times
14. Controle ao vivo
15. Cadastro de jogadores
16. Configuração do grupo
17. Permissões

Fases futuras:

18. Financeiro
19. Pagamentos
20. Integrações

---

# 49. Fluxo principal do organizador

```text
HOME
│
├── Próxima rodada
│   ├── Importar lista
│   ├── Presenças
│   ├── Espera
│   └── Montar times
│
├── TIMES
│   ├── Sorteio puro
│   ├── Equilibrado
│   ├── Editar
│   └── Compartilhar
│
├── AO VIVO
│   ├── Escolher confronto
│   ├── Placar
│   ├── Gol
│   ├── Assistência
│   └── Encerrar partida
│
└── PÓS-JOGO
    ├── Resultado
    ├── Ranking atualizado
    └── Compartilhar
```

---

# 50. Fluxo principal do jogador

```text
Abre link no WhatsApp
→ vê times
→ vê horário/local
→ acompanha placar
→ consulta ranking
```

Nenhum cadastro obrigatório no MVP para esse fluxo.

---

# 51. Estados vazios que precisam ser bons

O design deve tratar estados vazios como parte do produto.

Exemplos:

### Sem rodada

> “Nada marcado ainda. Bora organizar o próximo?”

### Sem ranking

> “O ranking começa no primeiro apito.”

### Sem jogadores

> “Adicione a galera ou cole uma lista do WhatsApp.”

### Sem partida ao vivo

> “Times prontos? Comece o primeiro jogo.”

---

# 52. Features pequenas com alto valor

- botão copiar localização;
- abrir Google Maps;
- contagem de vagas;
- contador para horário do fut;
- “quem está na espera”;
- últimos times usados;
- desfazer última alteração;
- duplicar rodada anterior;
- ativar/inativar jogador;
- busca rápida;
- compartilhar card;
- histórico por jogador;
- estatística do mês atual na home;
- escolha de apelido exibido.

---

# 53. Roadmap recomendado

## Fase 0 — Fundação

- projeto;
- design system;
- banco;
- auth do organizador;
- modelo multi-grupo;
- PWA shell;
- CI/CD;
- seeds/testes.

## Fase 1 — MVP de organização

- criar grupo;
- jogadores;
- rodada;
- parser;
- revisão;
- lista de espera;
- sorteio puro;
- balanceamento;
- editor;
- goleiros;
- compartilhar times.

## Fase 1.5 — MVP divertido

- link público;
- modo ao vivo;
- placar;
- gol;
- assistência;
- ranking básico;
- histórico;
- motion polish;
- cards compartilháveis.

## Fase 2 — Social / gamificação

- MVP da rodada;
- badges;
- share cards avançados;
- recordes;
- retrospectivas.

## Fase 3 — Financeiro

- valor da rodada;
- pago/pendente;
- histórico;
- painel.

## Fase 4 — Pix / automações

- comprovante;
- OCR opcional;
- integração de cobrança;
- webhook.

## Fase 5 — Presença avançada

- inscrição por link;
- fila automática;
- notificações;
- cancelamento e promoção da espera.

## Fase 6 — WhatsApp e integrações

- templates;
- automações compatíveis com APIs oficiais;
- outras integrações úteis.

## Fase 7 — SaaS público

- planos;
- billing;
- onboarding de mercado;
- analytics;
- suporte;
- limites e premium.

---

# 54. Prioridade MoSCoW do MVP

## MUST

- multi-grupo desde o modelo de dados;
- criação/configuração do fut;
- cadastro de jogadores;
- rodada;
- parser da lista;
- revisão;
- confirmados/espera/goleiros;
- geração de times;
- edição manual;
- compartilhamento;
- mobile perfeito.

## SHOULD

- balanceamento;
- modo ao vivo simples;
- gols;
- assistências;
- ranking;
- link público;
- PWA instalável.

## COULD

- imagem compartilhável;
- cards de jogador;
- animação de sorteio mais elaborada;
- estatísticas adicionais.

## WON'T — agora

- pagamentos;
- integração bancária;
- leitura automática do WhatsApp;
- app nativo;
- IA obrigatória no core.

---

# 55. Testes essenciais

## Parser

- listas com e sem emojis;
- hífen/traço/espaços diferentes;
- numeração 1, 01, 001;
- nomes duplicados;
- aliases;
- lista de espera;
- goleiros vazios;
- texto antes/depois da lista;
- acentos;
- copy/paste real de WhatsApp.

## Balanceador

- não perder jogador;
- não duplicar jogador;
- número correto por time;
- respeitar locks;
- respeitar goleiros;
- seed reproduzível;
- fallback quando faltam ratings.

## Ao vivo

- gol incrementa placar;
- desfazer corrige estatística;
- assistência vinculada;
- encerramento de partida;
- atualização do ranking.

## Permissões

- jogador público não altera dados;
- assistente não edita configurações;
- admin acessa somente grupos permitidos.

---

# 56. Métricas para validar a ideia

No começo, medir uso real, não vanity metrics.

- tempo entre colar lista e times prontos;
- número de rodadas organizadas;
- % de rodadas em que os times são gerados pelo app;
- quantas edições manuais acontecem após balanceamento;
- uso do link compartilhado;
- gols registrados por rodada;
- retorno semanal do organizador;
- quantidade de grupos além do grupo original.

A melhor validação é: **outras pessoas começarem a usar sem você precisar operar para elas**.

---

# 57. Estratégia de desenvolvimento com IA

## Claude Code

Usar principalmente para:

- scaffold;
- features completas;
- refactors;
- testes;
- componentes;
- migrations;
- debugging.

## ChatGPT

Usar para:

- arquitetura;
- decisões de produto;
- revisão de PR;
- edge cases;
- modelagem;
- UX/copy;
- auditoria do balanceador;
- geração de testes.

## Claude Design

Usar para criar:

- design system;
- protótipo mobile;
- protótipo web;
- direção de motion;
- componentes visuais principais.

Existe um documento separado neste projeto preparado especificamente para isso.

## VPS

Boa candidata para:

- PostgreSQL;
- deploy Docker;
- jobs;
- backups;
- serviços auxiliares.

## Vercel

Boa candidata quando a prioridade for velocidade de deploy e simplicidade do frontend/fullstack.

## Hermes

Não é necessário para o core do MVP. Pode ser explorado posteriormente para automações e agentes, caso exista um caso de uso claro.

---

# 58. Backlog técnico inicial

## Epic A — Foundation

- [ ] criar monorepo/repositório
- [ ] Next.js + TypeScript
- [ ] lint/format
- [ ] testes
- [ ] banco
- [ ] migrations
- [ ] auth
- [ ] PWA manifest
- [ ] theme tokens

## Epic B — Groups

- [ ] criar grupo
- [ ] editar configurações
- [ ] slug/share token
- [ ] roles

## Epic C — Players

- [ ] CRUD
- [ ] alias
- [ ] skill privado
- [ ] posição
- [ ] goleiro

## Epic D — Rounds

- [ ] criar rodada
- [ ] duplicar anterior
- [ ] status
- [ ] presença
- [ ] espera

## Epic E — Parser

- [ ] sections detector
- [ ] numbered line parser
- [ ] normalization
- [ ] alias resolution
- [ ] duplicate detection
- [ ] review UI
- [ ] parser test suite

## Epic F — Teams

- [ ] randomizer
- [ ] seeded random
- [ ] balancer
- [ ] goalkeeper strategies
- [ ] drag/drop editor
- [ ] undo
- [ ] share text

## Epic G — Live

- [ ] create match
- [ ] scoreboard
- [ ] goal event
- [ ] assist event
- [ ] undo
- [ ] end match

## Epic H — Ranking

- [ ] aggregate stats
- [ ] round ranking
- [ ] month ranking
- [ ] all-time

## Epic I — Polish

- [ ] animations
- [ ] loading states
- [ ] empty states
- [ ] responsive QA
- [ ] iPhone QA
- [ ] accessibility
- [ ] share cards

---

# 59. Estrutura de pastas sugerida

```text
src/
├── app/
│   ├── (public)/
│   ├── (app)/
│   ├── api/
│   └── manifest.ts
│
├── components/
│   ├── ui/
│   ├── football/
│   ├── motion/
│   └── charts/
│
├── features/
│   ├── groups/
│   ├── players/
│   ├── rounds/
│   ├── parser/
│   ├── teams/
│   ├── live/
│   └── rankings/
│
├── domain/
│   ├── team-balancer/
│   ├── list-parser/
│   └── statistics/
│
├── lib/
├── db/
├── styles/
└── tests/
```

---

# 60. Serviços de domínio importantes

## `ListParserService`

Responsável somente por transformar texto bruto em estrutura normalizada.

```text
parse(text, groupContext)
→ metadata
→ goalkeepers
→ confirmedPlayers
→ waitingPlayers
→ warnings
→ unresolvedNames
```

## `PlayerResolverService`

Resolve nome/apelido/alias contra jogadores conhecidos.

## `TeamBalancerService`

Recebe jogadores e regras e retorna times.

## `MatchService`

Controla partidas e eventos.

## `StatisticsService`

Gera agregações.

Manter regras de negócio fora dos componentes React.

---

# 61. Primeira experiência que precisa impressionar

A demonstração ideal do produto deve ser:

1. abrir o Jogaê no celular;
2. escolher um grupo;
3. colar uma lista bagunçada do WhatsApp;
4. em segundos ver jogadores separados corretamente;
5. tocar em **Montar times**;
6. assistir uma animação curta e bonita;
7. ver quatro times visualmente excelentes;
8. tocar em **Copiar para WhatsApp**;
9. durante o jogo registrar um gol em poucos toques;
10. no fim abrir o ranking atualizado.

Esse fluxo vende a ideia sozinho.

---

# 62. Definition of Done da primeira versão pública

A v1 só deve ser considerada pronta quando:

- funciona muito bem em iPhone;
- funciona bem em Android;
- desktop está bem resolvido;
- parser passa por listas reais;
- montar times não perde/duplica ninguém;
- goleiros funcionam;
- link público funciona;
- compartilhamento funciona;
- layout não parece template;
- animações são fluidas;
- loading/empty/error states estão tratados;
- acessibilidade básica está respeitada;
- banco possui backup;
- erros são rastreáveis;
- existe um caminho claro para corrigir dados.

---

# 63. Decisões de produto que ficam abertas

Não bloqueiam o design inicial, mas devem ser fechadas durante desenvolvimento:

- nome definitivo;
- auth por magic link, Google ou outro;
- Prisma x Drizzle;
- Vercel x VPS para app;
- regra exata de ranking por vitórias;
- quando o modo ao vivo entra na primeira release;
- se skill será 1–5 ou outra escala;
- quantas estratégias de goleiro entram no primeiro release;
- se o jogador poderá criar conta já na v1.

---

# 64. Recomendação de escopo real

A sequência mais eficiente é:

### Primeiro

**Fazer a organização da rodada ficar excelente.**

### Depois

**Adicionar o modo ao vivo e ranking para aumentar retenção e diversão.**

### Só então

**Entrar em pagamentos, Pix, WhatsApp avançado e SaaS.**

Isso reduz risco técnico e mantém o projeto focado no que gera valor imediatamente.

---

# 65. Norte do produto

A aplicação não deve virar um “sistema para administrar futebol”.

Ela deve parecer um produto que a galera realmente quer abrir.

A pergunta para qualquer nova feature é:

> **Isso deixa o fut mais rápido, mais organizado ou mais divertido?**

Se não fizer uma dessas três coisas, provavelmente não precisa entrar.

---

# 66. Resumo final

**Jogaê** é, por enquanto, o codename de uma PWA mobile-first capaz de atender qualquer grupo de futebol informal.

O MVP resolve:

- grupos configuráveis;
- jogadores;
- rodadas;
- lista do WhatsApp;
- lista de espera;
- goleiros;
- sorteio e balanceamento;
- edição manual;
- compartilhamento;
- modo ao vivo simples;
- gols;
- assistências;
- rankings.

Funcionalidades de maior complexidade ficam propositalmente para depois:

- pagamentos;
- Pix;
- OCR;
- automações financeiras;
- integrações profundas com WhatsApp;
- SaaS público.

Visualmente, a direção é **sports tech + streetwear + game UI + social**, com base escura e quatro cores de alta energia: **verde, amarelo, vermelho e rosa**.

O produto deve ser rápido o bastante para ser útil no campo e bonito o bastante para ser lembrado depois do jogo.
