import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

export const config = {
  coreAppsGraphqlUrl: process.env.CORE_APPS_GRAPHQL_URL,
};
