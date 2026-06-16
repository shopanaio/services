/**
 * Utility functions for generating product variants from options
 */

export interface IOptionValueInput {
  value: string;
  slug: string;
}

export interface IOptionInput {
  id: string;
  name: string;
  values: IOptionValueInput[];
}

export interface IOptionValue {
  name: string;
  value: string;
  slug: string;
}

export interface IGeneratedVariant {
  id: string;
  title: string;
  options: IOptionValue[];
  enabled: boolean;
}

/**
 * Computes the cartesian product of multiple arrays
 * @example
 * cartesianProduct([[1, 2], [3, 4]]) => [[1, 3], [1, 4], [2, 3], [2, 4]]
 */
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [[]];

  return arrays.reduce<T[][]>(
    (acc, arr) => acc.flatMap((x) => arr.map((y) => [...x, y])),
    [[]]
  );
}

/**
 * Generates all possible variant combinations from product options
 *
 * @param options - Array of option groups with their values
 * @returns Array of generated variants with combined titles
 *
 * @example
 * ```ts
 * const options = [
 *   { id: '1', name: 'Color', values: ['Red', 'Blue'] },
 *   { id: '2', name: 'Size', values: ['S', 'M'] },
 * ];
 *
 * generateVariants(options);
 * // Returns:
 * // [
 * //   { id: 'variant-0', title: 'Red / S', options: [...], enabled: true },
 * //   { id: 'variant-1', title: 'Red / M', options: [...], enabled: true },
 * //   { id: 'variant-2', title: 'Blue / S', options: [...], enabled: true },
 * //   { id: 'variant-3', title: 'Blue / M', options: [...], enabled: true },
 * // ]
 * ```
 */
export function generateVariants(options: IOptionInput[]): IGeneratedVariant[] {
  // Filter out options with no values
  const validOptions = options.filter(
    (opt) => opt.name.trim() && opt.values.length > 0
  );

  if (validOptions.length === 0) {
    return [];
  }

  // Transform options into arrays of { name, value, slug } objects
  const optionValueArrays = validOptions.map((opt) =>
    opt.values.map((v) => ({
      name: opt.name,
      value: v.value,
      slug: v.slug,
    }))
  );

  // Generate all combinations using cartesian product
  const combinations = cartesianProduct(optionValueArrays);

  // Transform combinations into variant objects
  return combinations.map((combo) => {
    const id = combo.map((c) => c.slug).join('-');
    const title = combo.map((c) => c.value).join(' / ');
    return {
      id,
      title,
      options: combo,
      enabled: true,
    };
  });
}

/**
 * Counts the total number of variants that would be generated
 * Useful for showing warnings before generating large numbers
 */
export function countPotentialVariants(options: IOptionInput[]): number {
  const validOptions = options.filter(
    (opt) => opt.name.trim() && opt.values.length > 0
  );

  if (validOptions.length === 0) return 0;

  return validOptions.reduce((acc, opt) => acc * opt.values.length, 1);
}

