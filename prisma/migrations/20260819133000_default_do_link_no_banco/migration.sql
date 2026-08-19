-- Fecha a janela entre migrar e deployar.
--
-- `Player.selfToken` nasceu `NOT NULL` sem default no banco: o
-- `@default(uuid(4))` do Prisma é gerado no client, não pelo Postgres. Só que
-- o código que já está no ar não conhece a coluna — ele mandaria um INSERT sem
-- `selfToken` e tomaria violação de NOT NULL. E importar lista **cria jogador**,
-- então a janela entre `migrate deploy` e o deploy do código não é teórica.
--
-- Com default no banco, o código velho continua funcionando e o novo não muda:
-- quando o Prisma manda o valor, é o dele que vale.
--
-- `gen_random_uuid()` é core do Postgres 13+ (sem extensão) e gera UUID v4 —
-- o mesmo formato do backfill da migration anterior.

-- AlterTable
ALTER TABLE "Player" ALTER COLUMN "selfToken" SET DEFAULT gen_random_uuid()::text;
