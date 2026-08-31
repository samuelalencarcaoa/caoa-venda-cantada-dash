import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  AtSign,
  BadgeInfo,
  BriefcaseBusiness,
  Building2,
  Clock3,
  Fingerprint,
  Globe,
  IdCard,
  ImageIcon,
  Languages,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  findAdExportManager,
  readRecordString,
  readRecordStringArray,
} from "@/lib/azure-ad-profile";
import { authOptions } from "@/lib/nextAuth";
import {
  themedChipClass,
  themedHeroClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
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

function formatValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value)) {
    const items = value.filter(
      (item): item is string => typeof item === "string" && Boolean(item.trim())
    );
    return items.length > 0 ? items.join(", ") : "Não informado";
  }
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  return "Não informado";
}

function formatDateTime(value?: string | null) {
  if (!value) return "Não informado";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
}

function sanitizeImageValue(value?: string | null) {
  if (!value) {
    return undefined;
  }

  if (value.startsWith("data:")) {
    return `[data-uri:${value.length} chars]`;
  }

  return value;
}

type ProfileRow = {
  label: string;
  value: unknown;
  icon: LucideIcon;
};

function ProfileSection({
  badge,
  description,
  rows,
  title,
}: {
  badge?: string;
  description: string;
  rows: ProfileRow[];
  title: string;
}) {
  return (
    <section className={cn(themedPanelClass, "p-4 sm:p-5")}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={themedTinyLabelClass}>{title}</p>
          <h2 className={cn("text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
            {description}
          </h2>
        </div>
        {badge ? <span className={cn(themedChipClass, "whitespace-nowrap")}>{badge}</span> : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const Icon = row.icon;

          return (
            <div
              key={row.label}
              className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className={cn(themedTinyLabelClass, "text-slate-500 dark:text-slate-400")}>
                  {row.label}
                </p>
                <p className={cn("mt-1 break-words text-sm font-semibold", themedTextTitleClass)}>
                  {formatValue(row.value)}
                </p>
                {row.label === "Sessão expira em" ? (
                  <p className={cn("mt-1 text-xs leading-5", themedTextBodyClass)}>
                    A validade exibida segue a sessão atual autenticada.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
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

  const identityRows: ProfileRow[] = [
    { label: "Nome", value: displayName, icon: UserRound },
    { label: "Email", value: email, icon: Mail },
    {
      label: "Nome de usuário preferencial",
      value: readRecordString(claims, "preferred_username"),
      icon: AtSign,
    },
    { label: "UPN", value: readRecordString(claims, "upn") || graph?.userPrincipalName, icon: Globe },
    { label: "ID do objeto", value: readRecordString(claims, "oid") || graph?.id, icon: Fingerprint },
    { label: "Subject (sub)", value: readRecordString(claims, "sub"), icon: Fingerprint },
    { label: "Tenant ID", value: readRecordString(claims, "tid"), icon: Globe },
    { label: "Emissor", value: readRecordString(claims, "iss"), icon: ShieldCheck },
    { label: "Funções", value: readRecordStringArray(claims, "roles"), icon: BadgeInfo },
    { label: "Foto", value: user.image ? "Disponível" : "Não informada", icon: ImageIcon },
    { label: "Sessão expira em", value: formatDateTime(session.expires), icon: Clock3 },
    { label: "Sincronizado em", value: formatDateTime(directory?.fetchedAt), icon: Clock3 },
  ];

  const graphRows: ProfileRow[] = [
    { label: "Cargo", value: graph?.jobTitle, icon: BriefcaseBusiness },
    { label: "Empresa", value: graph?.companyName, icon: Building2 },
    { label: "Departamento", value: graph?.department, icon: Building2 },
    { label: "Celular", value: graph?.mobilePhone, icon: Phone },
    { label: "Telefones comerciais", value: graph?.businessPhones, icon: Phone },
    { label: "Escritório", value: graph?.officeLocation, icon: MapPin },
    { label: "Cidade", value: graph?.city, icon: MapPin },
    { label: "Estado", value: graph?.state, icon: MapPin },
    { label: "País", value: graph?.country, icon: Globe },
    { label: "CEP", value: graph?.postalCode, icon: MapPin },
    { label: "Endereço", value: graph?.streetAddress, icon: MapPin },
    { label: "Idioma preferido", value: graph?.preferredLanguage, icon: Languages },
    { label: "ID do colaborador", value: graph?.employeeId, icon: IdCard },
    { label: "Tipo de colaborador", value: graph?.employeeType, icon: BadgeInfo },
    { label: "Local de uso", value: graph?.usageLocation, icon: Globe },
  ];

  const managerRows: ProfileRow[] = [
    { label: "Nome", value: adExportManager?.displayName, icon: UserRound },
    { label: "Distinguished Name", value: adExportManager?.distinguishedName, icon: Fingerprint },
  ];

  const rawProfile = {
    session: {
      expires: session.expires,
    },
    user: {
      ...user,
      image: sanitizeImageValue(user.image),
    },
    microsoftEntra: directory ? { ...directory, adExportManager } : directory,
  };

  const heroBackButtonClass =
    "h-10 rounded-full border border-white/20 bg-white/10 px-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-white shadow-none backdrop-blur-sm transition hover:border-white/30 hover:bg-white/15 hover:text-white";

  return (
    <main className={cn(themedPageBackgroundClass, themedPageTextClass, "min-h-[100dvh] px-4 py-4 sm:px-6 sm:py-6")}>
      <div className="mx-auto w-full max-w-6xl space-y-4">
        <section className={cn(themedHeroClass, "overflow-hidden")}>
          <div className="flex items-center justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
            <Button asChild variant="ghost" className={heroBackButtonClass}>
              <Link href="/dashboard">
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Link>
            </Button>
            <span className={cn(themedChipClass, "border-white/15 bg-white/10 text-white/90 dark:bg-white/10 dark:text-white/90")}>
              Meu perfil
            </span>
          </div>

          <div className="flex flex-col gap-5 px-5 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={displayName}
                  className="h-20 w-20 rounded-[28px] object-cover ring-4 ring-white/15"
                  width={80}
                  height={80}
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-[28px] text-2xl font-semibold text-white ring-4 ring-white/15"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-[0.34em] text-sky-100/80 dark:text-cyan-200/80">
                  Perfil do usuário
                </p>
                <h1 className="mt-2 truncate text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-1 truncate text-sm text-sky-50/85 dark:text-slate-300">
                  {email}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 shadow-none">
                Sessão ativa
              </span>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 shadow-none">
                {user.image ? "Foto disponível" : "Sem foto"}
              </span>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 shadow-none">
                {directory ? "Perfil AD sincronizado" : "Perfil AD básico"}
              </span>
            </div>
          </div>
        </section>

        <ProfileSection
          badge={`${identityRows.length} itens`}
          description="Informações principais"
          rows={identityRows}
          title="Detalhes da conta"
        />

        <ProfileSection
          badge={`${graphRows.length} itens`}
          description="Perfil corporativo capturado no Microsoft Graph"
          rows={graphRows}
          title="Dados do perfil"
        />

        <ProfileSection
          badge={adExportManager ? "Encontrado na exportação AD" : "Não informado"}
          description="Gestor direto conforme a exportação do Active Directory"
          rows={managerRows}
          title="Meu gestor"
        />

        <section className={cn(themedPanelClass, "p-4 sm:p-5")}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className={themedTinyLabelClass}>Dados brutos</p>
              <h2 className={cn("text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                Snapshot completo do AD
              </h2>
            </div>
            <span className={cn(themedChipClass, "whitespace-nowrap")}>
              JSON
            </span>
          </div>

          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words rounded-3xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100 dark:border-white/10 dark:bg-slate-900">
            {JSON.stringify(rawProfile, null, 2)}
          </pre>
        </section>
      </div>
    </main>
  );
}
