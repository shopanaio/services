import { z } from "zod";

export const swatchSchema = z.object({
  type: z.enum(["color", "color_duo", "image"]),
  color1: z.string().optional(),
  color2: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const optionValueSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Value name is required"),
  slug: z.string(),
  sortIndex: z.number(),
  swatch: swatchSchema.optional(),
});

export const optionGroupSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Option name is required"),
  slug: z.string(),
  style: z.enum(["radio", "dropdown", "swatch", "cover", "size"]),
  values: z.array(optionValueSchema),
  sortIndex: z.number(),
});

export const editOptionsSchema = z.object({
  groups: z.array(optionGroupSchema),
});

export type FeatureStyleType = z.infer<typeof optionGroupSchema>["style"];
export type FeatureSwatchType = z.infer<typeof swatchSchema>["type"];
export type ISwatch = z.infer<typeof swatchSchema>;
export type IOptionValue = z.infer<typeof optionValueSchema>;
export type IOptionGroup = z.infer<typeof optionGroupSchema>;
export type IEditOptionsFormValues = z.infer<typeof editOptionsSchema>;
