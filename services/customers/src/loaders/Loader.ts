import type { Repository } from "../repositories/Repository.js";

export class Loader {
  constructor(public readonly repository: Repository) {}
}
