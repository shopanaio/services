import { describe, it, expect, jest } from "@jest/globals";
import { ConfigService } from "../config-service";
import type {
  WorkflowLoader,
  WorkflowScript,
  ScriptContext,
  GeneratedConfig,
} from "../interface";
import type { ConfigExtensionRequest } from "../../woodpecker/payload";
import {
  RepoVisibility,
  ApprovalMode,
  WebhookEvent,
  StatusValue,
  ForgeType,
} from "../../woodpecker/payload";

describe("ConfigService", () => {
  const mockRequest: ConfigExtensionRequest = {
    repo: {
      owner: "test-namespace",
      name: "test-repo",
      full_name: "test-namespace/test-repo",
      clone_url: "https://github.com/test-namespace/test-repo.git",
      default_branch: "main",
      private: false,
      visibility: RepoVisibility.Public,
      pr_enabled: true,
      active: true,
      allow_pr: true,
      allow_deploy: false,
      config_file: ".woodpecker.yml",
      trusted: {
        network: false,
        volumes: false,
        security: false,
      },
      require_approval: ApprovalMode.None,
      approval_allowed_users: [],
      cancel_previous_pipeline_events: [],
      netrc_trusted: [],
      config_extension_endpoint: "",
    },
    pipeline: {
      id: 1,
      parent: 0,
      number: 1,
      author: "test-author",
      author_email: "test@example.com",
      author_avatar: "https://example.com/avatar.jpg",
      sender: "test-sender",
      timestamp: 1234567890,
      message: "test commit message",
      commit: "abc123",
      ref: "refs/heads/main",
      refspec: "",
      event: WebhookEvent.Push,
      event_reason: [],
      branch: "main",
      title: "",
      forge_url: "https://github.com/test-namespace/test-repo/commit/abc123",
      created: 1234567890,
      updated: 1234567890,
      started: 1234567890,
      finished: 1234567890,
      status: StatusValue.Success,
      errors: [],
      deploy_to: "",
      deploy_task: "",
      reviewed_by: "",
      reviewed: 0,
    },
    netrc: {
      machine: "github.com",
      login: "test-user",
      password: "test-token",
      type: ForgeType.Github,
    },
  };

  function createMockScript(
    name: string,
    supports: boolean,
    config: GeneratedConfig | null
  ): WorkflowScript {
    return {
      getName: () => name,
      supports: () => supports,
      build: async () => (config ? [config] : null),
    };
  }

  function createMockLoader(scripts: WorkflowScript[]): WorkflowLoader {
    return {
      load: async () => scripts,
    };
  }

  it("should create service with default loader", () => {
    const service = new ConfigService({});
    expect(service).toBeDefined();
  });

  it("should create service with custom loader", () => {
    const loader = createMockLoader([]);
    const service = new ConfigService({ loader });
    expect(service).toBeDefined();
  });

  it("should generate config from single workflow", async () => {
    const config: GeneratedConfig = {
      name: ".woodpecker.yml",
      workflow: {
        steps: [
          {
            name: "build",
            image: "node:18",
            commands: ["npm install", "npm run build"],
          },
        ],
      },
    };

    const script = createMockScript("test-workflow", true, config);
    const loader = createMockLoader([script]);
    const service = new ConfigService({ loader });

    const result = await service.generate(mockRequest);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe(".woodpecker.yml");
    expect(result[0].data).toContain("steps:");
    expect(result[0].data).toContain("name: build");
  });

  it("should throw error when no workflows produced", async () => {
    const script = createMockScript("test-workflow", false, null);
    const loader = createMockLoader([script]);
    const service = new ConfigService({ loader });

    await expect(service.generate(mockRequest)).rejects.toThrow(
      "No workflows produced by scripts"
    );
  });

  it("should throw error when all scripts return null", async () => {
    const script1 = createMockScript("script1", true, null);
    const script2 = createMockScript("script2", true, null);
    const loader = createMockLoader([script1, script2]);
    const service = new ConfigService({ loader });

    await expect(service.generate(mockRequest)).rejects.toThrow(
      "No workflows produced by scripts"
    );
  });

  it("should generate multiple configs from multiple workflows", async () => {
    const config1: GeneratedConfig = {
      name: ".woodpecker/build.yml",
      workflow: {
        steps: [{ name: "build", image: "alpine", commands: ["echo build"] }],
      },
    };
    const config2: GeneratedConfig = {
      name: ".woodpecker/test.yml",
      workflow: {
        steps: [{ name: "test", image: "alpine", commands: ["echo test"] }],
      },
    };

    const script1 = createMockScript("build-workflow", true, config1);
    const script2 = createMockScript("test-workflow", true, config2);
    const loader = createMockLoader([script1, script2]);
    const service = new ConfigService({ loader });

    const result = await service.generate(mockRequest);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe(".woodpecker/build.yml");
    expect(result[1].name).toBe(".woodpecker/test.yml");
  });

  it("should convert workflow to YAML format", async () => {
    const config: GeneratedConfig = {
      name: ".woodpecker.yml",
      workflow: {
        steps: [
          {
            name: "test-step",
            image: "alpine:latest",
            commands: ['echo "Hello World"'],
          },
        ],
      },
    };

    const script = createMockScript("test-workflow", true, config);
    const loader = createMockLoader([script]);
    const service = new ConfigService({ loader });

    const result = await service.generate(mockRequest);

    expect(result[0].data).toContain("steps:");
    expect(result[0].data).toContain("name: test-step");
    expect(result[0].data).toContain("image: alpine:latest");
    expect(result[0].data).toContain("commands:");
    expect(result[0].data).toContain('echo "Hello World"');
  });

  it("should skip unsupported workflows", async () => {
    const config: GeneratedConfig = {
      name: ".woodpecker.yml",
      workflow: { steps: [] },
    };

    const script1 = createMockScript("unsupported", false, config);
    const script2 = createMockScript("supported", true, config);
    const loader = createMockLoader([script1, script2]);
    const service = new ConfigService({ loader });

    const result = await service.generate(mockRequest);

    expect(result).toHaveLength(1);
  });

  it("should pass correct context to workflows", async () => {
    let capturedContext = {} as ScriptContext;

    const script: WorkflowScript = {
      getName: () => "context-test",
      supports: () => true,
      build: async (ctx) => {
        capturedContext = ctx;
        return [
          {
            name: ".woodpecker.yml",
            workflow: { steps: [] },
          },
        ];
      },
    };

    const loader = createMockLoader([script]);
    const service = new ConfigService({ loader });

    await service.generate(mockRequest);

    expect(capturedContext).toBeDefined();
    if (capturedContext) {
      expect(capturedContext.repo).toBe(mockRequest.repo);
      expect(capturedContext.pipeline).toBe(mockRequest.pipeline);
      expect(capturedContext.netrc).toBe(mockRequest.netrc);
    }
  });

  it("should handle complex workflow structure", async () => {
    const config: GeneratedConfig = {
      name: ".woodpecker.yml",
      workflow: {
        when: {
          branch: ["main", "develop"],
          event: ["push", "pull_request"],
        },
        steps: [
          {
            name: "restore-cache",
            image: "meltwater/drone-cache",
            settings: {
              restore: true,
            },
          },
          {
            name: "build",
            image: "node:18",
            commands: ["npm ci", "npm run build"],
          },
        ],
      },
    };

    const script = createMockScript("complex-workflow", true, config);
    const loader = createMockLoader([script]);
    const service = new ConfigService({ loader });

    const result = await service.generate(mockRequest);

    expect(result[0].data).toContain("when:");
    expect(result[0].data).toContain("branch:");
    expect(result[0].data).toContain("main");
    expect(result[0].data).toContain("steps:");
    expect(result[0].data).toContain("restore-cache");
  });

  it("should load scripts before generating", async () => {
    let loadCalled = false;
    const loader: WorkflowLoader = {
      load: async () => {
        loadCalled = true;
        return [
          createMockScript("test", true, {
            name: ".woodpecker.yml",
            workflow: { steps: [] },
          }),
        ];
      },
    };

    const service = new ConfigService({ loader });
    await service.generate(mockRequest);

    expect(loadCalled).toBe(true);
  });
});
