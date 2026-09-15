import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

async function refreshGraphAccessToken(refreshToken: string) {
  const tenantId = process.env.AZURE_AD_TENANT_ID;
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) return null;

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: "User.Read",
    }),
    cache: "no-store",
  });
  if (!response.ok) return null;
  const body = await response.json() as { access_token?: string };
  return body.access_token ?? null;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.directory) return new NextResponse(null, { status: 401 });

  try {
    let accessToken = token.graphAccessToken;
    if ((!accessToken || (token.graphAccessTokenExpiresAt ?? 0) * 1000 <= Date.now()) && token.graphRefreshToken) {
      accessToken = await refreshGraphAccessToken(token.graphRefreshToken) ?? undefined;
    }
    if (!accessToken) return new NextResponse(null, { status: 404 });

    const getPhoto = (bearer: string) => fetch("https://graph.microsoft.com/v1.0/me/photos/240x240/$value", {
      headers: { Authorization: `Bearer ${bearer}` },
      cache: "no-store",
    });
    let photo = await getPhoto(accessToken);
    if (photo.status === 401 && token.graphRefreshToken) {
      const refreshed = await refreshGraphAccessToken(token.graphRefreshToken);
      if (refreshed) photo = await getPhoto(refreshed);
    }
    if (!photo.ok) return new NextResponse(null, { status: 404 });

    const contentType = photo.headers.get("content-type") ?? "image/jpeg";
    if (!contentType.startsWith("image/")) return new NextResponse(null, { status: 502 });
    return new NextResponse(photo.body, {
      headers: { "Content-Type": contentType, "Cache-Control": "private, no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
