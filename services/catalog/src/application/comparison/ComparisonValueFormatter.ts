import type { LocalizedComparisonProfile } from "../../repositories/comparison/comparison-types.js";

export class ComparisonValueFormatter {
  private readonly number: Intl.NumberFormat;
  constructor(private readonly locale: string) { this.number = new Intl.NumberFormat(locale, { maximumFractionDigits: 12 }); }
  format(value: any, type: string, unit: string | null, optionName: string | null): string {
    if (type === "BOOLEAN") return this.booleanLabel(Boolean(value.booleanValue));
    if (type === "ENUM") return optionName ?? "";
    if (type === "DECIMAL") return this.withUnit(this.number.format(Number(value.decimalValue)), unit);
    if (type === "INTEGER") return this.withUnit(this.number.format(Number(value.integerValue)), unit);
    return String(value.textValue ?? "").trim();
  }
  status(status: "MISSING" | "NOT_APPLICABLE" | "UNAVAILABLE", profile: LocalizedComparisonProfile) { return status === "MISSING" ? profile.missingLabel : status === "NOT_APPLICABLE" ? profile.notApplicableLabel : profile.unavailableLabel; }
  join(values: string[]) { return new Intl.ListFormat(this.locale, { style: "long", type: "conjunction" }).format(values); }
  private withUnit(value: string, unit: string | null) { return unit ? `${value} ${unit}` : value; }
  private booleanLabel(value: boolean) { const language = this.locale.toLowerCase().split("-")[0]; const labels: Record<string, [string, string]> = { uk: ["Так", "Ні"], ru: ["Да", "Нет"], de: ["Ja", "Nein"], fr: ["Oui", "Non"], es: ["Sí", "No"] }; const [yes, no] = labels[language ?? ""] ?? ["Yes", "No"]; return value ? yes : no; }
}
