import db from './database';

// ── Users ─────────────────────────────────────────────────────────────────────
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, role)
  VALUES (@name, @email, @role)
`);

const users = [
  { name: 'Alice Admin',     email: 'alice@example.com',   role: 'admin'     },
  { name: 'Bob Developer',   email: 'bob@example.com',     role: 'developer' },
  { name: 'Carol Developer', email: 'carol@example.com',   role: 'developer' },
  { name: 'Dave Tester',     email: 'dave@example.com',    role: 'tester'    },
  { name: 'Eva Tester',      email: 'eva@example.com',     role: 'tester'    },
];

for (const u of users) insertUser.run(u);

// ── Projects ──────────────────────────────────────────────────────────────────
const insertProject = db.prepare(`
  INSERT OR IGNORE INTO projects (name, description)
  VALUES (@name, @description)
`);

const projects = [
  { name: 'Web App',     description: 'Customer-facing React web application' },
  { name: 'Mobile App',  description: 'iOS and Android mobile client'         },
  { name: 'API Gateway', description: 'Central API gateway and auth service'  },
];

for (const p of projects) insertProject.run(p);

// Fetch IDs assigned by SQLite
const [webApp, mobileApp, apiGateway] = db.prepare('SELECT id FROM projects ORDER BY id').all() as { id: number }[];
const [alice, bob, carol, dave, eva]  = db.prepare('SELECT id FROM users ORDER BY id').all()    as { id: number }[];

// ── Bugs ──────────────────────────────────────────────────────────────────────
const insertBug = db.prepare(`
  INSERT OR IGNORE INTO bugs
    (project_id, title, description, status, priority, severity, reporter_id, assignee_id)
  VALUES
    (@project_id, @title, @description, @status, @priority, @severity, @reporter_id, @assignee_id)
`);

const bugs = [
  // Web App bugs
  {
    project_id: webApp.id, title: 'Login page crashes on Safari',
    description: 'Clicking submit on the login form causes a full page crash in Safari 17.',
    status: 'open', priority: 'critical', severity: 'blocker',
    reporter_id: dave.id, assignee_id: bob.id,
  },
  {
    project_id: webApp.id, title: 'Profile image upload fails silently',
    description: 'Uploading a JPEG larger than 2 MB produces no error message but does not save.',
    status: 'in_progress', priority: 'high', severity: 'major',
    reporter_id: eva.id, assignee_id: bob.id,
  },
  {
    project_id: webApp.id, title: 'Dark mode toggle not persisted',
    description: 'User preference for dark mode resets on every page reload.',
    status: 'open', priority: 'medium', severity: 'minor',
    reporter_id: dave.id, assignee_id: carol.id,
  },
  {
    project_id: webApp.id, title: 'Search autocomplete shows duplicate results',
    description: 'Typing in the global search box sometimes shows the same result entry twice.',
    status: 'resolved', priority: 'low', severity: 'minor',
    reporter_id: eva.id, assignee_id: carol.id,
  },
  {
    project_id: webApp.id, title: 'CSV export truncates long field values',
    description: 'Any text field longer than 255 characters is cut off in the exported CSV.',
    status: 'open', priority: 'high', severity: 'major',
    reporter_id: alice.id, assignee_id: bob.id,
  },
  {
    project_id: webApp.id, title: 'Notification badge count incorrect after read',
    description: 'The notification counter does not decrement when notifications are marked as read.',
    status: 'in_progress', priority: 'medium', severity: 'minor',
    reporter_id: dave.id, assignee_id: carol.id,
  },
  {
    project_id: webApp.id, title: 'Session expires without warning',
    description: 'Users are silently logged out after 30 minutes with no warning toast.',
    status: 'closed', priority: 'medium', severity: 'major',
    reporter_id: eva.id, assignee_id: bob.id,
  },
  // Mobile App bugs
  {
    project_id: mobileApp.id, title: 'App freezes on Android 14 during sync',
    description: 'Background sync operation causes a 10-second UI freeze on Android 14 devices.',
    status: 'open', priority: 'critical', severity: 'critical',
    reporter_id: dave.id, assignee_id: carol.id,
  },
  {
    project_id: mobileApp.id, title: 'Push notifications not received on iOS 17',
    description: 'APNs token registration fails silently on iOS 17; no push notifications delivered.',
    status: 'in_progress', priority: 'critical', severity: 'blocker',
    reporter_id: eva.id, assignee_id: bob.id,
  },
  {
    project_id: mobileApp.id, title: 'Offline mode shows stale data indefinitely',
    description: 'Cached data is never invalidated; users see weeks-old content after reconnecting.',
    status: 'open', priority: 'high', severity: 'major',
    reporter_id: dave.id, assignee_id: carol.id,
  },
  {
    project_id: mobileApp.id, title: 'Camera permission dialog appears every launch',
    description: 'Despite granting camera permissions, the app re-requests them on every cold start.',
    status: 'resolved', priority: 'medium', severity: 'minor',
    reporter_id: eva.id, assignee_id: bob.id,
  },
  {
    project_id: mobileApp.id, title: 'Biometric login falls back to PIN silently',
    description: 'Face ID failure falls back to PIN without informing the user of the failure.',
    status: 'open', priority: 'medium', severity: 'major',
    reporter_id: alice.id, assignee_id: null,
  },
  {
    project_id: mobileApp.id, title: 'Map view leaks memory on long sessions',
    description: 'Memory usage grows unbounded when the map screen is left open for >1 hour.',
    status: 'in_progress', priority: 'high', severity: 'critical',
    reporter_id: dave.id, assignee_id: carol.id,
  },
  {
    project_id: mobileApp.id, title: 'Deep link routing broken for nested paths',
    description: 'Deep links with more than 2 path segments navigate to the wrong screen.',
    status: 'open', priority: 'high', severity: 'major',
    reporter_id: eva.id, assignee_id: bob.id,
  },
  // API Gateway bugs
  {
    project_id: apiGateway.id, title: 'Rate limiter does not reset on new window',
    description: 'Sliding window rate limit counter is never reset, permanently blocking users.',
    status: 'open', priority: 'critical', severity: 'blocker',
    reporter_id: alice.id, assignee_id: bob.id,
  },
  {
    project_id: apiGateway.id, title: 'JWT refresh token accepted after expiry',
    description: 'Expired refresh tokens are still accepted by the /auth/refresh endpoint.',
    status: 'open', priority: 'critical', severity: 'critical',
    reporter_id: alice.id, assignee_id: carol.id,
  },
  {
    project_id: apiGateway.id, title: 'CORS preflight returns 500 for OPTIONS',
    description: 'OPTIONS requests fail with 500 when the Origin header is present.',
    status: 'resolved', priority: 'high', severity: 'blocker',
    reporter_id: dave.id, assignee_id: carol.id,
  },
  {
    project_id: apiGateway.id, title: 'Request body logging exposes PII',
    description: 'Structured logs include full request bodies, leaking passwords and card numbers.',
    status: 'closed', priority: 'critical', severity: 'critical',
    reporter_id: alice.id, assignee_id: bob.id,
  },
  {
    project_id: apiGateway.id, title: 'Health check endpoint returns 200 when DB is down',
    description: '/health always returns 200 OK even when the database connection pool is exhausted.',
    status: 'in_progress', priority: 'high', severity: 'major',
    reporter_id: eva.id, assignee_id: carol.id,
  },
  {
    project_id: apiGateway.id, title: 'Pagination cursor wraps around at large offsets',
    description: 'Requesting page >1000 returns results from the beginning of the dataset.',
    status: 'open', priority: 'medium', severity: 'major',
    reporter_id: dave.id, assignee_id: null,
  },
  {
    project_id: apiGateway.id, title: 'GraphQL introspection enabled in production',
    description: 'Schema introspection is not disabled in production, exposing full API structure.',
    status: 'open', priority: 'high', severity: 'critical',
    reporter_id: alice.id, assignee_id: bob.id,
  },
  {
    project_id: apiGateway.id, title: 'Webhook signature validation skipped on retry',
    description: 'Retried webhook deliveries bypass HMAC signature verification.',
    status: 'open', priority: 'critical', severity: 'critical',
    reporter_id: alice.id, assignee_id: carol.id,
  },
];

for (const b of bugs) insertBug.run(b);

// ── Comments ──────────────────────────────────────────────────────────────────
const insertComment = db.prepare(`
  INSERT OR IGNORE INTO comments (bug_id, user_id, content)
  VALUES (@bug_id, @user_id, @content)
