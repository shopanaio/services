import { createHmac } from "node:crypto";

export const APPLICATION_AUTH_RATE_LIMIT_PORT = Symbol.for(
  "shopana.iam.application-auth-rate-limit-port"
);

export interface ApplicationAuthRateLimitConsumeInput {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface ApplicationAuthRateLimitConsumeResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

/** Production implementations must perform this operation atomically. */
export interface ApplicationAuthRateLimitPort {
  consume(
    input: ApplicationAuthRateLimitConsumeInput
  ): Promise<ApplicationAuthRateLimitConsumeResult>;
}

export class ApplicationAuthRateLimitError extends Error {
  constructor(
    public readonly statusCode: 429 | 503,
    public readonly retryAfterSeconds: number,
    public readonly oauthError: "slow_down" | "temporarily_unavailable"
  ) {
    super(
      statusCode === 429
        ? "Authentication request rate limit exceeded"
        : "Authentication request is temporarily unavailable"
    );
    this.name = "ApplicationAuthRateLimitError";
  }
}

interface LocalEntry {
  count: number;
  expiresAt: number;
}

/**
 * Enforces the application-auth baseline policies. A shared port is used when present;
 * local buckets are only the documented tighter emergency mode.
 */
export class ApplicationAuthRateLimiter {
  private readonly emergency = new Map<string, LocalEntry>();

  constructor(
    private readonly port?: ApplicationAuthRateLimitPort,
    private readonly now: () => number = Date.now
  ) {}

  async assertPasswordSignIn(input: {
    applicationId: string;
    normalizedEmail: string;
    ip: string;
    secret: string;
  }): Promise<void> {
    const identity = digest(input.secret, input.normalizedEmail);
    const ip = digest(input.secret, input.ip);
    await this.consume(
      [
        bucket(input, "password-signin:identity", `${identity}:${ip}`, 5, 60),
        bucket(input, "password-signin:ip", ip, 30, 15 * 60),
      ],
      "required"
    );
  }

  async assertPasswordReset(input: {
    applicationId: string;
    normalizedEmail: string;
    ip: string;
    secret: string;
  }): Promise<void> {
    const identity = digest(input.secret, input.normalizedEmail);
    const ip = digest(input.secret, input.ip);
    await this.consume(
      [
        bucket(input, "password-reset:identity-hour", `${identity}:${ip}`, 3, 60 * 60),
        bucket(input, "password-reset:ip-hour", ip, 20, 60 * 60),
        bucket(input, "password-reset:identity-day", `${identity}:${ip}`, 10, 24 * 60 * 60),
      ],
      "required"
    );
  }

  async assertEmailOtpRequest(input: {
    applicationId: string;
    normalizedEmail: string;
    ip: string;
    secret: string;
  }): Promise<void> {
    const identity = digest(input.secret, input.normalizedEmail);
    const ip = digest(input.secret, input.ip);
    const identityAndRequester = `${identity}:${ip}`;
    await this.consume(
      [
        bucket(
          input,
          "email-otp-request:cooldown",
          identityAndRequester,
          1,
          60
        ),
        bucket(
          input,
          "email-otp-request:identity-window",
          identity,
          3,
          15 * 60
        ),
        bucket(
          input,
          "email-otp-request:identity-day",
          identity,
          20,
          24 * 60 * 60
        ),
        bucket(
          input,
          "email-otp-request:ip-day",
          ip,
          100,
          24 * 60 * 60
        ),
      ],
      "required"
    );
  }

  async assertEmailOtpVerify(input: {
    applicationId: string;
    verificationId: string;
    ip: string;
    secret: string;
  }): Promise<void> {
    const verification = digest(input.secret, input.verificationId);
    const ip = digest(input.secret, input.ip);
    await this.consume(
      [
        bucket(
          input,
          "email-otp-verify:challenge",
          verification,
          3,
          5 * 60
        ),
        bucket(
          input,
          "email-otp-verify:ip-window",
          ip,
          10,
          15 * 60
        ),
      ],
      "required"
    );
  }

  async assertAuthorize(input: {
    applicationId: string;
    clientId: string;
    ip: string;
    secret: string;
  }): Promise<void> {
    await this.consume(
      [
        bucket(
          input,
          "oauth-authorize",
          `${digest(input.secret, input.clientId)}:${digest(input.secret, input.ip)}`,
          60,
          60
        ),
      ],
      "fallback",
      30,
      60
    );
  }

  async assertToken(input: {
    applicationId: string;
    clientId: string;
    ip: string;
    secret: string;
  }): Promise<void> {
    const subject = `${digest(input.secret, input.clientId)}:${digest(
      input.secret,
      input.ip
    )}`;
    await this.consume(
      [
        bucket(input, "oauth-token:minute", subject, 30, 60),
        bucket(input, "oauth-token:burst", subject, 10, 10),
      ],
      "fallback",
      5,
      10
    );
  }

  private async consume(
    requests: readonly ApplicationAuthRateLimitConsumeInput[],
    availability: "required" | "fallback",
    emergencyLimit = 1,
    emergencyWindowSeconds = 60
  ): Promise<void> {
    if (this.port) {
      try {
        for (const request of requests) {
          const result = await this.port.consume(request);
          if (!result.allowed) {
            throw new ApplicationAuthRateLimitError(
              429,
              result.retryAfterSeconds ?? request.windowSeconds,
              "slow_down"
            );
          }
        }
        return;
      } catch (error) {
        if (error instanceof ApplicationAuthRateLimitError) throw error;
        if (availability === "required") {
          throw new ApplicationAuthRateLimitError(
            503,
            60,
            "temporarily_unavailable"
          );
        }
      }
    } else if (availability === "required") {
      throw new ApplicationAuthRateLimitError(
        503,
        60,
        "temporarily_unavailable"
      );
    }

    const emergencyKey = `emergency:${requests.map((item) => item.key).join(":")}`;
    const now = this.now();
    const current = this.emergency.get(emergencyKey);
    if (!current || current.expiresAt <= now) {
      this.emergency.set(emergencyKey, {
        count: 1,
        expiresAt: now + emergencyWindowSeconds * 1_000,
      });
      this.prune(now);
      return;
    }
    if (current.count >= emergencyLimit) {
      throw new ApplicationAuthRateLimitError(
        429,
        Math.max(1, Math.ceil((current.expiresAt - now) / 1_000)),
        "slow_down"
      );
    }
    current.count += 1;
  }

  private prune(now: number): void {
    if (this.emergency.size < 10_000) return;
    for (const [key, value] of this.emergency) {
      if (value.expiresAt <= now) this.emergency.delete(key);
    }
  }
}

function bucket(
  input: { applicationId: string; secret: string },
  policy: string,
  subject: string,
  limit: number,
  windowSeconds: number
): ApplicationAuthRateLimitConsumeInput {
  return {
    key: digest(
      input.secret,
      `shopana:iam:application-auth-rate-limit:v1:${input.applicationId}:${policy}:${subject}`
    ),
    limit,
    windowSeconds,
  };
}

function digest(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value, "utf8").digest("base64url");
}
