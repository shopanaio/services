import yaml from "js-yaml";
import type {
  ConfigExtensionRequest,
  ConfigFile,
} from "../woodpecker/payload";
import { WorkflowRegistry } from "./workflow-registry";
import type { ScriptContext, WorkflowLoader } from "./interface";
import { WorkflowScriptLoader } from "src/service/workflow-loader";

export class ConfigService {
  private readonly loader!: WorkflowLoader;

  constructor(params: { loader?: WorkflowLoader }) {
    this.loader = params.loader || new WorkflowScriptLoader();
  }

  async generate(body: ConfigExtensionRequest): Promise<ConfigFile[]> {
    const { repo, pipeline, netrc } = body;

    const scripts = await this.loader.load();
    const registry = new WorkflowRegistry();
    for (const s of scripts) registry.register(s);

    const context: ScriptContext = {
      repo,
      pipeline,
      netrc,
    };

    const generated = await registry.buildWorkflows(context);
    if (generated.length === 0) {
      throw new Error("No workflows produced by scripts");
    }

    return generated.map((g) => ({
      name: g.name,
      data: yaml.dump(g.workflow),
    }));
  }
}
