export const DEFAULT_POST_LOGIN_PATH = "/sales-intention";
const LOGIN_PATH = "/login";

export function getSafeCallbackUrl(value: string | null | undefined, baseOrigin?: string) {
  if (!value) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  if (value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }

  if (baseOrigin) {
    try {
      const parsedUrl = new URL(value);

      if (parsedUrl.origin === baseOrigin) {
        return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
      }
    } catch {
      // Ignore invalid URLs and fall back to the default route.
    }
  }

  return DEFAULT_POST_LOGIN_PATH;
}

export function buildLoginRedirectHref(callbackUrl: string, baseOrigin?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("callbackUrl", getSafeCallbackUrl(callbackUrl, baseOrigin));

  return `${LOGIN_PATH}?${searchParams.toString()}`;
}
