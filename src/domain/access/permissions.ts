// Quem pode o quê dentro de um grupo (plano §6 e §55).
// Puro de propósito: a regra é testável sem banco, sem sessão e sem React.

export type Role = "OWNER" | "ADMIN" | "ASSISTANT";

/**
 * Permissões nomeadas pelo que o organizador faz, não pela tabela que mudam.
 * Nome novo aqui obriga a decidir explicitamente o que cada papel faz com ele.
 */
export type Permission =
  /** Editar nome, formato, recorrência e local do grupo. */
  | "grupo:editar"
  /** Excluir o grupo inteiro. */
  | "grupo:excluir"
  /** Convidar, promover e remover membros. */
  | "membros:gerenciar"
  /** Adicionar, editar, inativar jogador e mexer no nível técnico. */
  | "elenco:editar"
  /** Criar rodada. */
  | "rodada:criar"
  /** Importar lista, promover da espera, marcar goleiro. */
  | "rodada:presenca"
  /** Sortear, trocar jogador de time, travar. */
  | "rodada:sortear"
  /** Iniciar partida, registrar gol, desfazer, encerrar partida. */
  | "partida:gerenciar"
  /** Encerrar a rodada e fechar as estatísticas. */
  | "rodada:encerrar";

/**
 * O assistente é o amigo que fica com o celular na beira do campo: ele apita o
 * jogo, mas não mexe em config nem refaz o sorteio.
 */
const ASSISTANT: readonly Permission[] = ["partida:gerenciar", "rodada:encerrar"];

const ADMIN: readonly Permission[] = [
  ...ASSISTANT,
  "grupo:editar",
  "elenco:editar",
  "rodada:criar",
  "rodada:presenca",
  "rodada:sortear",
];

const OWNER: readonly Permission[] = [...ADMIN, "grupo:excluir", "membros:gerenciar"];

const BY_ROLE: Record<Role, readonly Permission[]> = {
  OWNER,
  ADMIN,
  ASSISTANT,
};

/** Papel `null` = visitante sem vínculo com o grupo: não pode nada. */
export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return BY_ROLE[role].includes(permission);
}

/** Todas as permissões do papel — útil para montar a UI de uma vez só. */
export function permissionsOf(role: Role | null | undefined): readonly Permission[] {
  if (!role) return [];
  return BY_ROLE[role];
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Dono",
  ADMIN: "Organizador",
  ASSISTANT: "Assistente",
};
