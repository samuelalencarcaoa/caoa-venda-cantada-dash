import type { DefaultSession, DefaultUser } from "next-auth";
import type { JWT as DefaultJWT } from "next-auth/jwt";

import type { AzureAdDirectoryProfile } from "@/lib/azure-ad-profile";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id?: string;
      directory?: AzureAdDirectoryProfile | null;
    };
  }

  interface User extends DefaultUser {
    id?: string;
    directory?: AzureAdDirectoryProfile | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    directory?: AzureAdDirectoryProfile | null;
  }
}
