/* eslint-disable */
import { exec } from 'child_process';

export const generate = () =>
  exec('npx graphql-codegen', (error) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
  });
