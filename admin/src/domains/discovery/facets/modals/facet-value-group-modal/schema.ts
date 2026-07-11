import { z } from "zod";

export const facetValueGroupSchema = z.object({
  label: z.string().trim().min(1, "Name is required"),
});

export type FacetValueGroupFormInput = z.input<typeof facetValueGroupSchema>;
export type FacetValueGroupFormValues = z.output<typeof facetValueGroupSchema>;
