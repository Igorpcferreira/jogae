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
    /**
     * Cache de navegação no cliente. Desde o Next 15 o padrão de `dynamic` é
     * 0s: voltar pra uma tela já visitada refazia tudo no servidor. Com 30s,
     * ir e voltar entre as abas do grupo não custa ida ao banco.
     *
     * O preço é dado velho por até 30s — o que outro organizador mudar do
     * celular dele demora isso pra aparecer aqui. Mutação própria não sofre:
     * toda action chama `revalidatePath("/g", "layout")`, que limpa na hora.
     * Se o placar ao vivo começar a atrasar, é este número que baixa.
     */
    staleTimes: { dynamic: 30, static: 180 },
  },
};

export default nextConfig;
