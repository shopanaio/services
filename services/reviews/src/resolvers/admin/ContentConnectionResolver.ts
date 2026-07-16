import type { ContentConnectionInput } from "../../repositories/content/ContentRepository.js";
import type {
  ContentReportRelayInput,
  ContentVoteRelayInput,
} from "../../repositories/engagement/EngagementRepository.js";
import type { ContentExternalReferenceRelayInput } from "../../repositories/integration/ExternalReferenceRepository.js";
import type {
  ContentRevisionRelayInput,
  ModerationCaseRelayInput,
  ModerationEventRelayInput,
  ModerationSignalRelayInput,
} from "../../repositories/moderation/ModerationRepository.js";
import {
  BaseConnectionResolver,
  type ConnectionData,
} from "./connection/BaseConnectionResolver.js";

export class ContentConnectionResolver extends BaseConnectionResolver<ContentConnectionInput> {
  $preload(): Promise<ConnectionData> {
    return this.$ctx.kernel.repository.content.getConnection(this.$props);
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.content(nodeId);
  }
}

type ContentVoteConnectionInput = ContentVoteRelayInput & {
  contentId: string;
};

export class ContentVoteConnectionResolver extends BaseConnectionResolver<ContentVoteConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.engagement.getVoteConnection(
      contentId,
      args
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.contentVote(nodeId);
  }
}

export type ContentReportConnectionInput = ContentReportRelayInput & {
  contentId?: string;
};

export class ContentReportConnectionResolver extends BaseConnectionResolver<ContentReportConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.engagement.getReportConnection(
      args,
      contentId
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.contentReport(nodeId);
  }
}

export type ModerationCaseConnectionInput = ModerationCaseRelayInput & {
  contentId?: string;
};

export class ModerationCaseConnectionResolver extends BaseConnectionResolver<ModerationCaseConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.moderation.getCaseConnection(
      args,
      contentId
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.moderationCase(nodeId);
  }
}

type ModerationEventConnectionInput = ModerationEventRelayInput & {
  contentId: string;
};

export class ModerationEventConnectionResolver extends BaseConnectionResolver<ModerationEventConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.moderation.getEventConnection(
      contentId,
      args
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.moderationEvent(nodeId);
  }
}

type ContentRevisionConnectionInput = ContentRevisionRelayInput & {
  contentId: string;
};

export class ContentRevisionConnectionResolver extends BaseConnectionResolver<ContentRevisionConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.moderation.getRevisionConnection(
      contentId,
      args
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.contentRevision(nodeId);
  }
}

type ModerationSignalConnectionInput = ModerationSignalRelayInput & {
  contentId: string;
};

export class ModerationSignalConnectionResolver extends BaseConnectionResolver<ModerationSignalConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.moderation.getSignalConnection(
      contentId,
      args
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.moderationSignal(nodeId);
  }
}

export type ContentExternalReferenceConnectionInput =
  ContentExternalReferenceRelayInput & { contentId?: string };

export class ContentExternalReferenceConnectionResolver extends BaseConnectionResolver<ContentExternalReferenceConnectionInput> {
  $preload(): Promise<ConnectionData> {
    const { contentId, ...args } = this.$props;
    return this.$ctx.kernel.repository.externalReference.getConnection(
      args,
      contentId
    );
  }

  protected createNodeResolver(nodeId: string) {
    return this.resolvers.contentExternalReference(nodeId);
  }
}
