import type { Repository } from "../repositories/Repository.js";

/** Request-scoped DataLoader registry. Add entity loaders here as schemas grow. */
export class Loader {
  constructor(_repository: Repository) {}
}
