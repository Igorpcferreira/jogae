-- O link de convidado do grupo (`/e/<token>`) passa a ser credencial.
--
-- `FootballGroup.publicToken` existia desde o init e nunca foi usado por rota
-- nenhuma: era um `cuid()` reservado pra "links públicos" que nunca chegaram.
-- Agora ele abre a lista de nomes do elenco e deixa qualquer um do grupo entrar
-- como si mesmo — ou seja, virou credencial, e credencial tem que ser
-- imprevisível.
--
-- `cuid()` não serve pra isso: ele carrega contador e fingerprint da máquina,
-- então dois gerados em sequência são parentes e dá pra chutar o vizinho. É o
-- mesmo raciocínio de `Player.selfToken` (migration 20260819120000), e a mesma
-- resposta: UUID v4, 122 bits de aleatório, gerado pelo **banco**.
--
-- O backfill troca o token de todos os grupos existentes sem quebrar nada,
-- justamente porque nenhum link com o valor antigo foi publicado.

-- Novos grupos já nascem com token imprevisível.
ALTER TABLE "FootballGroup" ALTER COLUMN "publicToken" SET DEFAULT gen_random_uuid()::text;

-- Grupos que já existem trocam o cuid pelo UUID.
UPDATE "FootballGroup" SET "publicToken" = gen_random_uuid()::text;
