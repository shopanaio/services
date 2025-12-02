import type { Database } from "../infrastructure/db/database";
import { warehouseStock } from "./models";

export class StockRepository {
  constructor(private readonly db: Database) {}
}
