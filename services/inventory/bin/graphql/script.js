#!/usr/bin/env node

import { exec } from 'child_process';
import { resolve } from 'path';

// Run GraphQL Code Generator
const configPath = resolve(process.cwd(), 'codegen.ts');

exec(`npx graphql-codegen --config ${configPath}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ CodeGen error: ${error.message}`);
    process.exit(1);
  }

  if (stderr) {
    console.error(`⚠️  CodeGen stderr: ${stderr}`);
  }

  console.log(`✅ CodeGen output:\n${stdout}`);
});
