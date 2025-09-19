import { z } from 'zod';

export const npBaseResponse = <T extends z.ZodTypeAny>(data: T) => z.object({
  success: z.boolean(),
  data,
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  info: z.array(z.string()).default([]),
});

export const npTariffItem = z.object({
  ServiceType: z.string(),
  Cost: z.number(),
  DeliveryDate: z.string().optional(),
});

export const getDocumentPriceResp = npBaseResponse(z.array(npTariffItem));
export type GetDocumentPriceResp = z.infer<typeof getDocumentPriceResp>;
