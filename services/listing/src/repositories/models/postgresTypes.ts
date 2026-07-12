import { customType } from "drizzle-orm/pg-core";

export type RoaringBitmapValue = string;

export const roaringbitmap = customType<{
  data: RoaringBitmapValue;
  driverData: string;
}>({
  dataType() {
    return "roaringbitmap";
  },
});

export type TsVectorValue = string;

export const tsvector = customType<{
  data: TsVectorValue;
  driverData: string;
}>({
  dataType() {
    return "tsvector";
  },
});
