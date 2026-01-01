// const path = require('path');

module.exports = {
  client: {
    service: {
      name: 'portal-graphql-api',
      localSchemaFile: 'schema.graphql',
    },
    includes: ['**/*.gql', '**/*.ts'],
  },
};
