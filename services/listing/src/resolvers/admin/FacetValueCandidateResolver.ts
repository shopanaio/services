import { ListingType } from "./ListingType.js";
import type { FacetValueCandidateView } from "../../repositories/facet/FacetRepository.js";

export class FacetValueCandidateResolver extends ListingType<FacetValueCandidateView> {
  id() {
    return this.$props.id;
  }

  facetType() {
    return this.$props.facetType;
  }

  sourceHandle() {
    return this.$props.sourceHandle;
  }

  handle() {
    return this.$props.handle;
  }

  label() {
    return this.$props.label;
  }
}
