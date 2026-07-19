import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ENVELOPE_PREFIX = "iam-auth-keyring.v1";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;

export type ApplicationAuthEncryptionContext =
  | {
      applicationId: string;
      model: "provider";
      provider: "google" | "facebook";
      field: "clientId" | "clientSecret";
    }
  | {
      applicationId: string;
      model: "jwks";
      rowId: string;
      field: "privateKey";
    };

export interface ApplicationAuthRootKeyProvider {
  readonly activeVersion: number;
  getKey(version: number): Buffer | undefined;
  versions(): readonly number[];
}

/**
 * Development adapter for the platform secrets port. Production composition
 * must supply the same interface from its secrets backend.
 */
export class EnvironmentApplicationAuthRootKeyProvider
  implements ApplicationAuthRootKeyProvider
{
  public readonly activeVersion: number;
  private readonly keys: ReadonlyMap<number, Buffer>;

  constructor(input: { activeVersion: number; keys: ReadonlyMap<number, Buffer> }) {
    this.activeVersion = assertPositiveVersion(input.activeVersion);
    this.keys = new Map(input.keys);
    if (!this.keys.has(this.activeVersion)) {
      throw new Error(
        `IAM application auth root key version ${this.activeVersion} is unavailable`
      );
    }
    for (const [version, key] of this.keys) {
      assertPositiveVersion(version);
      if (key.byteLength !== KEY_BYTES) {
        throw new Error(
          `IAM application auth root key version ${version} must be ${KEY_BYTES} bytes`
        );
      }
    }
  }

  static fromEnvironment(
    environment: NodeJS.ProcessEnv
  ): EnvironmentApplicationAuthRootKeyProvider {
    if (environment.NODE_ENV === "production") {
      throw new Error(
        "Environment application auth root keys are disabled in production; configure the platform secrets provider"
      );
    }
    const activeRaw = environment.IAM_APPLICATION_AUTH_ACTIVE_KEY_VERSION;
    const keysRaw = environment.IAM_APPLICATION_AUTH_ROOT_KEYS;
    if (!activeRaw || !keysRaw) {
      throw new Error(
        "IAM application auth root keys are not configured"
      );
    }

    const activeVersion = Number(activeRaw);
    let encodedKeys: unknown;
    try {
      encodedKeys = JSON.parse(keysRaw);
    } catch {
      throw new Error("IAM application auth root keys configuration is invalid");
    }
    if (
      !encodedKeys ||
      typeof encodedKeys !== "object" ||
      Array.isArray(encodedKeys)
    ) {
      throw new Error("IAM application auth root keys configuration is invalid");
    }

    const keys = new Map<number, Buffer>();
    for (const [versionRaw, encodedKey] of Object.entries(encodedKeys)) {
      const version = Number(versionRaw);
      if (typeof encodedKey !== "string") {
        throw new Error(
          `IAM application auth root key version ${versionRaw} is invalid`
        );
      }
      const key = Buffer.from(encodedKey, "base64");
      if (key.toString("base64") !== encodedKey && key.toString("base64url") !== encodedKey) {
        throw new Error(
          `IAM application auth root key version ${versionRaw} is not canonical base64`
        );
      }
      keys.set(assertPositiveVersion(version), key);
    }

    return new EnvironmentApplicationAuthRootKeyProvider({
      activeVersion,
      keys,
    });
  }

  getKey(version: number): Buffer | undefined {
    const key = this.keys.get(version);
    return key ? Buffer.from(key) : undefined;
  }

  versions(): readonly number[] {
    return [...this.keys.keys()].sort((left, right) => left - right);
  }
}

/** AES-256-GCM application secret envelope with versioned root keys. */
export class ApplicationAuthKeyring {
  public readonly activeVersion: number;

  constructor(private readonly rootKeys: ApplicationAuthRootKeyProvider) {
    this.activeVersion = rootKeys.activeVersion;
    const key = this.getRequiredKey(this.activeVersion);
    key.fill(0);
  }

  assertVersionsAvailable(versions: Iterable<number>): void {
    const activeKey = this.getRequiredKey(this.activeVersion);
    activeKey.fill(0);
    for (const version of new Set(versions)) {
      const key = this.getRequiredKey(version);
      key.fill(0);
    }
  }

  hasVersion(version: number): boolean {
    const key = this.rootKeys.getKey(version);
    key?.fill(0);
    return key !== undefined;
  }

