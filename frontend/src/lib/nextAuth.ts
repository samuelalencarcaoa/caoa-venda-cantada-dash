import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

import {
  buildAzureAdDirectorySnapshot,
  decodeAzureAdIdToken,
} from "@/lib/azure-ad-profile";

const allowFallbackAuth =
  process.env.NEXTAUTH_FALLBACK_AUTH === "true" ||
  process.env.NEXT_PUBLIC_FALLBACK_AUTH === "true";

export const authOptions: NextAuthOptions = {
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID || "",
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
      tenantId: process.env.AZURE_AD_TENANT_ID || "",
      authorization: {
        params: {
          scope: "openid profile email User.Read",
        },
      },
    }),

    ...(allowFallbackAuth
      ? [
          CredentialsProvider({
            name: "Credenciais temporárias",
            credentials: {
              username: { label: "Usuário", type: "text" },
              password: { label: "Senha", type: "password" },
            },

            async authorize(credentials) {
              if (!credentials) return null;

              const { validateCredentials } = await import("@/lib/auth");

              const user = await validateCredentials(
                credentials.username,
                credentials.password
              );

              if (!user) return null;

              return {
                id: user.username,
                name: user.displayName,
                email: user.email,
              };
            },
          }),
        ]
      : []),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
    error: "/access-denied",
  },

  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`;
      }

      if (new URL(url).origin === baseUrl) {
        return url;
      }

      return `${baseUrl}/sales-intention`;
    },

    async signIn({ account }) {
      if (account?.provider === "credentials") {
        return true;
      }

      // O provedor Azure AD já valida a identidade do usuário no tenant configurado.
      return true;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: session.user?.id || token.sub || token.directory?.stableId || undefined,
          name: session.user?.name || token.name || undefined,
          email: session.user?.email || token.email || undefined,
          image: session.user?.image || token.picture || undefined,
          directory: token.directory ?? null,
        };
      }

      return session;
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.name = token.name || user.name || undefined;
        token.email = token.email || user.email || undefined;
        token.picture = token.picture || user.image || undefined;
      }

      if (account?.provider === "azure-ad") {
        const claimsSource = decodeAzureAdIdToken(account.id_token) ?? profile;
        const snapshot = await buildAzureAdDirectorySnapshot({
          claimsSource,
          accessToken: account.access_token,
        });

        token.directory = snapshot.directory;
        token.picture = token.picture || snapshot.picture || undefined;
        token.name = token.name || snapshot.displayName || undefined;
        token.email = token.email || snapshot.email || undefined;
        token.sub = token.sub || snapshot.stableId || undefined;
      }

      return token;
    },
  },
};

export default function NextAuthHandler() {
  return NextAuth(authOptions);
}
