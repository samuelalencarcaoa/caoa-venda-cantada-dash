import { getServerSession } from "next-auth";

import { redirectToLogin } from "@/lib/auth-redirect";
import { authOptions } from "@/lib/nextAuth";

export default async function DashboardV2Layout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirectToLogin("/dashboard");
  }

  return children;
}
