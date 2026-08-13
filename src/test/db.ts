import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/db/generated/client";

/**
 * Banco dos testes de integração.
 *
 * Aponta pro schema `teste` do mesmo Postgres local (`DATABASE_URL_TESTE`).
 * Sem a variável, os testes de integração se declaram pulados em vez de
 * quebrar: quem só quer rodar o domínio não precisa de Docker.
 */

export const URL_DE_TESTE = process.env.DATABASE_URL_TESTE;
export const temBancoDeTeste = Boolean(URL_DE_TESTE);

/**
 * O schema vai por opção do adapter, não pelo `?schema=` da URL.
 *
 * O CLI do Prisma lê o parâmetro da URL, mas o driver adapter **ignora**: sem
 * este `schema`, o client cai no `public` e `limparBanco` apaga o banco de
 * desenvolvimento no meio da suíte. Já aconteceu.
 */
function schemaDaUrl(url: string): string {
  return new URL(url).searchParams.get("schema") ?? "public";
}

export function criarClientDeTeste(): PrismaClient {
  if (!URL_DE_TESTE) {
    throw new Error("DATABASE_URL_TESTE não configurada — veja .env.example");
  }
  const schema = schemaDaUrl(URL_DE_TESTE);
  if (schema === "public") {
    throw new Error(
      "DATABASE_URL_TESTE aponta pro schema `public` — os testes apagariam o " +
        "banco de desenvolvimento. Use ?schema=teste.",
    );
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: URL_DE_TESTE }, { schema }),
    log: ["error"],
  });
}

/**
 * Zera o banco entre testes. A ordem segue as dependências; `FootballGroup`
 * cascateia quase tudo, mas apagar explícito deixa a falha legível quando
 * algum onDelete mudar.
 */
export async function limparBanco(db: PrismaClient): Promise<void> {
  await db.matchEvent.deleteMany();
  await db.match.deleteMany();
  await db.teamPlayer.deleteMany();
  await db.team.deleteMany();
  await db.attendance.deleteMany();
  await db.playerAlias.deleteMany();
  await db.player.deleteMany();
  await db.round.deleteMany();
  await db.membership.deleteMany();
  await db.invite.deleteMany();
  await db.footballGroup.deleteMany();
  await db.user.deleteMany();
}

let contador = 0;
/** Slug único por cenário — os testes rodam no mesmo banco. */
export function slugDeTeste(prefixo = "grupo"): string {
  contador += 1;
  return `${prefixo}-${contador}`;
}
