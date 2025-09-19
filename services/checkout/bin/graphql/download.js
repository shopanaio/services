/* eslint-disable */
import fs from "fs";
import path from "path";
import { printSchema, buildClientSchema } from "graphql";

const { readFile, writeFile } = fs.promises;

export const download = async (url, output) => {
  console.log("Downloading GraphQL schema from: ", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Interpolation": "true",
    },
    body: JSON.stringify({
      operationName: "IntrospectionQuery",
      query: await readFile(
        path.resolve(process.cwd(), "bin", "graphql", "IntrospectionQuery.gql"),
        "utf8"
      ),
    }),
  });

  const data = await response.json();
  return writeFile(
    path.join(process.cwd(), output),
    printSchema(buildClientSchema({ __schema: data.data.__schema }))
  );
};
