import { gql } from "@apollo/client";

export const NOTIFICATION_SETTINGS_QUERY = gql`
  query NotificationSettings {
    notificationsQuery {
      definitions {
        key
        title
        audience
        optional
        enabled
        allowedChannels
        activeChannels
        variables {
          path
          type
          required
          description
          children {
            path
            type
            required
            description
          }
        }
      }
      staffRecipients {
        id
        userId
        name
        email
        locale
        timezone
        scope
        enabled
        eventKeys
        createdAt
        updatedAt
      }
    }
  }
`;

export const NOTIFICATION_TEMPLATE_QUERY = gql`
  query NotificationTemplate($key: String!, $channel: NotificationChannel!, $locale: String!) {
    notificationsQuery {
      template(key: $key, channel: $channel, locale: $locale) {
        key
        channel
        locale
        source
        subjectTemplate
        bodyTemplate
        plainTextTemplate
        revisionId
        revision
        sourceVersion
      }
    }
  }
`;

export const NOTIFICATION_WEBHOOKS_QUERY = gql`
  query NotificationWebhooks {
    notificationsQuery {
      webhookCapabilities {
        events {
          eventType
          title
        }
        apiVersions {
          version
          stability
          isDefault
        }
      }
      webhookSubscriptions {
        id
        eventType
        format
        url
        apiVersion
        status
        createdAt
        updatedAt
      }
    }
  }
`;
