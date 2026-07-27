import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";

const blockedIpv4Addresses = new BlockList();
const blockedIpv6Addresses = new BlockList();

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4Addresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blockedIpv6Addresses.addSubnet(network, prefix, "ipv6");
}

export interface ResolvedSmtpEndpoint {
  readonly address: string;
  readonly family: 4 | 6;
  readonly servername?: string;
}

interface SmtpAddress {
  readonly address: string;
  readonly family: number;
}

export async function resolvePublicSmtpEndpoints(
  host: string,
): Promise<readonly ResolvedSmtpEndpoint[]> {
  const literalFamily = isIP(host);
  const addresses = literalFamily
    ? [{ address: host, family: literalFamily }]
    : await dns.lookup(host, { all: true, verbatim: true });

  return selectPublicSmtpEndpoints(host, addresses);
}

export function selectPublicSmtpEndpoints(
  host: string,
  addresses: readonly SmtpAddress[],
): readonly ResolvedSmtpEndpoint[] {
  const literalFamily = isIP(host);
  const endpoints = addresses.flatMap(({ address, family }) => {
    if (
      (family !== 4 && family !== 6) ||
      (family === 4
        ? blockedIpv4Addresses.check(address, "ipv4")
        : blockedIpv6Addresses.check(address, "ipv6"))
    ) {
      return [];
    }
    return [
      Object.freeze({
        address,
        family,
        ...(literalFamily === 0 ? { servername: host } : {}),
      }) satisfies ResolvedSmtpEndpoint,
    ];
  });

  if (endpoints.length === 0) {
    throw Object.assign(
      new Error("SMTP host does not resolve to a public IP address"),
      {
        code: "SMTP_HOST_NOT_PUBLIC",
        details: Object.freeze({
          kind: "CONFIGURATION",
          safeToRetry: false,
          acceptedByProvider: false,
        }),
      },
    );
  }

  return Object.freeze(endpoints);
}
