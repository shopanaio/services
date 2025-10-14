import express, { Request, Response, Router } from "express";
import { ConfigService } from "../service/config-service";

/**
 * Create an Express router that wires JSON parsing
 * and delegates POST / handling to ConfigService.
 */
export function createExpressRouter(service: ConfigService): Router {
  const router = express.Router();

  router.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  router.post("/", async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        configs: await service.generate(req.body),
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
