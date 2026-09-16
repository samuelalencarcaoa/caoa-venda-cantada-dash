import Link from "next/link";
import { ArrowLeft, Compass, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  themedCardClass,
  themedOutlineButtonClass,
  themedPageBackgroundClass,
  themedPageTextClass,
  themedTextBodyClass,
  themedTextTitleClass,
  themedTinyLabelClass,
} from "@/lib/theme-classes";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main
      className={cn(
        themedPageBackgroundClass,
        themedPageTextClass,
        "flex min-h-[calc(100dvh-10rem)] items-center justify-center px-4 py-10 sm:px-6",
      )}
    >
      <section className={cn(themedCardClass, "w-full max-w-xl overflow-hidden p-6 text-center sm:p-10")}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-cyan-400/20 dark:bg-cyan-400/10 dark:text-cyan-200">
          <Compass className="h-7 w-7" aria-hidden="true" />
        </div>

        <p className={cn("mt-6", themedTinyLabelClass)}>Erro 404</p>
        <h1 className={cn("mt-2 text-2xl font-normal tracking-[-0.03em] sm:text-3xl", themedTextTitleClass)}>
          Não encontramos esta página
        </h1>
        <p className={cn("mx-auto mt-3 max-w-md text-sm leading-6 sm:text-base", themedTextBodyClass)}>
          O endereço pode estar incorreto, ter sido movido ou não estar mais disponível. Use uma das opções abaixo para continuar.
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild className="min-w-44">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4" />
              Ir para o dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" className={cn("min-w-44", themedOutlineButtonClass)}>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao início
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
