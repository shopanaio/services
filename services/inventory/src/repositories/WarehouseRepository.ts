import type { Database } from "../infrastructure/db/database";
import { warehouses } from "./models";

export class WarehouseRepository {
  constructor(private readonly db: Database) {}
}
