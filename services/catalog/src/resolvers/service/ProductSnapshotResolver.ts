import { ServiceType } from "./ServiceType.js";

export class ProductSnapshotResolver extends ServiceType<string> {
  id() {
    return this.$props;
  }
}
