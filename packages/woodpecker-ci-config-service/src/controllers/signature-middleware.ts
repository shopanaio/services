import { NextFunction, Request, RequestHandler, Response } from "express";
import { verifyHttpMessageSignature } from "../service/signature";

export interface SignatureMiddlewareConfig {
  publicKey: string;
  skipSignatureVerification?: boolean;
}

/**
 * Creates a middleware that verifies HTTP message signatures
 * using the provided public key.
 */
export function createSignatureMiddleware(
  cfg: SignatureMiddlewareConfig
): RequestHandler {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (cfg.skipSignatureVerification) {
      return void next();
    }

    try {
      const ok = await verifyHttpMessageSignature(req, cfg.publicKey!);
      if (ok) return void next();
      res.status(401).json({ error: "missing or invalid signature" });
    } catch {
      res.status(401).json({ error: "signature validation failed" });
    }
  };
}
