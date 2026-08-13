<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Jogaê

Antes de escrever código neste repositório, leia **STATUS.md** (o que existe, o que falta,
notas de ambiente) e **HANDOFF.md** (convenções, armadilhas conhecidas, próximos passos).
O PRD é `docs/jogae_plano_produto_refatorado.md`; o design system é
`docs/prototipo/Design System Jogae.dc.html`, já traduzido em tokens em `src/app/globals.css`.

Regras curtas:

- Código, comentários e UI em português do Brasil.
- Regra de negócio vive em `src/domain/` (puro, sem React/Next/Prisma) e é coberta por teste.
- Mutação sempre por server action em `src/features/<área>/actions.ts`, validada com Zod.
- Use os tokens visuais existentes; não invente hex nem tamanho fora do `@theme`.
- Antes de concluir: `npm test && npm run typecheck && npx eslint . && npm run build`.
