/* eslint-disable */
import { generate } from "./generate.js";
import "dotenv/config";
import { download } from "./download.js";

const run = async () => {
  try {
    await download("http://127.0.0.1:10002/graphql", "storefront-api.graphql");
    // Core schema is now maintained in @shopana/platform-api; skip downloading here
    await generate();
  } catch (e) {
    console.log(e, "Error generating graphql schema for core");
    process.exit(1);
  }
};

run();
