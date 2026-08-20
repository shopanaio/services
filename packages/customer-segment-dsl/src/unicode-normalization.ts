import {
  UNICODE_CANONICAL_DECOMPOSITION_DATA,
  UNICODE_COMBINING_CLASS_DATA,
  UNICODE_COMPATIBILITY_DECOMPOSITION_DATA,
  UNICODE_COMPOSITION_DATA,
} from "./unicode-normalization-data.js";

const S_BASE = 0xac00;
const L_BASE = 0x1100;
const V_BASE = 0x1161;
const T_BASE = 0x11a7;
const L_COUNT = 19;
const V_COUNT = 21;
const T_COUNT = 28;
const N_COUNT = V_COUNT * T_COUNT;
const S_COUNT = L_COUNT * N_COUNT;
const MAX_CODE_POINT = 0x110000;

const canonicalDecompositions = parseSequenceMap(UNICODE_CANONICAL_DECOMPOSITION_DATA);
const compatibilityDecompositions = parseSequenceMap(UNICODE_COMPATIBILITY_DECOMPOSITION_DATA);
const combiningClasses = parseScalarMap(UNICODE_COMBINING_CLASS_DATA);
const compositions = parseCompositionMap(UNICODE_COMPOSITION_DATA);

export function fullUnicodeNfc(value: string): string {
  return normalize(value, canonicalDecompositions);
}

export function fullUnicodeNfkc(value: string): string {
  return normalize(value, compatibilityDecompositions);
}

function normalize(value: string, decompositions: ReadonlyMap<number, readonly number[]>): string {
  const decomposed: number[] = [];
  for (const character of value) decompose(character.codePointAt(0)!, decompositions, decomposed);
  canonicalOrder(decomposed);
  return codePointsToString(compose(decomposed));
}

function decompose(
  codePoint: number,
  decompositions: ReadonlyMap<number, readonly number[]>,
  output: number[],
): void {
  const hangul = decomposeHangul(codePoint);
  const mapping = hangul ?? decompositions.get(codePoint);
  if (!mapping) {
    output.push(codePoint);
    return;
  }
  for (const child of mapping) decompose(child, decompositions, output);
}

function canonicalOrder(codePoints: number[]): void {
  for (let index = 1; index < codePoints.length; index += 1) {
    const combiningClass = combiningClassOf(codePoints[index]!);
    if (combiningClass === 0) continue;
    let target = index;
    while (target > 0 && combiningClassOf(codePoints[target - 1]!) > combiningClass) target -= 1;
    if (target !== index) {
      const [codePoint] = codePoints.splice(index, 1);
      codePoints.splice(target, 0, codePoint!);
    }
  }
}

function compose(decomposed: readonly number[]): number[] {
  if (decomposed.length === 0) return [];
  const output = [decomposed[0]!];
  let starterPosition = 0;
  let starter = output[0]!;
  let lastCombiningClass = 0;
  for (let index = 1; index < decomposed.length; index += 1) {
    const codePoint = decomposed[index]!;
    const combiningClass = combiningClassOf(codePoint);
    const composite = composePair(starter, codePoint);
    if (composite !== null && (lastCombiningClass < combiningClass || lastCombiningClass === 0)) {
      output[starterPosition] = composite;
      starter = composite;
      continue;
    }
    if (combiningClass === 0) {
      starterPosition = output.length;
      starter = codePoint;
    }
    lastCombiningClass = combiningClass;
    output.push(codePoint);
  }
  return output;
}

function decomposeHangul(codePoint: number): readonly number[] | null {
  const index = codePoint - S_BASE;
  if (index < 0 || index >= S_COUNT) return null;
  const leading = L_BASE + Math.floor(index / N_COUNT);
  const vowel = V_BASE + Math.floor((index % N_COUNT) / T_COUNT);
  const trailing = T_BASE + (index % T_COUNT);
  return trailing === T_BASE ? [leading, vowel] : [leading, vowel, trailing];
}

function composePair(left: number, right: number): number | null {
  const leadingIndex = left - L_BASE;
  if (leadingIndex >= 0 && leadingIndex < L_COUNT) {
    const vowelIndex = right - V_BASE;
    if (vowelIndex >= 0 && vowelIndex < V_COUNT) {
      return S_BASE + (leadingIndex * V_COUNT + vowelIndex) * T_COUNT;
    }
  }
  const syllableIndex = left - S_BASE;
  if (syllableIndex >= 0 && syllableIndex < S_COUNT && syllableIndex % T_COUNT === 0) {
    const trailingIndex = right - T_BASE;
    if (trailingIndex > 0 && trailingIndex < T_COUNT) return left + trailingIndex;
  }
  return compositions.get(left * MAX_CODE_POINT + right) ?? null;
}

function combiningClassOf(codePoint: number): number {
  return combiningClasses.get(codePoint) ?? 0;
}

function parseSequenceMap(data: string): ReadonlyMap<number, readonly number[]> {
  const result = new Map<number, readonly number[]>();
  if (!data) return result;
  for (const entry of data.split(";")) {
    const [key, sequence] = entry.split(":");
    result.set(
      parseInt(key!, 36),
      sequence!.split(".").map((value) => parseInt(value, 36)),
    );
  }
  return result;
}

function parseScalarMap(data: string): ReadonlyMap<number, number> {
  const result = new Map<number, number>();
  if (!data) return result;
  for (const entry of data.split(";")) {
    const [key, value] = entry.split(":");
    result.set(parseInt(key!, 36), parseInt(value!, 36));
  }
  return result;
}

function parseCompositionMap(data: string): ReadonlyMap<number, number> {
  const result = new Map<number, number>();
  if (!data) return result;
  for (const entry of data.split(";")) {
    const [pair, value] = entry.split(":");
    const [left, right] = pair!.split(".").map((item) => parseInt(item, 36));
    result.set(left! * MAX_CODE_POINT + right!, parseInt(value!, 36));
  }
  return result;
}

function codePointsToString(codePoints: readonly number[]): string {
  let value = "";
  for (let index = 0; index < codePoints.length; index += 4_096) {
    value += String.fromCodePoint(...codePoints.slice(index, index + 4_096));
  }
  return value;
}
