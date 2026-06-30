import type { OutputData } from "@editorjs/editorjs";
import type { ApiFile } from "@/graphql/types";

export interface ICreateCategoryFormValues {
  name: string;
  handle: string;
  description: OutputData | null;
  media: ApiFile[];
}
