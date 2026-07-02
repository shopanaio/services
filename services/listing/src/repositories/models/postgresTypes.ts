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
