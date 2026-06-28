export {
  GLOBAL_ID_NAMESPACE,
  GLOBAL_ID_PATTERN,
  GlobalIdEntity,
  composeGlobalId,
  decodeGlobalId,
  encodeGlobalId,
  parseGlobalId,
  type GlobalId,
  type GlobalIdType,
} from "./core.js";

export { decodeGlobalIdByType, encodeGlobalIdByType } from "./idCodec.js";
export { IsGlobalId, IsGlobalIdArray } from "./validators.js";
