import { promisify } from "util";
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

export abstract class Repository {
  protected readonly repoSlug: string;
  constructor(repoSlug: string) {
    this.repoSlug = repoSlug;
  }
  abstract checkout(commitSha: string): Promise<string>;
  abstract hasOpenPullRequest(sourceBranch: string, targetBranch: string): Promise<boolean>;
  protected async clone(remoteUrl: string, commitSha: string): Promise<string> {
    const workdir = await fs.mkdtemp(path.join(os.tmpdir(), "repo-"));
    await execFileAsync("git", ["clone", "--quiet", remoteUrl, workdir]);
    await execFileAsync("git", ["-C", workdir, "checkout", "--quiet", commitSha]);
    return workdir;
  }
}

export class BitBucketRepository extends Repository {
  private readonly token: string;
  constructor(repoSlug: string, token: string) {
    super(repoSlug);
    this.token = token;
  }
  async checkout(commitSha: string): Promise<string> {
    const httpsUrl = `https://x-token-auth:${this.token}@bitbucket.org/${this.repoSlug}.git`;
    return this.clone(httpsUrl, commitSha);
  }
  async hasOpenPullRequest(sourceBranch: string, targetBranch: string): Promise<boolean> {
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${this.repoSlug}/pullrequests`;
    const query = `source.branch.name="${sourceBranch}" AND destination.branch.name="${targetBranch}" AND state="OPEN"`;
    const url = `${apiUrl}?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as any;
    return Boolean(json.values && json.values.length > 0);
  }
}

export class GitHubRepository extends Repository {
  private readonly token: string;
  constructor(repoSlug: string, token: string) {
    super(repoSlug);
    this.token = token;
  }
  async checkout(commitSha: string): Promise<string> {
    const httpsUrl = `https://x-access-token:${this.token}@github.com/${this.repoSlug}.git`;
    return this.clone(httpsUrl, commitSha);
  }
  async hasOpenPullRequest(sourceBranch: string, targetBranch: string): Promise<boolean> {
    const [owner, repo] = this.repoSlug.split('/');
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/pulls`;
    const url = `${apiUrl}?state=open&head=${owner}:${sourceBranch}&base=${targetBranch}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as any[];
    return json.length > 0;
  }
}
