import { z } from "zod";
import { FacetScopeType, FacetType, FacetUiType } from "@/graphql/types";

const facetTypeValues = Object.values(FacetType) as [FacetType, ...FacetType[]];
const facetUiTypeValues = Object.values(FacetUiType) as [
  FacetUiType,
  ...FacetUiType[],
];
const facetScopeTypeValues = Object.values(FacetScopeType) as [
  FacetScopeType,
  ...FacetScopeType[],
];
const sourceSchema = z.object({
  handle: z.string().trim().min(1),
  name: z.string().trim().min(1),
});

const multiSourceFacetTypes = new Set<FacetType>([
  FacetType.Option,
  FacetType.Feature,
]);

export const createFacetSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().optional().default(""),
  facetType: z.enum(facetTypeValues),
  uiType: z.enum(facetUiTypeValues),
  scopes: z
    .array(z.enum(facetScopeTypeValues))
    .min(1, "Select at least one listing context"),
  sources: z.array(sourceSchema).min(1, "Source is required").default([]),
  selectedValueCandidates: z.array(z.object({
    id: z.string().trim().min(1),
    handle: z.string().trim().min(1),
    label: z.string().trim().min(1),
    sourceHandle: z.string().trim().min(1),
  })).default([]),
}).superRefine((values, ctx) => {
  if (
    values.sources.length > 1 &&
    !multiSourceFacetTypes.has(values.facetType)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["sources"],
      message: "Only option and feature filters can use multiple sources",
    });
  }
});

export type CreateFacetFormInput = z.input<typeof createFacetSchema>;
export type CreateFacetFormValues = z.output<typeof createFacetSchema>;
