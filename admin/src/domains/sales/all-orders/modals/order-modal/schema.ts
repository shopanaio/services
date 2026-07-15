import { z } from "zod";
const optionalNumber = z.number().finite().nonnegative().nullable();
export const orderFormSchema = z.object({
  customerId: z.string(), firstName: z.string().trim().min(1, "First name is required").max(80), lastName: z.string().trim().min(1, "Last name is required").max(80), email: z.string().trim().email("Enter a valid email").max(254), phone: z.string().trim().max(40), currencyCode: z.enum(["USD", "EUR", "UAH"]), externalSystemId: z.string().trim().max(100), shippingMethodId: z.string(), paymentMethodId: z.string(),
  items: z.array(z.object({ id: z.string(), productId: z.string().min(1), title: z.string().trim().min(1, "Product title is required"), sku: z.string(), price: z.number().finite().nonnegative(), quantity: z.number().int().min(1), weight: optionalNumber, costPrice: optionalNumber })).min(1, "Add at least one item"),
  tags: z.array(z.string().trim().min(1).max(40)).max(20), adminNote: z.string().trim().max(2000),
});
export type OrderFormValues = z.infer<typeof orderFormSchema>;
