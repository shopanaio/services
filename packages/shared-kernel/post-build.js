// Post-build script to add .js extensions to imports for ESM compatibility
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, 'dist');

function processFile(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Add .js to relative imports
  const updatedContent = content
    .replace(/from ["'](\.[^"']+)["']/g, (match, path) => {
      if (path.endsWith('.js')) return match;

      // Check if path is a directory with index.js
      const fullPath = resolve(dirname(filePath), path);
      if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
        if (existsSync(join(fullPath, 'index.js'))) {
          return `from "${path}/index.js"`;
        }
      }

      return `from "${path}.js"`;
    })
    .replace(/import\(["'](\.[^"']+)["']\)/g, (match, path) => {
      if (path.endsWith('.js')) return match;

      // Check if path is a directory with index.js
      const fullPath = resolve(dirname(filePath), path);
      if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
        if (existsSync(join(fullPath, 'index.js'))) {
          return `import("${path}/index.js")`;
        }
      }

      return `import("${path}.js")`;
    });

  if (content !== updatedContent) {
    writeFileSync(filePath, updatedContent, 'utf-8');
  }
}

function walkDir(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      walkDir(filePath);
    } else if (file.endsWith('.js')) {
      processFile(filePath);
    }
  }
}

console.log('Adding .js extensions to imports...');
walkDir(distDir);
console.log('✅ Post-build completed');
