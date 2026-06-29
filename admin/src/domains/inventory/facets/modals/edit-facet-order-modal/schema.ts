import { z } from "zod";

export const editFacetOrderSchema = z.object({});

export type EditFacetOrderFormValues = z.infer<typeof editFacetOrderSchema>;
