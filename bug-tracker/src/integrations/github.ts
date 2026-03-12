import type { CommitMetadata, PlatformAdapter } from './types';

const GITHUB_API = 'https://api.github.com';

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

export class GitHubAdapter implements PlatformAdapter {
  readonly platform = 'github';
  readonly name:    string;
  private repo:     string; // "owner/repo"
  private token:    string;

  constructor(name: string, repo: string, token: string) {
    this.name  = name;
    this.repo  = repo;
    this.token = token;
  }

  async fetchAllCommits(): Promise<CommitMetadata[]> {
    let page = 1;
    const all: CommitMetadata[] = [];

    while (true) {
      const res = await fetch(
        `${GITHUB_API}/repos/${this.repo}/commits?per_page=100&page=${page}`,
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      // Log rate limit at debug level
      const remaining = res.headers.get('x-ratelimit-remaining');
      const resetAt   = res.headers.get('x-ratelimit-reset');
      if (remaining !== null) {
        console.debug(`[github:${this.name}] rate limit remaining: ${remaining}, resets at: ${resetAt}`);
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error(`[github:${this.name}] auth error ${res.status}: check access token`);
      }
      if (!res.ok) {
        console.warn(`[github:${this.name}] fetch failed: ${res.status} ${res.statusText}`);
        break;
      }

      const batch = await res.json() as GitHubCommit[];
      if (!batch.length) break;

      all.push(...batch.map((c) => ({
        sha:         c.sha,
        message:     c.commit.message,
        author:      c.commit.author.name,
        committedAt: c.commit.author.date,
        url:         c.html_url,
      })));

      if (batch.length < 100) break;
      page++;
    }

    return all;
  }
}
