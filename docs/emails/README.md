# Templates de e-mail do Supabase

Os e-mails de autenticação **não vivem no código** — ficam no painel do Supabase, em
**Authentication → Emails → Templates**. Estes arquivos existem só para versionar o que
foi colado lá e para poder revisar o texto num diff.

## O que colar onde

| Arquivo | Template no painel | Assunto (campo "Subject heading") |
| --- | --- | --- |
| `magic-link.html` | **Magic Link** | `Seu link de entrada no Jogaê` |
| `convite.html` | **Invite user** | `Te chamaram para ajudar a organizar o fut` |

Cole o conteúdo inteiro no campo "Message body". Salvar já vale para o próximo envio —
não tem deploy no meio.

> O convite de membro do Jogaê (`/g/[slug]/membros`) **não usa** o template "Invite user":
> ele grava um `Invite` no banco sem token e a pessoa entra pelo login normal, então o
> e-mail que ela recebe é o **Magic Link**. O template de convite serve para convite
> disparado do painel do Supabase e para o dia em que o app usar `inviteUserByEmail`.

## Por que assim

- **Tabela e estilo inline.** Gmail e Outlook descartam `<style>` e não conhecem os tokens
  do `globals.css`. As cores são as mesmas do design system, escritas em hex na mão:
  `#090a0c` (canvas), `#111317` (surface), `#262a31` (linha), `#eceff3` / `#a7aeb9` /
  `#7a828e` (texto) e `#35e878` (verde de ação).
- **Texto de verdade.** Três linhas e um link solto é assinatura de spam. Cada template
  explica quem está mandando, o que o produto faz, quanto tempo o link vale e o que fazer
  se não foi você — que é o mesmo conteúdo que os filtros esperam de e-mail transacional
  legítimo.
- **Preheader escondido** na primeira linha: é o trecho que aparece na caixa de entrada ao
  lado do assunto. Sem ele, o cliente puxa o começo do HTML.
- **Link também em texto**, além do botão. Cliente que bloqueia HTML ainda entrega o
  acesso, e o endereço visível reduz a suspeita de link mascarado.
- **`{{ .ConfirmationURL }}` intocado.** O fluxo de login já funciona em produção; aqui só
  mudou a embalagem. Se um dia valer trocar para o formato `token_hash` — que casa direto
  com a rota `/auth/confirm` — o href seria
  `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=magiclink`, e isso **precisa ser
  testado de ponta a ponta** antes de ir pro ar (o `.RedirectTo` já vem com `?proximo=`,
  por isso o `&`).

## Variáveis disponíveis

`{{ .ConfirmationURL }}` · `{{ .Token }}` (código de 6 dígitos) · `{{ .TokenHash }}` ·
`{{ .SiteURL }}` · `{{ .RedirectTo }}` · `{{ .Email }}` · `{{ .Data }}`

## Antes de dar por bom

1. Mande um link de teste para uma conta **Gmail** e outra **Outlook/Hotmail** — são os
   dois que mais mandam para spam.
2. Confira se caiu na caixa de entrada; se cair no spam, marque "não é spam" (reputação de
   domínio novo melhora com uso).
3. Cheque o resultado em <https://www.mail-tester.com> — ele aponta SPF/DKIM/DMARC e o que
   o conteúdo está custando de pontuação.
4. Veja no celular: a largura máxima é 560px e o botão tem 44px de altura de toque.