  encrypt(
    plaintext: string,
    context: ApplicationAuthEncryptionContext,
    keyVersion = this.activeVersion
  ): string {
    if (!plaintext) {
      throw new Error("Application auth secret plaintext must not be empty");
    }
    const key = this.getRequiredKey(keyVersion);
    const iv = randomBytes(IV_BYTES);
    try {
      const cipher = createCipheriv("aes-256-gcm", key, iv, {
        authTagLength: AUTH_TAG_BYTES,
      });
      cipher.setAAD(serializeContext(context));
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag();
      return [
        ENVELOPE_PREFIX,
        String(keyVersion),
        iv.toString("base64url"),
        authTag.toString("base64url"),
        ciphertext.toString("base64url"),
      ].join(".");
    } finally {
      key.fill(0);
    }
  }

  decrypt(
    envelope: string,
    context: ApplicationAuthEncryptionContext
  ): string {
    const parsed = parseEnvelope(envelope);
    const key = this.getRequiredKey(parsed.keyVersion);
    try {
      const decipher = createDecipheriv("aes-256-gcm", key, parsed.iv, {
        authTagLength: AUTH_TAG_BYTES,
      });
      decipher.setAAD(serializeContext(context));
      decipher.setAuthTag(parsed.authTag);
      return Buffer.concat([
        decipher.update(parsed.ciphertext),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new Error("Application auth secret could not be decrypted");
    } finally {
      key.fill(0);
    }
  }

  reencrypt(
    envelope: string,
    context: ApplicationAuthEncryptionContext,
    targetVersion = this.activeVersion
  ): string {
    const plaintext = this.decrypt(envelope, context);
    return this.encrypt(plaintext, context, targetVersion);
  }

  getEnvelopeKeyVersion(envelope: string): number {
    return parseEnvelope(envelope).keyVersion;
  }

  /** Used only by the realm-secret derivation service. */
  withRootKey<TResult>(
    version: number,
    operation: (key: Buffer) => TResult
  ): TResult {
    const key = this.getRequiredKey(version);
    try {
      return operation(key);
    } finally {
      key.fill(0);
    }
  }

  private getRequiredKey(version: number): Buffer {
    const validVersion = assertPositiveVersion(version);
    const key = this.rootKeys.getKey(validVersion);
    if (!key) {
      throw new Error(
        `IAM application auth root key version ${validVersion} is unavailable`
      );
    }
    if (key.byteLength !== KEY_BYTES) {
      throw new Error(
        `IAM application auth root key version ${validVersion} is invalid`
      );
    }
    return key;
  }
}

function serializeContext(context: ApplicationAuthEncryptionContext): Buffer {
  const entries =
    context.model === "provider"
      ? [
          context.applicationId,
          context.model,
          context.provider,
          context.field,
        ]
      : [context.applicationId, context.model, context.rowId, context.field];
  return Buffer.from(JSON.stringify(entries), "utf8");
}

function parseEnvelope(envelope: string): {
  keyVersion: number;
  iv: Buffer;
  authTag: Buffer;
  ciphertext: Buffer;
} {
  const parts = envelope.split(".");
  if (
    parts.length !== 6 ||
    `${parts[0]}.${parts[1]}` !== ENVELOPE_PREFIX
  ) {
    throw new Error("Application auth secret envelope is invalid");
  }
  const keyVersion = assertPositiveVersion(Number(parts[2]));
  const iv = decodeCanonicalBase64Url(parts[3]);
  const authTag = decodeCanonicalBase64Url(parts[4]);
  const ciphertext = decodeCanonicalBase64Url(parts[5]);
  if (iv.byteLength !== IV_BYTES || authTag.byteLength !== AUTH_TAG_BYTES) {
    throw new Error("Application auth secret envelope is invalid");
  }
  return { keyVersion, iv, authTag, ciphertext };
}

function decodeCanonicalBase64Url(value: string): Buffer {
  const decoded = Buffer.from(value, "base64url");
  const canonical = Buffer.from(decoded.toString("base64url"), "utf8");
  const input = Buffer.from(value, "utf8");
  if (
    canonical.byteLength !== input.byteLength ||
    !timingSafeEqual(canonical, input)
  ) {
    throw new Error("Application auth secret envelope is invalid");
  }
  return decoded;
}

function assertPositiveVersion(version: number): number {
  if (!Number.isSafeInteger(version) || version <= 0) {
    throw new Error("IAM application auth key version must be a positive integer");
  }
  return version;
}
