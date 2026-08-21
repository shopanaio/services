export const REQUEST_TIMESTAMP_HEADER = "x-shopana-request-timestamp";

/**
 * Read the gateway-assigned request timestamp from a Fastify header value.
 * Direct subgraph requests fall back to the time at which their context is built.
 */
export function resolveRequestTimestamp(
  header: string | string[] | undefined,
  fallback: () => number = Date.now,
): number {
  if (header === undefined) {
    return fallback();
  }

  if (Array.isArray(header) || !/^\d+$/.test(header)) {
    throw new Error(`${REQUEST_TIMESTAMP_HEADER} must be a single Unix timestamp in milliseconds`);
  }

  const timestamp = Number(header);
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error(
      `${REQUEST_TIMESTAMP_HEADER} must be a non-negative safe integer Unix timestamp in milliseconds`,
    );
  }

  return timestamp;
}
