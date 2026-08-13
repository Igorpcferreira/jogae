# Deploy do Jogaê

O que precisa existir pra o produto sair do localhost, e o que decidir antes.
Este documento é o bloco **J** do HANDOFF.

---

## 1. A arquitetura escolhida

**App na VPS (Hostinger) + Supabase Cloud para identidade, banco e storage.**

```
  navegador ──► VPS Hostinger ──► Supabase (São Paulo)
                (Next.js,          ├── Auth  (Google, e-mail)
                 Docker,           ├── Postgres (Prisma é o dono do schema)
                 Caddy/TLS)        └── Storage (logo do grupo, avatar)
```

Por que **não** hospedar o Supabase na própria VPS: o self-hosted sobe cerca de dez
contêineres (Postgres, GoTrue, PostgREST, Realtime, Storage, Kong, Studio, imgproxy,
meta, analytics). Roda em 8 GB de RAM com folga, aperta em 4 GB — e aí backup, upgrade
e rotação de chave JWT passam a ser seu problema, num app cujo diferencial não é infra.
O plano gratuito do Supabase Cloud cobre um grupo de fut sem esforço.

Por que a VPS e não a Vercel: o plano Hobby da Vercel **proíbe uso comercial**, e você
quer lançar aberto. A VPS que você já tem resolve isso e o `Dockerfile` já está pronto.

**Região importa:** escolha a VPS em São Paulo e o projeto Supabase em `sa-east-1`
(São Paulo). App numa ponta do mundo e banco na outra dobra o tempo de cada consulta.

| | O que fica onde |
| --- | --- |
| VPS Hostinger | Next.js (Docker), TLS, domínio |
| Supabase | Auth, Postgres, Storage |
| Prisma | Continua dono do schema — as migrations rodam contra o Postgres do Supabase |

> Se um dia quiser sair do Supabase: só a autenticação está acoplada a ele
> (5 arquivos). O domínio, os serviços e os testes não sabem que ele existe.

---
## 2. Variáveis de ambiente

| Variável | Obrigatória | O quê |
| --- | --- | --- |
| `DATABASE_URL` | sim | Postgres do Supabase, URL do **pooler** (porta 6543) com `?pgbouncer=true`. |
| `DIRECT_URL` | sim | A mesma conexão na **porta 5432**. Só o `prisma migrate` usa: o pooler em modo transação não tem advisory lock e a migration trava nele. |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | sim | Chave pública. Vai pro browser — é o esperado. |
| `SUPABASE_SECRET_KEY` | recomendada | Só pra disparar o e-mail de convite. Sem ela o convite ainda funciona: fica registrado e é aplicado quando a pessoa entra por conta própria. |
| `NEXT_PUBLIC_APP_URL` | sim | `https://seudominio.com`, sem barra no fim. Monta o redirect de volta do Google, o link público e o `og:image`. |
| `DATABASE_URL_TESTE` | não | Só para `npm run test:integracao`, e **nunca** com `schema=public`. Não configure em produção. |

`NEXT_PUBLIC_*` é embutida no bundle **no momento do build** — mudar depois exige
rebuild, não só restart. É por isso que o `Dockerfile` recebe as três variáveis públicas
como `--build-arg`.

---

## 3. Configurar o Supabase

1. Criar o projeto na região **South America (São Paulo)**.
2. **Authentication → Providers → Google**: criar o OAuth Client no Google Cloud
   Console e colar Client ID e Secret. Atenção: no Google, o *Authorized redirect URI*
   é `https://<ref>.supabase.co/auth/v1/callback` — o do Supabase, não o do seu app.
3. **Authentication → URL Configuration**: `Site URL` = seu domínio e, em
   *Redirect URLs*, inclua `https://seudominio.com/auth/callback`.
   Sem isso o login volta pra lugar nenhum.
4. **Authentication → Emails → SMTP**: configure um SMTP próprio (Resend serve).
   O envio nativo do Supabase é limitado a poucos e-mails por hora e existe só pra
   desenvolvimento — quem depender dele em produção fica sem convite.
5. **Database → RLS**: ligue Row Level Security em todas as tabelas e **não crie
   policy nenhuma**. O app fala com o banco pelo Prisma, com a senha do Postgres, e
   passa por cima de RLS; assim, se a chave pública vazar, ela não lê nada.
