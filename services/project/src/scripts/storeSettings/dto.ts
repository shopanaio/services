import { z } from "zod";
import { DimensionUnitEnum, WeightUnitEnum } from "../../repositories/models/index.js";
import { timezoneSchema } from "../shared/timezoneSchema.js";
import { storeNameSchema } from "../store/dto/StoreCreateDto.js";
import type { StorePayload } from "../store/dto/shared.js";

const contextSchema = z.object({
  storeId: z.string().uuid("Invalid store ID"),
  organizationId: z.string().uuid("Invalid organization ID"),
});

const nullableTrimmedString = (max: number) => z.string().trim().min(1).max(max).nullable();

export const storeContactDetailsUpdateSchema = contextSchema.extend({
  name: z.string().trim().min(1).max(255),
  slug: storeNameSchema,
  email: z.string().trim().email("Invalid email format").nullable(),
  phoneNumbers: z
    .array(
      z
        .string()
        .trim()
        .regex(/^\+[1-9][0-9]{1,14}$/, "Phone number must use E.164 format"),
    )
    .max(20)
    .refine(
      (phoneNumbers) => new Set(phoneNumbers).size === phoneNumbers.length,
      "Phone numbers must be unique",
    ),
});

export const storeAddressUpdateSchema = contextSchema.extend({
  companyName: nullableTrimmedString(255),
  countryCode: z.string().regex(/^[A-Z]{2}$/, "Invalid ISO country code"),
  addressLine1: nullableTrimmedString(255),
  addressLine2: nullableTrimmedString(255),
  city: nullableTrimmedString(128),
  administrativeArea: nullableTrimmedString(128),
  postalCode: nullableTrimmedString(32),
});

const storeSocialLinkSchema = z.object({
  platform: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z][a-z0-9_-]{0,31}$/, "Invalid social platform code"),
  url: z
    .string()
    .trim()
    .url("Invalid social URL")
    .refine((url) => /^https?:\/\//i.test(url), "Social URL must use HTTP(S)"),
});

export const storeBrandUpdateSchema = contextSchema
  .extend({
    defaultLogoMediaId: z.string().uuid().nullable(),
    squareLogoMediaId: z.string().uuid().nullable(),
    coverImageMediaId: z.string().uuid().nullable(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid primary color"),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid secondary color"),
    slogan: nullableTrimmedString(255),
    shortDescription: nullableTrimmedString(500),
    socialLinks: z.array(storeSocialLinkSchema).max(20),
  })
  .refine(
    ({ socialLinks }) =>
      new Set(socialLinks.map(({ platform }) => platform)).size === socialLinks.length,
    { message: "Social platforms must be unique", path: ["socialLinks"] },
  );

export const storeOrderProcessingUpdateSchema = contextSchema.extend({
  orderNumberPrefix: z
    .string()
    .max(16)
    .regex(/^[^\u0000-\u001F\u007F]*$/),
  orderNumberSuffix: z
    .string()
    .max(16)
    .regex(/^[^\u0000-\u001F\u007F]*$/)
    .nullable(),
  requireCheckoutConfirmation: z.boolean(),
  automaticFulfillmentMode: z.enum(["all_line_items", "gift_cards_only", "disabled"]),
  automaticallyArchiveOrders: z.boolean(),
});

export const storeDefaultsUpdateSchema = contextSchema.extend({
  unitSystem: z.enum(["metric", "imperial"]),
  defaultWeightUnit: z.nativeEnum(WeightUnitEnum),
  defaultDimensionUnit: z.nativeEnum(DimensionUnitEnum),
  timezone: timezoneSchema,
});

export const storeCurrencySettingsUpdateSchema = contextSchema
  .extend({
    currencyDisplay: z.enum(["symbol", "narrowSymbol", "code", "name"]),
    currencySign: z.enum(["standard", "accounting"]),
    grouping: z.enum(["auto", "always", "min2", "never"]),
    signDisplay: z.enum(["auto", "always", "exceptZero", "negative", "never"]),
    minimumFractionDigits: z.number().int().min(0).max(100),
    maximumFractionDigits: z.number().int().min(0).max(100),
    roundingMode: z.enum([
      "ceil",
      "floor",
      "expand",
      "trunc",
      "halfCeil",
      "halfFloor",
      "halfExpand",
      "halfTrunc",
      "halfEven",
    ]),
    trailingZeroDisplay: z.enum(["auto", "stripIfInteger"]),
  })
  .refine(
    ({ minimumFractionDigits, maximumFractionDigits }) =>
      minimumFractionDigits <= maximumFractionDigits,
    {
      message: "Minimum fraction digits cannot exceed maximum fraction digits",
      path: ["minimumFractionDigits"],
    },
  );

export type StoreContactDetailsUpdateParams = z.infer<typeof storeContactDetailsUpdateSchema>;
export type StoreAddressUpdateParams = z.infer<typeof storeAddressUpdateSchema>;
export type StoreBrandUpdateParams = z.infer<typeof storeBrandUpdateSchema>;
export type StoreOrderProcessingUpdateParams = z.infer<typeof storeOrderProcessingUpdateSchema>;
export type StoreDefaultsUpdateParams = z.infer<typeof storeDefaultsUpdateSchema>;
export type StoreCurrencySettingsUpdateParams = z.infer<typeof storeCurrencySettingsUpdateSchema>;
export type StoreSettingsUpdateResult = StorePayload;
