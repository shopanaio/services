import { GlobalIdEntity } from "@shopana/shared-graphql-guid";
import { PreloadNotFoundError, SubgraphReference } from "@shopana/type-resolver";
import type {
  ContentRevision,
  ModerationCase,
  ModerationEvent,
  ModerationSignal,
} from "../../repositories/models/index.js";
import { ReviewsType } from "./ReviewsType.js";

@SubgraphReference()
export class ModerationCaseResolver extends ReviewsType<string, ModerationCase> {
  async $preload() {
    const moderationCase = await this.$ctx.loaders.moderationCase.load(
      this.$props
    );
    if (!moderationCase) {
      throw new PreloadNotFoundError(
        `Review moderation case with ID ${this.$props} not found`
      );
    }
    return moderationCase;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewModerationCase); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  status() { return this.$get("status"); }
  priority() { return this.$get("priority"); }
  reasonCode() { return this.$get("reasonCode"); }
  assignedToPrincipalId() { return this.$get("assignedToPrincipalId"); }
  dueAt() { return this.$get("dueAt"); }
  resolutionCode() { return this.$get("resolutionCode"); }
  resolutionNote() { return this.$get("resolutionNote"); }
  resolvedByPrincipalId() { return this.$get("resolvedByPrincipalId"); }
  resolvedAt() { return this.$get("resolvedAt"); }
  createdAt() { return this.$get("createdAt"); }
  updatedAt() { return this.$get("updatedAt"); }
}

@SubgraphReference()
export class ModerationEventResolver extends ReviewsType<string, ModerationEvent> {
  async $preload() {
    const event = await this.$ctx.loaders.moderationEvent.load(this.$props);
    if (!event) {
      throw new PreloadNotFoundError(
        `Review moderation event with ID ${this.$props} not found`
      );
    }
    return event;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewModerationEvent); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  async moderationCase() {
    const caseId = await this.$get("caseId");
    return caseId ? this.resolvers.moderationCase(caseId) : null;
  }
  action() { return this.$get("action"); }
  fromStatus() { return this.$get("fromStatus"); }
  toStatus() { return this.$get("toStatus"); }
  actorType() { return this.$get("actorType"); }
  actorId() { return this.$get("actorId"); }
  reasonCode() { return this.$get("reasonCode"); }
  note() { return this.$get("note"); }
  isAutomated() { return this.$get("isAutomated"); }
  metadata() { return this.$get("metadata"); }
  createdAt() { return this.$get("createdAt"); }
}

@SubgraphReference()
export class ContentRevisionResolver extends ReviewsType<string, ContentRevision> {
  async $preload() {
    const revision = await this.$ctx.loaders.contentRevision.load(this.$props);
    if (!revision) {
      throw new PreloadNotFoundError(
        `Review content revision with ID ${this.$props} not found`
      );
    }
    return revision;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewContentRevision); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  revision() { return this.$get("revision"); }
  snapshot() { return this.$get("snapshot"); }
  changedByType() { return this.$get("changedByType"); }
  changedById() { return this.$get("changedById"); }
  changeReason() { return this.$get("changeReason"); }
  createdAt() { return this.$get("createdAt"); }
}

@SubgraphReference()
export class ModerationSignalResolver extends ReviewsType<string, ModerationSignal> {
  async $preload() {
    const signal = await this.$ctx.loaders.moderationSignal.load(this.$props);
    if (!signal) {
      throw new PreloadNotFoundError(
        `Review moderation signal with ID ${this.$props} not found`
      );
    }
    return signal;
  }

  id() { return this.encodeId(this.$props, GlobalIdEntity.ReviewModerationSignal); }
  async content() { return this.resolvers.content(await this.$get("contentId")); }
  provider() { return this.$get("provider"); }
  signalType() { return this.$get("signalType"); }
  score() { return this.$get("score"); }
  verdict() { return this.$get("verdict"); }
  modelVersion() { return this.$get("modelVersion"); }
  evidence() { return this.$get("evidence"); }
  createdAt() { return this.$get("createdAt"); }
}
