export type SecretRef = { $secret: string };

export function isSecretRef(value: unknown): value is SecretRef {
  return Boolean(value) && typeof value === 'object' && '$secret' in (value as Record<string, unknown>);
}

export function deepClone<T>(x: T): T {
  return x == null ? x : JSON.parse(JSON.stringify(x)) as T;
}

export function maskSecrets(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSecrets);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (isSecretRef(v)) out[k] = '***';
    else if (v && typeof v === 'object') out[k] = maskSecrets(v);
    else out[k] = v;
  }
  return out;
}

export function collectMissingSecrets(obj: unknown, pathPrefix = ''): string[] {
  if (!obj || typeof obj !== 'object') return [];
  const missing: string[] = [];
  const rec = (node: unknown, pathAcc: string) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((v, i) => rec(v, `${pathAcc}[${i}]`)); return; }
    for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
      const current = pathAcc ? `${pathAcc}.${key}` : key;
      if (isSecretRef(val)) {
        const envName = val.$secret;
        if (!process.env[envName]) missing.push(`${current} -> ${envName}`);
      } else if (val && typeof val === 'object') rec(val, current);
    }
  };
  rec(obj, pathPrefix);
  return missing;
}

export function substituteSecrets<TConfig extends Record<string, unknown>>(obj: TConfig): TConfig {
  const cloned = deepClone(obj);
  const rec = (node: any) => {
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      if (isSecretRef(v)) {
        const envName = (v as SecretRef).$secret;
        node[k] = process.env[envName] ?? '';
      } else if (v && typeof v === 'object') rec(v);
    }
  };
  rec(cloned);
  return cloned;
}
