import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.E2E_OAUTH_CLIENT_PORT || 3000);
const appDirectory = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../apps/oauth-test-client",
);
const indexHtml = readFileSync(resolve(appDirectory, "index.html"));
const appScript = readFileSync(resolve(appDirectory, "app.js"));

createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://localhost:${port}`);
  if (request.method !== "GET") {
    response.writeHead(405).end();
    return;
  }
  if (url.pathname === "/app.js") {
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/javascript; charset=utf-8",
    });
    response.end(appScript);
    return;
  }
  if (url.pathname === "/" || url.pathname === "/auth/callback") {
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
    });
    response.end(indexHtml);
    return;
  }
  response.writeHead(404).end();
}).listen(port, "127.0.0.1", () => {
  console.log(`[oauth-test-client] listening on http://localhost:${port}`);
});
