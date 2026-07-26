const WEBSOCKET_REQUEST_URL = "http://gateway.internal/graphql";
const MAX_HEADER_BYTES = 16_384;

export function createWebSocketRequest(
  connectionParams: Readonly<Record<string, unknown>> | undefined,
  allowedHeaders: ReadonlySet<string>,
): Request {
  const headers = new Headers();
  const seen = new Set<string>();

  for (const [name, value] of Object.entries(connectionParams ?? {})) {
    const normalizedName = name.toLowerCase();
    if (!allowedHeaders.has(normalizedName)) continue;
    if (
      seen.has(normalizedName) ||
      typeof value !== "string" ||
      Buffer.byteLength(value, "utf8") > MAX_HEADER_BYTES
    ) {
      throw Object.assign(new Error("Invalid WebSocket connection header"), {
        status: 400,
        code: "WEBSOCKET_HEADER_INVALID",
      });
    }
    seen.add(normalizedName);
    headers.set(normalizedName, value);
  }

  return new Request(WEBSOCKET_REQUEST_URL, { headers });
}
