"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Home, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AccessDeniedContent() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") ?? null;
  const email = searchParams?.get("email")?.trim() || null;

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Erro ao conectar com o provedor de autenticação.",
    OAuthCallback: "Erro ao processar a autenticação OAuth.",
    OAuthCreateAccount: "Erro ao criar conta durante autenticação.",
    EmailCreateAccount: "Erro ao criar conta com email.",
    Callback: "Erro ao processar callback de autenticação.",
    EmailSignInError: "Erro ao enviar email de autenticação.",
    CredentialsSignin: "Credenciais inválidas.",
    SessionCallback: "Erro ao criar sessão.",
    AccessDenied:
      "Sua conta não pôde ser validada neste tenant do Microsoft Entra ID. Use uma conta Microsoft vinculada ao ambiente configurado ou peça acesso ao administrador.",
    Verification: "Token de verificação inválido ou expirado.",
  };

  const message =
    (error && errorMessages[error]) ||
    "Sua conta não pôde ser validada neste tenant do Microsoft Entra ID. Use uma conta Microsoft vinculada ao ambiente configurado ou peça acesso ao administrador.";

  const finalMessage = email
    ? `A conta ${email} não pôde ser autenticada neste tenant do Microsoft Entra ID. Use uma conta Microsoft vinculada ao ambiente configurado ou solicite acesso ao administrador.`
    : message;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_34%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_100%)] px-4 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_32%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-white/10 dark:bg-slate-950/80 dark:shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-rose-100 p-4 dark:bg-rose-500/10">
            <AlertCircle className="h-8 w-8 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        <h1 className="mb-2 text-center text-2xl font-bold text-rose-600 dark:text-rose-400">
          Acesso não autorizado
        </h1>

        <p className="mb-6 text-center text-sm text-slate-600 dark:text-slate-400">
          {finalMessage}
        </p>

        {email ? (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-center dark:border-white/10 dark:bg-white/5">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              Conta utilizada
            </p>
            <p className="mt-1 break-all text-sm font-semibold text-slate-900 dark:text-slate-100">
              {email}
            </p>
          </div>
        ) : null}

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-3 dark:border-rose-400/20 dark:bg-rose-500/10">
            <p className="text-xs font-mono text-rose-700 dark:text-rose-200">
              Código do erro: <strong>{error}</strong>
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Tentar Login Novamente
            </Link>
          </Button>

          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <Home className="h-4 w-4" />
              Voltar para Home
            </Link>
          </Button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          Se você acredita que deveria ter acesso, verifique se está usando a conta Microsoft correta ou entre em contato com o administrador do sistema.
        </p>
      </div>
    </div>
  );
}
