import {
  encodeGlobalIdByType,
  GlobalIdEntity,
  parseGlobalId,
} from "@shopana/shared-graphql-guid";

export type NodeType = "File" | "Bucket" | "MediaAssetGroup";

export function encodeGlobalId(type: NodeType, id: string): string {
  return encodeGlobalIdByType(id, GlobalIdEntity[type]);
}

export function decodeGlobalId(
  globalId: string
): { type: NodeType; id: string } | null {
  try {
    const parsed = parseGlobalId(globalId);
    if (parsed.typeName === GlobalIdEntity.File) {
      return { type: "File", id: parsed.id };
    }
    if (parsed.typeName === GlobalIdEntity.Bucket) {
      return { type: "Bucket", id: parsed.id };
    }
    if (parsed.typeName === GlobalIdEntity.MediaAssetGroup) {
      return { type: "MediaAssetGroup", id: parsed.id };
    }
    return null;
  } catch {
    return null;
  }
}
