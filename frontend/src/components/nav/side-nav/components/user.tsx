"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

import {
  PROFILE_PREFERENCES_UPDATED_EVENT,
  readProfilePreferences,
} from "@/lib/profilePreferences";

function getAuthUsername() {
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith("caoa-auth="));

  if (!cookie) {
    return null;
  }

  return decodeURIComponent(cookie.split("=")[1] || "");
}

function getDisplayName(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];

  const firstName = parts[0];
  const lastNameInitial = parts[parts.length - 1][0]?.toUpperCase() ?? "";
  return `${firstName} ${lastNameInitial}`;
}

function getAvatarInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "";

  const first = parts[0][0]?.toUpperCase() ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0]?.toUpperCase() ?? "" : "";

  return `${first}${last}`;
}

function getAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 65%, 45%)`;
}

type UserProps = {
  onNavigate?: () => void;
};

export default function User({ onNavigate }: UserProps) {
  const { data: session } = useSession();
  const [username, setUsername] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<{ displayName?: string; imageUrl?: string }>({});

  useEffect(() => {
    if (session?.user?.name) {
      setUsername(session.user.name);
      return;
    }

    setUsername(getAuthUsername());
  }, [session]);

  useEffect(() => {
    const identifier = session?.user?.email || session?.user?.name || username;
    setPreferences(readProfilePreferences(identifier));
  }, [session?.user?.email, session?.user?.name, username]);

  useEffect(() => {
    function handlePreferencesUpdate() {
      const identifier = session?.user?.email || session?.user?.name || username;
      setPreferences(readProfilePreferences(identifier));
    }

    window.addEventListener(PROFILE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate);
    window.addEventListener("storage", handlePreferencesUpdate);

    return () => {
      window.removeEventListener(PROFILE_PREFERENCES_UPDATED_EVENT, handlePreferencesUpdate);
      window.removeEventListener("storage", handlePreferencesUpdate);
    };
  }, [session?.user?.email, session?.user?.name, username]);

  const resolvedName = preferences.displayName || session?.user?.name || username;
  const displayName = resolvedName ? getDisplayName(resolvedName) : "Convidado";
  const initials = resolvedName ? getAvatarInitials(resolvedName) : "U";
  const avatarColor = useMemo(
    () => (resolvedName ? getAvatarColor(resolvedName) : "hsl(214, 15%, 35%)"),
    [resolvedName]
  );

  const imageSrc = preferences.imageUrl || session?.user?.image;

  return (
    <div className="border-b border-border px-2 py-3">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/60 dark:border-white/10 dark:bg-slate-950 dark:shadow-black/20">
        <div className="flex items-center gap-3">
          {imageSrc ? (
            <Image
              src={imageSrc}
              alt={resolvedName ? `${resolvedName}` : "User"}
              className="h-10 w-10 rounded-full object-cover ring-2 ring-sky-100 dark:ring-slate-700"
              width={40}
              height={40}
              unoptimized
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ring-white dark:ring-slate-900"
              style={{ backgroundColor: avatarColor }}
              aria-label={resolvedName ? `${initials} avatar` : "User avatar"}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {displayName}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {session?.user?.email || "Conta vinculada"}
            </p>
          </div>
        </div>
        <Button asChild className="w-full">
          <Link href="/perfil" onClick={onNavigate}>
            <UserRound className="h-4 w-4" />
            Ver perfil
          </Link>
        </Button>
      </div>
    </div>
  );
}
