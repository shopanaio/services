import express, { NextFunction, Request, RequestHandler, Response, Router } from "express";
import pinoHttp from "pino-http";
import type { Logger } from "pino";
import { ConfigService } from "./config-service";
import { CompositeSignatureVerifier, HmacSignatureVerifier, HttpMessageSignatureVerifier, SignatureVerifier } from "./signature";
import type { PipelineScript } from "./scripts";

export interface RouterConfig {
  githubToken: string;
  secret?: string;
  publicKeyHex?: string;
  skipSignatureVerification?: boolean;
  logger?: Logger;
}

/**
 * Create an Express router that wires logging, JSON, signature verification
 * and delegates POST / handling to ConfigService.
 */
export function createExpressRouter(cfg: RouterConfig, scripts: PipelineScript[]): Router {
  const router = express.Router();

  if (cfg.logger) {
    router.use(
      pinoHttp({
        logger: cfg.logger,
        customLogLevel: (_req: Request, res: Response, err?: Error) => {
          if (res.statusCode >= 500 || err) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },
        customSuccessMessage: (req: Request, res: Response) => `${req.method} ${req.url} ${res.statusCode}`,
        customErrorMessage: (req: Request, res: Response, err: Error) => `${req.method} ${req.url} ${res.statusCode} - ${err.message}`,
      })
    );
  }

  router.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  let verifier: SignatureVerifier | undefined;
  if (!cfg.skipSignatureVerification) {
    const verifiers: SignatureVerifier[] = [];
    if (cfg.publicKeyHex) verifiers.push(new HttpMessageSignatureVerifier(cfg.publicKeyHex));
    if (cfg.secret) verifiers.push(new HmacSignatureVerifier(cfg.secret));
    verifier = new CompositeSignatureVerifier(verifiers);
  }

  const signatureMiddleware: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!verifier) return void next();
      const ok = await verifier.verify(req);
      if (ok) return void next();
      res.status(401).json({ error: "missing or invalid signature" });
    } catch {
      res.status(401).json({ error: "signature validation failed" });
    }
  };

  router.use(signatureMiddleware);

  router.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  const service = new ConfigService({ githubToken: cfg.githubToken, logger: cfg.logger!, scripts });

  const postHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const configs = await service.generate(req.body);
      res.json({ configs });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      res.status(500).json({ error: error.message });
    }
  };

  router.post("/", postHandler);
  return router;
}
