import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import { promisify } from 'util';
import { execFile } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { sync } from 'glob';
import yaml from 'js-yaml';
import os from 'os';

interface PipelineStep {
  name: string;
  image: string;
  failure: string;
  environment?: Record<string, any>;
  depends_on?: string[];
  commands: string[];
}

const execFileAsync = promisify(execFile);
const app = express();
app.use(bodyParser.json());

const MAX_PARALLEL_STEPS = parseInt(process.env.MAX_PARALLEL_STEPS || '4', 10);
const BASE_URL = process.env.BASE_URL || 'https://sandbox.shopana.io';
const GRAPHQL_URL = process.env.GRAPHQL_URL || 'https://sandbox.shopana.io/api/admin/graphql/query';
const BITBUCKET_TOKEN = process.env.BITBUCKET_TOKEN;
if (!BITBUCKET_TOKEN) {
  console.error('Env BITBUCKET_TOKEN is required');
  process.exit(1);
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  return arr.reduce<T[][]>((chunks, item, idx) => {
    if (idx % size === 0) {
      chunks.push([item]);
    } else {
      chunks[chunks.length - 1].push(item);
    }
    return chunks;
  }, []);
}

app.post('/', async (req: Request, res: Response) => {
  const { repo, build } = req.body as any;
  let repoDir: string | undefined;

  try {
    const sourceBranch = build.source;
    const defaultBranch = repo.default_branch || 'main';
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${repo.slug}/pullrequests`;
    const query = `source.branch.name=\"${sourceBranch}\" AND destination.branch.name=\"${defaultBranch}\" AND state=\"OPEN\"`;

    const url = `${apiUrl}?q=${encodeURIComponent(query)}`;

    console.log(`Fetching open PR: ${url}`);
    console.log(`Bitbucket token: ${BITBUCKET_TOKEN}`);

    const prResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${BITBUCKET_TOKEN}`,
        Accept: 'application/json',
      },
    });

    if (!prResponse.ok) {
      throw new Error(`Bitbucket API error: ${prResponse.status} ${prResponse.statusText}`);
    }
    const prJson = (await prResponse.json()) as any;
    if (!prJson.values || prJson.values.length === 0) {
      console.log(`No open PR from branch ${sourceBranch} to ${defaultBranch}`);

      const skipPipeline = {
        kind: 'pipeline',
        type: 'docker',
        name: 'skip',
        trigger: {
          event: ['pull_request'],
          branch: { exclude: [sourceBranch] },
        },
        clone: {
          disable: true,
        },
        steps: [],
      };
      const yml = yaml.dump(skipPipeline);
      return res.json({ data: yml });
    }

    repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'repo-'));
    const httpsUrl = `https://x-token-auth:${BITBUCKET_TOKEN}@bitbucket.org/${repo.slug}.git`;
    await execFileAsync('git', ['clone', httpsUrl, repoDir]);
    await execFileAsync('git', ['-C', repoDir, 'checkout', build.after]);

    const [firstStepName, ...restStepNames] = sync('tests/**/*.spec.ts', { cwd: repoDir })
      .map((it) => it.replace('tests/', ''))
      .sort();
    if (!firstStepName) {
      throw new Error('No test files found');
    }

    const getPlaywrightStep = (file: string, dependsOn: string[]) => {
      return {
        name: file,
        image: 'mcr.microsoft.com/playwright:v1.51.1-jammy',
        failure: 'ignore',
        environment: {
          CI: true,
          BASE_URL,
          GRAPHQL_URL,
        },
        depends_on: dependsOn,
        commands: ['yarn install --frozen-lockfile', `npx playwright test ${file}`],
      };
    };

    const chunkedFiles = chunkArray(restStepNames, MAX_PARALLEL_STEPS);
    const steps: PipelineStep[] = chunkedFiles.flatMap((files, chunkIdx) =>
      files.map((file) => {
        const dependsOn = chunkIdx === 0 ? [firstStepName] : [...chunkedFiles[chunkIdx - 1]];
        return getPlaywrightStep(file, dependsOn);
      }),
    );

    const pipelines = [
      {
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
              webhook_id: '1363865260024397845',
              webhook_token: '_EThJWUu6axVukBinE6RWEXBIjzDEQNE-VuAnCbJBPTFa3YXKsIcOPYnL1qVDGZ00vZD',
              avatar_url: 'https://avatars.githubusercontent.com/u/2181346?v=4',
              username: 'Drone CI',
              message:
                '**Lint & Type Check [#{{build.number}}]({{build.link}})**\n- Branch `{{commit.branch}}`\n- Author `{{commit.email}}`',
            },
          },
        ],
      },
      {
        kind: 'pipeline',
        type: 'docker',
        name: 'playwright',
        steps: [
          getPlaywrightStep(firstStepName, []),
          ...steps,
          {
            name: 'discord',
            image: 'appleboy/drone-discord',
            depends_on: chunkedFiles.at(-1),
            settings: {
              webhook_id: '1363865260024397845',
              webhook_token: '_EThJWUu6axVukBinE6RWEXBIjzDEQNE-VuAnCbJBPTFa3YXKsIcOPYnL1qVDGZ00vZD',
              avatar_url: 'https://avatars.githubusercontent.com/u/2181346?v=4',
              username: 'Drone CI',
              message:
                '{{#success build.status}}✅{{else}}❌{{/success}} **Playwright [#{{build.number}}]({{build.link}})**\n- Status `{{uppercase build.status}}`\n- Branch `{{commit.branch}}`\n- Author `{{commit.email}}`\n',
            },
          },
        ],
      },
    ];

    const yml = pipelines.map((p) => yaml.dump(p)).join('---\n');
    console.log('Generated YAML:', yml);

    res.json({ data: yml });
  } catch (err: any) {
    console.error('Pipeline generation error:', err);
    res.status(500).json({ error: err.message });
  } finally {
    if (repoDir) {
      await fs.rm(repoDir, { recursive: true, force: true });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Drone convert extension listening on port ${PORT}`));
