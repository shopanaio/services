import { loadConfig } from "./core/config";
import { createServer } from "./server";

const config = loadConfig();
const app = createServer(config);
app.listen(config.port, config.host, () =>
  console.log(`Woodpecker convert extension listening on ${config.host}:${config.port}`)
);
