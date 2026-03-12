import db from '../db/database';
import { GitLabAdapter } from '../integrations/gitlab';
import type { PlatformAdapter } from '../integrations/types';

const INTERVAL = Number(process.env.GITLAB_POLL_INTERVAL_MS ?? 300_000);
const BUG_REF  = /#(\d+)/g;

// env-var fallback — kept for backward compat until profiles are fully adopted (see #203)
const ENV_GITLAB_URL = process.env.GITLAB_URL;
const ENV_PROJECT_ID = process.env.GITLAB_PROJECT_ID;
const ENV_TOKEN      = process.env.GITLAB_TOKEN;

type ProfileRow = { id: number; name: string; platform: string; base_url: string; repo: string; access_token: string };

function buildAdapters(): PlatformAdapter[] {
  const adapters: PlatformAdapter[] = [];
  const seen = new Set<number>();

  // Load all distinct profiles that are bound to at least one project
  const profiles = db.prepare(`
    SELECT DISTINCT ip.id, ip.name, ip.platform, ip.base_url, ip.repo, ip.access_token
    FROM integration_profiles ip
    JOIN project_integrations pi ON pi.profile_id = ip.id
  `).all() as ProfileRow[];

  for (const p of profiles) {
    if (seen.has(p.id)) continue;
    seen.add(p.id);

    if (p.platform === 'gitlab') {
      adapters.push(new GitLabAdapter(p.name, p.base_url, p.repo, p.access_token));
    }
    // github (#195) and bitbucket (#196) adapters will be added in subsequent tasks
  }

  // env-var fallback — only used when no DB profiles are configured (see #203 to remove)
  if (adapters.length === 0 && ENV_GITLAB_URL && ENV_PROJECT_ID && ENV_TOKEN) {
    console.log('[sync] no DB profiles found — using env-var GitLab fallback');
    adapters.push(new GitLabAdapter('env-fallback', ENV_GITLAB_URL, ENV_PROJECT_ID, ENV_TOKEN));
  }

  return adapters;
}

async function syncFromAdapter(adapter: PlatformAdapter): Promise<number> {
  let commits;
  try {
    commits = await adapter.fetchAllCommits();
  } catch (e) {
    console.warn(`[sync:${adapter.platform}:${adapter.name}] failed to fetch commits:`, e);
    return 0;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO bug_commits (bug_id, commit_sha, message, author, committed_at, url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const backfillUrl = db.prepare(`
    UPDATE bug_commits SET url = ? WHERE bug_id = ? AND commit_sha = ? AND url = ''
  `);

  for (const commit of commits) {
    const refs = [...commit.message.matchAll(BUG_REF)];
    for (const match of refs) {
      const bugId = Number(match[1]);
      const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(bugId);
      if (!bug) continue;
      insert.run(bugId, commit.sha, commit.message.split('\n')[0], commit.author, commit.committedAt, commit.url);
      backfillUrl.run(commit.url, bugId, commit.sha);
    }
  }

  return commits.length;
}

export async function syncCommits(): Promise<void> {
  const adapters = buildAdapters();
  if (adapters.length === 0) {
    console.log('[sync] no integration profiles configured, skipping');
    return;
  }
  for (const adapter of adapters) {
    const count = await syncFromAdapter(adapter);
    console.log(`[sync:${adapter.platform}:${adapter.name}] synced ${count} commits`);
  }
}

export function startPoller(): void {
  // Always start the interval — profiles can be added at runtime
  // syncCommits() handles the case gracefully when no profiles are configured
  const hasEnvFallback = !!(ENV_GITLAB_URL && ENV_PROJECT_ID && ENV_TOKEN);
  if (!hasEnvFallback) {
    console.log('[sync] poller started — will sync when integration profiles are configured');
  }
  syncCommits().catch(console.error);
  setInterval(() => syncCommits().catch(console.error), INTERVAL);
}
