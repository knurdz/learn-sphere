/**
 * Public origin for asset URLs handed to the mobile app.
 *
 * Behind Caddy the app server receives plain HTTP, so `request.nextUrl.origin`
 * would emit `http://` URLs that Android release builds refuse to load.
 */
export function resolvePublicOrigin(request: Request, fallbackOrigin: string): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");

  const firstValue = (name: string) =>
    request.headers.get(name)?.split(",")[0]?.trim() || null;

  const host = firstValue("x-forwarded-host") ?? firstValue("host");
  if (!host) return fallbackOrigin;

  const protocol =
    firstValue("x-forwarded-proto") ?? new URL(fallbackOrigin).protocol.replace(":", "");

  return `${protocol}://${host}`;
}
