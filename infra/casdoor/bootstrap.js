#!/usr/bin/env node
/**
 * Casdoor Bootstrap Script
 *
 * Updates app-built-in application with custom client credentials and JWT settings.
 *
 * Usage: node casdoor/bootstrap.js
 */

import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(
  readFileSync(join(__dirname, "config.json"), "utf-8")
);

const ENDPOINT = "http://localhost:9011";
const DEFAULT_PASSWORD = "123";
const APP_NAME = "app-built-in";

let sessionCookie = null;

async function login(username, password) {
  const res = await fetch(`${ENDPOINT}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      application: "app-built-in",
      organization: "built-in",
      username,
      password,
      type: "login",
    }),
  });

  const data = await res.json();
  if (data.status === "ok") {
    const cookie = res.headers.get("set-cookie");
    if (cookie) {
      sessionCookie = cookie.split(";")[0];
    }
    return true;
  }
  return false;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Cookie: sessionCookie,
  };
}

async function api(method, action, body = null) {
  const url = `${ENDPOINT}/api/${action}`;
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  const data = await res.json();

  if (data.status !== "ok" && data.msg) {
    throw new Error(`API error: ${data.msg}`);
  }
  return data;
}

async function getApplication(name) {
  const res = await api("GET", `get-application?id=admin/${name}`);
  return res.data || null;
}

async function main() {
  console.log("Casdoor Bootstrap Script");
  console.log(`Endpoint: ${ENDPOINT}\n`);

  // 1. Authenticate
  console.log("1. Authentication...");
  if (await login(config.user, config.password)) {
    console.log("   ✓ Logged in");
  } else if (await login(config.user, DEFAULT_PASSWORD)) {
    console.log("   ✓ Logged in (default password)");
  } else {
    throw new Error("Failed to authenticate");
  }

  // 2. Update app-built-in
  console.log("2. Updating app-built-in...");
  let app = await getApplication(APP_NAME);
  if (!app) {
    throw new Error("app-built-in not found");
  }

  // Custom credentials
  if (config.clientId) app.clientId = config.clientId;
  if (config.clientSecret) app.clientSecret = config.clientSecret;

  // JWT settings
  app.tokenFormat = "JWT-Custom";
  app.tokenFields = ["sub", "iss", "aud", "exp", "iat", "email", "name", "owner"];
  app.expireInHours = 168;
  app.refreshExpireInHours = 720;
  app.grantTypes = [
    "authorization_code",
    "password",
    "client_credentials",
    "refresh_token",
  ];

  await api("POST", `update-application?id=admin/${APP_NAME}`, app);
  console.log("   ✓ Updated");

  // Output
  app = await getApplication(APP_NAME);

  console.log("\n========================================");
  console.log("ENV Configuration:");
  console.log("========================================\n");
  console.log(`CASDOOR_ENDPOINT=${ENDPOINT}`);
  console.log(`CASDOOR_APPLICATION=${APP_NAME}`);
  console.log(`CASDOOR_CLIENT_ID=${app.clientId}`);
  console.log(`CASDOOR_CLIENT_SECRET=${app.clientSecret}`);

  console.log("\n✓ Done!");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
