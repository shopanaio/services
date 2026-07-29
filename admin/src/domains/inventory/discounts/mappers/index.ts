export { buildDiscountCreateInput } from "./discount-create.mapper";
export {
  buildDiscountGeneralUpdateInput,
  createDiscountGeneralFormValues,
  validateDiscountGeneralForm,
  type DiscountCodeEditorRow,
  type DiscountGeneralFormValues,
} from "./discount-general-update.mapper";
export {
  buildDiscountValueTargetsUpdateInput,
  createDiscountValueTargetsFormValues,
  validateDiscountValueTargetsForm,
  type DiscountTargetEditorItem,
  type DiscountValueTargetsFormValues,
} from "./discount-value-targets-update.mapper";
export {
  buildDiscountEligibilityChannelsUpdateInput,
  createDiscountEligibilityChannelsFormValues,
  validateDiscountEligibilityChannelsForm,
  type DiscountChannelEditorRow,
  type DiscountCustomerEditorRow,
  type DiscountEligibilityChannelsFormValues,
  type DiscountSegmentEditorRow,
} from "./discount-eligibility-channels-update.mapper";
export {
  buildDiscountAvailabilityUpdateInput,
  createDiscountAvailabilityFormValues,
  validateDiscountAvailabilityForm,
  type DiscountAvailabilityFormValues,
} from "./discount-availability-update.mapper";
export {
  mapDiscountUserErrorsToFormErrors,
  type DiscountFormError,
} from "./discount-errors.mapper";
