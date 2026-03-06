import { execSync } from 'child_process';
import db from '../db/database';

const BUG_REF = /#(\d+)/;

function repoRoot(): string {
  return execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
}

function extractBranch(refs: string): string {
  if (!refs.trim()) return '';
  const parts = refs.split(',').map((r) => r.replace(/^HEAD -> /, '').trim());
  return parts.find((r) => r && !r.startsWith('origin/') && r !== 'HEAD') ?? parts[0] ?? '';
}

export function syncLocalCommitsForBug(bugId: number): void {
  try {
    const root = repoRoot();
    const output = execSync(
      'git log --all --format=%H|||%D|||%an|||%aI|||%s',
      { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }
    );

    const insert = db.prepare(`
      INSERT OR IGNORE INTO bug_commits (bug_id, commit_sha, message, author, committed_at, url, branch)
      VALUES (?, ?, ?, ?, ?, '', ?)
    `);

    const updateBranch = db.prepare(`
      UPDATE bug_commits SET branch = ? WHERE bug_id = ? AND commit_sha = ? AND (branch IS NULL OR branch = '')
    `);

    for (const line of output.trim().split('\n').filter(Boolean)) {
      const sep = '|||';
      const first = line.indexOf(sep);
      const second = line.indexOf(sep, first + 3);
      const third  = line.indexOf(sep, second + 3);
      const fourth = line.indexOf(sep, third + 3);
      if (first < 0 || fourth < 0) continue;

      const sha     = line.slice(0, first).trim();
      const refs    = line.slice(first + 3, second).trim();
      const author  = line.slice(second + 3, third).trim();
      const date    = line.slice(third + 3, fourth).trim();
      const message = line.slice(fourth + 3).trim();

      const match = BUG_REF.exec(message);
      if (!match || Number(match[1]) !== bugId) continue;

      const branch = extractBranch(refs);

      const existing = db.prepare(
        'SELECT id, branch FROM bug_commits WHERE bug_id = ? AND commit_sha = ?'
      ).get(bugId, sha) as { id: number; branch: string } | undefined;

      if (existing) {
        if (!existing.branch && branch) updateBranch.run(branch, bugId, sha);
      } else {
        insert.run(bugId, sha, message, author, date, branch);
      }
    }
  } catch (e) {
    console.error('[git] local sync failed:', e);
  }
}
