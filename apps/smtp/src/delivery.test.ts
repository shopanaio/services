import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { EmailDeliveryInput } from "@shopana/broker-types";
import {
  deliverEmail,
  normalizeSmtpError,
  type SmtpDeliveryDependencies,
} from "./delivery.js";
import {
  smtpConfigurationError,
  validateSmtpPassword,
  type SmtpConfiguration,
} from "./configuration.js";
import { selectPublicSmtpEndpoints } from "./network.js";

const configuration: SmtpConfiguration = {
  host: "smtp.example.com",
  port: 587,
  security: "STARTTLS",
  username: "mailer@example.com",
};

const delivery: EmailDeliveryInput = {
  channel: "EMAIL",
  deliveryId: "delivery-1",
  idempotencyKey: "idempotency-1",
  storeId: "store-1",
  notificationKey: "customer.order.confirmation",
  correlationId: "correlation-1",
  metadata: {},
  to: [{ email: "customer@example.com" }],
  from: { email: "store@example.com", name: "Store" },
  subject: "Order confirmation",
  text: "Your order was received.",
};

test("classifies an explicit DATA 4xx response as retryable", () => {
  const failure = normalizeSmtpError(
    Object.assign(new Error("Temporary failure"), {
      code: "EMESSAGE",
      command: "DATA",
      responseCode: 451,
    }),
  );

  assert.equal(failure.receipt, undefined);
  assert.deepEqual(
    (failure.error as Error & {
      details: Record<string, unknown>;
    }).details,
    {
      kind: "TEMPORARY",
      safeToRetry: true,
      acceptedByProvider: false,
      responseCode: 451,
      command: "DATA",
    },
  );
});

test("classifies a DATA disconnect without a response as unknown", () => {
  const failure = normalizeSmtpError(
    Object.assign(new Error("Connection lost"), {
      code: "ETIMEDOUT",
      command: "DATA",
    }),
  );

  assert.equal(failure.receipt, undefined);
  assert.deepEqual(
    (failure.error as Error & {
      details: Record<string, unknown>;
    }).details,
    {
      kind: "UNKNOWN",
      safeToRetry: false,
      acceptedByProvider: true,
      command: "DATA",
    },
  );
});

test("retains every public DNS endpoint and filters private addresses", () => {
  const endpoints = selectPublicSmtpEndpoints("smtp.example.com", [
    { address: "10.0.0.10", family: 4 },
    { address: "2606:4700:4700::1111", family: 6 },
    { address: "8.8.8.8", family: 4 },
  ]);

  assert.deepEqual(endpoints, [
    {
      address: "2606:4700:4700::1111",
      family: 6,
      servername: "smtp.example.com",
    },
    {
      address: "8.8.8.8",
      family: 4,
      servername: "smtp.example.com",
    },
  ]);
});

test("falls back to the next DNS endpoint after a connection failure", async () => {
  const attemptedHosts: string[] = [];
  let closed = 0;
  const dependencies: SmtpDeliveryDependencies = {
    resolveEndpoints: async () => [
      {
        address: "2606:4700:4700::1111",
        family: 6,
        servername: "smtp.example.com",
      },
      {
        address: "8.8.8.8",
        family: 4,
        servername: "smtp.example.com",
      },
    ],
    createTransport: (options) => {
      assert.equal(options.secure, false);
      assert.equal(options.requireTLS, true);
      assert.equal(options.tls?.servername, "smtp.example.com");
      const attempt = attemptedHosts.push(String(options.host));
      return {
        sendMail: async () => {
          if (attempt === 1) {
            throw Object.assign(new Error("Connection refused"), {
              code: "ECONNREFUSED",
              command: "CONN",
            });
          }
          return {
            envelope: { from: "", to: [] },
            messageId: "message-1",
            accepted: ["customer@example.com"],
            rejected: [],
            pending: [],
            response: "250 queued",
          };
        },
        close: () => {
          closed += 1;
        },
      };
    },
    now: () => new Date("2026-07-27T12:00:00.000Z"),
  };

  const receipt = await deliverEmail(
    configuration,
    { password: "secret" },
    delivery,
    dependencies,
  );

  assert.deepEqual(attemptedHosts, [
    "2606:4700:4700::1111",
    "8.8.8.8",
  ]);
  assert.equal(closed, 2);
  assert.deepEqual(receipt, {
    state: "ACCEPTED",
    providerCode: "smtp",
    providerMessageId: "message-1",
    acceptedAt: "2026-07-27T12:00:00.000Z",
    responseCode: "250",
  });
});

test("does not use DNS fallback after an explicit SMTP response", async () => {
  let transportsCreated = 0;
  const dependencies: SmtpDeliveryDependencies = {
    resolveEndpoints: async () => [
      { address: "8.8.8.8", family: 4 },
      { address: "1.1.1.1", family: 4 },
    ],
    createTransport: () => {
      transportsCreated += 1;
      return {
        sendMail: async () => {
          throw Object.assign(new Error("Try again later"), {
            code: "EMESSAGE",
            command: "DATA",
            responseCode: 451,
          });
        },
        close: () => undefined,
      };
    },
    now: () => new Date(),
  };

  await assert.rejects(
    deliverEmail(
      configuration,
      { password: "secret" },
      delivery,
      dependencies,
    ),
    (error: Error & { details?: Record<string, unknown> }) =>
      error.details?.kind === "TEMPORARY" &&
      error.details.safeToRetry === true,
  );
  assert.equal(transportsCreated, 1);
});

test("rejects a blank SMTP password", () => {
  assert.throws(
    () => validateSmtpPassword("   "),
    (error: Error & { code?: string }) =>
      error.code === "SMTP_PASSWORD_INVALID",
  );
  assert.equal(
    validateSmtpPassword("  intentional spaces  "),
    "  intentional spaces  ",
  );
});

test("preserves normalized configuration errors", () => {
  const error = smtpConfigurationError(
    "SMTP_CONFIGURATION_INVALID",
    "Invalid SMTP configuration",
  );
  const failure = normalizeSmtpError(error);

  assert.equal(failure.error, error);
});
