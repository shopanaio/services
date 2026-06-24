import type {
  SortFieldMapping,
  UsePageConfigReturn,
} from "@/hooks";
import type { TagsQueryVariables } from "../graphql";

type TagsWhereInput = Record<string, never>;
type TagsOrderField = string;

export const tagSortFieldMapping: SortFieldMapping<TagsOrderField> = {};

export function buildTagsQueryVariables(
  pageConfig: Pick<
    UsePageConfigReturn<TagsWhereInput, TagsOrderField>,
    "first" | "after" | "last" | "before"
  >,
): TagsQueryVariables {
  return {
    first: pageConfig.first,
    after: pageConfig.after,
    last: pageConfig.last,
    before: pageConfig.before,
  };
}

export type {
  TagsOrderField,
  TagsWhereInput,
};
