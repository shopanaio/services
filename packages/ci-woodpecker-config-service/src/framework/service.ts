import type { Router } from "express";
import type { PipelineScript } from "./scripts";
import type { Logger } from "pino";
import { createExpressRouter } from "./express-controller";
import { ConfigService } from "./config-service";

export interface ServiceConfig {
  githubToken: string;
  secret?: string;
  publicKeyHex?: string;
  skipSignatureVerification?: boolean;
  logger?: Logger;
}

export function createConfigService(
  config: ServiceConfig,
  scripts: PipelineScript[]
): Router {
  const service = new ConfigService({
    githubToken: config.githubToken,
    logger: config.logger!,
    scripts,
  });

  return createExpressRouter(config, service);
}
