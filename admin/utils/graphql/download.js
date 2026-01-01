const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const { printSchema } = require('graphql');
const { buildClientSchema } = require('graphql/utilities');

const serverUrl = process.env.GRAPHQL_SCHEMA_URL;

console.log('Downloading GraphQL schema...', serverUrl);

exports.download = async () => {
  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'IntrospectionQuery',
      query: await fs.readFile(`${__dirname}/introspection.gql`, 'utf8'),
    }),
  });

  const data = await response.json();
  return fs.writeFile(
    path.join(process.cwd(), 'schema.graphql'),
    printSchema(buildClientSchema({ __schema: data.data.__schema })),
  );
};
