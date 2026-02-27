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

export interface Bug {
  id: number;
  project_id: number;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  severity: 'minor' | 'major' | 'critical' | 'blocker';
  reporter_id: number;
  assignee_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: number;
  bug_id: number;
  user_id: number;
  author_name: string;
  content: string;
  created_at: string;
}

export interface BugFilters {
  status?: string;
  priority?: string;
  severity?: string;
  project_id?: number;
  assignee_id?: number;
}

export interface CreateBugData {
  project_id: number;
  title: string;
  description?: string;
  priority?: Bug['priority'];
  severity?: Bug['severity'];
  reporter_id: number;
  assignee_id?: number | null;
}

export interface UpdateBugData {
  title?: string;
  description?: string;
  status?: Bug['status'];
  priority?: Bug['priority'];
  severity?: Bug['severity'];
  assignee_id?: number | null;
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
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  role?: User['role'];
}
