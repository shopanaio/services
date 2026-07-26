import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import type { StorefrontCredentialKind } from "../repositories/index.js";

const TOKEN_VERSION = 1;
const TOKEN_PATTERN =
  /^shpna_(sfpub|sfprv)_v1_([A-Za-z0-9_-]{22})_([A-Za-z0-9_-]{43})$/;
const MAX_TOKEN_LENGTH = 128;

export interface GeneratedStorefrontCredential {
  readonly token: string;
  readonly kid: string;
  readonly tokenVersion: 1;
  readonly pepperVersion: number;
  readonly digest: Uint8Array;
  readonly hint: string;
}

export interface ParsedStorefrontCredential {
  readonly kind: StorefrontCredentialKind;
  readonly kid: string;
  readonly tokenVersion: 1;
}

export class StorefrontCredentialCrypto {
  constructor(
    private readonly activePepperVersion: number,
    private readonly peppers: ReadonlyMap<number, Buffer>,
    private readonly publicTokenMasterKey: Buffer,
  ) {
    if (!Number.isInteger(activePepperVersion) || activePepperVersion < 1) {
      throw new Error("Invalid storefront token active pepper version");
    }
    if (!peppers.has(activePepperVersion)) {
      throw new Error("Active storefront token pepper is missing");
    }
    if ([...peppers.values()].some((pepper) => pepper.length < 32)) {
      throw new Error("Storefront token peppers must be at least 32 bytes");
    }
    if (publicTokenMasterKey.length !== 32) {
      throw new Error(
        "STOREFRONT_PUBLIC_TOKEN_MASTER_KEY must decode to exactly 32 bytes",
      );
    }
  }

  static fromEnvironment(
    environment: NodeJS.ProcessEnv = process.env,
  ): StorefrontCredentialCrypto {
    const version = Number(
      environment.STOREFRONT_TOKEN_ACTIVE_PEPPER_VERSION,
    );
    const peppers = new Map<number, Buffer>();
    for (const [name, value] of Object.entries(environment)) {
      const match = /^STOREFRONT_TOKEN_PEPPER_V(\d+)$/.exec(name);
      if (match && value) {
        peppers.set(Number(match[1]), decodeSecret(value));
      }
    }
    const master = environment.STOREFRONT_PUBLIC_TOKEN_MASTER_KEY;
    if (!master) {
      throw new Error("STOREFRONT_PUBLIC_TOKEN_MASTER_KEY is required");
    }
    return new StorefrontCredentialCrypto(
      version,
      peppers,
      decodeSecret(master),
    );
  }

  generate(kind: StorefrontCredentialKind): GeneratedStorefrontCredential {
    const kid = randomBytes(16).toString("base64url");
    const secret = randomBytes(32).toString("base64url");
    const prefix = kind === "PUBLIC" ? "sfpub" : "sfprv";
    const token = `shpna_${prefix}_v${TOKEN_VERSION}_${kid}_${secret}`;
    return Object.freeze({
      token,
      kid,
      tokenVersion: TOKEN_VERSION,
      pepperVersion: this.activePepperVersion,
      digest: this.digest(token, this.activePepperVersion),
      hint: token.slice(-8),
    });
  }

  parse(token: string): ParsedStorefrontCredential {
    if (!token || token.length > MAX_TOKEN_LENGTH) {
      throw new Error("Invalid storefront credential");
    }
    const match = TOKEN_PATTERN.exec(token);
    if (!match) throw new Error("Invalid storefront credential");
    return Object.freeze({
      kind: match[1] === "sfpub" ? "PUBLIC" : "PRIVATE",
      kid: match[2],
      tokenVersion: TOKEN_VERSION,
    });
  }

  verify(
    token: string,
    pepperVersion: number,
    expectedDigest: Uint8Array,
  ): boolean {
    const actual = this.digest(token, pepperVersion);
    const expected = Buffer.from(expectedDigest);
    return (
      actual.byteLength === expected.byteLength &&
      timingSafeEqual(Buffer.from(actual), expected)
    );
  }

  encryptPublicToken(
    token: string,
    owner: {
      readonly storeId: string;
      readonly connectionId: string;
      readonly credentialId: string;
    },
  ): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      this.publicTokenMasterKey,
      iv,
    );
    cipher.setAAD(Buffer.from(aad(owner), "utf8"));
    const ciphertext = Buffer.concat([
      cipher.update(token, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
  }

  decryptPublicToken(
    envelope: string,
    owner: {
      readonly storeId: string;
      readonly connectionId: string;
      readonly credentialId: string;
    },
  ): string {
    const [version, iv, ciphertext, tag] = envelope.split(".");
    if (version !== "v1" || !iv || !ciphertext || !tag) {
      throw new Error("Invalid public storefront token envelope");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.publicTokenMasterKey,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAAD(Buffer.from(aad(owner), "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  private digest(token: string, pepperVersion: number): Uint8Array {
    const pepper = this.peppers.get(pepperVersion);
    if (!pepper) throw new Error("Unsupported storefront pepper version");
    return Uint8Array.from(
      createHmac("sha256", pepper).update(token, "utf8").digest(),
    );
  }
}

function aad(owner: {
  readonly storeId: string;
  readonly connectionId: string;
  readonly credentialId: string;
}): string {
  return `${owner.storeId}:${owner.connectionId}:${owner.credentialId}:PUBLIC`;
}

function decodeSecret(value: string): Buffer {
  const trimmed = value.trim();
  if (trimmed.startsWith("base64:")) {
    return Buffer.from(trimmed.slice(7), "base64");
  }
  return Buffer.from(trimmed, "utf8");
}
