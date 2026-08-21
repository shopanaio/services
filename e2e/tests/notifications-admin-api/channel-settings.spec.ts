import { definePendingContractSuite } from "./contract-case";

definePendingContractSuite("Notifications Admin API - channel settings", [
  ["NTF-CHAN-001", "channelSettings returns exactly the channels allowed by the definition"],
  ["NTF-CHAN-002", "channel setting uses definition defaults before a store override exists"],
  ["NTF-CHAN-003", "setChannelEnabled creates the first channel override"],
  ["NTF-CHAN-004", "successful channel update persists the requested state"],
  ["NTF-CHAN-007", "channel not allowed by the definition returns CHANNEL_NOT_ALLOWED"],
  ["NTF-CHAN-008", "unknown definition key is rejected before a channel row is written"],
  ["NTF-CHAN-009", "email channel accepts valid senderName, senderEmail, and replyTo values"],
  ["NTF-CHAN-010", "invalid senderEmail maps validation to the senderEmail field"],
  ["NTF-CHAN-011", "invalid replyTo maps validation to the replyTo field"],
  ["NTF-CHAN-012", "SMS and WEBHOOK channels reject email sender settings"],
  ["NTF-CHAN-013", "omitted sender fields preserve existing email sender configuration"],
  ["NTF-CHAN-014", "disabling a channel removes it from effective activeChannels"],
  ["NTF-CHAN-015", "re-enabling a channel preserves valid stored sender configuration"],
  ["NTF-CHAN-016", "channel setting in Store A is invisible and ineffective in Store B"],
  ["NTF-CHAN-017", "successful channel mutation writes a safe audit record without recipient data"],
  ["NTF-CHAN-018", "failed channel mutation writes no partial setting or audit state"],
] as const);
