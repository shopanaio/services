import { createFacetValueSchema } from "../create-facet-value-modal/schema";
import type { z } from "zod";

export const editFacetValueSchema = createFacetValueSchema;

export type EditFacetValueFormValues = z.infer<typeof editFacetValueSchema>;
