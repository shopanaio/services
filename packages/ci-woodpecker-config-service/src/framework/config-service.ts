import yaml from "js-yaml";
import type { Logger } from "pino";
import type { ConfigExtensionRequest, ConfigFileDto } from "../woodpecker/payload";
import { ScriptRegistry } from "../core/registry";
import type { PipelineScript, ScriptContext } from "./scripts";
import { GitHubRepository } from "../repositories/repository";
import fs from "fs/promises";

export class ConfigService {
  private readonly githubToken: string;
  private readonly logger: Logger;
  private readonly scripts: PipelineScript[];

  constructor(params: { githubToken: string; logger: Logger; scripts: PipelineScript[] }) {
    this.githubToken = params.githubToken;
    this.logger = params.logger;
    this.scripts = params.scripts;
  }

  async generate(body: ConfigExtensionRequest): Promise<ConfigFileDto[]> {
    let tmpRepoDir: string | undefined;
    let clonePromise: Promise<string> | undefined;

    try {
      const { repo, pipeline, netrc } = body;

      if (!repo || !pipeline) {
        throw new Error("Invalid payload: repo and pipeline are required");
      }
      if (!pipeline.commit) {
        throw new Error("Invalid payload: commit SHA is required");
      }

      const repository = new GitHubRepository(repo.full_name, this.githubToken);

      const registry = new ScriptRegistry();
      for (const s of this.scripts) registry.register(s);

      const context: ScriptContext = {
        repo,
        pipeline,
        netrc,
        tmpRepoDir: undefined,
        env: {},
        clone: async () => {
          if (tmpRepoDir) return tmpRepoDir;
          if (!clonePromise) {
            clonePromise = repository.checkout(pipeline.commit).then((dir) => {
              tmpRepoDir = dir;
              return dir;
            });
          }
          return clonePromise;
        },
        log: this.logger,
      };

      const generated = await registry.buildPipelines(context);
      if (generated.length === 0) {
        throw new Error("No configs produced by scripts");
      }

      const configs: ConfigFileDto[] = generated.map((g) => ({ name: g.name, data: yaml.dump(g.workflow) }));
      return configs;
    } finally {
      try {
        if (tmpRepoDir) {
          await fs.rm(tmpRepoDir, { recursive: true, force: true });
        }
      } catch {
        // ignore cleanup errors
      }
    }
  }
}
