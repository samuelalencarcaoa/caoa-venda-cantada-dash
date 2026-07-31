"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  BadgeInfo,
  ImageIcon,
  Mail,
  PencilLine,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  clearProfilePreferences,
  readProfilePreferences,
  saveProfilePreferences,
} from "@/lib/profilePreferences";

type DraftProfile = {
  displayName: string;
  imageUrl: string;
};

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

export default function ProfileContent() {
  const { data: session, status } = useSession();
  const [preferences, setPreferences] = useState<DraftProfile>({ displayName: "", imageUrl: "" });
  const [draft, setDraft] = useState<DraftProfile>({ displayName: "", imageUrl: "" });
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const user = session?.user;
  const identifier = user?.email || user?.name || null;

  useEffect(() => {
    if (!identifier) return;
    const savedPreferences = readProfilePreferences(identifier);
    setPreferences({
      displayName: savedPreferences.displayName || "",
      imageUrl: savedPreferences.imageUrl || "",
    });
  }, [identifier]);

  useEffect(() => {
    if (!isEditorOpen) return;
    setDraft({
      displayName: preferences.displayName || user?.name || "",
      imageUrl: preferences.imageUrl || user?.image || "",
    });
  }, [isEditorOpen, preferences.displayName, preferences.imageUrl, user?.image, user?.name]);

  const effectiveDisplayName = preferences.displayName?.trim() || user?.name || "Usuário";
  const effectiveImageUrl = preferences.imageUrl?.trim() || user?.image || "";
  const initials = getInitials(effectiveDisplayName);
  const avatarColor = useMemo(() => getAvatarColor(effectiveDisplayName), [effectiveDisplayName]);

  if (status === "loading") {
    return (
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
        <div className="mx-auto w-full max-w-4xl">
          <div className="animate-pulse rounded-[30px] border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800/60" />
            <div className="mt-6 space-y-3">
              <div className="h-6 w-48 rounded bg-slate-100 dark:bg-slate-800/60" />
              <div className="h-4 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
              <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800/60" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return null;
  }

  const profileRows = [
    { label: "Nome", value: effectiveDisplayName, icon: UserRound },
    { label: "Email", value: user.email, icon: Mail },
    { label: "Foto", value: effectiveImageUrl ? "Disponível" : "Não informada", icon: ImageIcon },
    { label: "Sessão", value: session?.expires, icon: ShieldCheck },
  ];

  const rawProfile = {
    sessionExpires: session?.expires,
    user,
    preferences,
  };

  function handleSave() {
    const nextPreferences = {
      displayName: draft.displayName.trim(),
      imageUrl: draft.imageUrl.trim(),
    };

    if (!nextPreferences.displayName && !nextPreferences.imageUrl) {
      clearProfilePreferences(identifier);
    } else {
      saveProfilePreferences(identifier, nextPreferences);
    }

    setPreferences(nextPreferences);
    setIsEditorOpen(false);
  }

  function handleReset() {
    clearProfilePreferences(identifier);
    setPreferences({ displayName: "", imageUrl: "" });
    setDraft({
      displayName: user?.name || "",
      imageUrl: user?.image || "",
    });
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 py-4 sm:px-6 sm:py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>

          <Button
            type="button"
            onClick={() => setIsEditorOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <PencilLine className="h-4 w-4" />
            Editar perfil
          </Button>
        </div>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
          <div className="bg-gradient-to-br from-sky-700 via-sky-600 to-cyan-500 p-5 text-white dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 sm:p-6">
            <div className="flex items-center gap-4">
              {effectiveImageUrl ? (
                <Image
                  src={effectiveImageUrl}
                  alt={effectiveDisplayName}
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
                <h1 className="mt-2 truncate text-3xl font-semibold tracking-tight">{effectiveDisplayName}</h1>
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
                    className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm dark:bg-slate-950 dark:text-cyan-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {row.label}
                      </p>
                      <p className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatValue(row.value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-950 p-4 text-slate-100 dark:border-white/10 dark:bg-slate-900">
              <div className="mb-3 flex items-center gap-2 text-sky-300 dark:text-cyan-300">
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

      {isEditorOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-slate-950/90">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-cyan-300">Editar perfil</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-100">Ajuste seus dados</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  As mudanças ficam salvas neste navegador e já aparecem na sidebar.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditorOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-slate-100"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                Nome de exibição
                <input
                  type="text"
                  value={draft.displayName}
                  onChange={(event) => setDraft((current) => ({ ...current, displayName: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none ring-1 ring-transparent transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10"
                  placeholder="Seu nome"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                URL da foto
                <input
                  type="url"
                  value={draft.imageUrl}
                  onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-950 outline-none ring-1 ring-transparent transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100 dark:border-white/10 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/10"
                  placeholder="https://..."
                />
              </label>

              <div className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white"
                  style={{ backgroundColor: getAvatarColor(draft.displayName || effectiveDisplayName) }}
                >
                  {getInitials(draft.displayName || effectiveDisplayName)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Pré-visualização</p>
                  <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {draft.displayName || effectiveDisplayName}
                  </p>
                  <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-400">
                    {draft.imageUrl || "Sem foto personalizada"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-200 p-5 dark:border-white/10 sm:flex-row sm:justify-between">
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Trash2 className="h-4 w-4" />
                Restaurar padrão
              </Button>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Button
                  type="button"
                  onClick={() => setIsEditorOpen(false)}
                  variant="outline"
                  className="inline-flex w-full items-center justify-center sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  className="inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  <Save className="h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
