import { gql } from "@apollo/client";

export const NOTIFICATION_DEFINITION_SET_ENABLED_MUTATION = gql`
  mutation NotificationDefinitionSetEnabled(
    $input: NotificationDefinitionSetEnabledInput!
  ) {
    notificationsMutation {
      setDefinitionEnabled(input: $input) {
        setting {
          definitionKey
          enabled
          version
          updatedAt
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const NOTIFICATION_WEBHOOK_SECRET_REVEAL_MUTATION = gql`
  mutation NotificationWebhookSecretReveal {
    notificationsMutation {
      revealWebhookSecret {
        secret
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const NOTIFICATION_TEMPLATE_UPDATE_MUTATION = gql`
  mutation NotificationTemplateUpdate(
    $input: NotificationTemplateUpdateInput!
  ) {
    notificationsMutation {
      updateTemplate(input: $input) {
        template {
          key
          channel
          locale
          source
          subjectTemplate
          bodyTemplate
          plainTextTemplate
          revisionId
          revision
          pointerVersion
          sourceVersion
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const NOTIFICATION_TEMPLATE_PREVIEW_MUTATION = gql`
  mutation NotificationTemplatePreview($input: NotificationPreviewInput!) {
    notificationsMutation {
      preview(input: $input) {
        preview {
          subject
          html
          text
          locale
          warnings
          sms {
            encoding
            segmentCount
            length
          }
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const NOTIFICATION_WEBHOOK_CREATE_MUTATION = gql`
  mutation NotificationWebhookCreate(
    $input: NotificationWebhookCreateInput!
  ) {
    notificationsMutation {
      createWebhook(input: $input) {
        webhook {
          id
          eventType
          format
          url
          apiVersion
          status
          version
          createdAt
          updatedAt
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;

export const NOTIFICATION_WEBHOOK_UPDATE_MUTATION = gql`
  mutation NotificationWebhookUpdate(
    $input: NotificationWebhookUpdateInput!
  ) {
    notificationsMutation {
      updateWebhook(input: $input) {
        webhook {
          id
          eventType
          format
          url
          apiVersion
          status
          version
          createdAt
          updatedAt
        }
        userErrors {
          code
          field
          message
        }
      }
    }
  }
`;
