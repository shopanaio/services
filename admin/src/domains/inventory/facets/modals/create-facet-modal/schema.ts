import { z } from "zod";
import {
  FacetSelectionMode,
  FacetType,
  FacetUiType,
} from "@/graphql/types";

const facetTypeValues = Object.values(FacetType) as [FacetType, ...FacetType[]];
const facetUiTypeValues = Object.values(FacetUiType) as [
  FacetUiType,
  ...FacetUiType[],
];
const selectionModeValues = Object.values(FacetSelectionMode) as [
  FacetSelectionMode,
  ...FacetSelectionMode[],
];

export const createFacetSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().optional().default(""),
  facetType: z.enum(facetTypeValues),
  uiType: z.enum(facetUiTypeValues),
  selectionMode: z.enum(selectionModeValues),
});

export type CreateFacetFormValues = z.infer<typeof createFacetSchema>;
