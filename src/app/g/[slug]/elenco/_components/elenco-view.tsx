"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  filtrarElenco,
  ROTULO_POSICAO,
  ROTULO_SKILL,
  type Posicao,
} from "@/domain/roster/roster";
import {
  alternarAtivoAction,
  atualizarJogadorAction,
  criarJogadorAction,
  excluirJogadorAction,
  regenerarLinkPessoalAction,
} from "@/features/players/actions";
import { Button } from "@/components/ui/button";
import { ChipRadioGroup, Field, Input, Textarea } from "@/components/ui/form";
import { Card, Chip, EmptyState, Panel, SectionLabel } from "@/components/ui/primitives";
import { Sheet } from "@/components/ui/dialog";
import { PlayerRow } from "@/components/football/player-row";
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconPlus,
  IconSearch,
  IconShare,
  IconSync,
  IconTrash,
  IconX,
} from "@/components/ui/icons";
import { buildLinkPessoalMessage } from "@/domain/share/whatsapp";
import { cn } from "@/lib/cn";

export interface JogadorDoElenco {
  id: string;
  displayName: string;
  nickname: string | null;
  skillLevel: number;
  preferredRole: string;
  isGoalkeeper: boolean;
  active: boolean;
  notes: string | null;
  aliases: string[];
  /** `/p/<token>` completo — a URL pública é montada no servidor. */
  linkPessoal: string;
}

const POSICOES: Posicao[] = [
  "GOALKEEPER",
  "DEFENDER",
  "MIDFIELDER",
  "FORWARD",
  "VERSATILE",
];

