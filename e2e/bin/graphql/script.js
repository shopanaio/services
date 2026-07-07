/* eslint-disable */
import { generate } from './generate.js';

const run = async () => {
  try {
    await generate();
  } catch (e) {
    console.log(e, 'Error generating graphql schema');
    process.exit(1);
  }
};

run();
