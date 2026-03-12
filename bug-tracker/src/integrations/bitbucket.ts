import type { CommitMetadata, PlatformAdapter } from './types';

const BITBUCKET_API = 'https://api.bitbucket.org/2.0';

interface BitbucketCommit {
  hash:    string;
  message: string;
  author: {
    raw: string; // "Display Name <email>"
  };
  date:  string;
  links: {
    html: { href: string };
  };
}

interface BitbucketPage {
  values: BitbucketCommit[];
  next?:  string; // cursor URL for next page; absent on last page
}

interface BitbucketBranch {
  name: string;
}

interface BitbucketBranchPage {
  values: BitbucketBranch[];
  next?:  string;
}

export class BitbucketAdapter implements PlatformAdapter {
  readonly platform = 'bitbucket';
  readonly name:      string;
  private repo:       string; // "workspace/repo-slug"
  private authHeader: string; // Basic base64(x-token-auth:<token>)

  constructor(name: string, repo: string, token: string) {
    this.name       = name;
    this.repo       = repo;
    // New Bitbucket API tokens use Bearer auth (app passwords used x-token-auth Basic, deprecated Sep 2025)
    this.authHeader = `Bearer ${token}`;
  }

  private async fetchBranches(): Promise<string[]> {
    const branches: string[] = [];
    let url: string | undefined = `${BITBUCKET_API}/repositories/${this.repo}/refs/branches?pagelen=100`;
    while (url) {
      const res = await fetch(url, { headers: { 'Authorization': this.authHeader } });
      if (!res.ok) {
        console.warn(`[bitbucket:${this.name}] branches fetch failed: ${res.status} ${res.statusText}`);
        break;
      }
      const page = await res.json() as BitbucketBranchPage;
      branches.push(...page.values.map((b) => b.name));
      url = page.next;
    }
    return branches;
  }

  private async fetchCommitsForBranch(branch: string): Promise<CommitMetadata[]> {
    const all: CommitMetadata[] = [];
    let url: string | undefined =
      `${BITBUCKET_API}/repositories/${this.repo}/commits/${encodeURIComponent(branch)}?pagelen=100`;

    while (url) {
      const res = await fetch(url, { headers: { 'Authorization': this.authHeader } });

      if (res.status === 401 || res.status === 403) {
        throw new Error(`[bitbucket:${this.name}] auth error ${res.status}: check access token`);
      }
      if (!res.ok) {
        console.warn(`[bitbucket:${this.name}] fetch failed: ${res.status} ${res.statusText}`);
        break;
      }

      const page = await res.json() as BitbucketPage;
      all.push(...page.values.map((c) => ({
        sha:         c.hash,
        message:     c.message,
        author:      c.author.raw.replace(/<[^>]+>/, '').trim() || c.author.raw,
        committedAt: c.date,
        url:         c.links.html.href,
      })));
      url = page.next;
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
