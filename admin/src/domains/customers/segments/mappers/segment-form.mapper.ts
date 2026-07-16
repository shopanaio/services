import type { FieldPath } from "react-hook-form";
import type {
  ApiCustomerSegmentCreateInput,
  ApiCustomerSegmentUpdateInput,
  ApiGenericUserError,
} from "@/graphql/types";
import { CustomerSegmentStatus, CustomerSegmentType } from "@/graphql/types";
import type { SegmentFormValues } from "../modals/segment-modal/schema";

export function buildCustomerSegmentCreateInput(values: SegmentFormValues): ApiCustomerSegmentCreateInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    color: values.color,
    type: CustomerSegmentType.Manual,
    status: CustomerSegmentStatus.Active,
  };
}

export function buildCustomerSegmentUpdateInput(values: SegmentFormValues): ApiCustomerSegmentUpdateInput {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    color: values.color,
  };
}

const fieldMap: Record<string, FieldPath<SegmentFormValues>> = {
  name: "name",
  description: "description",
  color: "color",
};

export function mapCustomerSegmentUserErrors(errors: ApiGenericUserError[]) {
  return errors.map((error) => {
    const path = error.field?.join(".") ?? null;
    return {
      field: path ? fieldMap[path] ?? null : null,
      message: error.message,
    };
  });
}
