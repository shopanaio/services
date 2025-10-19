import { createServer, type Server } from "http";

/**
 * Create and start health check HTTP server
 * Provides /healthz endpoint for Docker health checks
 */
export function startHealthServer(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      if (req.url === "/" || req.url === "/healthz") {
        const response = {
          status: "ok",
          service: "platform",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        };

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not Found" }));
      }
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`💚 Health check available at http://localhost:${port}/healthz`);
      resolve(server);
    });

    server.on("error", reject);
  });
}
