declare module "tr46" {
  export interface ToAsciiOptions {
    readonly checkBidi?: boolean;
    readonly checkHyphens?: boolean;
    readonly checkJoiners?: boolean;
    readonly transitionalProcessing?: boolean;
    readonly useSTD3ASCIIRules?: boolean;
    readonly verifyDNSLength?: boolean;
  }

  const tr46: {
    toASCII(domainName: string, options?: ToAsciiOptions): string | null;
  };

  export default tr46;
}