`);

// Fetch bug IDs in insertion order
const bugRows = db.prepare('SELECT id FROM bugs ORDER BY id').all() as { id: number }[];
const [b1, b2, b3, b4, b8, b9, b10, b15, b16, b17, b19, b20, b21, b22] =
  [bugRows[0], bugRows[1], bugRows[2], bugRows[3],
   bugRows[7], bugRows[8], bugRows[9], bugRows[14],
   bugRows[15], bugRows[16], bugRows[18], bugRows[19],
   bugRows[20], bugRows[21]];

const comments = [
  { bug_id: b1.id,  user_id: bob.id,   content: 'Reproduced on Safari 17.2. Likely a CSP issue with inline scripts.' },
  { bug_id: b1.id,  user_id: dave.id,  content: 'Confirmed. Also happens on Safari 17.1.' },
  { bug_id: b1.id,  user_id: alice.id, content: 'Marking as blocker — this affects all Mac users.' },
  { bug_id: b2.id,  user_id: carol.id, content: 'The S3 presigned URL is expiring before the upload completes.' },
  { bug_id: b2.id,  user_id: eva.id,   content: 'Increasing timeout to 5 minutes on the presign call might fix it.' },
  { bug_id: b3.id,  user_id: carol.id, content: 'Will store preference in localStorage instead of session.' },
  { bug_id: b4.id,  user_id: bob.id,   content: 'Fixed by deduplicating on the Elasticsearch query side.' },
  { bug_id: b8.id,  user_id: carol.id, content: 'Reproduced on Pixel 8. The WorkManager job is blocking the main thread.' },
  { bug_id: b8.id,  user_id: dave.id,  content: 'Also freezes on Samsung Galaxy S24 running Android 14.' },
  { bug_id: b9.id,  user_id: bob.id,   content: 'APNs certificate expired on 2024-01-15. Renewing now.' },
  { bug_id: b9.id,  user_id: alice.id, content: 'This is P0 for iOS users. Expedite the fix.' },
  { bug_id: b10.id, user_id: carol.id, content: 'Need to add ETag/Last-Modified headers and check them on reconnect.' },
  { bug_id: b15.id, user_id: alice.id, content: 'The Redis TTL key is never deleted after the window expires.' },
  { bug_id: b16.id, user_id: carol.id, content: 'Added exp claim validation to the middleware — PR open for review.' },
  { bug_id: b17.id, user_id: dave.id,  content: 'Fixed — added Vary: Origin and correct OPTIONS handler.' },
];

for (const c of comments) insertComment.run(c);

console.log('Seed complete:');
console.log(`  ${users.length} users`);
console.log(`  ${projects.length} projects`);
console.log(`  ${bugs.length} bugs`);
console.log(`  ${comments.length} comments`);
