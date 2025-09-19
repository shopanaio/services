import type { CodegenConfig } from "@graphql-codegen/cli";

const scalars = {
  ID: { input: "string", output: "string" },
  String: { input: "string", output: "string" },
  Boolean: { input: "boolean", output: "boolean" },
  Int: { input: "number", output: "number" },
  Float: { input: "number", output: "number" },
  Any: { input: "unknown", output: "unknown" },
  Timestamp: { input: "string", output: "string" },
  Uint: { input: "number", output: "number" },
  Upload: { input: "File", output: "File" },
  Uuid: { input: "string", output: "string" },
};

const config: CodegenConfig = {
  generates: {
    "./src/types.ts": {
      schema: "./src/schema.graphql",
      plugins: ["typescript"],
      config: {
        typesPrefix: "Core",
        enumPrefix: "Core",
        scalars,
      },
    },
  },
};

export default config;