export function ElencoView({
  groupId,
  groupName,
  jogadores,
}: {
  groupId: string;
  groupName: string;
  jogadores: JogadorDoElenco[];
}) {
  const [busca, setBusca] = useState("");
  /** `"novo"` abre a ficha em branco; um id abre a ficha do jogador. */
  const [editando, setEditando] = useState<string | null>(null);

  const filtrados = useMemo(
    () =>
      filtrarElenco(
        jogadores.map((jogador) => ({ ...jogador, aliases: jogador.aliases })),
        busca,
      ),
    [jogadores, busca],
  );

  const ativos = filtrados.filter((jogador) => jogador.active);
  const inativos = filtrados.filter((jogador) => !jogador.active);
  const goleiros = ativos.filter((jogador) => jogador.isGoalkeeper).length;

  const emEdicao =
    editando && editando !== "novo"
      ? jogadores.find((jogador) => jogador.id === editando)
      : undefined;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 leading-none text-ink">Elenco</h1>
          <p className="mt-1.5 text-body-s text-ink-3">
            {jogadores.length} cadastrados · {goleiros} goleiros
          </p>
        </div>
        <Button size="md" onClick={() => setEditando("novo")}>
          <IconPlus size={17} />
          Adicionar
        </Button>
      </header>

      <div className="relative">
        <IconSearch
          size={17}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3"
        />
        <Input
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
          placeholder="Buscar por nome ou apelido"
          aria-label="Buscar jogador"
          className="pl-10"
        />
        {busca && (
          <button
            type="button"
            aria-label="Limpar busca"
            onClick={() => setBusca("")}
            className="absolute right-1 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-sm text-ink-3 hover:text-ink"
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      {filtrados.length === 0 ? (
        <EmptyState
          title={
            busca
              ? "Ninguém com esse nome por aqui."
              : "Elenco vazio. Adiciona o primeiro ou cola uma lista do WhatsApp."
          }
          action={
            !busca ? (
              <Button onClick={() => setEditando("novo")}>Adicionar jogador</Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <section>
            <SectionLabel
              action={<span className="text-caption tabular text-ink-3">{ativos.length}</span>}
            >
              Na ativa
            </SectionLabel>
            <Panel>
              <div className="divide-y divide-line/60">
                {ativos.map((jogador) => (
                  <LinhaDoElenco
                    key={jogador.id}
                    jogador={jogador}
                    onEditar={() => setEditando(jogador.id)}
                  />
                ))}
              </div>
            </Panel>
          </section>

          {inativos.length > 0 && (
            <section>
              <SectionLabel
                action={
                  <span className="text-caption tabular text-ink-3">{inativos.length}</span>
                }
              >
                Fora do grupo
              </SectionLabel>
              <Panel className="border-dashed">
                <div className="divide-y divide-line/60">
                  {inativos.map((jogador) => (
                    <LinhaDoElenco
                      key={jogador.id}
                      jogador={jogador}
                      onEditar={() => setEditando(jogador.id)}
                    />
                  ))}
                </div>
              </Panel>
            </section>
          )}
        </>
      )}

      <Card className="flex flex-col gap-1 py-3">
        <span className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
          Sobre o nível
        </span>
        <p className="text-body-s text-ink-2">
          A escala de 1 a 5 é privada: serve só pro sorteio equilibrar. Ela nunca
          aparece no link público da rodada.
        </p>
      </Card>

      {/* Montar/desmontar a ficha zera o estado sem `setState` em efeito. */}
      {editando && (
        <FichaDoJogador
          key={editando}
          groupId={groupId}
          groupName={groupName}
          jogador={emEdicao}
          onFechar={() => setEditando(null)}
        />
      )}
    </div>
  );
}

function LinhaDoElenco({
  jogador,
  onEditar,
}: {
  jogador: JogadorDoElenco;
  onEditar: () => void;
}) {
  const detalhes = [
    jogador.nickname,
    ROTULO_POSICAO[jogador.preferredRole as Posicao],
    jogador.aliases.length > 0
      ? `${jogador.aliases.length} ${jogador.aliases.length === 1 ? "apelido" : "apelidos"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PlayerRow
      name={jogador.displayName}
      isGoalkeeper={jogador.isGoalkeeper}
      meta={detalhes}
      waiting={!jogador.active}
      right={
        <div className="flex items-center gap-2">
          {!jogador.active && <Chip tone="outline">Inativo</Chip>}
          <NivelPontos nivel={jogador.skillLevel} />
          <button
            type="button"
            onClick={onEditar}
            aria-label={`Editar ${jogador.displayName}`}
            className="flex size-11 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-elevated hover:text-ink"
          >
            <IconEdit size={17} />
          </button>
        </div>
      }
    />
  );
}

/** Nível como pontinhos: número cru na lista viraria nota pública. */
function NivelPontos({ nivel }: { nivel: number }) {
  return (
    <span
      className="hidden items-center gap-0.5 sm:inline-flex"
      title={`Nível ${nivel} — ${ROTULO_SKILL[nivel] ?? ""}`}
    >
      <span className="sr-only">Nível {nivel} de 5</span>
      {[1, 2, 3, 4, 5].map((ponto) => (
        <span
          key={ponto}
          aria-hidden
          className={cn(
            "size-1.5 rounded-pill",
            ponto <= nivel ? "bg-ink-2" : "bg-line",
          )}
        />
      ))}
    </span>
  );
}

function FichaDoJogador({
  groupId,
  groupName,
  jogador,
  onFechar,
}: {
  groupId: string;
  groupName: string;
  jogador?: JogadorDoElenco;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, iniciarSalvamento] = useTransition();

  const [nome, setNome] = useState(jogador?.displayName ?? "");
  const [apelido, setApelido] = useState(jogador?.nickname ?? "");
  const [nivel, setNivel] = useState(jogador?.skillLevel ?? 3);
  const [posicao, setPosicao] = useState<Posicao>(
    (jogador?.preferredRole as Posicao) ?? "VERSATILE",
  );
  const [goleiro, setGoleiro] = useState(jogador?.isGoalkeeper ?? false);
  const [aliases, setAliases] = useState(jogador?.aliases.join(", ") ?? "");
  const [observacao, setObservacao] = useState(jogador?.notes ?? "");
  const [erro, setErro] = useState<{ mensagem: string; campo?: string } | null>(null);

  const ehGoleiro = goleiro || posicao === "GOALKEEPER";

  function salvar() {
    setErro(null);
    const entrada = {
      displayName: nome,
      nickname: apelido.trim() || null,
      skillLevel: nivel,
      preferredRole: posicao,
      isGoalkeeper: ehGoleiro,
      aliases: aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
      notes: observacao.trim() || null,
    };

    iniciarSalvamento(async () => {
      const resultado = jogador
        ? await atualizarJogadorAction(jogador.id, entrada)
        : await criarJogadorAction(groupId, entrada);

      if (resultado.status === "erro") {
        setErro({ mensagem: resultado.mensagem, campo: resultado.campo });
        return;
      }
      onFechar();
      router.refresh();
    });
  }

  function alternarAtivo() {
    if (!jogador) return;
    iniciarSalvamento(async () => {
      await alternarAtivoAction(jogador.id);
      onFechar();
      router.refresh();
    });
  }

  function excluir() {
    if (!jogador) return;
    setErro(null);
    iniciarSalvamento(async () => {
      const resultado = await excluirJogadorAction(jogador.id);
      if (resultado.status === "erro") {
        setErro({ mensagem: resultado.mensagem });
        return;
      }
      onFechar();
      router.refresh();
    });
  }

  return (
    <Sheet
      titulo={jogador ? "Editar jogador" : "Novo jogador"}
      onFechar={onFechar}
      rodape={
        <>
          <Button size="lg" block onClick={salvar} disabled={salvando || !nome.trim()}>
            {salvando ? "Salvando…" : "Salvar"}
          </Button>

          {jogador && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                block
                onClick={alternarAtivo}
                disabled={salvando}
              >
                {jogador.active ? "Inativar" : "Reativar"}
              </Button>
              <Button
                variant="ghost"
                size="md"
                onClick={excluir}
                disabled={salvando}
                className="text-red hover:bg-red/10 hover:text-red"
              >
                <IconTrash size={16} />
                Excluir
              </Button>
            </div>
          )}
        </>
      }
    >
          <Field
            label="Nome"
            htmlFor="nome"
            error={erro?.campo === "displayName" ? erro.mensagem : undefined}
          >
            <Input
              id="nome"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              data-foco-inicial
              maxLength={60}
              placeholder="Igor de Castro"
            />
          </Field>

          <Field label="Apelido" htmlFor="apelido" hint="É o que aparece no card do time.">
            <Input
              id="apelido"
              value={apelido}
              onChange={(evento) => setApelido(evento.target.value)}
              maxLength={30}
              placeholder="Igão"
            />
          </Field>

          <Field
            label="Outros nomes que ele usa na lista"
            htmlFor="aliases"
            hint="Separe por vírgula. O grupo aprende sozinho quando você confirma na importação."
            error={erro?.campo === "aliases" ? erro.mensagem : undefined}
          >
            <Input
              id="aliases"
              value={aliases}
              onChange={(evento) => setAliases(evento.target.value)}
              placeholder="Igao, Igor"
            />
          </Field>

          <ChipRadioGroup
            name="posicao"
            label="Posição"
            columns={2}
            value={posicao}
            onChange={setPosicao}
            options={POSICOES.map((valor) => ({
              value: valor,
              label: ROTULO_POSICAO[valor],
            }))}
          />

          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={ehGoleiro}
              disabled={posicao === "GOALKEEPER"}
              onChange={(evento) => setGoleiro(evento.target.checked)}
              className="size-5 accent-[var(--color-green)]"
            />
            <span className="text-body text-ink">
              Pega no gol
              {posicao === "GOALKEEPER" && (
                <span className="ml-2 text-body-s text-ink-3">(pela posição)</span>
              )}
            </span>
          </label>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
              Nível — {ROTULO_SKILL[nivel]}
            </legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((valor) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={valor === nivel}
                  onClick={() => setNivel(valor)}
                  className={cn(
                    "h-12 flex-1 rounded-sm border font-display text-[20px] leading-none transition-colors duration-[120ms]",
                    valor === nivel
                      ? "border-green/60 bg-green/12 text-green"
                      : "border-line bg-surface text-ink-3 hover:border-line-strong",
                  )}
                >
                  {valor}
                </button>
              ))}
            </div>
            <p className="text-body-s text-ink-3">
              Só o sorteio enxerga. Nunca vai pro link público.
            </p>
          </fieldset>

          <Field label="Observação" htmlFor="observacao" hint="Opcional, só pra você lembrar.">
            <Textarea
              id="observacao"
              rows={2}
              maxLength={280}
              value={observacao}
              onChange={(evento) => setObservacao(evento.target.value)}
              placeholder="Chega sempre atrasado, mas chega."
            />
          </Field>

          {jogador && (
            <LinkPessoal
              jogador={jogador}
              groupName={groupName}
              nome={apelido.trim() || nome.trim() || jogador.displayName}
            />
          )}

          {erro && !erro.campo && <p className="text-body-s text-red">{erro.mensagem}</p>}
    </Sheet>
  );
}

/**
 * O link pessoal do jogador (bloco I). Fica na ficha, e não na lista, porque a
 * distribuição é **um a um**: colar 22 links no grupo entrega a presença de
 * cada um pra todo mundo.
 */
function LinkPessoal({
  jogador,
  groupName,
  nome,
}: {
  jogador: JogadorDoElenco;
  groupName: string;
  nome: string;
}) {
  const [link, setLink] = useState(jogador.linkPessoal);
  const [copiado, setCopiado] = useState<"link" | "mensagem" | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [trocando, iniciarTroca] = useTransition();

  const mensagem = buildLinkPessoalMessage({
    nome,
    groupName,
    url: link,
  });

  async function copiar(texto: string, qual: "link" | "mensagem") {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(qual);
    } catch {
      setCopiado(null);
    }
  }

  function trocar() {
    iniciarTroca(async () => {
      const novo = await regenerarLinkPessoalAction(jogador.id);
      setLink(novo);
      setConfirmando(false);
      setCopiado(null);
    });
  }

  return (
    <section className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 p-3">
      <span className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
        Link pessoal
      </span>
      <p className="text-body-s text-ink-2">
        Com esse link {jogador.displayName} confirma presença sozinho, sem conta e
        sem instalar nada. Manda no privado — quem abre responde no lugar dele.
      </p>

      <code className="overflow-x-auto rounded-sm bg-canvas px-2.5 py-2 text-body-s text-ink-3">
        {link}
      </code>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          disabled={trocando}
          onClick={() => copiar(link, "link")}
        >
          {copiado === "link" ? <IconCheck size={15} /> : <IconCopy size={15} />}
          {copiado === "link" ? "Copiado" : "Copiar link"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          block
          disabled={trocando}
          onClick={() => copiar(mensagem, "mensagem")}
        >
          {copiado === "mensagem" ? <IconCheck size={15} /> : <IconShare size={15} />}
          {copiado === "mensagem" ? "Copiado" : "Copiar recado"}
        </Button>
      </div>

      {confirmando ? (
        <div className="flex flex-col gap-2">
          <p role="status" className="text-body-s text-red">
            O link que {jogador.displayName} tem hoje para de funcionar. Vai ter
            que mandar o novo no privado dele.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="danger"
              size="sm"
              block
              disabled={trocando}
              onClick={trocar}
            >
              {trocando ? "Gerando…" : "Confirmar troca"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              block
              disabled={trocando}
              onClick={() => setConfirmando(false)}
            >
              Deixa quieto
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmando(true)}
          className="self-start"
        >
          <IconSync size={15} />
          Gerar link novo
        </Button>
      )}
    </section>
  );
}
