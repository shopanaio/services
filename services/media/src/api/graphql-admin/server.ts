import { ApolloServer } from "@apollo/server";
import { buildSubgraphSchema } from "@apollo/subgraph";
import fastifyApollo, {
  fastifyApolloDrainPlugin,
} from "@as-integrations/fastify";
import Fastify from "fastify";
import { readFileSync } from "fs";
import { gql } from "graphql-tag";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { resolvers } from "./resolvers/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface GraphQLContext {
  // Add your context properties here
  // e.g., userId?: string;
  // db?: DatabaseConnection;
}

function loadTypeDefs() {
  const schemaDir = __dirname;
  const files = [
    "relay.graphql",
    "base.graphql",
    "file.graphql",
  ];

  const typeDefs = files.map((file) => {
    const content = readFileSync(join(schemaDir, file), "utf-8");
    return gql(content);
  });

  return typeDefs;
}

export async function createApolloServer() {
  const fastify = Fastify({
    logger: true,
  });

  const typeDefs = loadTypeDefs();

  const server = new ApolloServer<GraphQLContext>({
    schema: buildSubgraphSchema({
      typeDefs,
      resolvers,
    }),
    plugins: [fastifyApolloDrainPlugin(fastify)],
  });

  await server.start();

  await fastify.register(fastifyApollo(server), {
    context: async (request, reply): Promise<GraphQLContext> => {
      // Build your context here
      // You can access request headers, etc.
      return {
        // userId: request.headers['x-user-id'],
      };
    },
  });

  return fastify;
}

export async function startServer(port = 4002) {
  const fastify = await createApolloServer();

  try {
    const address = await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`GraphQL Admin API running at ${address}/graphql`);
    return fastify;
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}
