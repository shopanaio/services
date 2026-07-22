import { UnitSystem, WeightUnit } from "@/graphql/types";

export const UNIT_SYSTEM_LABELS: Record<UnitSystem, string> = {
  [UnitSystem.Metric]: "Metric system",
  [UnitSystem.Imperial]: "Imperial system",
};

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  [WeightUnit.Kg]: "Kilogram (kg)",
  [WeightUnit.G]: "Gram (g)",
  [WeightUnit.Lb]: "Pound (lb)",
  [WeightUnit.Oz]: "Ounce (oz)",
};

export const formatTimeZoneLabel = (timeZone: string) => {
  const city = timeZone.split("/").at(-1)?.replaceAll("_", " ") ?? timeZone;

  try {
    const offset = new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      timeZone,
      timeZoneName: "longOffset",
    })
      .formatToParts(new Date())
      .find(({ type }) => type === "timeZoneName")?.value;

    return `(${offset ?? "GMT"}) ${city}`;
  } catch {
    return timeZone;
  }
};

export const getTimeZoneOptions = () => {
  const fallback = [
    "Europe/Kyiv",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "America/Los_Angeles",
    "Asia/Tokyo",
  ];
  const timeZones =
    typeof Intl.supportedValuesOf === "function"
      ? Intl.supportedValuesOf("timeZone")
      : fallback;

  return timeZones.map((value) => ({
    label: formatTimeZoneLabel(value),
    value,
  }));
};
