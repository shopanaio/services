import { DronePipeline, PipelineScript, ScriptContext } from '../../core/types';

/**
 * Lint and type-check pipeline script.
 */
export class LintScript implements PipelineScript {
  getName(): string {
    return 'lint';
  }

  supports(_context: ScriptContext): boolean {
    return true;
  }

  async build(): Promise<DronePipeline> {
    return {
      kind: 'pipeline',
      type: 'docker',
      name: 'lint',
      steps: [
        {
          name: 'lint-and-type-check',
          image: 'node:22-alpine',
          commands: ['yarn install --frozen-lockfile', 'yarn lint', 'yarn type-check'],
        },
        {
          name: 'discord',
          image: 'appleboy/drone-discord',
          settings: {
            webhook_id: { from_secret: 'DISCORD_WEBHOOK_ID' },
            webhook_token: { from_secret: 'DISCORD_WEBHOOK_TOKEN' },
            avatar_url: 'https://avatars.githubusercontent.com/u/2181346?v=4',
            username: 'Drone CI',
            message:
              '**Lint & Type Check [#{{build.number}}]({{build.link}})**\\n- Branch `{{commit.branch}}`\\n- Author `{{commit.email}}`',
          },
        },
      ],
    };
  }
}
