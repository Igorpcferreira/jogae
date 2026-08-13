# Imagem de produção do Jogaê — caminho VPS (ver docs/deploy.md).
# Quem for de Vercel não precisa deste arquivo.

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# ── Dependências ────────────────────────────────────────────────
# O .npmrc do projeto força o registry público; sem ele o install quebra em
# máquina com registry privado configurado.
FROM base AS deps
COPY package.json package-lock.json .npmrc ./
COPY prisma ./prisma
COPY prisma.config.ts ./
# `npm ci` dispara o postinstall (prisma generate), que precisa do schema.
RUN npm ci

# ── Migrations ─────────────────────────────────────────────────
# A imagem de runtime não carrega o CLI nem as dependências de desenvolvimento.
FROM deps AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

# ── Build ───────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* é embutido no bundle do client: precisa existir no build.
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1
# O DAL valida a URL ao carregar; a imagem recebe a URL real só em runtime.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npm run build

# ── Runtime ─────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
