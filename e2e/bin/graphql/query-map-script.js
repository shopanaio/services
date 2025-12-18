/* eslint-disable */
import { readdirSync, statSync, writeFileSync } from 'fs';
import { join, extname, relative, resolve, dirname } from 'path';
import process from 'process';

const [inputDir, outputTsFile] = process.argv.slice(2);

if (!inputDir || !outputTsFile) {
  console.error('Usage: node generate-graphql-map.mjs <input-directory> <output-ts-file>');
  process.exit(1);
}

const ROOT_DIR = resolve(inputDir);
const OUTPUT_TS_FILE = resolve(outputTsFile);
const OUTPUT_TS_DIR = dirname(OUTPUT_TS_FILE);
const graphqlExtensions = new Set(['.graphql', '.gql']);

const entries = [];

/**
 * Recursively collects .graphql/.gql files
 */
function collectGraphQLFiles(dir) {
  const items = readdirSync(dir);
  for (const item of items) {
    const fullPath = join(dir, item);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      collectGraphQLFiles(fullPath);
    } else if (stats.isFile() && graphqlExtensions.has(extname(item))) {
      const key = relative(ROOT_DIR, fullPath).replace(extname(item), '').replace(/\\/g, '/'); // Normalize for Windows
      const fileRelativePath = relative(OUTPUT_TS_DIR, fullPath).replace(/\\/g, '/');
      entries.push({ key, fileRelativePath });
    }
  }
}

collectGraphQLFiles(ROOT_DIR);

// Generate the TypeScript file content without a separate filePaths variable.
const tsOutput = `

export type GraphQLFileName =
${entries.map(({ key }) => `  | '${key}'`).join('\n')};
`;

// Write the generated TypeScript file.
writeFileSync(OUTPUT_TS_FILE, tsOutput.trim() + '\n', 'utf8');

console.log(`✅ TypeScript map written to: ${OUTPUT_TS_FILE}`);
