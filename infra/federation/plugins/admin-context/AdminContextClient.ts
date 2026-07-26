import {
  parseResolvedAdminAccessContext,
  type ResolvedAdminAccessContext,
} from "@shopana/shared-context";

export class AdminContextClient {
  private readonly endpoint: URL;

  constructor(
    origin: string,
    private readonly serviceToken: string,
    private readonly timeoutMs = 1_000,
  ) {
    if (!origin || !serviceToken) {
      throw new Error("Admin context resolver configuration is required");
    }
    if (Buffer.byteLength(serviceToken, "utf8") < 32) {
      throw new Error(
        "ADMIN_CONTEXT_RESOLVER_INTERNAL_TOKEN must be at least 32 bytes",
      );
    }
    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1 ||
      timeoutMs > 60_000
    ) {
      throw new Error(
        "ADMIN_CONTEXT_RESOLVE_TIMEOUT_MS must be an integer between 1 and 60000",
      );
    }
    const parsedOrigin = new URL(origin);
    if (
      (parsedOrigin.protocol !== "http:" &&
        parsedOrigin.protocol !== "https:") ||
      parsedOrigin.username ||
      parsedOrigin.password
    ) {
      throw new Error("ADMIN_CONTEXT_RESOLVER_URL is invalid");
    }
    this.endpoint = new URL(
      "/internal/admin-context/resolve",
      parsedOrigin,
    );
  }

  async resolve(input: {
    readonly accessToken: string;
    readonly organizationId?: string;
    readonly storeName?: string;
    readonly requestId: string;
  }): Promise<ResolvedAdminAccessContext | null> {
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
      if (code === "ADMIN_CONTEXT_INVALID") return null;
      throw new Error("Admin context resolver authentication failed");
    }
    if (!response.ok) {
      await discardResponse(response);
      throw new Error(`Admin context resolver returned ${response.status}`);
    }
    return parseResolvedAdminAccessContext(
      (await response.json()) as unknown,
    );
  }
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
