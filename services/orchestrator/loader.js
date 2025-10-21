import { register } from 'tsconfig-paths';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Register tsconfig-paths for the apps service
register({
  baseUrl: resolve(__dirname, '../apps'),
  paths: {
    '@src/*': ['./src/*']
  }
});
