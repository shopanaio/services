import { build } from 'esbuild';

const options = {
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    'express',
    'pino',
    'pino-http',
    'js-yaml',
    '@noble/ed25519',
    'dotenv',
    'dotenv/config'
  ]
};

try {
  await build(options);
  console.log('Build succeeded');
} catch (error) {
  console.error('Build failed');
  console.error(error);
  process.exitCode = 1;
}
