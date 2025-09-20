import type { StreamNamePolicyPort } from "@src/application/ports/streamNamePort";

export class StreamNamePolicyAdapter implements StreamNamePolicyPort {
  buildOrderStreamNameFromId(id: string): string {
    return `chk-${id}`;
  }
}
