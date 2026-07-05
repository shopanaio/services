import type { Product } from "../../repositories/models/index.js";
import { ServiceType } from "./ServiceType.js";

export class ProductSnapshotResolver extends ServiceType<string, Product> {}
