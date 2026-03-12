import type { CommitMetadata, PlatformAdapter } from './types';

interface GitLabApiCommit {
  id:             string;
  message:        string;
  author_name:    string;
  committed_date: string;
  web_url:        string;
}

interface GitLabBranch {
  name: string;
}

export class GitLabAdapter implements PlatformAdapter {
  readonly platform = 'gitlab';
  readonly name:      string;
  private baseUrl:    string;
  private repo:       string; // numeric project ID or namespace/path
  private token:      string;

  constructor(name: string, baseUrl: string, repo: string, token: string) {
    this.name    = name;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    // GitLab API accepts numeric IDs directly; namespace/path must be URL-encoded
    this.repo    = repo.includes('/') ? encodeURIComponent(repo) : repo;
    this.token   = token;
  }

  private get authHeader() {
    return { 'PRIVATE-TOKEN': this.token };
  }

  private async fetchBranches(): Promise<string[]> {
    const branches: string[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `${this.baseUrl}/api/v4/projects/${this.repo}/repository/branches?per_page=100&page=${page}`,
        { headers: this.authHeader }
      );
      if (!res.ok) {
        console.warn(`[gitlab:${this.name}] branches fetch failed: ${res.status} ${res.statusText}`);
        break;
      }
      const batch = await res.json() as GitLabBranch[];
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
        `${this.baseUrl}/api/v4/projects/${this.repo}/repository/commits?ref_name=${encodeURIComponent(branch)}&per_page=100&page=${page}`,
        { headers: this.authHeader }
      );
      if (!res.ok) {
        console.warn(`[gitlab:${this.name}] fetch failed: ${res.status} ${res.statusText}`);
        break;
      }
      const batch = await res.json() as GitLabApiCommit[];
      if (!batch.length) break;
      all.push(...batch.map((c) => ({
        sha:         c.id,
        message:     c.message,
        author:      c.author_name,
        committedAt: c.committed_date,
        url:         c.web_url,
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
