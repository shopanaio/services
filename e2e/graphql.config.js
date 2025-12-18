export default {
  projects: {
    admin: {
      schema: 'schema-admin.graphql',
      documents: ['queries/admin/*.gql'],
    },
    client: {
      schema: 'schema-client.graphql',
      documents: ['queries/client/*.gql'],
    },
  },
};
