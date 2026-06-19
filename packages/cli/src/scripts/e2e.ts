#!/usr/bin/env tsx

import { existsSync } from "fs";
import { join } from "path";
import { execa } from "execa";
import { findRootDir } from "../utils.js";

interface E2eTestOptions {
  testPath?: string;
  grep?: string;
  project?: string;
  headed?: boolean;
  debug?: boolean;
  workers?: number;
  retries?: number;
  reporter?: string;
  updateSnapshots?: boolean;
}

function getE2eDir() {
  return join(findRootDir(), "e2e");
}

function assertE2eDir() {
  const e2eDir = getE2eDir();

  if (!existsSync(join(e2eDir, "playwright.config.ts"))) {
    throw new Error(`Playwright config not found in ${e2eDir}`);
  }

  return e2eDir;
}

function withTransformTypesNodeOption() {
  const current = process.env.NODE_OPTIONS ?? "";

  if (current.split(/\s+/).includes("--experimental-transform-types")) {
    return current;
  }

  return [current, "--experimental-transform-types"].filter(Boolean).join(" ");
}

export async function runE2eTests(options: E2eTestOptions) {
  const e2eDir = assertE2eDir();
  const args = ["test"];

  if (options.testPath) {
    args.push(options.testPath);
  }

  if (options.grep) {
    args.push("--grep", options.grep);
  }

  if (options.project) {
    args.push("--project", options.project);
  }

  if (options.headed) {
    args.push("--headed");
  }

  if (options.debug) {
    args.push("--debug");
  }

  if (options.workers !== undefined) {
    args.push("--workers", String(options.workers));
  }

  if (options.retries !== undefined) {
    args.push("--retries", String(options.retries));
  }

  if (options.reporter) {
    args.push("--reporter", options.reporter);
  }

  if (options.updateSnapshots) {
    args.push("--update-snapshots");
  }

  await execa("yarn", args, {
    cwd: e2eDir,
    env: {
      ...process.env,
      NODE_OPTIONS: withTransformTypesNodeOption(),
    },
    stdio: "inherit",
  });
}

export async function runE2eCodegen() {
  const e2eDir = assertE2eDir();

  await execa("yarn", ["codegen"], {
    cwd: e2eDir,
    stdio: "inherit",
  });
}
