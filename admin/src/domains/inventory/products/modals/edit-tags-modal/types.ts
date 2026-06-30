import type { ApiTag } from "@/graphql/types";

export interface IEditTagsModalProps {
  productId?: string;
  selectedTagIds?: string[];
  availableTags?: ApiTag[];
  onSave?: (data: { tagIds: string[] }) => void;
  onCreateTag?: (name: string) => Promise<ApiTag>;
}
