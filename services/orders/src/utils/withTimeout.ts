export async function withTimeout<T>(promise: Promise<T>, ms: number, message = 'Operation timed out'): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  try {
    const result = await Promise.race([promise, timeout]);
    return result as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
