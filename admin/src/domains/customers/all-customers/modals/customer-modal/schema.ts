import { z } from "zod";
import {
  CustomerMarketingState,
  CustomerStatus,
} from "../../graphql/operation-types";

export const customerFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80),
    lastName: z.string().trim().min(1, "Last name is required").max(80),
    email: z.string().trim().email("Enter a valid email address").max(254),
    phone: z.string().trim().max(40, "Phone number is too long"),
    status: z.enum([
      CustomerStatus.Active,
      CustomerStatus.Disabled,
      CustomerStatus.Blocked,
    ]),
    locale: z.string().min(1, "Locale is required"),
    taxExempt: z.boolean(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20, "Use at most 20 tags"),
    note: z.string().trim().max(2000, "Note must be at most 2,000 characters"),
    emailMarketingState: z.enum([
      CustomerMarketingState.Subscribed,
      CustomerMarketingState.NotSubscribed,
      CustomerMarketingState.Pending,
    ]),
    smsMarketingState: z.enum([
      CustomerMarketingState.Subscribed,
      CustomerMarketingState.NotSubscribed,
      CustomerMarketingState.Pending,
    ]),
    segmentIds: z.array(z.string()),
    defaultAddress: z.object({
      address1: z.string().trim().max(160),
      address2: z.string().trim().max(160),
      city: z.string().trim().max(100),
      province: z.string().trim().max(100),
      postalCode: z.string().trim().max(32),
      countryCode: z.string(),
    }),
    blockedReason: z.string().trim().max(500, "Block reason must be at most 500 characters"),
    moderationNote: z.string().trim().max(2000, "Moderation note must be at most 2,000 characters"),
  })
  .superRefine((values, context) => {
    if (values.status === CustomerStatus.Blocked && !values.blockedReason) {
      context.addIssue({
        code: "custom",
        path: ["blockedReason"],
        message: "Add a reason when blocking a customer",
      });
    }

    const address = values.defaultAddress;
    const hasAddress = Object.values(address).some((value) => String(value ?? "").length > 0);
    if (!hasAddress) return;

    const requiredAddressFields: Array<keyof typeof address> = [
      "address1",
      "city",
      "postalCode",
      "countryCode",
    ];
    for (const field of requiredAddressFields) {
      if (!address[field]) {
        context.addIssue({
          code: "custom",
          path: ["defaultAddress", field],
          message: "Required when an address is provided",
        });
      }
    }
  });

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
