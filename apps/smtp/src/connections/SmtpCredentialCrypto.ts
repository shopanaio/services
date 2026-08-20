import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class SmtpCredentialCrypto {
  constructor(private readonly masterKey: Buffer) {
    if (masterKey.length !== 32) {
      throw new Error("SMTP_CREDENTIAL_MASTER_KEY must decode to exactly 32 bytes");
    }
  }

  static fromEnvironment(environment: NodeJS.ProcessEnv = process.env): SmtpCredentialCrypto {
    const value = environment.SMTP_CREDENTIAL_MASTER_KEY;
    if (!value) {
      throw new Error("SMTP_CREDENTIAL_MASTER_KEY is required");
    }
    return new SmtpCredentialCrypto(decodeSecret(value));
  }

  encrypt(
    password: string,
    owner: { readonly storeId: string; readonly connectionId: string },
  ): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.masterKey, iv);
    cipher.setAAD(Buffer.from(aad(owner), "utf8"));
    const ciphertext = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${tag.toString("base64url")}`;
  }

  decrypt(
    envelope: string,
    owner: { readonly storeId: string; readonly connectionId: string },
  ): string {
    const [version, iv, ciphertext, tag] = envelope.split(".");
    if (version !== "v1" || !iv || !ciphertext || !tag) {
      throw new Error("Invalid SMTP credential envelope");
    }
    const decipher = createDecipheriv("aes-256-gcm", this.masterKey, Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(aad(owner), "utf8"));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }
}

function aad(owner: { readonly storeId: string; readonly connectionId: string }): string {
  return `${owner.storeId}:${owner.connectionId}:SMTP_PASSWORD`;
}

function decodeSecret(value: string): Buffer {
  const trimmed = value.trim();
  return trimmed.startsWith("base64:")
    ? Buffer.from(trimmed.slice(7), "base64")
    : Buffer.from(trimmed, "utf8");
}
