"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import {
  themedChipClass,
  themedInputClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedPanelClass,
  themedSoftCardClass,
  themedTextBodyClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

const MIN_LOADING_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function MicrosoftLogoMark({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn("shrink-0", className)}
      role="img"
    >
      <rect x="2" y="2" width="9" height="9" rx="1.5" fill="#f25022" />
      <rect x="13" y="2" width="9" height="9" rx="1.5" fill="#7fba00" />
      <rect x="2" y="13" width="9" height="9" rx="1.5" fill="#00a4ef" />
      <rect x="13" y="13" width="9" height="9" rx="1.5" fill="#ffb900" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [fallbackUsername, setFallbackUsername] = useState("admin");
  const [fallbackPassword, setFallbackPassword] = useState("admin");
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [isFallbackLoading, setIsFallbackLoading] = useState(false);
  const allowFallbackAuth = process.env.NEXT_PUBLIC_FALLBACK_AUTH === "true";

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/sales-intention");
    }
  }, [router, status]);

  if (status === "authenticated") {
    return null;
  }

  async function handleMicrosoftSignIn() {
    setIsLoading(true);
    const startedAt = Date.now();
    try {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await wait(MIN_LOADING_MS - elapsed);
      }
      await signIn("azure-ad", {
        redirect: true,
        callbackUrl: "/sales-intention",
      });
    } catch {
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await wait(MIN_LOADING_MS - elapsed);
      }
      setIsLoading(false);
    }
  }

  async function handleFallbackSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFallbackError(null);
    setIsFallbackLoading(true);
    const startedAt = Date.now();

    const result = await signIn("credentials", {
      redirect: false,
      username: fallbackUsername,
      password: fallbackPassword,
      callbackUrl: "/sales-intention",
    });

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await wait(MIN_LOADING_MS - elapsed);
    }

    setIsFallbackLoading(false);

    if (result?.error || !result?.ok) {
      setFallbackError("Credenciais inválidas ou autenticação alternativa indisponível.");
      return;
    }

    router.push(result.url ?? "/sales-intention");
  }

  return (
    <main
      className={cn(
        themedPageBackgroundClass,
        themedPageTextClass,
        "flex min-h-[100dvh] items-center px-4 py-6 sm:px-6 sm:py-8",
      )}
    >
      <div className="mx-auto w-full max-w-2xl">
        <section className={cn(themedPanelClass, "relative overflow-hidden p-5 sm:p-8")}>
          <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,_#0ea5e9_0%,_#22d3ee_48%,_#38bdf8_100%)]" />

          <div className="relative space-y-7">
            <div className="space-y-4 text-center">
              <span
                className={cn(
                  themedChipClass,
                  "mx-auto inline-flex border-sky-100 bg-sky-50 text-sky-700 dark:border-white/10 dark:bg-white/5 dark:text-cyan-200",
                )}
              >
                Acesso seguro
              </span>

              <div className="mx-auto w-full max-w-[300px]">
                <BrandLogo className="mx-auto w-full max-w-[300px]" />
              </div>

              <div className="space-y-2">
                <h1 className={cn("text-2xl font-semibold tracking-[-0.03em] sm:text-3xl", themedTextTitleClass)}>
                  Conecte-se ao painel
                </h1>
                <p className={cn("mx-auto max-w-lg text-sm leading-6", themedTextBodyClass)}>
                  Use sua conta Microsoft para acessar as vendas, relatórios e indicadores do sistema.
                </p>
              </div>
            </div>

            <div className="rounded-[24px] border border-sky-100 bg-sky-50/70 p-4 dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-4 text-left">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950">
                  <MicrosoftLogoMark className="h-8 w-8" />
                </div>

                <div className="min-w-0 space-y-1">
                  <p className={cn(themedTinyLabelClass, "text-sky-600 dark:text-cyan-200")}>Conexão principal</p>
                  <p className={cn("text-lg font-semibold tracking-[-0.02em]", themedTextTitleClass)}>
                    Entrar no sistema
                  </p>
                  <p className={cn("text-sm leading-6", themedTextBodyClass)}>
                    Acesso ao painel de vendas e relatórios.
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleMicrosoftSignIn}
                disabled={isLoading}
                className="mt-4 h-12 w-full rounded-full text-base font-semibold shadow-[0_16px_30px_-20px_rgba(14,165,233,0.8)]"
              >
                {isLoading ? "Conectando..." : "Entrar com Microsoft"}
              </Button>
            </div>

            {allowFallbackAuth ? (
              <form
                className={cn(
                  themedSoftCardClass,
                  "space-y-4 p-4 sm:p-5 dark:bg-white/5",
                )}
                onSubmit={handleFallbackSignIn}
              >
                <div className="space-y-1">
                  <p className={cn("text-sm font-semibold", themedTextTitleClass)}>
                    Acesso temporário
                  </p>
                  <p className={cn("text-sm leading-6", themedTextBodyClass)}>
                    Use credenciais de homologação quando o login Microsoft não estiver disponível.
                  </p>
                </div>

                <label className="block space-y-2 text-sm">
                  <span className={themedTinyLabelClass}>Usuário</span>
                  <input
                    className={cn(themedInputClass, "rounded-2xl")}
                    value={fallbackUsername}
                    onChange={(event) => setFallbackUsername(event.target.value)}
                    placeholder="admin"
                    required
                  />
                </label>

                <label className="block space-y-2 text-sm">
                  <span className={themedTinyLabelClass}>Senha</span>
                  <input
                    type="password"
                    className={cn(themedInputClass, "rounded-2xl")}
                    value={fallbackPassword}
                    onChange={(event) => setFallbackPassword(event.target.value)}
                    placeholder="admin"
                    required
                  />
                </label>

                {fallbackError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">
                    {fallbackError}
                  </div>
                ) : null}

                <Button type="submit" className="h-11 w-full rounded-full" disabled={isFallbackLoading}>
                  {isFallbackLoading ? "Verificando..." : "Entrar com credenciais temporárias"}
                </Button>
              </form>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
