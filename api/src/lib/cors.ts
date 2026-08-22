function configuredPublicOrigin(): string | null {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (!configured) return null;
  return configured.replace(/\/+$/, "");
}

export function isAllowedCorsOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    if (
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      return true;
    }
    const normalized = origin.replace(/\/+$/, "");
    const allowed = new Set(
      ["https://learnsphere.knurdz.org", configuredPublicOrigin()].filter(
        (value): value is string => Boolean(value),
      ),
    );
    return allowed.has(normalized);
  } catch {
    return false;
  }
}

export function corsHeaderRecord(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Authorization, Content-Type, X-LearnSphere-Locale, X-Timezone",
    "Access-Control-Max-Age": "86400",
  };
  if (isAllowedCorsOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}
