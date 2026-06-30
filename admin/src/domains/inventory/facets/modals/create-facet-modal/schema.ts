import { z } from "zod";
import { FacetType, FacetUiType } from "@/graphql/types";

const facetTypeValues = Object.values(FacetType) as [FacetType, ...FacetType[]];
const facetUiTypeValues = Object.values(FacetUiType) as [
  FacetUiType,
  ...FacetUiType[],
];
export const createFacetSchema = z.object({
  label: z.string().trim().min(1, "Label is required"),
  slug: z.string().trim().optional().default(""),
  facetType: z.enum(facetTypeValues),
  uiType: z.enum(facetUiTypeValues),
  source: z.object({
    handle: z.string().trim().min(1),
    name: z.string().trim().min(1),
  }).nullable().refine((value) => value !== null, {
    message: "Source is required",
  }),
});

export type CreateFacetFormInput = z.input<typeof createFacetSchema>;
export type CreateFacetFormValues = z.output<typeof createFacetSchema>;
