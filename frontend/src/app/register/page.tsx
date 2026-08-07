"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import BrandLogo from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { registerUser } from "@/lib/auth";

const MIN_LOADING_MS = 1000;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (password !== confirmPassword) {
      setError("A confirmação da senha não coincide.");
      return;
    }

    setIsLoading(true);
    const startedAt = Date.now();
    const result = await registerUser(username, email, password);

    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await wait(MIN_LOADING_MS - elapsed);
    }

    setIsLoading(false);

    if (!result.success) {
      setError(result.message ?? "Ocorreu um erro ao criar a conta.");
      return;
    }

    setSuccess("Conta criada com sucesso. Você já pode fazer o login.");
    setUsername("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setTimeout(() => router.push("/login"), 1200);
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[radial-gradient(circle_at_35%_10%,#15568b_0%,#06345e_38%,#031d43_100%)] px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-3xl border-2 border-emerald-300/70 bg-[#365888]/95 p-10 shadow-lg shadow-slate-950/20">
        <div className="mb-8">
          <BrandLogo className="mx-auto w-full max-w-[320px]" />
        </div>

        <div className="mb-8 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-emerald-200/90">Cadastro</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">Crie sua conta</h1>
          <p className="mt-2 text-sm text-white/75">
            Depois do cadastro você poderá acessar as rotas do sistema.
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-emerald-200/90">Nome de usuário</span>
            <input
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="seu.usuario"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-emerald-200/90">Email</span>
            <input
              type="email"
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-emerald-200/90">Senha</span>
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-emerald-200/90">Confirmar senha</span>
            <input
              type="password"
              className="mt-2 w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/60 focus:border-emerald-300/70 focus:ring-2 focus:ring-emerald-300/20"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repita a senha"
              required
            />
          </label>

          {error && <div className="rounded-2xl border border-rose-400/50 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">{error}</div>}
          {success && <div className="rounded-2xl border border-emerald-400/50 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100">{success}</div>}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Aguarde..." : "Criar conta"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-white/85">
          Já tem conta?{' '}
          <Link href="/login" className="font-medium text-emerald-200 hover:text-emerald-100">
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
}
