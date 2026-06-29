import { z } from "zod";
import { FacetUiType } from "@/graphql/types";

const facetUiTypeValues = Object.values(FacetUiType) as [
  FacetUiType,
  ...FacetUiType[],
];
export const editFacetSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().optional().default(""),
  uiType: z.enum(facetUiTypeValues),
});

export type EditFacetFormValues = z.infer<typeof editFacetSchema>;
