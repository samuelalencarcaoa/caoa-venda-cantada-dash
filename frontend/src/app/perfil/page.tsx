import Image from "next/image";
import Link from "next/link";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  BadgeInfo,
  BriefcaseBusiness,
  Building2,
  ContactRound,
  Globe2,
  IdCard,
  Mail,
  MapPin,
  Phone,
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

type ProfileField = {
  icon: LucideIcon;
  label: string;
  value: string;
};

type ProfileSection = {
  title: string;
  icon: LucideIcon;
  fields: ProfileField[];
};

function profileField(label: string, value: string | string[] | null | undefined, icon: LucideIcon): ProfileField | null {
  const formatted = Array.isArray(value) ? value.filter(Boolean).join(" • ") : value?.trim();
  return formatted ? { label, value: formatted, icon } : null;
}

function availableFields(fields: Array<ProfileField | null>): ProfileField[] {
  return fields.filter((field): field is ProfileField => field !== null);
}

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
  const synchronizedAt = formatDateTime(directory?.fetchedAt);

  const profileSections: ProfileSection[] = [
    {
      title: "Dados pessoais",
      icon: ContactRound,
      fields: availableFields([
        profileField("Nome de exibição", graph?.displayName, ContactRound),
        profileField("Nome", graph?.givenName || readRecordString(claims, "given_name"), ContactRound),
        profileField("Sobrenome", graph?.surname || readRecordString(claims, "family_name"), ContactRound),
        profileField("Idioma preferido", graph?.preferredLanguage || readRecordString(claims, "locale"), Globe2),
      ]),
    },
    {
      title: "Informações profissionais",
      icon: BriefcaseBusiness,
      fields: availableFields([
        profileField("Cargo", graph?.jobTitle, BriefcaseBusiness),
        profileField("Empresa", graph?.companyName, Building2),
        profileField("Departamento", graph?.department, BadgeInfo),
        profileField("Matrícula", graph?.employeeId, IdCard),
        profileField("Tipo de colaborador", graph?.employeeType, IdCard),
        profileField("Gestor direto (export AD)", adExportManager?.displayName, Users),
      ]),
    },
    {
      title: "Contato",
      icon: Phone,
      fields: availableFields([
        profileField("Email", graph?.mail, Mail),
        profileField("Celular", graph?.mobilePhone, Phone),
        profileField("Telefones comerciais", graph?.businessPhones, Phone),
      ]),
    },
    {
      title: "Endereço e localização",
      icon: MapPin,
      fields: availableFields([
        profileField("Local do escritório", graph?.officeLocation, Building2),
        profileField("Endereço", graph?.streetAddress, MapPin),
        profileField("Cidade", graph?.city, MapPin),
        profileField("Estado", graph?.state, MapPin),
        profileField("País", graph?.country, MapPin),
        profileField("CEP", graph?.postalCode, MapPin),
        profileField("País/região de uso", graph?.usageLocation, Globe2),
      ]),
    },
    {
      title: "Conta Microsoft Entra",
      icon: IdCard,
      fields: availableFields([
        profileField("Nome principal do usuário (UPN)", graph?.userPrincipalName || readRecordString(claims, "upn") || readRecordString(claims, "preferred_username"), IdCard),
        profileField("ID do usuário", graph?.id || directory?.stableId, IdCard),
        profileField("ID do tenant", readRecordString(claims, "tid"), IdCard),
      ]),
    },
  ].filter((section) => section.fields.length > 0);

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

          <div className="flex flex-col gap-5 p-4 sm:p-5">
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
                    className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-normal text-white ring-4 ring-slate-200/70 dark:ring-white/10"
                    style={{ backgroundColor: avatarColor }}
                  >
                    {initials}
                  </div>
                )}

                <div className="min-w-0">
                  <p className={themedTinyLabelClass}>Conta autenticada</p>
                  <h1
                    className={cn(
                      "mt-1 break-words text-xl font-normal tracking-[-0.02em] sm:text-2xl",
                      themedTextTitleClass,
                    )}
                  >
                    {displayName}
                  </h1>
                  <p className={cn("mt-1 break-all text-sm", themedTextBodyClass)}>{email}</p>
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
                  <p className={themedTinyLabelClass}>Diretório</p>
                  <h2 className={cn("mt-1 text-base font-normal tracking-[-0.02em]", themedTextTitleClass)}>
                    Informações disponíveis
                  </h2>
                </div>

                {synchronizedAt ? (
                  <p className={cn("text-xs", themedTextBodyClass)}>Sincronizado em {synchronizedAt}</p>
                ) : null}
              </div>

              {profileSections.length > 0 ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {profileSections.map((section) => {
                    const SectionIcon = section.icon;
                    return (
                      <section key={section.title} className="min-w-0 overflow-hidden rounded-xl bg-slate-50/80 dark:bg-white/5">
                        <h3 className={cn("flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 text-sm font-normal dark:border-white/10", themedTextTitleClass)}>
                          <SectionIcon className="h-4 w-4 text-sky-700 dark:text-cyan-300" />
                          {section.title}
                        </h3>
                        <dl className="divide-y divide-slate-200 dark:divide-white/10">
                          {section.fields.map((field) => {
                            const Icon = field.icon;
                            return (
                              <div key={field.label} className="flex min-w-0 items-start gap-2.5 px-3 py-2.5">
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-700 dark:text-cyan-300" />
                                <div className="min-w-0">
                                  <dt className={themedTinyLabelClass}>{field.label}</dt>
                                  <dd className={cn("mt-1 break-words text-sm font-normal", themedTextTitleClass)}>{field.value}</dd>
                                </div>
                              </div>
                            );
                          })}
                        </dl>
                      </section>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                  Nenhuma informação adicional foi sincronizada para esta conta.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
