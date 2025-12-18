/* eslint-disable */
import { download } from './download.js';
import { generate } from './generate.js';
import 'dotenv/config';

const run = async () => {
  try {
    await download(process.env.ADMIN_GRAPHQL_URL, 'schema-admin.graphql');
    await download(process.env.CLIENT_GRAPHQL_URL, 'schema-client.graphql');
    // await download(process.env.CHECKOUT_GRAPHQL_URL, 'schema-checkout.graphql');

    await generate();
  } catch (e) {
    console.log(e, 'Error generating graphql schema');
    process.exit(1);
  }
};

run();
