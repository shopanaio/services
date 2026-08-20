import { ListingType } from "./ListingType.js";
import type { FacetSourceCandidateView } from "../../repositories/facet/FacetRepository.js";

export class FacetSourceCandidateResolver extends ListingType<FacetSourceCandidateView> {
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
