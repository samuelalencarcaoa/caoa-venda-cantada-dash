import { NextResponse, type NextRequest } from 'next/server';

const REQUEST_TIMEOUT_MS = 10000;

function normalizeBaseUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\/+$/, '');
}

function getBackendBaseUrls() {
  return Array.from(
    new Set(
      [
        normalizeBaseUrl(process.env.API_BASE_URL),
        normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL),
        'http://localhost:4000',
        'http://localhost:4001',
        'http://backend:4000'
      ].filter((value): value is string => Boolean(value))
    )
  );
}

async function forwardResponse(response: Response) {
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return NextResponse.json(await response.json(), { status: response.status });
  }

  const body = await response.text();
  return new NextResponse(body, {
    status: response.status,
    headers: contentType
      ? { 'content-type': contentType }
      : { 'content-type': 'text/plain; charset=utf-8' }
  });
}

export async function proxyBackendRequest(
  request: NextRequest,
  path: string,
  messages: {
    notFound: string;
    responseError: string;
    unavailable: string;
  }
) {
  const headers = new Headers(request.headers);
  headers.delete('host');

  const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text();
  const baseUrls = getBackendBaseUrls();

  for (const baseUrl of baseUrls) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: request.method,
        headers,
        body,
        signal: controller.signal
      });

      if (!response.ok) {
        return NextResponse.json(
          {
            message: response.status === 404 ? messages.notFound : messages.responseError
          },
          { status: response.status }
        );
      }

      return forwardResponse(response);
    } catch {
      // Try the next backend URL before giving up.
    } finally {
      clearTimeout(timeout);
    }
  }

  return NextResponse.json(
    {
      message: messages.unavailable
    },
    { status: 503 }
  );
}
