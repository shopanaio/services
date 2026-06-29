import { z } from "zod";
import { FacetSelectionMode, FacetUiType } from "@/graphql/types";

const facetUiTypeValues = Object.values(FacetUiType) as [
  FacetUiType,
  ...FacetUiType[],
];
const selectionModeValues = Object.values(FacetSelectionMode) as [
  FacetSelectionMode,
  ...FacetSelectionMode[],
];

export const editFacetSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().min(1, "Slug is required"),
  uiType: z.enum(facetUiTypeValues),
  selectionMode: z.enum(selectionModeValues),
});

export type EditFacetFormValues = z.infer<typeof editFacetSchema>;
