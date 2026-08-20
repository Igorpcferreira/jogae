import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/db/generated/client";
import { motivoNaoNome } from "../src/domain/list-parser/parser";

/**
 * Apaga os "jogadores" que na verdade eram cabeçalho de lista.
 *
 * O parser antigo deixou linhas como "Toda Quinta 20:30 Às 22:00",
 * "Local Campo 03 - Farofa", "Localização: https://..." e "Lista Fecha Com 20"
 * virarem jogador de verdade — com presença na rodada e tudo. A tela de elenco
 * não resolve: "excluir" recusa quem tem presença, e era exatamente o caso.
 *
 * O critério é o MESMO do parser corrigido (`motivoNaoNome`). Atenção: o
 * critério é heurístico e AQUI não existe a exceção de "nome conhecido" do
 * parser (todo nome do banco é conhecido) — por isso o script é por grupo,
 * relata antes, imprime cada nome e se recusa a apagar em volume. **Leia o
 * relatório antes do --aplicar**: apelido tipo "Pix" seria apontado como
 * fantasma, e a decisão final é sua.
 *
 * Jogador com gol ou assistência **válidos** (lance desfeito não conta) nunca
 * é tocado.
 *
 * Uso (relata por padrão, só grava com --aplicar):
 *   npx tsx scripts/limpar-jogadores-fantasma.ts --grupo <slug>
 *   npx tsx scripts/limpar-jogadores-fantasma.ts --grupo <slug> --aplicar
 *
 * Contra produção, force a URL no ambiente (o dotenv não sobrescreve o shell):
 *   $env:DATABASE_URL = 'postgresql://...pooler.supabase.com:6543/postgres'
 *   npx tsx scripts/limpar-jogadores-fantasma.ts --grupo <slug>
 *   Remove-Item Env:\DATABASE_URL
 *
 * A primeira linha da saída diz contra qual banco ele fala. Confira antes do
 * --aplicar.
 */

const aplicar = process.argv.includes("--aplicar");
const indiceGrupo = process.argv.indexOf("--grupo");
const slugDoGrupo = indiceGrupo !== -1 ? process.argv[indiceGrupo + 1] : null;

/** Acima disso é sinal de critério errado, não de lista suja — pare e leia. */
const MAXIMO_POR_EXECUCAO = 12;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

if (!slugDoGrupo) {
  console.error("Informe o grupo: --grupo <slug> (ex.: --grupo fut-da-quinta).");
  console.error("O escopo é obrigatório de propósito: o critério é heurístico.");
  process.exit(1);
}

function descreverBanco(): string {
  try {
    const url = new URL(process.env.DATABASE_URL!);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return `${url.hostname}:${url.port}  <- ${local ? "DESENVOLVIMENTO (Docker local)" : "REMOTO"}`;
  } catch {
    return "(não consegui interpretar a DATABASE_URL)";
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  console.log(`Banco: ${descreverBanco()}`);
  console.log(`Grupo: ${slugDoGrupo}`);
  console.log(aplicar ? "Modo: --aplicar (vai gravar)\n" : "Modo: relatório (nada é gravado)\n");

  const grupo = await prisma.footballGroup.findUnique({
    where: { slug: slugDoGrupo! },
    select: { id: true, name: true },
  });
  if (!grupo) {
    console.error(`Grupo "${slugDoGrupo}" não existe neste banco.`);
    process.exitCode = 1;
    return;
  }

  const jogadores = await prisma.player.findMany({
    where: { groupId: grupo.id },
    select: {
      id: true,
      displayName: true,
      _count: {
        select: {
          attendances: true,
          teamPlayers: true,
          // Lance desfeito é soft-delete e não conta: senão "desfazer o gol
          // do fantasma" nunca destravaria a limpeza.
          goals: { where: { voidedAt: null } },
          assists: { where: { voidedAt: null } },
          votosDados: true,
          votosRecebidos: true,
        },
      },
    },
  });

  const fantasmas = jogadores
    .map((jogador) => ({ jogador, motivo: motivoNaoNome(jogador.displayName) }))
    .filter((item): item is typeof item & { motivo: string } => item.motivo !== null);

  if (fantasmas.length === 0) {
    console.log("Nenhum jogador-fantasma encontrado. Elenco limpo.");
    return;
  }

  if (aplicar && fantasmas.length > MAXIMO_POR_EXECUCAO) {
    console.error(
      `${fantasmas.length} candidatos passa do limite de ${MAXIMO_POR_EXECUCAO} por execução.`,
    );
    console.error("Isso cheira a critério errado, não a lista suja. Rode sem --aplicar e leia um a um.");
    process.exitCode = 1;
    return;
  }

  let apagados = 0;
  for (const { jogador, motivo } of fantasmas) {
    const contagem = jogador._count;
    const temLance = contagem.goals > 0 || contagem.assists > 0;
    console.log(`— "${jogador.displayName}" (id ${jogador.id}) → parece ${motivo}`);
    console.log(
      `    presenças: ${contagem.attendances} · em times: ${contagem.teamPlayers} · gols válidos: ${contagem.goals} · assistências válidas: ${contagem.assists} · votos dados: ${contagem.votosDados} · votos recebidos: ${contagem.votosRecebidos}`,
    );
    if (contagem.votosDados > 0 || contagem.votosRecebidos > 0) {
      console.log(
        "    ATENÇÃO: apagar também apaga esses votos de craque — pode mudar a apuração da rodada.",
      );
    }

    if (temLance) {
      console.log(
        "    TEM LANCE VÁLIDO REGISTRADO — não apago. Desfaça o lance na tela do ao vivo e rode de novo.",
      );
      continue;
    }

    if (!aplicar) {
      console.log("    seria apagado (rode com --aplicar).");
      continue;
    }

    await prisma.$transaction([
      prisma.mvpVote.deleteMany({
        where: { OR: [{ voterPlayerId: jogador.id }, { votedPlayerId: jogador.id }] },
      }),
      prisma.teamPlayer.deleteMany({ where: { playerId: jogador.id } }),
      prisma.attendance.deleteMany({ where: { playerId: jogador.id } }),
      prisma.playerAlias.deleteMany({ where: { playerId: jogador.id } }),
      prisma.player.delete({ where: { id: jogador.id } }),
    ]);
    apagados += 1;
    console.log("    apagado (com presenças, vagas em time e votos).");
  }

  console.log("");
  console.log(
    aplicar
      ? `Fim: ${apagados} de ${fantasmas.length} fantasma(s) apagado(s) no grupo "${grupo.name}".`
      : `Fim: ${fantasmas.length} fantasma(s) no grupo "${grupo.name}". Nada foi gravado — rode com --aplicar.`,
  );
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
