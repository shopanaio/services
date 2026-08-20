import { promises as dns } from "node:dns";
import { BlockList, isIP } from "node:net";

const privateIpv4Addresses = new BlockList();
const privateIpv6Addresses = new BlockList();
const unsupportedIpv4Addresses = new BlockList();
const unsupportedIpv6Addresses = new BlockList();

for (const [network, prefix] of [
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
] as const) {
  privateIpv4Addresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  unsupportedIpv4Addresses.addSubnet(network, prefix, "ipv4");
}

for (const [network, prefix] of [
  ["::1", 128],
  ["100::", 64],
  ["fc00::", 7],
  ["fe80::", 10],
] as const) {
  privateIpv6Addresses.addSubnet(network, prefix, "ipv6");
}

for (const [network, prefix] of [
  ["::", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["2001:db8::", 32],
  ["ff00::", 8],
] as const) {
  unsupportedIpv6Addresses.addSubnet(network, prefix, "ipv6");
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
  allowPrivateNetwork = false,
): Promise<readonly ResolvedSmtpEndpoint[]> {
  const literalFamily = isIP(host);
  const addresses = literalFamily
    ? [{ address: host, family: literalFamily }]
    : await dns.lookup(host, { all: true, verbatim: true });

  return selectPublicSmtpEndpoints(host, addresses, allowPrivateNetwork);
}

export function selectPublicSmtpEndpoints(
  host: string,
  addresses: readonly SmtpAddress[],
  allowPrivateNetwork = false,
): readonly ResolvedSmtpEndpoint[] {
  const literalFamily = isIP(host);
  const endpoints = addresses.flatMap(({ address, family }) => {
    const unsupported =
      family === 4
        ? unsupportedIpv4Addresses.check(address, "ipv4")
        : family === 6
          ? unsupportedIpv6Addresses.check(address, "ipv6")
          : true;
    const privateAddress =
      family === 4
        ? privateIpv4Addresses.check(address, "ipv4")
        : family === 6
          ? privateIpv6Addresses.check(address, "ipv6")
          : false;
    if ((family !== 4 && family !== 6) || unsupported || (!allowPrivateNetwork && privateAddress)) {
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
      new Error(
        allowPrivateNetwork
          ? "SMTP host does not resolve to a supported IP address"
          : "SMTP host does not resolve to a public IP address",
      ),
      {
        code: allowPrivateNetwork ? "SMTP_HOST_NOT_SUPPORTED" : "SMTP_HOST_NOT_PUBLIC",
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
