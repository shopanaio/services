import type { Router } from "express";
import type { PipelineScript } from "./scripts";
import type { Logger } from "pino";
import { createExpressRouter } from "./express-controller";

export interface ServiceConfig {
  githubToken: string;
  secret?: string;
  publicKeyHex?: string;
  skipSignatureVerification?: boolean;
  logger?: Logger;
}

export function createConfigService(config: ServiceConfig, scripts: PipelineScript[]): Router {
  return createExpressRouter(config, scripts);
}
