import "server-only";

/** Read Snwolley credentials at call time so env reloads are picked up. */
export function getSnwolleyCredentials() {
  const rawKey = process.env.SNWOLLEY_API_KEY?.trim();
  const rawSecret = process.env.SNWOLLEY_API_SECRET?.trim();

  const apiKey =
    rawKey && rawKey !== "your-snwolley-api-key" ? rawKey : undefined;
  const apiSecret =
    rawSecret && rawSecret !== "your-snwolley-api-secret" ? rawSecret : undefined;

  return { apiKey, apiSecret };
}

/** Headers Snwolley expects for REST calls (STT/TTS/chat). */
export function snwolleyAuthHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const { apiKey, apiSecret } = getSnwolleyCredentials();
  const headers: Record<string, string> = { ...extra };
  if (apiKey) headers["X-API-Key"] = apiKey;
  if (apiSecret) headers["X-API-Secret"] = apiSecret;
  return headers;
}

export function isSnwolleyConfigured(): boolean {
  return Boolean(getSnwolleyCredentials().apiKey);
}
