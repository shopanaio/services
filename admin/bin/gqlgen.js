const { download } = require('../utils/graphql/download');
const { generate } = require('../utils/graphql/generate');

const run = async () => {
  try {
    await download();
    await generate();
  } catch (e) {
    console.log(e, 'Error generating graphql schema');
    process.exit(1);
  }
};

run();
