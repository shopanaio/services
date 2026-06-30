import { CatalogType } from "./CatalogType.js";
import type { FacetSourceCandidateView } from "../../repositories/models/index.js";

export class FacetSourceCandidateResolver extends CatalogType<
  FacetSourceCandidateView
> {
  id() {
    return `${this.$props.facetType}:${this.$props.handle}`;
  }

  locale() {
    return this.$props.locale;
  }

  facetType() {
    return this.$props.facetType;
  }

  handle() {
    return this.$props.handle;
  }

  name() {
    return this.$props.name;
  }
}
