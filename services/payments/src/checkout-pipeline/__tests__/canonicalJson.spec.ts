import { canonicalJson, contentRevision } from "../canonicalJson.js";

describe("Payments canonical JSON", () => {
  it("uses RFC-style canonical key ordering", () => {
    expect(canonicalJson({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}');
  });

  it("produces the same revision for equivalent object key orders", () => {
    expect(contentRevision("payment-test", { b: 2, a: 1 })).toBe(
      contentRevision("payment-test", { a: 1, b: 2 }),
    );
  });

  it("rejects values outside the JSON data model", () => {
    expect(() => canonicalJson({ value: undefined })).toThrow();
    expect(() => canonicalJson({ value: Number.NaN })).toThrow();
  });
});
