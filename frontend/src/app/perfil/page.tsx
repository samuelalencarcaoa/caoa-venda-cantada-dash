import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  BadgeInfo,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { findAdExportManager, readRecordString } from "@/lib/azure-ad-profile";
import { authOptions } from "@/lib/nextAuth";
import {
  themedCardClass,
  themedChipClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedTextBodyClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

function getInitials(name?: string | null) {
  if (!name) return "U";

  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0]?.toUpperCase() ?? "" : "";
  return `${first}${last}` || "U";
}

function getAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }

  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 68%, 44%)`;
}

function formatDateTime(value?: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function joinParts(values: Array<string | null | undefined>) {
  return values
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim())
    .join(" • ");
}

type ProfileField = {
  icon: LucideIcon;
  label: string;
  value: string;
};

export const metadata = {
  title: "Meu perfil",
};

export default async function PerfilPage() {
  const session = await getServerSession(authOptions);
  const user = session?.user;

  if (!user) {
    return null;
  }

  const directory = user.directory;
  const claims = directory?.claims ?? {};
  const graph = directory?.graph ?? null;
  const adExportManager = findAdExportManager({
    claims: {
      ...claims,
      email: readRecordString(claims, "email") || user.email,
      name: readRecordString(claims, "name") || user.name,
    },
    graph: {
      ...graph,
      displayName: graph?.displayName || user.name || undefined,
      mail: graph?.mail || user.email || undefined,
    },
  });

  const claimsDisplayName =
    readRecordString(claims, "name") ||
    graph?.displayName ||
    (graph?.givenName && graph?.surname ? `${graph.givenName} ${graph.surname}` : undefined);
  const claimsEmail =
    readRecordString(claims, "email") ||
    readRecordString(claims, "preferred_username") ||
    graph?.mail ||
    graph?.userPrincipalName;

  const displayName = user.name || claimsDisplayName || "Usuário";
  const email = user.email || claimsEmail || "Email não informado";
  const initials = getInitials(displayName);
  const avatarColor = getAvatarColor(displayName);
  const location = joinParts([graph?.city, graph?.state, graph?.country]);
  const synchronizedAt = formatDateTime(directory?.fetchedAt);

  const profileFields: ProfileField[] = [
    { label: "Cargo", value: graph?.jobTitle || "Não informado", icon: BriefcaseBusiness },
    { label: "Empresa", value: graph?.companyName || "Não informado", icon: Building2 },
    { label: "Departamento", value: graph?.department || "Não informado", icon: BadgeInfo },
    {
      label: "Gestor direto",
      value: adExportManager?.displayName || "Não informado",
      icon: Users,
    },
    {
      label: "Localização",
      value: location || "Não informado",
      icon: MapPin,
    },
  ].filter((field) => field.value !== "Não informado");

  return (
    <main
      className={cn(
        themedPageBackgroundClass,
        themedPageTextClass,
        "min-h-[100dvh] px-4 py-4 sm:px-6 sm:py-6",
      )}
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="outline" className={themedOutlineButtonClass}>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <span className={cn(themedChipClass, "shrink-0")}>Meu perfil</span>
        </div>

        <section className={cn(themedCardClass, "overflow-hidden")}>
          <div className="h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400" />

          <div className="flex flex-col gap-6 p-5 sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={displayName}
                    className="h-20 w-20 rounded-full object-cover ring-4 ring-slate-200/70 dark:ring-white/10"
                    width={80}
                    height={80}
                    unoptimized
                  />
                ) : (
                  <div
                    className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold text-white ring-4 ring-slate-200/70 dark:ring-white/10"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <p className={themedTinyLabelClass}>Conta autenticada</p>
                  <h1
                    className={cn(
                      "mt-2 truncate text-3xl font-semibold tracking-[-0.03em]",
                      themedTextTitleClass,
                    )}
                  >
                    {displayName}
                  </h1>
                  <p className={cn("mt-1 truncate text-sm", themedTextBodyClass)}>{email}</p>
                </div>
              </div>

              <span
                className={cn(
                  themedChipClass,
                  directory
                    ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200"
                    : "border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400",
                )}
              >
                {directory ? "Microsoft Entra" : "Conta local"}
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className={themedTinyLabelClass}>Resumo</p>
                  <h2 className={cn("mt-1 text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                    Informações relevantes
                  </h2>
                </div>

                {synchronizedAt ? (
                  <p className={cn("text-xs", themedTextBodyClass)}>Sincronizado em {synchronizedAt}</p>
                ) : null}
              </div>

              {profileFields.length > 0 ? (
                <dl className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  {profileFields.map((field, index) => {
                    const Icon = field.icon;

                    return (
                      <div
                        key={field.label}
                        className={cn(
                          "flex items-start gap-4 px-4 py-4 sm:px-5",
                          index !== profileFields.length - 1 &&
                            "border-b border-slate-200 dark:border-white/10",
                        )}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <dt className={themedTinyLabelClass}>{field.label}</dt>
                          <dd className={cn("mt-1 break-words text-sm font-semibold", themedTextTitleClass)}>
                            {field.value}
                          </dd>
                        </div>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  Nenhuma informação corporativa adicional foi sincronizada para esta conta.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
