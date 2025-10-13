/**
 * Pull request service abstraction.
 */
export interface PullRequestService {
  /**
   * Checks if there is an open pull request from source to target branch.
   */
  hasOpenPullRequest(repoSlug: string, sourceBranch: string, targetBranch: string): Promise<boolean>;
}

/**
 * Bitbucket pull request service.
 */
export class BitbucketPullRequestService implements PullRequestService {
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async hasOpenPullRequest(repoSlug: string, sourceBranch: string, targetBranch: string): Promise<boolean> {
    const apiUrl = `https://api.bitbucket.org/2.0/repositories/${repoSlug}/pullrequests`;
    const query = `source.branch.name=\"${sourceBranch}\" AND destination.branch.name=\"${targetBranch}\" AND state=\"OPEN\"`;
    const url = `${apiUrl}?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.status} ${response.statusText}`);
    }
    const json = (await response.json()) as any;
    return Boolean(json.values && json.values.length > 0);
  }
}
