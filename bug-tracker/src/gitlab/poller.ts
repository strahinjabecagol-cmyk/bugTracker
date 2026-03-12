import db from '../db/database';

const GITLAB_URL = process.env.GITLAB_URL;
const PROJECT_ID = process.env.GITLAB_PROJECT_ID;
const TOKEN = process.env.GITLAB_TOKEN;
const INTERVAL = Number(process.env.GITLAB_POLL_INTERVAL_MS ?? 300_000);

const BUG_REF = /#(\d+)/g;

interface GitLabCommit {
  id: string;
  message: string;
  author_name: string;
  committed_date: string;
  web_url: string;
}

export async function syncCommits() {
  if (!GITLAB_URL || !PROJECT_ID || !TOKEN) return;

  let page = 1;
  const allCommits: GitLabCommit[] = [];

  while (true) {
    const res = await fetch(
      `${GITLAB_URL}/api/v4/projects/${PROJECT_ID}/repository/commits?per_page=100&page=${page}`,
      { headers: { 'PRIVATE-TOKEN': TOKEN } }
    );
    if (!res.ok) break;
    const batch: GitLabCommit[] = await res.json() as GitLabCommit[];
    if (!batch.length) break;
    allCommits.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO bug_commits (bug_id, commit_sha, message, author, committed_at, url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const backfillUrl = db.prepare(`
    UPDATE bug_commits SET url = ? WHERE bug_id = ? AND commit_sha = ? AND url = ''
  `);

  for (const commit of allCommits) {
    const refs = [...commit.message.matchAll(BUG_REF)];
    for (const match of refs) {
      const bugId = Number(match[1]);
      const bug = db.prepare('SELECT id FROM bugs WHERE id = ?').get(bugId);
      if (!bug) continue;
      insert.run(bugId, commit.id, commit.message.split('\n')[0], commit.author_name, commit.committed_date, commit.web_url);
      backfillUrl.run(commit.web_url, bugId, commit.id);
    }
  }

  console.log(`[gitlab] synced ${allCommits.length} commits`);
}

export function startPoller() {
  if (!GITLAB_URL || !PROJECT_ID || !TOKEN) {
    console.log('[gitlab] skipping poller — GITLAB_URL/PROJECT_ID/TOKEN not set');
    return;
  }
  syncCommits().catch(console.error);
  setInterval(() => syncCommits().catch(console.error), INTERVAL);
}
