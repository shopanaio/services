import { describe, it, expect, beforeAll } from "@jest/globals";
import request from "supertest";
import express, { Express, Request, Response } from "express";
import * as crypto from "crypto";
import { httpbis, createSigner } from "http-message-signatures";
import { createSignatureMiddleware } from "../signature-middleware";

/**
 * Test suite for signature verification middleware.
 * This test uses real ed25519 key pairs and actual signature generation
 * to verify the middleware behavior.
 */
describe("Signature Middleware", () => {
  let app: Express;
  let publicKeyPem: string;
  let privateKeyPem: string;

  beforeAll(() => {
    // Generate a real ed25519 key pair for testing
    const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519", {
      publicKeyEncoding: {
        type: "spki",
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8",
        format: "pem",
      },
    });

    publicKeyPem = publicKey;
    privateKeyPem = privateKey;

    // Create test Express app with signature middleware
    app = express();

    // Add signature middleware
    app.use(
      createSignatureMiddleware({
        publicKey: publicKeyPem,
      })
    );

    // Add test endpoint
    app.post("/test", express.json(), (req: Request, res: Response) => {
      res.json({ success: true, body: req.body });
    });
  });

  /**
   * Helper function to sign a request using http-message-signatures library
   */
  async function signRequest(
    method: string,
    url: string,
    headers: Record<string, string>,
    options: { includeBody?: boolean } = {}
  ) {
    const requestToSign = {
      method,
      url,
      headers: { ...headers },
    };

    // Build fields list - always include @request-target
    const fields = ["@request-target"];

    // Add content-digest if requested and present
    if (options.includeBody && headers["content-digest"]) {
      fields.push("content-digest");
    }

    const signedRequest = await httpbis.signMessage(
      {
        key: createSigner(privateKeyPem, "ed25519", "test-key"),
        name: "woodpecker-ci-extensions",
        fields,
        paramValues: {
          created: new Date(),
        },
      },
      requestToSign
    );

    return signedRequest.headers as Record<string, string>;
  }

  describe("Valid signatures", () => {
    it("should accept request with valid signature", async () => {
      const testBody = { test: "data" };
      const bodyJson = JSON.stringify(testBody);

      // Calculate content-digest for the body
      const digest = crypto
        .createHash("sha256")
        .update(bodyJson)
        .digest("base64");
      const contentDigest = `sha-256=:${digest}:`;

      const headers = await signRequest(
        "POST",
        "http://127.0.0.1/test",
        {
          "content-type": "application/json",
          "content-digest": contentDigest,
          "content-length": String(bodyJson.length),
        },
        { includeBody: true }
      );

      const response = await request(app)
        .post("/test")
        .set(headers)
        .send(testBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.body).toEqual(testBody);
    });

    it("should accept request with minimal headers", async () => {
      const headers = await signRequest("POST", "http://127.0.0.1/test", {
        "content-type": "application/json",
      });

      const response = await request(app)
        .post("/test")
        .set(headers)
        .send({ minimal: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe("Invalid signatures", () => {
    it("should reject request without signature", async () => {
      await request(app)
        .post("/test")
        .send({ test: "data" })
        .expect(401);
    });

    it("should reject request with missing signature header", async () => {
      await request(app)
        .post("/test")
        .set("signature-input", "sig=();created=123")
        .send({ test: "data" })
        .expect(401);
    });

    it("should reject request with missing signature-input header", async () => {
      await request(app)
        .post("/test")
        .set("signature", "sig=:abc:")
        .send({ test: "data" })
        .expect(401);
    });

    it("should reject request with invalid signature", async () => {
      const headers = await signRequest("POST", "http://127.0.0.1/test", {
        "content-type": "application/json",
      });

      // Tamper with signature
      headers.signature = "woodpecker-ci-extensions=:invalidsignaturebase64:";

      await request(app)
        .post("/test")
        .set(headers)
        .send({ test: "data" })
        .expect(401);
    });

    it("should reject request signed with wrong key", async () => {
      // Generate another key pair
      const { privateKey: wrongPrivateKey } = crypto.generateKeyPairSync(
        "ed25519",
        {
          publicKeyEncoding: {
            type: "spki",
            format: "pem",
          },
          privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
          },
        }
      );

      const requestToSign = {
        method: "POST",
        url: "http://127.0.0.1/test",
        headers: {
          "content-type": "application/json",
        },
      };

      const signedRequest = await httpbis.signMessage(
        {
          key: createSigner(wrongPrivateKey, "ed25519", "wrong-key"),
          name: "woodpecker-ci-extensions",
          fields: ["@request-target"],
          paramValues: {
            created: new Date(),
          },
        },
        requestToSign
      );

      await request(app)
        .post("/test")
        .set(signedRequest.headers as Record<string, string>)
        .send({ test: "data" })
        .expect(401);
    });

    it("should reject request with tampered content-digest", async () => {
      const testBody = { test: "data" };
      const bodyJson = JSON.stringify(testBody);

      // Calculate content-digest for the body
      const digest = crypto
        .createHash("sha256")
        .update(bodyJson)
        .digest("base64");
      const contentDigest = `sha-256=:${digest}:`;

      const headers = await signRequest(
        "POST",
        "http://127.0.0.1/test",
        {
          "content-type": "application/json",
          "content-digest": contentDigest,
        },
        { includeBody: true }
      );

      // Tamper with content-digest header after signing
      headers["content-digest"] = "sha-256=:tampered:";

      await request(app)
        .post("/test")
        .set(headers)
        .send(testBody)
        .expect(401);
    });
  });

  describe("Edge cases", () => {
    it("should handle malformed signature header", async () => {
      await request(app)
        .post("/test")
        .set("signature", "malformed")
        .set("signature-input", "malformed")
        .send({ test: "data" })
        .expect(401);
    });

    it("should handle empty signature value", async () => {
      await request(app)
        .post("/test")
        .set("signature", "")
        .set("signature-input", "")
        .send({ test: "data" })
        .expect(401);
    });

    it("should reject request with modified signature-input", async () => {
      const headers = await signRequest("POST", "http://127.0.0.1/test", {
        "content-type": "application/json",
      });

      // Find signature-input header (might be case-insensitive)
      const sigInputKey = Object.keys(headers).find(
        (k) => k.toLowerCase() === "signature-input"
      );

      if (!sigInputKey) {
        throw new Error("signature-input header not found");
      }

      // Tamper with signature-input (change algorithm)
      const signatureInput = headers[sigInputKey] as string;
      headers[sigInputKey] = signatureInput.replace(
        'alg="ed25519"',
        'alg="rsa-pss-sha512"'
      );

      await request(app)
        .post("/test")
        .set(headers)
        .send({ test: "data" })
        .expect(401);
    });
  });

  describe("Configuration validation", () => {
    it("should throw error when publicKey is not provided", () => {
      expect(() => {
        createSignatureMiddleware({ publicKey: "" });
      }).toThrow("publicKey is required");
    });

    it("should throw error when publicKey is null/undefined", () => {
      expect(() => {
        // @ts-expect-error Testing invalid config
        createSignatureMiddleware({ publicKey: null });
      }).toThrow("publicKey is required");

      expect(() => {
        // @ts-expect-error Testing invalid config
        createSignatureMiddleware({});
      }).toThrow("publicKey is required");
    });
  });

  describe("Multiple requests", () => {
    it("should handle multiple valid requests in sequence", async () => {
      for (let i = 0; i < 3; i++) {
        const testBody = { iteration: i };
        const headers = await signRequest("POST", "http://127.0.0.1/test", {
          "content-type": "application/json",
        });

        const response = await request(app)
          .post("/test")
          .set(headers)
          .send(testBody)
          .expect(200);

        expect(response.body.body.iteration).toBe(i);
      }
    });
  });
});
