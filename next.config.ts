import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sem isso o Turbopack sobe a raiz até achar um package-lock fora do repo.
  turbopack: { root: import.meta.dirname },
  /**
   * O Dockerfile precisa do build autocontido; a Vercel já cria o próprio
   * output serverless e o adaptador dela empacota as rotas depois do build.
   */
  output: process.env.VERCEL ? undefined : "standalone",
  experimental: {
    // O client do Prisma 7 não deve ser empacotado pelo bundler do servidor.
    serverComponentsHmrCache: true,
  },
};

export default nextConfig;
