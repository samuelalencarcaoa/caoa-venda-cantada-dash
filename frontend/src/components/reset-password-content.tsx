"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { consumePasswordResetToken, updatePassword, verifyPasswordResetToken } from "@/lib/auth";
import { themedAuthCardClass, themedAuthInputClass } from "@/lib/theme-classes";

export default function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "invalid" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const username = verifyPasswordResetToken(token);
    setStatus(username ? "ready" : "invalid");
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("A confirmação da senha não coincide.");
      return;
    }

    const username = verifyPasswordResetToken(token);
    if (!username) {
      setStatus("invalid");
      return;
    }

    const updated = await updatePassword(username, password);
    if (!updated) {
      setError("Não foi possível atualizar a senha.");
      return;
    }

    consumePasswordResetToken(token);
    router.push("/login");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className={themedAuthCardClass}>
        {status === "loading" && <p>Validando token...</p>}
        {status === "invalid" && (
          <div className="space-y-4">
            <h1 className="text-2xl font-normal text-slate-900 dark:text-slate-100">Link inválido</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">O link de redefinição expirou ou é inválido. Solicite um novo link.</p>
            <Button asChild>
              <Link href="/forgot-password">Solicitar novo link</Link>
            </Button>
          </div>
        )}

        {status === "ready" && (
          <>
            <div className="mb-5 text-center">
              <p className="text-xs font-normal uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Redefinir senha</p>
              <h1 className="mt-2 text-xl font-normal text-slate-900 dark:text-slate-100">Criar nova senha</h1>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-sm font-normal text-slate-700 dark:text-slate-300">Nova senha</span>
                <input
                  type="password"
                  className={themedAuthInputClass}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </label>

              <label className="block">
                <span className="text-sm font-normal text-slate-700 dark:text-slate-300">Confirmar senha</span>
                <input
                  type="password"
                  className={themedAuthInputClass}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Repita a senha"
                  required
                />
              </label>

              {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100">{error}</div>}

              <Button type="submit" className="w-full">
                Redefinir senha
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
              <Link href="/login" className="font-normal text-primary hover:underline">
                Voltar ao login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
