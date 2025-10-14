import { describe, it, expect } from '@jest/globals';
import { WorkflowRegistry } from '../workflow-registry';
import type { WorkflowScript, ScriptContext, GeneratedConfig } from '../interface';
import {
  RepoVisibility,
  ApprovalMode,
  WebhookEvent,
  StatusValue,
  ForgeType,
} from '../../woodpecker/payload';

describe('WorkflowRegistry', () => {
  const mockContext: ScriptContext = {
    repo: {
      owner: 'test-namespace',
      name: 'test-repo',
      full_name: 'test-namespace/test-repo',
      clone_url: 'https://github.com/test-namespace/test-repo.git',
      default_branch: 'main',
      private: false,
      visibility: RepoVisibility.Public,
      pr_enabled: true,
      active: true,
      allow_pr: true,
      allow_deploy: false,
      config_file: '.woodpecker.yml',
      trusted: {
        network: false,
        volumes: false,
        security: false,
      },
      require_approval: ApprovalMode.None,
      approval_allowed_users: [],
      cancel_previous_pipeline_events: [],
      netrc_trusted: [],
      config_extension_endpoint: '',
    },
    pipeline: {
      id: 1,
      parent: 0,
      number: 1,
      author: 'test-author',
      author_email: 'test@example.com',
      author_avatar: 'https://example.com/avatar.jpg',
      sender: 'test-sender',
      timestamp: 1234567890,
      message: 'test commit message',
      commit: 'abc123',
      ref: 'refs/heads/main',
      refspec: '',
      event: WebhookEvent.Push,
      event_reason: [],
      branch: 'main',
      title: '',
      forge_url: 'https://github.com/test-namespace/test-repo/commit/abc123',
      created: 1234567890,
      updated: 1234567890,
      started: 1234567890,
      finished: 1234567890,
      status: StatusValue.Success,
      errors: [],
      deploy_to: '',
      deploy_task: '',
      reviewed_by: '',
      reviewed: 0,
    },
    netrc: {
      machine: 'github.com',
      login: 'test-user',
      password: 'test-token',
      type: ForgeType.Github,
    },
  };

  function createMockScript(
    name: string,
    supports: boolean | ((ctx: ScriptContext) => boolean | Promise<boolean>),
    buildResult: GeneratedConfig[] | null
  ): WorkflowScript {
    return {
      getName: () => name,
      supports: typeof supports === 'function' ? supports : () => supports,
      build: async () => buildResult,
    };
  }

  it('should create empty registry', () => {
    const registry = new WorkflowRegistry();
    expect(registry).toBeDefined();
  });

  it('should register a script', () => {
    const registry = new WorkflowRegistry();
    const script = createMockScript('test-script', true, null);

    registry.register(script);
    // No error means success
  });

  it('should return empty array when no scripts registered', async () => {
    const registry = new WorkflowRegistry();
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toEqual([]);
  });

  it('should build workflow from single supported script', async () => {
    const registry = new WorkflowRegistry();
    const config: GeneratedConfig = {
      name: '.woodpecker.yml',
      workflow: { steps: [{ name: 'test', image: 'alpine', commands: ['echo test'] }] },
    };
    const script = createMockScript('test-script', true, [config]);

    registry.register(script);
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toEqual([config]);
  });

  it('should skip unsupported scripts', async () => {
    const registry = new WorkflowRegistry();
    const script1 = createMockScript('unsupported', false, [
      { name: 'config1', workflow: { steps: [] } },
    ]);
    const script2 = createMockScript('supported', true, [
      { name: 'config2', workflow: { steps: [] } },
    ]);

    registry.register(script1);
    registry.register(script2);
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('config2');
  });

  it('should handle scripts returning null', async () => {
    const registry = new WorkflowRegistry();
    const script = createMockScript('test-script', true, null);

    registry.register(script);
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toEqual([]);
  });

  it('should flatten results from multiple scripts', async () => {
    const registry = new WorkflowRegistry();
    const config1: GeneratedConfig = { name: 'config1', workflow: { steps: [] } };
    const config2: GeneratedConfig = { name: 'config2', workflow: { steps: [] } };
    const config3: GeneratedConfig = { name: 'config3', workflow: { steps: [] } };

    const script1 = createMockScript('script1', true, [config1, config2]);
    const script2 = createMockScript('script2', true, [config3]);

    registry.register(script1);
    registry.register(script2);
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toHaveLength(3);
    expect(result).toEqual([config1, config2, config3]);
  });

  it('should handle async supports function', async () => {
    const registry = new WorkflowRegistry();
    const config: GeneratedConfig = { name: 'config', workflow: { steps: [] } };
    const script = createMockScript(
      'async-script',
      async (ctx) => ctx.pipeline.branch === 'main',
      [config]
    );

    registry.register(script);
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toEqual([config]);
  });

  it('should handle mix of supported and unsupported scripts with nulls', async () => {
    const registry = new WorkflowRegistry();
    const config: GeneratedConfig = { name: 'config', workflow: { steps: [] } };

    const script1 = createMockScript('unsupported', false, [config]);
    const script2 = createMockScript('supported-null', true, null);
    const script3 = createMockScript('supported', true, [config]);

    registry.register(script1);
    registry.register(script2);
    registry.register(script3);
    const result = await registry.buildWorkflows(mockContext);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(config);
  });

  it('should register multiple scripts', () => {
    const registry = new WorkflowRegistry();
    const script1 = createMockScript('script1', true, null);
    const script2 = createMockScript('script2', true, null);
    const script3 = createMockScript('script3', true, null);

    registry.register(script1);
    registry.register(script2);
    registry.register(script3);
    // No error means success
  });

  it('should execute all scripts in parallel', async () => {
    const registry = new WorkflowRegistry();
    const executionOrder: string[] = [];

    const createDelayedScript = (name: string, delay: number): WorkflowScript => ({
      getName: () => name,
      supports: () => true,
      build: async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        executionOrder.push(name);
        return null;
      },
    });

    registry.register(createDelayedScript('slow', 50));
    registry.register(createDelayedScript('fast', 10));

    await registry.buildWorkflows(mockContext);

    // Fast should finish before slow (parallel execution)
    expect(executionOrder[0]).toBe('fast');
    expect(executionOrder[1]).toBe('slow');
  });
});
