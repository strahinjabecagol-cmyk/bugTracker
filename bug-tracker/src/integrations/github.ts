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

interface GitHubBranch {
  name: string;
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

  private get headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  private async fetchBranches(): Promise<string[]> {
    const branches: string[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `${GITHUB_API}/repos/${this.repo}/branches?per_page=100&page=${page}`,
        { headers: this.headers }
      );
      if (!res.ok) {
        console.warn(`${new Date().toISOString()} [github:${this.name}] branches fetch failed: ${res.status} ${res.statusText}`);
        break;
      }
      const batch = await res.json() as GitHubBranch[];
      branches.push(...batch.map((b) => b.name));
      if (batch.length < 100) break;
      page++;
    }
    return branches;
  }

  private async fetchCommitsForBranch(branch: string): Promise<CommitMetadata[]> {
    const all: CommitMetadata[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `${GITHUB_API}/repos/${this.repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100&page=${page}`,
        { headers: this.headers }
      );

      const remaining = res.headers.get('x-ratelimit-remaining');
      const resetAt   = res.headers.get('x-ratelimit-reset');
      if (remaining !== null) {
        console.debug(`${new Date().toISOString()} [github:${this.name}] rate limit remaining: ${remaining}, resets at: ${resetAt}`);
      }

      if (res.status === 401 || res.status === 403) {
        throw new Error(`[github:${this.name}] auth error ${res.status}: check access token`);
      }
      if (!res.ok) {
        console.warn(`${new Date().toISOString()} [github:${this.name}] fetch failed: ${res.status} ${res.statusText}`);
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

  async fetchAllCommits(): Promise<CommitMetadata[]> {
    const branches = await this.fetchBranches();
    const seen = new Set<string>();
    const all: CommitMetadata[] = [];

    for (const branch of branches) {
      const commits = await this.fetchCommitsForBranch(branch);
      for (const c of commits) {
        if (!seen.has(c.sha)) {
          seen.add(c.sha);
          all.push(c);
        }
      }
    }

    return all;
  }
}
