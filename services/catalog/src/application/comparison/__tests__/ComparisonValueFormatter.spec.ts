import { ComparisonValueFormatter } from "../ComparisonValueFormatter.js";

const profile = {
  missingLabel: "Missing",
  notApplicableLabel: "Not applicable",
  unavailableLabel: "Unavailable",
} as any;

describe("ComparisonValueFormatter", () => {
  it("formats all canonical scalar types without changing semantic storage", () => {
    const formatter = new ComparisonValueFormatter("en-US");
    expect(formatter.format({ booleanValue: true }, "BOOLEAN", null, null)).toBe("Yes");
    expect(formatter.format({ decimalValue: "6.100000000000" }, "DECIMAL", "mm", null)).toBe(
      "6.1 mm",
    );
    expect(formatter.format({ integerValue: 1200n }, "INTEGER", "Hz", null)).toBe("1,200 Hz");
    expect(formatter.format({ fieldOptionId: "oled" }, "ENUM", null, "OLED")).toBe("OLED");
    expect(formatter.format({ textValue: "  prepared  " }, "TEXT", null, null)).toBe("prepared");
  });

  it("uses configured status labels and locale-aware joining", () => {
    const formatter = new ComparisonValueFormatter("en-US");
    expect(formatter.status("MISSING", profile)).toBe("Missing");
    expect(formatter.status("NOT_APPLICABLE", profile)).toBe("Not applicable");
    expect(formatter.status("UNAVAILABLE", profile)).toBe("Unavailable");
    expect(formatter.join(["A", "B", "C"])).toBe("A, B, and C");
  });
});
