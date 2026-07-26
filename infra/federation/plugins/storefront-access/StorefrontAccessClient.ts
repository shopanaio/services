import type { ResolvedStorefrontAccessContext } from "./types.js";

export class StorefrontAccessClient {
  constructor(
    private readonly origin: string,
    private readonly serviceToken: string,
    private readonly timeoutMs = 1_000,
  ) {
    if (!origin || !serviceToken) {
      throw new Error("Storefront access resolver configuration is required");
    }
  }

  async resolve(input: {
    readonly token: string;
    readonly accessMode: "PUBLIC" | "PRIVATE";
    readonly buyerIp?: string;
    readonly requestId: string;
  }): Promise<ResolvedStorefrontAccessContext | null> {
    const response = await fetch(
      new URL("/internal/storefront-access/resolve", this.origin),
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.serviceToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          token: input.token,
          accessMode: input.accessMode,
          ...(input.buyerIp ? { buyerIp: input.buyerIp } : {}),
          requestId: input.requestId,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    if (response.status === 401) return null;
    if (!response.ok) {
      throw new Error(`Storefront resolver returned ${response.status}`);
    }
    return (await response.json()) as ResolvedStorefrontAccessContext;
  }
}
