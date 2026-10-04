function originOf(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function hasValidOrigin(request: Request) {
  const origin = originOf(request.headers.get("origin"));
  if (!origin) return false;

  const candidates = new Set<string>();
  const add = (value: string | null | undefined) => {
    const candidate = originOf(value);
    if (candidate) candidates.add(candidate);
  };

  add(request.url);
  add(process.env.URL);
  add(process.env.DEPLOY_PRIME_URL);
  add(process.env.DEPLOY_URL);

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (host) add(`${forwardedProtocol || new URL(origin).protocol.replace(":", "")}://${host.split(",")[0].trim()}`);

  return candidates.has(origin);
}
