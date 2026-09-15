"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createPasswordResetToken, findUser } from "@/lib/auth";
import { themedAuthCardClass, themedAuthInputClass } from "@/lib/theme-classes";

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [tokenLink, setTokenLink] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setTokenLink(null);

    const user = findUser(username);
    if (!user) {
      setMessage("Não encontramos este usuário. Verifique o nome de usuário.");
      return;
    }

    const token = createPasswordResetToken(user.username);
    if (!token) {
      setMessage("Não foi possível gerar o link de recuperação.");
      return;
    }

    const link = `${window.location.origin}/reset-password?token=${encodeURIComponent(token)}`;
    setTokenLink(link);
    setMessage("Enviamos as instruções para redefinir sua senha. Use o link abaixo para concluir.");
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 py-6 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className={themedAuthCardClass}>
        <div className="mb-5 text-center">
          <p className="text-xs font-normal uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">Recuperação de senha</p>
          <h1 className="mt-2 text-xl font-normal text-slate-900 dark:text-slate-100">Esqueci minha senha</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Insira o nome de usuário para receber um link de recuperação.
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-normal text-slate-700 dark:text-slate-300">Nome de usuário</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={themedAuthInputClass}
              placeholder="CAOA"
              required
            />
          </label>

          {message && <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">{message}</div>}
          {tokenLink && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100">
              <p className="font-normal">Link de redefinição gerado:</p>
              <a href={tokenLink} className="break-all text-primary hover:underline">
                {tokenLink}
              </a>
            </div>
          )}

          <Button type="submit" className="w-full">
            Enviar link
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <Link href="/login" className="font-normal text-primary hover:underline">
            Voltar ao login
          </Link>
          <Link href="/register" className="font-normal text-primary hover:underline">
            Criar conta
          </Link>
        </div>
      </div>
    </div>
  );
}
