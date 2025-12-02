import type { Database } from "../infrastructure/db/database";
import {
  productOption,
  productOptionValue,
  productOptionSwatch,
  productOptionVariantLink,
} from "./models";

export class OptionRepository {
  constructor(private readonly db: Database) {}
}
