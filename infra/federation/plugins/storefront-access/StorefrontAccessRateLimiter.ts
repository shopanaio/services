import type { ResolvedStorefrontAccessContext } from "./types.js";

interface Bucket {
  count: number;
  resetAt: number;
}

export class StorefrontAccessRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  consume(
    context: ResolvedStorefrontAccessContext,
    buyerIp: string | undefined,
  ): boolean {
    const mode = context.access.mode;
    const key =
      mode === "PUBLIC"
        ? `public:${context.access.connectionId}:${context.access.credentialId}:${buyerIp ?? "unknown"}`
        : buyerIp
          ? `private:${context.access.connectionId}:${context.access.credentialId}:${buyerIp}`
          : `private-server:${context.access.credentialId}`;
    const limit =
      mode === "PUBLIC"
        ? numberFromEnv("STOREFRONT_PUBLIC_REQUESTS_PER_MINUTE", 1_000)
        : buyerIp
          ? numberFromEnv("STOREFRONT_PRIVATE_REQUESTS_PER_MINUTE", 5_000)
          : numberFromEnv(
              "STOREFRONT_PRIVATE_SERVER_REQUESTS_PER_MINUTE",
              10_000,
            );
    const now = Date.now();
    const current = this.buckets.get(key);
    if (!current || current.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + 60_000 });
      if (this.buckets.size > 100_000) this.prune(now);
      return true;
    }
    current.count += 1;
    return current.count <= limit;
  }

  private prune(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
