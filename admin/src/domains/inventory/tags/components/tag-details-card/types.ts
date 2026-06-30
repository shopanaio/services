import type { ApiTag } from "@/graphql/types";

export interface TagDetailsCardProps {
  tag: ApiTag;
  onRefetch?: () => Promise<unknown> | unknown;
}
