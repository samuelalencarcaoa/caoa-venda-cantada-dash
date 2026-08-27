import NextAuth from "next-auth";
import AzureAD from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";

function getStringField(value: unknown, key: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const field = record[key];

  return typeof field === "string" ? field : undefined;
}

function getMicrosoftUserEmail(user: { email?: string | null }, profile?: unknown) {
  const candidates = [
    user.email,
    getStringField(profile, "email"),
    getStringField(profile, "preferred_username"),
    getStringField(profile, "upn"),
    getStringField(profile, "unique_name"),
  ];

  return candidates
    .find((candidate) => candidate?.includes("@"))
    ?.trim()
    .toLowerCase();
}

const allowedDomains = (process.env.AUTH_ALLOWED_DOMAINS || "caoa.com.br")
  .split(",")
  .map((domain) => domain.trim().replace(/^@/, "").toLowerCase())
  .filter(Boolean);

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

    async signIn({ user, profile, account }) {
      if (account?.provider === "credentials") {
        return true;
      }

      const userEmail = getMicrosoftUserEmail(user, profile);

      if (!userEmail) {
        return false;
      }

      const isAllowed = allowedDomains.some((domain) => userEmail.endsWith(`@${domain}`));

      if (!isAllowed) {
        return `/access-denied?error=AccessDenied&email=${encodeURIComponent(userEmail)}`;
      }

      return true;
    },

    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          name: session.user?.name || token.name || undefined,
          email: session.user?.email || token.email || undefined,
          image: session.user?.image || token.picture || undefined,
        };
      }

      return session;
    },

    async jwt({ token, user, account, profile }) {
      if (user) {
        token.name = token.name || user.name || undefined;
        token.email = token.email || user.email || undefined;
        token.picture =
          token.picture ||
          user.image ||
          getStringField(profile, "picture");
      }

      if (
        account?.provider === "azure-ad" &&
        account.access_token
      ) {
        try {
          const response = await fetch(
            "https://graph.microsoft.com/v1.0/me/photos/48x48/$value",
            {
              headers: {
                Authorization: `Bearer ${account.access_token}`,
              },
            }
          );

          if (response.ok) {
            const contentType =
              response.headers.get("content-type") ?? "image/jpeg";

            const buffer = Buffer.from(await response.arrayBuffer());

            token.picture = `data:${contentType};base64,${buffer.toString(
              "base64"
            )}`;
          }
        } catch {
          // Ignora erros ao buscar foto
        }
      }

      return token;
    },
  },
};

export default function NextAuthHandler() {
  return NextAuth(authOptions);
}
