import { getServerSession } from "next-auth";

import { redirectToLogin } from "@/lib/auth-redirect";
import { authOptions } from "@/lib/nextAuth";

export default async function RelatoriosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Usuário não autenticado - redireciona para login
  if (!session?.user) {
    redirectToLogin("/relatorios");
  }

  return <>{children}</>;
}
