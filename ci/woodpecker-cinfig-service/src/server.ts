import express, { NextFunction, Request, RequestHandler, Response } from 'express';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import pinoHttp from 'pino-http';
import { AppConfig } from './core/config';
import { BitBucketRepository } from './repositories/repository';
import { ScriptRegistry } from './core/registry';
import { DronePipeline, ScriptContext } from './core/types';
import { loadScripts } from './core/loader';
import { createLogger } from './core/logger';
import crypto from 'crypto';
import { GitHubRepository } from './repositories/repository';

/**
 * Compose and create an Express server.
 */
export function createServer(config: AppConfig) {
  const logger = createLogger();
  const app = express();

  // HTTP request logging middleware
  app.use(
    pinoHttp({
      logger,
      customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} ${res.statusCode}`;
      },
      customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
      },
    })
  );
  // Capture raw body for HMAC verification and allow larger payloads
  app.use(
    express.json({
      limit: '2mb',
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );

  // HMAC signature verification middleware
  const hmacMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
    try {
      const header = (req.headers['x-woodpecker-signature'] || req.headers['x-drone-signature']) as string | undefined;
      if (!header) {
        logger.warn('HMAC signature header missing');
        res.status(401).json({ error: 'missing signature' });
        return;
      }
      const rawBody: Buffer | undefined = (req as unknown as { rawBody?: Buffer }).rawBody;
      if (!rawBody) {
        logger.warn('Raw body missing for HMAC verification');
        res.status(400).json({ error: 'missing raw body' });
        return;
      }
      const hmac = crypto.createHmac('sha256', config.convertSecret);
      hmac.update(rawBody);
      const digest = `sha256=${hmac.digest('hex')}`;
      if (digest !== header) {
        logger.warn({ expected: digest, received: header }, 'HMAC signature mismatch');
        res.status(401).json({ error: 'invalid signature' });
        return;
      }
      logger.debug('HMAC signature verified successfully');
      next();
    } catch (e) {
      logger.error({ err: e }, 'HMAC signature validation error');
      res.status(401).json({ error: 'signature validation failed' });
    }
  };
  app.use(hmacMiddleware);

  // Liveness probe
  app.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  const postHandler: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const { repo, build } = req.body as any;
    let tmpRepoDir: string | undefined;

    try {
      const sourceBranch: string = build.source;
      const defaultBranch: string = repo.default_branch || 'main';
      // Try to construct workspace/repo slug robustly across providers
      const repoSlug: string = (repo.full_name as string)
        || [
          (repo.owner && (repo.owner.username || repo.owner)) || repo.namespace,
          repo.slug || repo.name,
        ]
          .filter(Boolean)
          .join('/');
      const commitSha: string = build.after;

      logger.info({ repoSlug, commitSha, sourceBranch, event: build?.event }, 'Processing pipeline request');

      // Initialize repository (auto-detect or override)
      // Only GitHub is supported
      const repository = new GitHubRepository(repoSlug, config.githubToken);

      // PR check only for pull_request event
      if (build?.event === 'pull_request') {
        logger.debug({ sourceBranch, defaultBranch }, 'Checking for open PR');
        const hasOpenPr = await repository.hasOpenPullRequest(sourceBranch, defaultBranch);
        if (!hasOpenPr) {
          logger.info({ sourceBranch, defaultBranch }, 'No open PR found, skipping pipeline');
          const skipPipeline: DronePipeline = {
            kind: 'pipeline',
            type: 'docker',
            name: 'skip',
            trigger: {
              event: ['pull_request'],
              branch: { exclude: [sourceBranch] },
            },
            clone: { disable: true },
            steps: [],
          };
          const yml = yaml.dump(skipPipeline);
          res.json({ data: yml });
          return;
        }
        logger.debug('Open PR found, proceeding with pipeline generation');
      }

      // Checkout repository
      logger.debug({ commitSha, tmpRepoDir }, 'Checking out repository');
      tmpRepoDir = await repository.checkout(commitSha);

      // Build pipelines
      logger.debug('Loading and registering pipeline scripts');
      const registry = new ScriptRegistry();
      const scripts = await loadScripts();
      logger.debug({ scriptCount: scripts.length }, 'Scripts loaded');
      for (const script of scripts) {
        registry.register(script);
      }

      const context: ScriptContext = {
        repoSlug,
        commitSha,
        sourceBranch,
        defaultBranch,
        tmpRepoDir,
        env: {},
      };

      logger.debug('Building pipelines');
      const pipelines = await registry.buildPipelines(context);
      if (pipelines.length === 0) {
        throw new Error('No pipelines produced by scripts');
      }

      logger.info({ pipelineCount: pipelines.length }, 'Pipelines generated successfully');
      const yml = pipelines.map((p) => yaml.dump(p)).join('---\n');
      res.json({ data: yml });
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      logger.error({ err: error, repoSlug: req.body?.repo?.full_name }, 'Pipeline generation error');
      res.status(500).json({ error: error.message });
    } finally {
      if (tmpRepoDir) {
        logger.debug({ tmpRepoDir }, 'Cleaning up temporary directory');
        await fs.rm(tmpRepoDir, { recursive: true, force: true });
      }
    }
  };
  app.post('/', postHandler);

  return app;
}
