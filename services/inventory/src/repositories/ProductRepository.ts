import type { Database } from "../infrastructure/db/database";
import { product } from "./models";

export class ProductRepository {
  constructor(private readonly db: Database) {}
}
