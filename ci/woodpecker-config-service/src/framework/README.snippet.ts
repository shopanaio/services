// Usage snippets for developers consuming the framework as an npm package.

export const expressIntegration = `
import express from 'express';
import { createExpressRouter } from '@shopana/woodpecker-dynamic';
import { scripts } from './ci/pipelines';

const app = express();
app.use('/convert', createExpressRouter({
  githubToken: process.env.WOODPECKER_GITHUB_TOKEN!,
  secret: process.env.WOODPECKER_CONFIG_SERVICE_SECRET,
  publicKeyHex: process.env.WOODPECKER_PUBLIC_KEY,
  skipSignatureVerification: process.env.SKIP_SIGNATURE_VERIFICATION === 'true',
}, scripts));
app.listen(3000);
`;

export const scriptExample = `
import { defineScript } from '@shopana/woodpecker-dynamic';

export const lintAndTest = defineScript({
  name: 'lint-and-test',
  supports: ({ pipeline: p }) => p.event === 'pull_request',
  async build() {
    return [{
      name: '.woodpecker/ci.yml',
      workflow: {
        when: { event: ['pull_request'] },
        steps: [
          {
            name: 'install',
            image: 'node:20',
            commands: ['corepack enable', 'pnpm i --frozen-lockfile'],
          },
          { name: 'lint', image: 'node:20', commands: ['pnpm lint'] },
          { name: 'test', image: 'node:20', commands: ['pnpm test -r'], depends_on: ['install'] },
        ],
      }
    }];
  },
});
`;
