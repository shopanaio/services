import type {
  ApiGenericUserError,
  ApiNotificationDefinition,
  ApiNotificationDefinitionSetEnabledInput,
  ApiNotificationDefinitionSetting,
  ApiNotificationEffectiveTemplate,
  ApiNotificationPreview,
  ApiNotificationPreviewInput,
  ApiNotificationTemplateUpdateInput,
  ApiNotificationWebhookCapabilities,
  ApiNotificationWebhookCreateInput,
  ApiNotificationWebhookSecretPayload,
  ApiNotificationWebhookSubscription,
  ApiNotificationWebhookUpdateInput,
  ApiStaffNotificationRecipient,
  NotificationChannel,
} from "@/graphql/types";

export interface NotificationSettingsQueryData {
  notificationsQuery: {
    definitions: Array<
      Pick<
        ApiNotificationDefinition,
        | "key"
        | "title"
        | "audience"
        | "optional"
        | "enabled"
        | "version"
        | "allowedChannels"
        | "activeChannels"
        | "variables"
      >
    >;
    staffRecipients: ApiStaffNotificationRecipient[];
  };
}

export interface NotificationDefinitionSetEnabledMutationData {
  notificationsMutation: {
    setDefinitionEnabled: {
      setting: ApiNotificationDefinitionSetting | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface NotificationDefinitionSetEnabledMutationVariables {
  input: ApiNotificationDefinitionSetEnabledInput;
}

export interface NotificationWebhookSecretRevealMutationData {
  notificationsMutation: {
    revealWebhookSecret: ApiNotificationWebhookSecretPayload;
  };
}

export interface NotificationTemplateQueryData {
  notificationsQuery: {
    template: ApiNotificationEffectiveTemplate;
  };
}

export interface NotificationTemplateQueryVariables {
  key: string;
  channel: NotificationChannel;
  locale: string;
}

export interface NotificationTemplateUpdateMutationData {
  notificationsMutation: {
    updateTemplate: {
      template: ApiNotificationEffectiveTemplate | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface NotificationTemplateUpdateMutationVariables {
  input: ApiNotificationTemplateUpdateInput;
}

export interface NotificationTemplatePreviewMutationData {
  notificationsMutation: {
    preview: {
      preview: ApiNotificationPreview | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface NotificationTemplatePreviewMutationVariables {
  input: ApiNotificationPreviewInput;
}

export interface NotificationWebhooksQueryData {
  notificationsQuery: {
    webhookCapabilities: ApiNotificationWebhookCapabilities;
    webhookSubscriptions: ApiNotificationWebhookSubscription[];
  };
}

export interface NotificationWebhookCreateMutationData {
  notificationsMutation: {
    createWebhook: {
      webhook: ApiNotificationWebhookSubscription | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface NotificationWebhookCreateMutationVariables {
  input: ApiNotificationWebhookCreateInput;
}

export interface NotificationWebhookUpdateMutationData {
  notificationsMutation: {
    updateWebhook: {
      webhook: ApiNotificationWebhookSubscription | null;
      userErrors: ApiGenericUserError[];
    };
  };
}

export interface NotificationWebhookUpdateMutationVariables {
  input: ApiNotificationWebhookUpdateInput;
}
