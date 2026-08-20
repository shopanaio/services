import type {
  ApiFulfillmentStage,
  FulfillmentStageCreateInput,
  FulfillmentStageUpdateInput,
} from "../graphql/operation-types";
import type { FulfillmentStageFormValues } from "../../stages/modals/stage-modal/schema";

export function buildFulfillmentStageCreateInput(
  values: FulfillmentStageFormValues,
  sortIndex: number,
): FulfillmentStageCreateInput {
  return {
    clientMutationId: crypto.randomUUID(),
    title: values.title.trim(),
    handle: values.handle.trim(),
    sortIndex,
  };
}

export function buildFulfillmentStageUpdateInput(
  values: FulfillmentStageFormValues,
  stage: ApiFulfillmentStage,
): FulfillmentStageUpdateInput {
  const input: FulfillmentStageUpdateInput = { id: stage.id, expectedVersion: stage.version };
  if (values.title.trim() !== stage.title) input.title = values.title.trim();
  if (values.handle.trim() !== stage.handle) input.handle = values.handle.trim();
  return input;
}
