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

export class BitbucketAdapter implements PlatformAdapter {
  readonly platform = 'bitbucket';
  readonly name:      string;
  private repo:       string; // "workspace/repo-slug"
  private authHeader: string; // Basic base64(x-token-auth:<token>)

  constructor(name: string, repo: string, token: string) {
    this.name       = name;
    this.repo       = repo;
    // Bitbucket accepts token-based Basic Auth via the "x-token-auth" pseudo-username
    this.authHeader = 'Basic ' + Buffer.from(`x-token-auth:${token}`).toString('base64');
  }

  async fetchAllCommits(): Promise<CommitMetadata[]> {
    const all: CommitMetadata[] = [];
    // Bitbucket uses cursor-based pagination — follow the `next` URL until absent
    let url: string | undefined =
      `${BITBUCKET_API}/repositories/${this.repo}/commits?pagelen=100`;

    while (url) {
      const res = await fetch(url, {
        headers: { 'Authorization': this.authHeader },
      });

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
        // "Display Name <email>" → extract display name before the angle bracket
        author:      c.author.raw.replace(/<[^>]+>/, '').trim() || c.author.raw,
        committedAt: c.date,
        url:         c.links.html.href,
      })));

      url = page.next;
    }

    return all;
  }
}
