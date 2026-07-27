const METHODS = "GET, POST, PATCH, OPTIONS";
const HEADERS = "Content-Type, Authorization";

function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const configuredId = process.env.CHROME_EXTENSION_ID?.trim();
  if (configuredId && origin === `chrome-extension://${configuredId}`) {
    return origin;
  }

  if (
    process.env.NODE_ENV !== "production" &&
    (origin.startsWith("chrome-extension://") ||
      origin === "http://localhost:3000")
  ) {
    return origin;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return appUrl === origin ? origin : null;
}

export function corsHeaders(request: Request): HeadersInit {
  const origin = allowedOrigin(request);
  return {
    ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
    "Access-Control-Allow-Methods": METHODS,
    "Access-Control-Allow-Headers": HEADERS,
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function corsJson(
  request: Request,
  body: unknown,
  init: ResponseInit = {}
): Response {
  const headers = new Headers(init.headers);
  for (const [key, value] of Object.entries(corsHeaders(request))) {
    headers.set(key, value);
  }
  headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(body), { ...init, headers });
}

export function corsOptions(request: Request): Response {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(request);
  if (origin && !Object.hasOwn(headers, "Access-Control-Allow-Origin")) {
    return corsJson(request, { success: false, error: "Origin not allowed" }, { status: 403 });
  }
  return new Response(null, { status: 204, headers });
}