6. Rodar as migrations: `npx prisma migrate deploy` com `DIRECT_URL` no ambiente.

---

## 4. Antes do primeiro deploy

1. **Domínio** apontando pro IP da VPS.
2. Supabase configurado conforme a seção 3.
3. Rodar a suíte local: `npm test && npm run test:integracao && npm run typecheck && npx eslint . && npm run build`.

---

## 5. VPS (Hostinger) com Docker

O `Dockerfile` na raiz tem dois alvos: `migrator` aplica as migrations com as dependências
completas do Prisma; o alvo padrão gera a imagem standalone de produção. Rodar migration
numa imagem separada mantém o servidor menor e não embarca o CLI de desenvolvimento.

```bash
# Imagem efêmera: só roda a migration e termina.
docker build --target migrator -t jogae-migrator .

# Imagem do app: recebe as variáveis públicas no build.
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=https://seudominio.com \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<chave-publica> \
  -t jogae .

# Migrations primeiro, sempre — usa DIRECT_URL.
docker run --rm --env-file .env.producao jogae-migrator

docker run -d --name jogae -p 3000:3000 --env-file .env.producao --restart unless-stopped jogae
```


Faltam, e são responsabilidade de quem opera a VPS:

- **TLS**: Caddy é o caminho mais curto (dois arquivos, certificado automático).
  Precisa repassar `X-Forwarded-Proto: https`.
- **Backup**: o Supabase faz backup diário no plano Pro; no gratuito, **não faz**.
  Enquanto estiver no gratuito, agende um `pg_dump` seu.
- **Atualização**: rebuild da imagem a cada deploy.

O `docker-compose.yml` do repositório é **só do banco de desenvolvimento** — não use
em produção como está (senha `jogae/jogae`, porta exposta).

---

## 6. O que já está pronto no código

- Autenticação é do Supabase: Google e link por e-mail. O cookie de sessão é dele,
  e o `proxy.ts` renova o token a cada navegação (Server Component não grava cookie).
- `getClaims()` verifica a assinatura do JWT — com chave assimétrica, localmente,
  sem ida ao servidor de auth. `getSession()` nunca é usado no servidor.
- O `User` do domínio é ligado ao Supabase por `authId`; o e-mail só serve de chave no
  primeiro login, dentro do callback, onde o provedor acabou de confirmá-lo.
- Convite não tem token: quem entra com o e-mail convidado recebe o vínculo.
- Grupo que não é seu responde 404 (não 403).
- Service worker não cacheia HTML de `/g/**` nem `POST` — dois organizadores no mesmo
  aparelho não veem dado um do outro.
- `metadataBase` lê `NEXT_PUBLIC_APP_URL`, então o card do WhatsApp aponta pro domínio certo.

## 7. Smoke test depois de subir

1. `/` deslogado mostra "Entrar".
2. `/entrar` → **Entrar com Google** completa o login e volta pro app.
3. `/entrar` → "Entrar com e-mail" → **o e-mail chega** (se falhar, é o SMTP da
   seção 3.4).
4. `/g/<slug>` carrega; `/g/<slug-de-outro>` responde 404.
5. `/r/<token>` abre sem login e **não** mostra nível técnico de ninguém.
6. `/r/<token>/imagem` devolve PNG.
7. Colar o link da rodada no WhatsApp: o preview tem que mostrar o card dos times.
8. Convidar um segundo e-mail em `/g/<slug>/membros`, entrar com ele e conferir que
   caiu direto no grupo, no papel certo.
9. Instalar o PWA no celular e registrar um gol com o avião ligado.

---

## 8. Riscos conhecidos

- **O login com Google nunca rodou contra um projeto Supabase real** — só contra o
  stack local. O que costuma falhar é configuração, não código: redirect URI no Google
  Cloud e Redirect URLs no Supabase (seção 3.2 e 3.3).
- **O envio de e-mail depende de SMTP configurado no Supabase.** Sem ele, o convite é
  registrado mas ninguém recebe nada.
- **Sem rate limit fora do login.** Uma sessão válida pode chamar action em loop.
  Antes de abrir pra mais gente, vale um limite por IP na borda.
- **Backup não é automático no plano gratuito** do Supabase.
