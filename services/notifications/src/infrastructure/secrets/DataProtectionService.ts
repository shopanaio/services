import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";

export class DataProtectionService {
  private readonly encryptionKey: Buffer;
  private readonly hashKey: Buffer;

  constructor(masterKey: string) {
    this.encryptionKey = createHash("sha256").update(`encryption:${masterKey}`).digest();
    this.hashKey = createHash("sha256").update(`hash:${masterKey}`).digest();
  }

  encrypt(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decrypt(value: string): string {
    const [version, iv, tag, ciphertext] = value.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext) {
      throw new Error("Unsupported notification ciphertext");
    }
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.encryptionKey,
      Buffer.from(iv, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  }

  hash(value: string): string {
    return createHmac("sha256", this.hashKey).update(value.trim().toLowerCase()).digest("hex");
  }
}
