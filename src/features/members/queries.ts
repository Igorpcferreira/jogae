import "server-only";

import { cache } from "react";
import { prisma } from "@/db/client";
import { listarConvites, listarMembros } from "./service";

export const getMembrosDoGrupo = cache(async (groupId: string) =>
  listarMembros(prisma, groupId),
);

export const getConvitesAbertos = cache(async (groupId: string) =>
  listarConvites(prisma, groupId),
);
