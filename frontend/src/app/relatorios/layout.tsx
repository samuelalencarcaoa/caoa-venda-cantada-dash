import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/nextAuth";
import { redirect } from "next/navigation";

export default async function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Usuário não autenticado - redireciona para login
  if (!session?.user) {
    redirect("/login?error=AccessDenied");
  }

  return <>{children}</>;
}
