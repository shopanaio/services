import type { FilterPriceRangeResolverInput } from "./FilterModels.js";
import { ListingType } from "./ListingType.js";
import { minorUnitsToMoney } from "./money.js";

export class FilterPriceRangeResolver extends ListingType<FilterPriceRangeResolverInput> {
  min() {
    return minorUnitsToMoney(
      this.$props.range.minPriceMinor,
      this.$props.range.currency
    );
  }

  max() {
    return minorUnitsToMoney(
      this.$props.range.maxPriceMinor,
      this.$props.range.currency
    );
  }

  selectedMin() {
    if (this.$props.selectedMinMinor === undefined) return null;
    return minorUnitsToMoney(
      this.$props.selectedMinMinor,
      this.$props.range.currency
    );
  }

  selectedMax() {
    if (this.$props.selectedMaxMinor === undefined) return null;
    return minorUnitsToMoney(
      this.$props.selectedMaxMinor,
      this.$props.range.currency
    );
  }
}
