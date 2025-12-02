import type { Database } from "../infrastructure/db/database";
import { variant } from "./models";

export class VariantRepository {
  constructor(private readonly db: Database) {}
}
