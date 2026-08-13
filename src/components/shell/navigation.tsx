"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/cn";
import { ROLE_LABELS, type Role } from "@/domain/access/permissions";
import { sairAction } from "@/features/auth/actions";
import {
  IconBall,
  IconCalendar,
  IconHome,
  IconLogout,
  IconMore,
  IconRanking,
  JogaeMark,
} from "@/components/ui/icons";

interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;
  /** Ao vivo é o único item com cor própria. */
  live?: boolean;
}

function items(slug: string): NavItem[] {
  return [
    { href: `/g/${slug}`, label: "Início", icon: IconHome },
    { href: `/g/${slug}/rodada`, label: "Rodada", icon: IconCalendar },
    { href: `/g/${slug}/ao-vivo`, label: "Ao vivo", icon: IconBall, live: true },
    { href: `/g/${slug}/ranking`, label: "Ranking", icon: IconRanking },
    { href: `/g/${slug}/mais`, label: "Mais", icon: IconMore },
  ];
}

function useActive(href: string, slug: string) {
  const pathname = usePathname();
  const root = `/g/${slug}`;
  if (href === root) return pathname === root;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Bottom navigation — alvo mínimo de 44px, safe area do iPhone respeitada. */
export function BottomNav({ slug, hasLive }: { slug: string; hasLive?: boolean }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-md lg:hidden pb-safe"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items(slug).map((item) => (
          <li key={item.href} className="flex-1">
            <NavTab item={item} slug={slug} hasLive={hasLive} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavTab({
  item,
  slug,
  hasLive,
}: {
  item: NavItem;
  slug: string;
  hasLive?: boolean;
}) {
  const active = useActive(item.href, slug);
  const Icon = item.icon;
  const showLive = item.live && hasLive;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2",
        "transition-colors duration-[120ms]",
        active ? "text-ink" : "text-ink-3",
        showLive && !active && "text-red",
      )}
    >
      {active && (
        <span
          className={cn(
            "absolute inset-x-3 top-0 h-0.5 rounded-pill",
            showLive ? "bg-red" : "bg-green",
          )}
          aria-hidden
        />
      )}
      <span className="relative">
        <Icon size={22} />
        {showLive && (
          <span
            className="absolute -right-1 -top-0.5 size-2 rounded-pill bg-red animate-live-pulse"
            aria-hidden
          />
        )}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.08em]">{item.label}</span>
    </Link>
  );
}

/** Sidebar compacta do desktop. */
export function Sidebar({
  slug,
  groupName,
  hasLive,
  usuario,
  role,
}: {
  slug: string;
  groupName: string;
  hasLive?: boolean;
  usuario?: { nome: string; email: string } | null;
  role?: Role;
}) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-line bg-surface-2 lg:flex lg:flex-col">
      <div className="flex items-center gap-2.5 border-b border-line px-5 py-5">
        <JogaeMark size={30} />
        <div className="min-w-0">
          <div className="font-display text-[19px] leading-none text-ink">Jogaê</div>
          <div className="truncate text-caption text-ink-3">{groupName}</div>
        </div>
      </div>

      <nav aria-label="Navegação principal" className="flex flex-col gap-1 p-3">
        {items(slug).map((item) => (
          <SidebarLink key={item.href} item={item} slug={slug} hasLive={hasLive} />
        ))}
      </nav>

      <div className="mt-auto p-3">
        {usuario ? (
          <div className="rounded-md border border-line bg-surface p-3">
            <div className="truncate text-body-s font-medium text-ink">{usuario.nome}</div>
            <div className="truncate text-caption text-ink-3">{usuario.email}</div>
            {role && (
              <div className="mt-2 text-caption font-bold uppercase tracking-[0.1em] text-ink-3">
                {ROLE_LABELS[role]}
              </div>
            )}
            <form action={sairAction} className="mt-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 text-caption font-bold uppercase tracking-[0.1em] text-ink-3 transition-colors hover:text-red"
              >
                <IconLogout size={15} />
                Sair
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-md border border-line bg-surface p-3">
            <div className="text-caption uppercase tracking-[0.1em] text-ink-3">Codename</div>
            <div className="mt-1 text-body-s text-ink-2">Seu fut, sem enrolação.</div>
          </div>
        )}
      </div>
    </aside>
  );
}

function SidebarLink({
  item,
  slug,
  hasLive,
}: {
  item: NavItem;
  slug: string;
  hasLive?: boolean;
}) {
  const active = useActive(item.href, slug);
  const Icon = item.icon;
  const showLive = item.live && hasLive;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-body transition-colors duration-[120ms]",
        active
          ? "bg-elevated text-ink"
          : "text-ink-2 hover:bg-elevated/60 hover:text-ink",
      )}
    >
      <Icon size={19} className={cn(showLive && !active && "text-red")} />
      <span className="font-medium">{item.label}</span>
      {showLive && (
        <span className="ml-auto size-2 rounded-pill bg-red animate-live-pulse" aria-hidden />
      )}
    </Link>
  );
}
