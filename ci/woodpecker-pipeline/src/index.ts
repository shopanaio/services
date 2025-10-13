import { loadConfig } from "./core/config";
import { createServer } from "./server";

const config = loadConfig();
const app = createServer(config);
app.listen(config.port, () =>
  console.log(`Drone convert extension listening on port ${config.port}`)
);
