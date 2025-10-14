import { NextFunction, Request, RequestHandler, Response } from "express";
import { httpbis, createVerifier } from "http-message-signatures";
import type { Request as HttpSigRequest } from "http-message-signatures/lib/types";

export interface SignatureMiddlewareConfig {
  publicKey: string;
}

/**
 * Creates a middleware that verifies HTTP message signatures
 * using the provided public key.
 *
 * @param cfg - Configuration with ed25519 public key in PEM format
 * @returns Express middleware that verifies HTTP signatures according to RFC 9421
 */
export function createSignatureMiddleware(
  cfg: SignatureMiddlewareConfig
): RequestHandler {
  if (!cfg.publicKey) {
    throw new Error("publicKey is required in SignatureMiddlewareConfig");
  }

  // Pre-create verifier once to avoid recreating it on every request
  const verifier = createVerifier(cfg.publicKey, "ed25519");

  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (await verifyHttpMessageSignature(req, verifier)) {
        return void next();
      }

      res.status(401).json({ error: "missing or invalid signature" });
    } catch (error) {
      res.status(401).json({ error: "signature validation failed" });
    }
  };
}

/**
 * Verifies HTTP message signature using ed25519 verifier.
 * This implementation follows RFC 9421 (HTTP Message Signatures)
 * which is used by Woodpecker CI.
 *
 * @param req - Express request object
 * @param verifier - Pre-configured ed25519 verifier function
 * @returns True if signature is valid, false otherwise
 */
const verifyHttpMessageSignature = async (
  req: Request,
  verifier: ReturnType<typeof createVerifier>
): Promise<boolean> => {
  try {
    // Build full URL from request
    // Express req.url contains only the path, but http-message-signatures needs full URL
    const protocol = req.protocol || "http";
    const host = req.get("host") || "localhost";
    const fullUrl = `${protocol}://${host}${req.url}`;

    // Convert Express Request to http-message-signatures format
    const httpSigRequest: HttpSigRequest = {
      method: req.method,
      url: fullUrl,
      headers: req.headers as Record<string, string | string[]>,
    };

    // Verify the message signature
    const verified = await httpbis.verifyMessage(
      {
        keyLookup: async () => {
          // Woodpecker CI doesn't use keyid in the signature parameters
          // Return the verifier for any key lookup
          return {
            id: "woodpecker-ci-plugins",
            algs: ["ed25519"],
            verify: verifier,
          };
        },
      },
      httpSigRequest
    );

    return verified === true;
  } catch (error) {
    // Signature verification failed - this is expected for invalid signatures
    return false;
  }
};
