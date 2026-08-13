import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem isso o Turbopack sobe a raiz até achar um package-lock fora do repo.
  turbopack: { root: import.meta.dirname },
  /**
   * Build autocontido em `.next/standalone` — é o que o Dockerfile copia pra
   * rodar em VPS. Plataforma serverless ignora esta opção, então ela não
   * atrapalha quem for de Vercel (ver `docs/deploy.md`).
   */
  output: "standalone",
  experimental: {
    // O client do Prisma 7 não deve ser empacotado pelo bundler do servidor.
    serverComponentsHmrCache: true,
  },
};

export default nextConfig;
