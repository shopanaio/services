import { createExecutor } from "@shopana/type-resolver";
import type { ServiceContext } from "../../context/types.js";
import { ProductResolver } from "../admin/ProductResolver.js";

export class ProductSnapshotResolver extends ProductResolver {
  static override executor = createExecutor<ServiceContext>({});

  id() {
    return this.$props;
  }
}
