import type { Repository } from "../repositories/Repository.js";

/** Request-scoped DataLoader registry prepared for Loyalty read models. */
export class Loader {
  constructor(readonly repository: Repository) {}
}
