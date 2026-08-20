import { z } from "zod";
import { FacetScopeType, FacetUiType } from "@/graphql/types";

const facetUiTypeValues = Object.values(FacetUiType) as [FacetUiType, ...FacetUiType[]];
const facetScopeTypeValues = Object.values(FacetScopeType) as [FacetScopeType, ...FacetScopeType[]];
export const editFacetSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().optional().default(""),
  uiType: z.enum(facetUiTypeValues),
  scopes: z.array(z.enum(facetScopeTypeValues)).min(1, "Select at least one listing context"),
});

export type EditFacetFormInput = z.input<typeof editFacetSchema>;
export type EditFacetFormValues = z.output<typeof editFacetSchema>;
