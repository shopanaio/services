import type { ITag } from "../../modals";

export interface IEditTagsModalProps {
  productId?: string;
  selectedTagIds?: string[];
  availableTags?: ITag[];
  onSave?: (data: { tagIds: string[] }) => void;
  onCreateTag?: (title: string) => Promise<ITag>;
}
