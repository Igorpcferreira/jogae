/**
 * O apito de fim de jogo — sintetizado, sem arquivo de áudio.
 *
 * Três silvos (dois curtos e um longo), como o árbitro apita o fim. O som é
 * gerado com WebAudio: um oscilador quadrado com trinado de ~45Hz imita o
 * apito de bolinha, e não há asset pra baixar — no 4G da beira do campo isso
 * importa.
 *
 * Autoplay: o navegador só deixa tocar depois de um gesto na página. No fluxo
 * real sempre houve um — quem começa a partida toca em "iniciar" — mas se o
 * contexto estiver bloqueado o apito falha em silêncio e a vibração cobre.
 */

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    contexto ??= new AudioContext();
    if (contexto.state === "suspended") void contexto.resume();
    return contexto;
  } catch {
    return null;
  }
}

function silvo(ctx: AudioContext, inicio: number, duracao: number) {
  const osc = ctx.createOscillator();
  const trinado = ctx.createOscillator();
  const profundidade = ctx.createGain();
  const volume = ctx.createGain();

  osc.type = "square";
  osc.frequency.value = 2300;

  // O trinado é o que separa "apito" de "bip de micro-ondas".
  trinado.type = "sine";
  trinado.frequency.value = 45;
  profundidade.gain.value = 220;
  trinado.connect(profundidade);
  profundidade.connect(osc.frequency);

  volume.gain.setValueAtTime(0, inicio);
  volume.gain.linearRampToValueAtTime(0.18, inicio + 0.015);
  volume.gain.setValueAtTime(0.18, inicio + duracao - 0.04);
  volume.gain.linearRampToValueAtTime(0, inicio + duracao);

  osc.connect(volume);
  volume.connect(ctx.destination);

  osc.start(inicio);
  osc.stop(inicio + duracao + 0.02);
  trinado.start(inicio);
  trinado.stop(inicio + duracao + 0.02);
}

/**
 * Memória de quem já apitou, no módulo e não no componente: a tela do ao vivo
 * desmonta quando o organizador navega pra outra aba e volta, e re-apitar a
 * cada visita durante o "mais um minutinho" viraria buzina.
 */
const partidasApitadas = new Set<string>();

/** Apita o fim uma vez por partida; chamadas repetidas são silêncio. */
export function apitarFimUmaVez(matchId: string): void {
  if (partidasApitadas.has(matchId)) return;
  partidasApitadas.add(matchId);
  tocarApitoDeFim();
}

/** Desfazer o gol do limite desarma: se o fim voltar, apita de novo. */
export function desarmarApito(matchId: string): void {
  partidasApitadas.delete(matchId);
}

/** Fim de jogo: "pi… pi… piiiii". Falha em silêncio se o áudio estiver bloqueado. */
export function tocarApitoDeFim(): void {
  const ctx = obterContexto();
  if (ctx) {
    try {
      const agora = ctx.currentTime + 0.03;
      silvo(ctx, agora, 0.22);
      silvo(ctx, agora + 0.32, 0.22);
      silvo(ctx, agora + 0.64, 0.9);
    } catch {
      // Sem áudio não é erro: a vibração e o banner na tela cobrem.
    }
  }

  try {
    navigator.vibrate?.([220, 110, 220, 110, 650]);
  } catch {
    // Vibração é só reforço.
  }
}
