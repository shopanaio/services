import { build } from 'esbuild';
import { readdirSync } from 'fs';

const externalDeps = [
  'express',
  'pino',
  'pino-http',
  'js-yaml',
  '@noble/ed25519',
  'dotenv',
  'dotenv/config'
];

// Build main index.ts
const mainOptions = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  external: externalDeps
};

// Find all workflow files
const workflowFiles = readdirSync('workflows')
  .filter(file => file.endsWith('.ts'))
  .map(file => `workflows/${file}`);

// Build each workflow separately
const workflowOptions = {
  entryPoints: workflowFiles,
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'dist/workflows',
  outbase: 'workflows',
  external: externalDeps
};

try {
  await build(mainOptions);
  console.log('Main build succeeded');

  await build(workflowOptions);
  console.log('Workflows build succeeded');

  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed');
  console.error(error);
  process.exitCode = 1;
}
