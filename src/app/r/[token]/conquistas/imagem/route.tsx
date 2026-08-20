import { ImageResponse } from "next/og";
import { CONQUISTAS } from "@/domain/badges/conquistas";
import { getRoundByToken } from "@/features/rounds/queries";
import { getConquistasDaRodadaPublica } from "@/features/rankings/queries";
import { formatLongDate } from "@/lib/dates";
import {
  ALTURA,
  CANVAS,
  CORES,
  INK,
  INK_2,
  INK_3,
  LARGURA,
  LINE,
  SURFACE,
  carregarAnton,
} from "@/components/og/base";

/**
 * Share card das conquistas da rodada (plano §27, "share cards para
 * WhatsApp/Instagram").
 *
 * Mora na rota pública da rodada porque é o mesmo dado que já é público ali:
 * quem foi craque, quem fez hat-trick, quem estreou. Não existe versão por
 * jogador com token pessoal — `Player.selfToken` é credencial e não pode virar
 * URL de imagem que alguém cola no grupo.
 *
 * Nível técnico não entra aqui, nem sob outro nome (plano §13).
 *
 * `ImageResponse` só entende flexbox (Satori): nada de grid, e toda div com
 * mais de um filho precisa de `display: flex`.
 */

const anton = await carregarAnton();

const TOM: Record<string, string> = {
  green: CORES[0],
  yellow: CORES[1],
  red: CORES[2],
  pink: CORES[3],
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const round = await getRoundByToken(token);
  if (!round) return new Response("Rodada não encontrada", { status: 404 });

  const conquistas = await getConquistasDaRodadaPublica(round.id);
  const display = anton ? "Anton" : "sans-serif";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: CANVAS,
          color: INK,
          fontFamily: "sans-serif",
          padding: 48,
        }}
      >
        <div style={{ display: "flex", height: 8, marginBottom: 32 }}>
          {CORES.map((cor) => (
            <div key={cor} style={{ flex: 1, backgroundColor: cor }} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 52, fontFamily: display, lineHeight: 1 }}>
              {round.group.name}
            </div>
            <div
              style={{
                fontSize: 22,
                color: INK_3,
                marginTop: 10,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {`Conquistas · ${formatLongDate(round.date)}`}
            </div>
          </div>
          <div style={{ fontSize: 26, fontFamily: display, color: INK_3 }}>Jogaê</div>
        </div>

        {conquistas.length === 0 ? (
          <div
            style={{
              display: "flex",
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              border: `1px dashed ${LINE}`,
              borderRadius: 12,
              fontSize: 30,
              color: INK_2,
            }}
          >
            As conquistas saem depois do apito final.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 14,
              // Rodada com uma ou duas conquistas ficaria com metade do card
              // vazia, e este card existe pra ser mandado no grupo.
              justifyContent: conquistas.length <= 3 ? "center" : "flex-start",
            }}
          >
            {/* Seis cabem sem apertar; acima disso o card vira lista e some a
                festa. O que sobra continua no app. */}
            {conquistas.slice(0, 6).map((conquista) => {
              const meta = CONQUISTAS[conquista.tipo];
              const cor = TOM[meta.tom] ?? INK;
              return (
                <div
                  key={`${conquista.tipo}-${conquista.playerId}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 20,
                    backgroundColor: SURFACE,
                    border: `1px solid ${LINE}`,
                    borderLeft: `6px solid ${cor}`,
                    borderRadius: 12,
                    padding: "16px 24px",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 34 }}>{meta.emoji}</div>
                  <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                    <div
                      style={{
                        fontSize: 18,
                        color: cor,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                      }}
                    >
                      {meta.rotulo}
                    </div>
                    <div style={{ fontSize: 34, fontFamily: display, marginTop: 4 }}>
                      {conquista.nickname ?? conquista.displayName}
                    </div>
                  </div>
                  <div style={{ display: "flex", fontSize: 24, color: INK_2 }}>
                    {meta.descricao(conquista.valor)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    ),
    {
      width: LARGURA,
      height: ALTURA,
      // Sem registrar a fonte, `fontFamily: "Anton"` cai em silêncio na padrão.
      fonts: anton
        ? [{ name: "Anton", data: anton, weight: 400 as const, style: "normal" as const }]
        : undefined,
    },
  );
}
