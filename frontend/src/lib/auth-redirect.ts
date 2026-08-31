import { redirect } from "next/navigation";

import { buildLoginRedirectHref } from "@/lib/auth-routing";

export function redirectToLogin(callbackUrl: string): never {
  redirect(buildLoginRedirectHref(callbackUrl));
}
