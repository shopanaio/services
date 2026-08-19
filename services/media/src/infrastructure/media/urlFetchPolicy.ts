import { isIP } from "node:net";
import dns from "node:dns/promises";

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

// Strip the IPv4-mapped-IPv6 wrapper (::ffff:127.0.0.1) so the IPv4 checks
// below can't be bypassed by asking for the same address in v6 notation.
function normalizeIp(ip: string): string {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped ? mapped[1] : ip;
}

function isPrivateOrReservedIp(rawIp: string): boolean {
  // 0.0.0.0/8, 127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16,
  // 169.254.0.0/16, 100.64.0.0/10 (CGNAT), ::1, ::, fc00::/7, fe80::/10.
  // fc00::/7 covers BOTH fc00::/8 and fd00::/8 — real-world randomly
  // generated ULAs are fd00::/8, so matching only "fc" (not "fd") would
  // silently let them through.
  const ip = normalizeIp(rawIp);
  return (
    /^0\./.test(ip) ||
    /^127\./.test(ip) ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^169\.254\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip) ||
    ip === "::1" ||
    ip === "::" ||
    /^f[cd][0-9a-f]{0,2}:/i.test(ip) ||
    /^fe80:/i.test(ip)
  );
}

export interface FetchTarget {
  url: URL;
  /** The exact IP the connection must be pinned to — never re-resolved. */
  pinnedIp: string;
  pinnedFamily: 4 | 6;
}

export async function assertFetchAllowed(rawUrl: string): Promise<FetchTarget> {
  const url = new URL(rawUrl);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new Error("This host is not allowed");
  }

  if (isIP(url.hostname)) {
    if (isPrivateOrReservedIp(url.hostname)) {
      throw new Error("This host is not allowed");
    }
    return {
      url,
      pinnedIp: url.hostname,
      pinnedFamily: isIP(url.hostname) === 6 ? 6 : 4,
    };
  }

  const records = await dns.lookup(url.hostname, { all: true, verbatim: true });
  const safe = records.find((r) => !isPrivateOrReservedIp(r.address));
  if (!safe) {
    throw new Error("This host resolves to a disallowed address");
  }
  return { url, pinnedIp: safe.address, pinnedFamily: safe.family as 4 | 6 };
}
