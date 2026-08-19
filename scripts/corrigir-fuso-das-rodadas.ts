import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/db/generated/client";
import { FUSO_PADRAO, instanteDoFuso, partesNoFuso } from "../src/domain/time/fuso";

/**
 * Conserta as rodadas gravadas com o bug do fuso.
 *
 * Até esta correção, `proximaDataRecorrente` montava a data com o relógio do
 * processo. Na Vercel isso é UTC, então "20:30" virava 20:30 **UTC** — e a
 * tela, que formata em Brasília, mostrava 17:30. Rodada criada na máquina do
 * dev (horário do Brasil) saiu certa; só as de produção estão deslocadas.
 *
 * A impressão digital do bug é exata: a hora de parede **em UTC** bate com o
 * `defaultStartTime` do grupo. Quem não tem essa marca não é tocado.
 *
 * Contra o banco local (o `.env` aponta pro Docker):
 *   npx tsx scripts/corrigir-fuso-das-rodadas.ts
 *   npx tsx scripts/corrigir-fuso-das-rodadas.ts --aplicar
 *
 * Contra produção, forçando a URL no ambiente (o `dotenv` não sobrescreve o
 * que já existe, então a variável do shell vence o `.env`) — PowerShell:
 *   $env:DATABASE_URL = 'postgresql://...pooler.supabase.com:6543/postgres'
 *   npx tsx scripts/corrigir-fuso-das-rodadas.ts
 *   Remove-Item Env:\DATABASE_URL
 *
 * A primeira linha da saída diz sempre contra qual banco ele está falando.
 * Confira antes de usar `--aplicar`.
 */

const aplicar = process.argv.includes("--aplicar");
const fuso = process.env.FUSO_DO_APP ?? FUSO_PADRAO;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

/**
 * Diz em voz alta com qual banco estamos falando, **antes** de conectar.
 *
 * Sem isto é fácil rodar contra o Postgres de desenvolvimento achando que é
 * produção: o `dotenv` carrega o `.env`, que aponta pro Docker local. Ver
 * "0 com a marca do bug" e concluir que está tudo certo seria o pior desfecho
 * possível deste script.
 */
function descreverBanco(): string {
  try {
    const url = new URL(process.env.DATABASE_URL!);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const etiqueta = local ? "DESENVOLVIMENTO (Docker local)" : "REMOTO";
    return `${url.hostname}:${url.port}  <- ${etiqueta}`;
  } catch {
    return "(não consegui interpretar a DATABASE_URL)";
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** "20:30" a partir do relógio UTC do instante. */
function horaEmUtc(data: Date): string {
  const hh = String(data.getUTCHours()).padStart(2, "0");
  const mm = String(data.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** Reancora: os mesmos números do relógio, agora no fuso do app. */
function reancorar(data: Date): Date {
  return instanteDoFuso(
    data.getUTCFullYear(),
    data.getUTCMonth(),
    data.getUTCDate(),
    data.getUTCHours(),
    data.getUTCMinutes(),
    fuso,
  );
}

/** Normaliza "7:05" e "07:05" para a mesma coisa antes de comparar. */
function normalizarHorario(valor: string): string {
  const [h = "", m = ""] = valor.split(":");
  return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
}

/** "20:30" a partir do relógio do fuso do app. */
function horaNoFuso(data: Date): string {
  const p = partesNoFuso(data, fuso);
  return `${String(p.hora).padStart(2, "0")}:${String(p.minuto).padStart(2, "0")}`;
}

async function main() {
  console.log(`banco : ${descreverBanco()}`);
  console.log(`fuso  : ${fuso}`);
  console.log(`modo  : ${aplicar ? "APLICAR — vai gravar" : "relatório — não grava nada"}\n`);

  const rodadas = await prisma.round.findMany({
    select: {
      id: true,
      date: true,
      startsAt: true,
      group: { select: { name: true, slug: true, defaultStartTime: true } },
    },
    orderBy: { date: "asc" },
  });

  const suspeitas = rodadas.filter((rodada) => {
    const configurado = rodada.group.defaultStartTime;
    if (!configurado) return false;
    const referencia = rodada.startsAt ?? rodada.date;
    return horaEmUtc(referencia) === normalizarHorario(configurado);
  });

  console.log(`${rodadas.length} rodada(s) no banco, ${suspeitas.length} com a marca do bug\n`);

  if (suspeitas.length === 0) {
    console.log("Nada a corrigir.");
    return;
  }

  for (const rodada of suspeitas) {
    const antes = rodada.startsAt ?? rodada.date;
    console.log(
      `  ${rodada.group.slug}  ${rodada.id}\n` +
        `    aparece hoje como ${horaNoFuso(antes)}` +
        `  ->  passa a aparecer ${horaNoFuso(reancorar(antes))}` +
        `   (configurado: ${rodada.group.defaultStartTime})`,
    );
  }

  if (!aplicar) {
    console.log("\nNada foi gravado. Rode de novo com --aplicar para corrigir.");
    return;
  }

  for (const rodada of suspeitas) {
    await prisma.round.update({
      where: { id: rodada.id },
      data: {
        date: reancorar(rodada.date),
        startsAt: rodada.startsAt ? reancorar(rodada.startsAt) : null,
      },
    });
  }

  console.log(`\n${suspeitas.length} rodada(s) corrigida(s).`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
