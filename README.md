# Jogaê

> Organizar o fut, montar times equilibrados, acompanhar o jogo e transformar a resenha em
> histórico — sem tirar a galera do WhatsApp.

PWA mobile-first para qualquer grupo de futebol informal. `Jogaê` é codename.

- **Produto:** [docs/jogae_plano_produto_refatorado.md](docs/jogae_plano_produto_refatorado.md)
- **Design system e protótipos:** [docs/prototipo/](docs/prototipo/)
- **Estado atual e próximos passos:** [STATUS.md](STATUS.md) · [HANDOFF.md](HANDOFF.md)

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
PostgreSQL 17 · Prisma 7 · Zod · Vitest

## Rodando local

Pré-requisitos: Node 20+, Docker.

```bash
npm install
npm run db:up        # Postgres em localhost:5433
npm run auth:up      # Supabase local (identidade). Primeira vez baixa ~3 GB
npm run db:migrate   # aplica as migrations
npm run db:seed      # carrega o "Fut da Quinta" com 22 jogadores e histórico
npm run dev
```

Copie `.env.example` para `.env.local` com as chaves que o `auth:up` imprime — elas são
fixas do CLI, iguais em qualquer máquina.

Abre <http://localhost:3000> e entra com **salles@jogae.app** (o organizador do seed).
Não há senha: escolha "Entrar com e-mail" e pegue o link no Mailpit,
em <http://127.0.0.1:54324>. (O Google só funciona contra um projeto Supabase real.)

> O `.npmrc` do projeto força o registry público do npm — a config global desta máquina
> aponta para um repositório privado.

## Scripts

| Comando              | O que faz                                    |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento                  |
| `npm run build`      | Build de produção                            |
| `npm test`           | Suíte de testes do domínio (sem banco)       |
| `npm run test:integracao` | Testes da camada de dados contra o Postgres |
| `npm run test:tudo`  | As duas suítes                               |
| `npm run typecheck`  | `tsc --noEmit`                               |
| `npm run lint`       | ESLint                                       |
| `npm run icones`     | Regera os PNG do PWA a partir do símbolo     |
| `npm run db:up/down` | Sobe/derruba o Postgres do docker-compose    |
| `npm run auth:up/down` | Sobe/derruba o Supabase local (identidade) |
| `npm run db:migrate` | `prisma migrate dev`                         |
| `npm run db:seed`    | Popula o banco com o grupo de demonstração   |
| `npm run db:reset`   | Recria o banco do zero                       |
| `npm run db:deploy`  | `prisma migrate deploy` (produção)           |
| `npm run db:studio`  | Prisma Studio                                |

## Arquitetura

Monólito modular. Regra de negócio nunca vive em componente React.

```
src/
├── app/              rotas (App Router)
│   ├── entrar/       login (Google ou link por e-mail)
│   ├── auth/         volta do provedor: callback (OAuth) e confirm (e-mail)
│   ├── novo/         criação de grupo
│   ├── g/[slug]/     área do organizador (exige sessão + vínculo)
│   ├── r/[token]/    página pública da rodada
│   └── api/gols/     descarga da fila offline de gols
├── components/       UI kit e componentes de futebol
├── features/         queries e server actions por domínio
├── domain/           regra pura e testável
│   ├── access/       quem pode o quê dentro do grupo
│   ├── groups/       defaults por modalidade, slug, capacidade
│   ├── roster/       validação e conflito de nome no elenco
│   ├── schedule/     próxima data recorrente
│   ├── list-parser/  interpreta a lista do WhatsApp
│   ├── team-balancer/ sorteio e balanceamento (determinístico por seed)
│   ├── statistics/   agregações e ranking
│   ├── share/        mensagens pro WhatsApp
│   ├── text/         normalização e fuzzy match
│   └── random/       PRNG com seed
├── db/               Prisma client + client gerado
├── lib/              utilidades de UI e a fila offline de gols
├── test/             fixtures e client do banco de teste
└── proxy.ts          renova a sessão e faz a triagem (antigo middleware)
```

`src/domain/` não importa nada de React, Next ou Prisma — é o que a suíte de testes cobre.
`src/features/<área>/service.ts` concentra o I/O; a `actions.ts` só autoriza e revalida.

## Autenticação

**Supabase Auth**: Google (caminho principal) e link por e-mail. Sem senha.

Identidade e domínio são separados de propósito: o Supabase é dono de "quem é você",
e o `User` daqui é dono de "o que você é neste app" — nome, grupos, papéis. A ponte é
`User.authId`. Trocar de provedor de auth mexeria em cinco arquivos, não no domínio.

No servidor a sessão é lida com `getClaims()`, que **verifica a assinatura** do JWT;
`getSession()` nunca é usado, porque lê o cookie sem verificar. A checagem que vale é a
de `features/auth/queries.ts` (`requireGroupAccess`) — o `proxy.ts` renova o token e faz
a triagem, mas não sabe de papel dentro do grupo.

Em desenvolvimento, `npm run auth:up` sobe o Supabase local e os e-mails caem no Mailpit
(`http://127.0.0.1:54324`). Em produção, veja `docs/deploy.md`.
