export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'developer' | 'tester';
  created_at: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

export interface BugCommit {
  id: number;
  bug_id: number;
  commit_sha: string;
  message: string;
  author: string;
  committed_at: string;
  url: string;
  branch: string;
}

export interface BugImage {
  id: number;
  bug_id: number;
  data_url: string;
  created_at: string;
}

export interface Bug {
  id: number;
  project_id: number;
  title: string;
  description: string;
  type: 'bug' | 'task';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity: 'minor' | 'major' | 'critical' | 'blocker';
  reporter_id: number;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
  images?: BugImage[];
  // Aggregated counts (from GET /bugs list)
  link_count?: number;
  comment_count?: number;
  assignee_name?: string | null;
  // AI assessment fields
  ai_explanation?: string | null;
  ai_suggested_priority?: Bug['priority'] | null;
  ai_suggested_severity?: Bug['severity'] | null;
  ai_assessed_at?: string | null;
  ai_tokens_in?: number | null;
  ai_tokens_out?: number | null;
}

export interface AiUsageLog {
  id: number;
  bug_id: number;
  bug_title?: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  created_at: string;
}

export interface AiUsageSummary {
  total_tokens_in: number;
  total_tokens_out: number;
  total_calls: number;
  log: AiUsageLog[];
}

export interface LinkedItem {
  id: number;
  bug_id: number;
  title: string;
  status: Bug['status'];
  type: Bug['type'];
  priority: Bug['priority'];
}

export interface ProjectMember {
  id: number;
  name: string;
  email: string;
  role: User['role'];
  joined_at: string;
}

export interface Comment {
  id: number;
  bug_id: number;
  user_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export interface AiPortfolioRun {
  id: number;
  run_at: string;
  model: string;
  tokens_in: number;
  tokens_out: number;
  item_count: number;
}

export interface AiPortfolioResult {
  id: number;
  run_id: number;
  bug_id: number;
  bug_title: string;
  bug_status: string;
  rank: number;
  suggested_priority: Bug['priority'];
  suggested_severity: Bug['severity'];
  current_priority: Bug['priority'];
  current_severity: Bug['severity'];
  rationale: string;
}

export interface AiPortfolioAssessment {
  run: AiPortfolioRun | null;
  results: AiPortfolioResult[];
}

export interface BugFilters {
  status?: string;
  priority?: string;
  severity?: string;
  type?: string;
  project_id?: number;
  assignee_id?: number;
}

export interface CreateBugData {
  project_id: number;
  title: string;
  description?: string;
  type?: Bug['type'];
  priority?: Bug['priority'];
  severity?: Bug['severity'];
  reporter_id: number;
  assignee_id?: number | null;
  images?: string[];
}

export interface UpdateBugData {
  title?: string;
  description?: string;
  type?: Bug['type'];
  status?: Bug['status'];
  priority?: Bug['priority'];
  severity?: Bug['severity'];
  assignee_id?: number | null;
  images?: string[];
}

export interface AddCommentData {
  user_id: number;
  content: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  role: User['role'];
  password?: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: User['role'];
}
