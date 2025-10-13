import type { Request } from "express";
import { verifyHttpMessageSignature, verifyHmacSignature } from "../core/signature";

export interface SignatureVerifier {
  verify(req: Request): Promise<boolean>;
}

export class HttpMessageSignatureVerifier implements SignatureVerifier {
  private readonly publicKeyHex: string;
  constructor(publicKeyHex: string) {
    this.publicKeyHex = publicKeyHex;
  }
  async verify(req: Request): Promise<boolean> {
    if (!req.headers["signature"] || !req.headers["signature-input"]) return false;
    return verifyHttpMessageSignature(req, this.publicKeyHex);
  }
}

export class HmacSignatureVerifier implements SignatureVerifier {
  private readonly secret: string;
  constructor(secret: string) {
    this.secret = secret;
  }
  async verify(req: Request): Promise<boolean> {
    if (!req.headers["x-woodpecker-signature"] && !req.headers["x-drone-signature"]) return false;
    return verifyHmacSignature(req, this.secret);
  }
}

export class CompositeSignatureVerifier implements SignatureVerifier {
  private readonly verifiers: SignatureVerifier[];
  constructor(verifiers: SignatureVerifier[]) {
    this.verifiers = verifiers;
  }
  async verify(req: Request): Promise<boolean> {
    for (const v of this.verifiers) {
      try {
        if (await v.verify(req)) return true;
      } catch {}
    }
    return false;
  }
}
