import { ImageResponse } from "next/og";
import { getRoundByToken } from "@/features/rounds/queries";
import { teamTheme } from "@/lib/team-colors";
import { formatLongDate, formatTime } from "@/lib/dates";
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
 * Card dos times pra mandar no grupo (plano §52 — compartilhar card).
 *
 * Vive na rota pública da rodada porque é o mesmo dado que já é público: nome,
 * time e ordem. Nível técnico não entra aqui — nem sob outro nome.
 *
 * `ImageResponse` só entende flexbox, então nada de grid; e os valores vêm em
 * hex porque a imagem é renderizada fora do CSS do app — são exatamente os
 * mesmos tokens de `globals.css`.
 */

const anton = await carregarAnton();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const round = await getRoundByToken(token);

  if (!round) {
    return new Response("Rodada não encontrada", { status: 404 });
  }

  const times = round.teams.map((team) => ({
    name: team.name,
    hex: teamTheme(team.color).hex,
    players: team.players
      .slice()
      .sort((a, b) => Number(b.isGoalkeeper) - Number(a.isGoalkeeper))
      .map((tp) => ({
        name: tp.player.nickname ?? tp.player.displayName,
        isGoalkeeper: tp.isGoalkeeper,
      })),
  }));

  const horario = formatTime(round.startsAt ?? round.date);
  const display = anton ? "Anton" : "sans-serif";

  // Satori exige `display: flex` em qualquer div com mais de um filho. Texto
  // montado antes vira um filho só e dispensa a regra.
  const legenda = [formatLongDate(round.date), horario, round.venue]
    .filter(Boolean)
    .join(" · ");

  const confirmados = round.attendances.filter(
    (presenca) => presenca.status === "CONFIRMED",
  ).length;
  const escalados = times.reduce((total, time) => total + time.players.length, 0);
  const rodape =
    times.length > 0
      ? `${times.length} times · ${escalados} jogadores`
      : `${confirmados} confirmados`;

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
        {/* Faixa das quatro cores — assinatura visual do produto. */}
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
            marginBottom: 28,
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
              {legenda}
            </div>
          </div>
          <div style={{ fontSize: 26, fontFamily: display, color: INK_3 }}>Jogaê</div>
        </div>

        <div style={{ display: "flex", flex: 1, gap: 16 }}>
          {times.length === 0 && (
            <div
              style={{
                display: "flex",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                border: `1px dashed ${LINE}`,
                borderRadius: 12,
                fontSize: 28,
                color: INK_2,
              }}
            >
              {confirmados > 0
                ? `${confirmados} confirmados · times ainda não sorteados`
                : "Lista ainda aberta"}
            </div>
          )}
          {times.map((time) => (
            <div
              key={time.name}
              style={{
                display: "flex",
                flexDirection: "column",
                flex: 1,
                backgroundColor: SURFACE,
                border: `1px solid ${LINE}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  display: "flex",
                  backgroundColor: time.hex,
                  color: CANVAS,
                  padding: "12px 16px",
                  fontSize: 26,
                  fontFamily: display,
                }}
              >
                {time.name}
              </div>
              <div style={{ display: "flex", flexDirection: "column", padding: "8px 16px" }}>
                {time.players.map((jogador) => (
                  <div
                    key={jogador.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: 22,
                      color: jogador.isGoalkeeper ? "#ffd84a" : INK,
                      padding: "5px 0",
                    }}
                  >
                    <div
                      style={{
                        width: 3,
                        height: 18,
                        backgroundColor: time.hex,
                        marginRight: 10,
                      }}
                    />
                    {jogador.name}
                    {jogador.isGoalkeeper ? " (GK)" : ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 24,
            fontSize: 20,
            color: INK_2,
          }}
        >
          <div style={{ display: "flex" }}>{rodape}</div>
          <div style={{ display: "flex", letterSpacing: 2, textTransform: "uppercase" }}>
            Feito no Jogaê
          </div>
        </div>
      </div>
    ),
    {
      width: LARGURA,
      height: ALTURA,
      fonts: anton
        ? [{ name: "Anton", data: anton, weight: 400 as const, style: "normal" as const }]
        : undefined,
      headers: {
        // O card muda quando o sorteio muda; cache curto evita servir time velho.
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}
