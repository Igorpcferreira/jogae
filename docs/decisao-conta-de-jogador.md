# Conta de jogador — a decisão em aberto

Bloco **I** do HANDOFF e último item do §63 do plano: *"se o jogador poderá criar
conta já na v1"*. Este documento fecha o levantamento; a escolha é sua.

## Onde estamos

Hoje só o organizador tem login. O jogador aparece no sistema como registro do elenco
(`Player`), sem `User` associado, e a presença dele nasce da lista colada do WhatsApp.
O link público (`/r/<token>`) é leitura pura.

O plano coloca "jogador confirmar por link" na **Fase 6**, não na v1 — e o §65 avisa
que o produto não deve virar "um sistema para administrar futebol".

## As três saídas

### A. Nada muda (lista do WhatsApp continua sendo a fonte)

O organizador cola a lista, o app interpreta. O jogador só lê.

- **A favor:** é o fluxo que o grupo já tem; zero atrito de adoção; nada novo pra manter.
- **Contra:** o organizador continua sendo o gargalo de toda mudança de presença.
- **Custo:** zero.

### B. Confirmação por link, sem conta *(recomendada)*

Cada jogador ganha um link pessoal e não previsível (`/p/<token>`) que abre uma tela
com um botão: **"Tô dentro" / "Não vou"**. Sem senha, sem cadastro, sem app.

- **A favor:** resolve o problema real (presença chega sozinha) sem inventar um segundo
  sistema de identidade; a lista do WhatsApp continua funcionando em paralelo, então o
  grupo migra no ritmo dele; é a primeira linha da Fase 6 do plano.
- **Contra:** link pessoal vazado deixa outra pessoa mexer na presença — impacto baixo,
  já que o dado é público no grupo de qualquer forma.
- **Custo estimado:** token por jogador no schema, uma rota, uma action, regra de domínio
  pra "cancelou → primeiro da espera sobe". Uma sessão de trabalho.

### C. Conta de jogador de verdade

`User` para cada jogador, com magic link, e uma visão própria: minhas estatísticas,
meu histórico, meus grupos.

- **A favor:** abre badges, histórico pessoal e notificação; é o caminho de SaaS.
- **Contra:** muda o modelo mental do produto inteiro. Obriga a decidir o que o jogador
  vê do grupo, quem pode editar o quê, o que acontece quando ele sai. Adoção é dura:
  22 pessoas precisam clicar num e-mail.
- **Custo estimado:** várias sessões, e reabre autorização em toda tela.

## Recomendação

**B.** Entrega o valor que C promete (presença sem o organizador no meio) por uma fração
do custo, sem fechar a porta pra C depois — o token do jogador vira o convite natural
para a conta, quando ela existir.

## Invariante que vale nas três

**Nível técnico (1–5) nunca aparece pro jogador.** É privado do balanceador (plano §13),
e isso não muda em nenhum dos cenários. Se B ou C forem implementados, a tela do jogador
mostra presença, time e estatística — nunca a nota.

## O que trava

Nada foi implementado neste bloco de propósito: escolher A, B ou C muda o schema
(`Player.selfToken`? `User` ligado a `Player`?), a rota pública e a regra de espera.
Implementar antes da decisão seria escrever código pra jogar fora.
