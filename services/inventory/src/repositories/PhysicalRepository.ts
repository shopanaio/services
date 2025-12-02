import type { Database } from "../infrastructure/db/database";
import { itemDimensions, itemWeight } from "./models";

export class PhysicalRepository {
  constructor(private readonly db: Database) {}
}
