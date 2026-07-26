import type { ContextCustomer } from "@shopana/shared-context";

export interface ResolvedStorefrontCustomerContext {
  readonly customer: ContextCustomer;
  readonly cacheUntil: Date;
}

export class StorefrontCustomerContextClient {
  private readonly endpoint: URL;

  constructor(
    origin: string,
    private readonly serviceToken: string,
    private readonly timeoutMs = 1_000,
  ) {
    if (!origin || !serviceToken) {
      throw new Error(
        "Storefront customer context resolver configuration is required",
      );
    }
    if (Buffer.byteLength(serviceToken, "utf8") < 32) {
      throw new Error(
        "STOREFRONT_RESOLVER_INTERNAL_TOKEN must be at least 32 bytes",
      );
    }
    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 60_000
    ) {
      throw new Error(
        "STOREFRONT_CUSTOMER_CONTEXT_RESOLVE_TIMEOUT_MS must be an integer between 1 and 60000",
      );
    }
    const parsedOrigin = new URL(origin);
    if (
      (parsedOrigin.protocol !== "http:" &&
        parsedOrigin.protocol !== "https:") ||
      parsedOrigin.username ||
      parsedOrigin.password
    ) {
      throw new Error("STOREFRONT_CUSTOMER_CONTEXT_RESOLVER_URL is invalid");
    }
    this.endpoint = new URL(
      "/internal/storefront-customer-context/resolve",
      parsedOrigin,
    );
  }

  async resolve(input: {
    readonly accessToken: string;
    readonly storeId: string;
    readonly organizationId: string;
    readonly requestId: string;
  }): Promise<ResolvedStorefrontCustomerContext | null> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.serviceToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (response.status === 401) {
      const code = await readErrorCode(response);
      if (code === "STOREFRONT_CUSTOMER_INVALID") return null;
      throw new Error("Storefront customer resolver authentication failed");
    }
    if (!response.ok) {
      await discardResponse(response);
      throw new Error(
        `Storefront customer resolver returned ${response.status}`,
      );
    }
    return parseResponse((await response.json()) as unknown);
  }
}

function parseResponse(value: unknown): ResolvedStorefrontCustomerContext {
  if (!isRecord(value) || !isRecord(value.customer)) {
    throw new Error("Invalid storefront customer resolver response");
  }
  const customer = value.customer;
  const cacheUntil = new Date(requiredString(value, "cacheUntil"));
  if (
    Number.isNaN(cacheUntil.getTime()) ||
    cacheUntil.getTime() <= Date.now() ||
    !hasNullableStrings(customer, [
      "email",
      "firstName",
      "lastName",
      "phone",
      "language",
    ]) ||
    typeof customer.isVerified !== "boolean" ||
    typeof customer.isBlocked !== "boolean"
  ) {
    throw new Error("Invalid storefront customer resolver response");
  }
  return Object.freeze({
    customer: Object.freeze({
      id: requiredString(customer, "id"),
      email: customer.email as string | null,
      firstName: customer.firstName as string | null,
      lastName: customer.lastName as string | null,
      phone: customer.phone as string | null,
      language: customer.language as string | null,
      isVerified: customer.isVerified,
      isBlocked: customer.isBlocked,
      createdAt: requiredString(customer, "createdAt"),
      updatedAt: requiredString(customer, "updatedAt"),
    }),
    cacheUntil,
  });
}

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const value = (await response.json()) as unknown;
    return isRecord(value) && typeof value.code === "string"
      ? value.code
      : undefined;
  } catch {
    await discardResponse(response);
    return undefined;
  }
}

async function discardResponse(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The body may already be consumed or locked by a failed JSON read.
  }
}

function requiredString(
  value: Record<string, unknown>,
  key: string,
): string {
  const current = value[key];
  if (
    typeof current !== "string" ||
    current.length === 0 ||
    current.length > 1_024
  ) {
    throw new Error("Invalid storefront customer resolver response");
  }
  return current;
}

function hasNullableStrings(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return keys.every(
    (key) => value[key] === null || typeof value[key] === "string",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
