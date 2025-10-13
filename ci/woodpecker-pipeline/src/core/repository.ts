import { promisify } from "util";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

/**
 * Base repository abstraction.
 */
export abstract class Repository {
  protected readonly repoSlug: string;

  constructor(repoSlug: string) {
    this.repoSlug = repoSlug;
  }

  /**
   * Checkout the repository at provided commit and return a working directory path.
   */
  abstract checkout(commitSha: string): Promise<string>;

  /**
   * Clone helper that performs a clone and checkout.
   * Implementations should prepare a proper remote URL and call this method.
   */
  protected async clone(remoteUrl: string, commitSha: string): Promise<string> {
    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-"));
    await execFileAsync("git", ["clone", "--quiet", remoteUrl, workdir]);
    await execFileAsync("git", [
      "-C",
      workdir,
      "checkout",
      "--quiet",
      commitSha,
    ]);
    return workdir;
  }
}

/**
 * Bitbucket repository implementation.
 */
export class BitBucketRepository extends Repository {
  private readonly token: string;

  constructor(repoSlug: string, token: string) {
    super(repoSlug);
    this.token = token;
  }

  /**
   * Checkout the Bitbucket repo using x-token-auth and return workdir path.
   */
  async checkout(commitSha: string): Promise<string> {
    const httpsUrl = `https://x-token-auth:${this.token}@bitbucket.org/${this.repoSlug}.git`;
    return this.clone(httpsUrl, commitSha);
  }
}

/**
 * GitHub repository implementation.
 */
export class GitHubRepository extends Repository {
  private readonly token: string;

  constructor(repoSlug: string, token: string) {
    super(repoSlug);
    this.token = token;
  }

  /**
   * Checkout the GitHub repo using x-access-token and return workdir path.
   */
  async checkout(commitSha: string): Promise<string> {
    const httpsUrl = `https://x-access-token:${this.token}@github.com/${this.repoSlug}.git`;
    return this.clone(httpsUrl, commitSha);
  }
}
