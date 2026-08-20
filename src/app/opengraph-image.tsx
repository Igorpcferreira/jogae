import { ImageResponse } from "next/og";
import {
  ALTURA,
  CANVAS,
  CORES,
  INK,
  INK_3,
  LARGURA,
  carregarAnton,
} from "@/components/og/base";

/**
 * O card padrão do app no WhatsApp: vale pra toda rota que não tem card
 * próprio — a landing, o `/entrar` e, principalmente, o link de convidado do
 * grupo (`/e/<token>`), que é colado na conversa e ganha prévia.
 *
 * De propósito ele não mostra dado nenhum: nome de grupo, elenco e presença
 * não entram em imagem que o WhatsApp cacheia. Só a marca.
 */

export const alt = "Jogaê — seu fut, sem enrolação";
export const size = { width: LARGURA, height: ALTURA };
export const contentType = "image/png";

export default async function Image() {
  const anton = await carregarAnton();
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
        }}
      >
        <div style={{ display: "flex", height: 10 }}>
          {CORES.map((cor) => (
            <div key={cor} style={{ flex: 1, backgroundColor: cor }} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontFamily: display,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            Jogaê
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 40, color: INK, fontFamily: display }}>
              Seu fut,
            </div>
            <div style={{ fontSize: 40, color: CORES[0], fontFamily: display }}>
              sem enrolação
            </div>
          </div>
          <div
            style={{
              fontSize: 24,
              color: INK_3,
              letterSpacing: 3,
              textTransform: "uppercase",
              marginTop: 10,
            }}
          >
            Times equilibrados · placar ao vivo · ranking do mês
          </div>
        </div>

        <div style={{ display: "flex", height: 10 }}>
          {CORES.map((cor) => (
            <div key={cor} style={{ flex: 1, backgroundColor: cor }} />
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: anton
        ? [{ name: "Anton", data: anton, weight: 400 as const, style: "normal" as const }]
        : undefined,
    },
  );
}
