/* eslint-disable */
import { exec } from 'child_process';

export const generate = () =>
  new Promise((resolve, reject) => {
    exec('npx graphql-codegen', (error, stdout, stderr) => {
      if (stdout) {
        process.stdout.write(stdout);
      }

      if (stderr) {
        process.stderr.write(stderr);
      }

      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
