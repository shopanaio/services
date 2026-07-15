const defaultInitializer = (index: number) => index;

export function createRange<T = number>(
  length: number,
  initializer: (index: number) => unknown = defaultInitializer,
): T[] {
  return [...new Array(length)].map((_, index) => initializer(index)) as T[];
}
