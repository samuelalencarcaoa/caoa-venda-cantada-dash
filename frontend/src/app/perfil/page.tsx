import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import {
  ArrowLeft,
  BadgeInfo,
  ImageIcon,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { authOptions } from "@/lib/nextAuth";

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
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") return String(value);
  return "Não informado";
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

  const displayName = user.name || "Usuário";
  const initials = getInitials(user.name);
  const avatarColor = getAvatarColor(displayName);
  const profileRows = [
    { label: "Nome", value: user.name, icon: UserRound },
    { label: "Email", value: user.email, icon: Mail },
    { label: "Foto", value: user.image ? "Disponível" : "Não informada", icon: ImageIcon },
    { label: "Sessão", value: session.expires, icon: ShieldCheck },
  ];

  const rawProfile = {
    user,
    sessionExpires: session.expires,
  };

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 py-4 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <span className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            Meu perfil
          </span>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
          <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 p-5 text-white sm:p-6">
            <div className="flex items-center gap-4">
              {user.image ? (
                <Image
                  src={user.image}
                  alt={displayName}
                  className="h-16 w-16 rounded-3xl object-cover ring-4 ring-white/25"
                  width={64}
                  height={64}
                  unoptimized
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-3xl text-xl font-semibold text-white ring-4 ring-white/25"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </div>
              )}

              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">Perfil do usuário</p>
                <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">{displayName}</h1>
                <p className="mt-1 truncate text-sm text-white/80">{user.email || "Email não informado"}</p>
              </div>
            </div>
          </div>

          <div className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {profileRows.map((row) => {
                const Icon = row.icon;
                return (
                  <div
                    key={row.label}
                    className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {row.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                        {formatValue(row.value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-slate-100">
              <div className="mb-3 flex items-center gap-2 text-sky-300">
                <BadgeInfo className="h-4 w-4" />
                <p className="text-sm font-semibold uppercase tracking-[0.2em]">Dados completos</p>
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap break-words rounded-2xl bg-black/30 p-4 text-xs leading-6 text-slate-100">
                {JSON.stringify(rawProfile, null, 2)}
              </pre>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
