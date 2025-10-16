import { describe, it, expect } from '@jest/globals';
import { defineScript } from '../scripts';
import type { ScriptContext } from '../interface';
import {
  RepoVisibility,
  ApprovalMode,
  WebhookEvent,
  StatusValue,
  ForgeType,
} from '../../woodpecker/payload';

describe('defineScript', () => {
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
    env: {},
    metadata: {},
    errors: [],
  };

  it('should create workflow script with basic definition', () => {
    const script = defineScript({
      name: 'test-workflow',
      build: () => null,
    });

    expect(script.getName()).toBe('test-workflow');
    expect(typeof script.supports).toBe('function');
    expect(typeof script.build).toBe('function');
  });

  it('should return script name from getName', () => {
    const script = defineScript({
      name: 'my-custom-workflow',
      build: () => null,
    });

    expect(script.getName()).toBe('my-custom-workflow');
  });

  it('should default supports to true when not provided', () => {
    const script = defineScript({
      name: 'test-workflow',
      build: () => null,
    });

    const result = script.supports(mockContext);
    expect(result).toBe(true);
  });

  it('should use custom supports function when provided', () => {
    const script = defineScript({
      name: 'test-workflow',
      supports: (ctx) => ctx.pipeline.branch === 'main',
      build: () => null,
    });

    expect(script.supports(mockContext)).toBe(true);
    expect(
      script.supports({
        ...mockContext,
        pipeline: { ...mockContext.pipeline, branch: 'develop' },
      })
    ).toBe(false);
  });

  it('should support async supports function', async () => {
    const script = defineScript({
      name: 'test-workflow',
      supports: async (ctx) => {
        return ctx.pipeline.branch === 'main';
      },
      build: () => null,
    });

    const result = await script.supports(mockContext);
    expect(result).toBe(true);
  });

  it('should call build function with context', async () => {
    let capturedContext: ScriptContext | null = null;
    const script = defineScript({
      name: 'test-workflow',
      build: (ctx) => {
        capturedContext = ctx;
        return null;
      },
    });

    await script.build(mockContext);
    expect(capturedContext).toBe(mockContext);
  });

  it('should return build result', async () => {
    const expectedResult = [
      {
        name: '.woodpecker.yml',
        workflow: {
          steps: [
            {
              name: 'build',
              image: 'node:18',
              commands: ['npm install', 'npm run build'],
            },
          ],
        },
      },
    ];

    const script = defineScript({
      name: 'test-workflow',
      build: () => expectedResult,
    });

    const result = await script.build(mockContext);
    expect(result).toBe(expectedResult);
  });

  it('should handle async build function', async () => {
    const expectedResult = [
      {
        name: '.woodpecker.yml',
        workflow: { steps: [] },
      },
    ];

    const script = defineScript({
      name: 'test-workflow',
      build: async () => {
        return expectedResult;
      },
    });

    const result = await script.build(mockContext);
    expect(result).toBe(expectedResult);
  });

  it('should return null when build returns null', async () => {
    const script = defineScript({
      name: 'test-workflow',
      build: () => null,
    });

    const result = await script.build(mockContext);
    expect(result).toBe(null);
  });
});
