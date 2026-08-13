"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, type Role } from "@/domain/access/permissions";
import { PAPEIS_ATRIBUIVEIS, ROLE_DESCRICOES } from "@/domain/access/membros";
import type { ConviteAberto, MembroDoGrupo } from "@/features/members/service";
import {
  convidarMembroAction,
  removerMembroAction,
  revogarConviteAction,
  trocarPapelAction,
} from "@/features/members/actions";
import { Button } from "@/components/ui/button";
import { ChipRadioGroup, Field, Input } from "@/components/ui/form";
import { Sheet } from "@/components/ui/dialog";
import { Avatar, Card, Chip, EmptyState, Panel, SectionLabel } from "@/components/ui/primitives";
import { IconPlus, IconTrash, IconX } from "@/components/ui/icons";

const TOM_DO_PAPEL: Record<Role, "green" | "yellow" | "neutral"> = {
  OWNER: "green",
  ADMIN: "yellow",
  ASSISTANT: "neutral",
};

export function MembrosView({
  groupId,
  grupo,
  membros,
  convites,
  euId,
}: {
  groupId: string;
  grupo: string;
  membros: MembroDoGrupo[];
  convites: ConviteAberto[];
  euId: string;
}) {
  const [convidando, setConvidando] = useState(false);
  const [emFoco, setEmFoco] = useState<string | null>(null);

  const membro = membros.find((candidato) => candidato.userId === emFoco);
  const donos = membros.filter((candidato) => candidato.role === "OWNER").length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-h1 leading-none text-ink">Membros</h1>
          <p className="mt-1.5 text-body-s text-ink-3">
            Quem ajuda a tocar o {grupo}
          </p>
        </div>
        <Button size="md" onClick={() => setConvidando(true)}>
          <IconPlus size={17} />
          Convidar
        </Button>
      </header>

      <section>
        <SectionLabel
          action={<span className="text-caption tabular text-ink-3">{membros.length}</span>}
        >
          No grupo
        </SectionLabel>
        <Panel>
          <div className="divide-y divide-line/60">
            {membros.map((atual) => (
              <button
                key={atual.userId}
                type="button"
                onClick={() => setEmFoco(atual.userId)}
                className="flex w-full min-h-14 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated/50"
              >
                <Avatar name={atual.name} size="md" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body text-ink">
                    {atual.name}
                    {atual.userId === euId && (
                      <span className="ml-2 text-caption text-ink-3">você</span>
                    )}
                  </span>
                  <span className="block truncate text-caption text-ink-3">{atual.email}</span>
                </span>
                <Chip tone={TOM_DO_PAPEL[atual.role]}>{ROLE_LABELS[atual.role]}</Chip>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      {convites.length > 0 && (
        <section>
          <SectionLabel>Convites abertos</SectionLabel>
          <Panel className="border-dashed">
            <div className="divide-y divide-line/60">
              {convites.map((convite) => (
                <LinhaDeConvite key={convite.id} groupId={groupId} convite={convite} />
              ))}
            </div>
          </Panel>
        </section>
      )}

      {membros.length === 1 && convites.length === 0 && (
        <EmptyState
          title="Você está sozinho aqui. Chame alguém pra apitar o jogo quando você não puder."
          action={<Button onClick={() => setConvidando(true)}>Convidar alguém</Button>}
        />
      )}

      <Card className="flex flex-col gap-3 py-4">
        <span className="text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
          O que cada papel faz
        </span>
        <dl className="flex flex-col gap-2.5">
          {PAPEIS_ATRIBUIVEIS.map((papel) => (
            <div key={papel} className="flex items-start gap-3">
              <dt className="w-[92px] shrink-0">
                <Chip tone={TOM_DO_PAPEL[papel]}>{ROLE_LABELS[papel]}</Chip>
              </dt>
              <dd className="text-body-s text-ink-2">{ROLE_DESCRICOES[papel]}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {convidando && (
        <FichaDeConvite groupId={groupId} onFechar={() => setConvidando(false)} />
      )}

      {membro && (
        <FichaDoMembro
          key={membro.userId}
          groupId={groupId}
          membro={membro}
          ehVoce={membro.userId === euId}
          ultimoDono={membro.role === "OWNER" && donos <= 1}
          onFechar={() => setEmFoco(null)}
        />
      )}
    </div>
  );
}

function LinhaDeConvite({
  groupId,
  convite,
}: {
  groupId: string;
  convite: ConviteAberto;
}) {
  const router = useRouter();
  const [revogando, iniciarRevogacao] = useTransition();

  const dias = convite.expiraEmDias;

  return (
    <div className="flex min-h-14 items-center gap-3 px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body text-ink">{convite.email}</span>
        <span className="block text-caption text-ink-3">
          {ROLE_LABELS[convite.role]} · vence em {dias} {dias === 1 ? "dia" : "dias"}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Cancelar convite de ${convite.email}`}
        disabled={revogando}
        onClick={() =>
          iniciarRevogacao(async () => {
            await revogarConviteAction(groupId, convite.id);
            router.refresh();
          })
        }
        className="flex size-11 items-center justify-center rounded-sm text-ink-3 transition-colors hover:bg-elevated hover:text-red disabled:opacity-[0.38]"
      >
        <IconX size={17} />
      </button>
    </div>
  );
}

function FichaDeConvite({
  groupId,
  onFechar,
}: {
  groupId: string;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [enviando, iniciarEnvio] = useTransition();
  const [email, setEmail] = useState("");
  const [papel, setPapel] = useState<Role>("ADMIN");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  function enviar() {
    setErro(null);
    iniciarEnvio(async () => {
      const resultado = await convidarMembroAction({ groupId, email, role: papel });
      if (!resultado.ok) {
        setErro(resultado.motivo);
        return;
      }
      router.refresh();
      if (resultado.aviso) {
        setAviso(resultado.aviso);
        return;
      }
      onFechar();
    });
  }

  return (
    <Sheet
      titulo="Convidar pro grupo"
      onFechar={onFechar}
      rodape={
        aviso ? (
          <Button size="lg" block variant="secondary" onClick={onFechar}>
            Entendi
          </Button>
        ) : (
          <Button size="lg" block onClick={enviar} disabled={enviando || !email.trim()}>
            {enviando ? "Enviando…" : "Enviar convite"}
          </Button>
        )
      }
    >
      {aviso ? (
        <div className="flex flex-col gap-3">
          <p className="text-body text-ink">Convite registrado.</p>
          <p className="text-body-s text-yellow">{aviso}</p>
        </div>
      ) : (
        <>
          <Field
            label="E-mail"
            htmlFor="email-convite"
            hint="Assim que essa pessoa entrar com esse e-mail, ela já cai no grupo."
            error={erro ?? undefined}
          >
            <Input
              id="email-convite"
              type="email"
              inputMode="email"
              autoComplete="email"
              data-foco-inicial
              value={email}
              onChange={(evento) => setEmail(evento.target.value)}
              placeholder="amigo@email.com"
            />
          </Field>

          <ChipRadioGroup
            name="papel"
            label="Papel"
            columns={1}
            value={papel}
            onChange={setPapel}
            options={PAPEIS_ATRIBUIVEIS.map((valor) => ({
              value: valor,
              label: ROLE_LABELS[valor],
              hint: ROLE_DESCRICOES[valor],
            }))}
          />
        </>
      )}
    </Sheet>
  );
}

function FichaDoMembro({
  groupId,
  membro,
  ehVoce,
  ultimoDono,
  onFechar,
}: {
  groupId: string;
  membro: MembroDoGrupo;
  ehVoce: boolean;
  ultimoDono: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [salvando, iniciarSalvamento] = useTransition();
  const [papel, setPapel] = useState<Role>(membro.role);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);

  function salvar() {
    setErro(null);
    iniciarSalvamento(async () => {
      const resultado = await trocarPapelAction(groupId, membro.userId, papel);
      if (!resultado.ok) {
        setErro(resultado.motivo);
        return;
      }
      onFechar();
      router.refresh();
    });
  }

  function remover() {
    setErro(null);
    iniciarSalvamento(async () => {
      const resultado = await removerMembroAction(groupId, membro.userId);
      if (!resultado.ok) {
        setErro(resultado.motivo);
        return;
      }
      onFechar();
      router.refresh();
    });
  }

  return (
    <Sheet
      titulo={membro.name}
      onFechar={onFechar}
      rodape={
        <>
          <Button
            size="lg"
            block
            onClick={salvar}
            disabled={salvando || papel === membro.role}
          >
            {salvando ? "Salvando…" : "Salvar papel"}
          </Button>

          {confirmandoRemocao ? (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                block
                onClick={() => setConfirmandoRemocao(false)}
                disabled={salvando}
              >
                Deixa pra lá
              </Button>
              <Button variant="danger" size="md" block onClick={remover} disabled={salvando}>
                Tirar do grupo
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="md"
              block
              disabled={salvando || ultimoDono}
              onClick={() => setConfirmandoRemocao(true)}
              className="text-red hover:bg-red/10 hover:text-red"
            >
              <IconTrash size={16} />
              {ehVoce ? "Sair do grupo" : "Tirar do grupo"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex items-center gap-3">
        <Avatar name={membro.name} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-body text-ink">{membro.email}</div>
          <div className="text-caption text-ink-3">
            No grupo desde {new Date(membro.desde).toLocaleDateString("pt-BR")}
          </div>
        </div>
      </div>

      <ChipRadioGroup
        name="papel-do-membro"
        label="Papel"
        columns={1}
        value={papel}
        onChange={setPapel}
        options={PAPEIS_ATRIBUIVEIS.map((valor) => ({
          value: valor,
          label: ROLE_LABELS[valor],
          hint: ROLE_DESCRICOES[valor],
        }))}
      />

      {ultimoDono && (
        <p className="text-body-s text-ink-3">
          É o único dono do grupo. Promova outra pessoa a dono antes de mudar isso.
        </p>
      )}

      {erro && <p className="text-body-s text-red">{erro}</p>}
    </Sheet>
  );
}
