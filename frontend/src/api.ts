import type {
  Bug, Project, User, Comment, BugCommit, LinkedItem, ProjectMember,
  BugFilters, CreateBugData, UpdateBugData, AddCommentData,
  CreateProjectData, UpdateProjectData,
  CreateUserData, UpdateUserData,
  AiUsageLog, AiUsageSummary,
  AiPortfolioAssessment,
  BugPortfolioAssessment,
  IntegrationProfile,
} from './types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    ...options,
  });
  if (res.status === 401) {
    window.location.href = '/login';
    return undefined as T;
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// Bugs
export function getBugs(filters?: BugFilters): Promise<Bug[]> {
  const params = new URLSearchParams();
  if (filters?.status)     params.set('status', filters.status);
  if (filters?.type)       params.set('type', filters.type);
  if (filters?.priority)   params.set('priority', filters.priority);
  if (filters?.severity)   params.set('severity', filters.severity);
  if (filters?.project_id) params.set('project_id', String(filters.project_id));
  if (filters?.assignee_id) params.set('assignee_id', String(filters.assignee_id));
  const qs = params.toString();
  return request<Bug[]>(`/bugs${qs ? `?${qs}` : ''}`);
}

export function getBug(id: number): Promise<Bug> {
  return request<Bug>(`/bugs/${id}`);
}

export function createBug(data: CreateBugData): Promise<Bug> {
  return request<Bug>('/bugs', { method: 'POST', body: JSON.stringify(data) });
}

export function updateBug(id: number, data: UpdateBugData): Promise<Bug> {
  return request<Bug>(`/bugs/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteBug(id: number): Promise<void> {
  return request<void>(`/bugs/${id}`, { method: 'DELETE' });
}

// Projects
export function getProjects(): Promise<Project[]> {
  return request<Project[]>('/projects');
}

export function createProject(data: CreateProjectData): Promise<Project> {
  return request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) });
}

export function updateProject(id: number, data: UpdateProjectData): Promise<Project> {
  return request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteProject(id: number): Promise<void> {
  return request<void>(`/projects/${id}`, { method: 'DELETE' });
}

// Users
export function getUsers(): Promise<User[]> {
  return request<User[]>('/users').then((users) => users.filter((u) => u.email !== 'deleted@system'));
}

export function createUser(data: CreateUserData): Promise<User> {
  return request<User>('/users', { method: 'POST', body: JSON.stringify(data) });
}

export function updateUser(id: number, data: UpdateUserData): Promise<User> {
  return request<User>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export function deleteUser(id: number): Promise<void> {
  return request<void>(`/users/${id}`, { method: 'DELETE' });
}

// Project Members
export function getProjectMembers(projectId: number): Promise<ProjectMember[]> {
  return request<ProjectMember[]>(`/projects/${projectId}/members`);
}

export function addProjectMember(projectId: number, userId: number): Promise<ProjectMember[]> {
  return request<ProjectMember[]>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  });
}

export function removeProjectMember(projectId: number, userId: number): Promise<void> {
  return request<void>(`/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
}

// Commits
export function getCommits(bugId: number): Promise<BugCommit[]> {
  return request<BugCommit[]>(`/bugs/${bugId}/commits`);
}

export function syncCommits(): Promise<void> {
  return request<void>('/gitlab/sync', { method: 'POST' });
}

// Comments
export function getComments(bugId: number): Promise<Comment[]> {
  return request<Comment[]>(`/bugs/${bugId}/comments`);
}

export function addComment(bugId: number, data: AddCommentData): Promise<Comment> {
  return request<Comment>(`/bugs/${bugId}/comments`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// AI Assessment
export function aiAssess(bugId: number): Promise<Bug> {
  return request<Bug>(`/bugs/${bugId}/ai-assess`, { method: 'POST' });
}

export function getAiHistory(bugId: number): Promise<AiUsageLog[]> {
  return request<AiUsageLog[]>(`/bugs/${bugId}/ai-assess/history`);
}

export function getAiUsage(): Promise<AiUsageSummary> {
  return request<AiUsageSummary>('/ai-usage');
}

// AI Portfolio Assessment
export function runPortfolioAssess(): Promise<AiPortfolioAssessment> {
  return request<AiPortfolioAssessment>('/ai-portfolio-assess', { method: 'POST' });
}

export function getLatestPortfolioAssess(): Promise<AiPortfolioAssessment> {
  return request<AiPortfolioAssessment>('/ai-portfolio-assess/latest');
}

export function applyPortfolioAssess(bugIds?: number[]): Promise<{ applied: number[] }> {
  return request<{ applied: number[] }>('/ai-portfolio-assess/apply', {
    method: 'POST',
    body: bugIds ? JSON.stringify({ bug_ids: bugIds }) : JSON.stringify({}),
  });
}

// Links
export function getLinks(bugId: number): Promise<LinkedItem[]> {
  return request<LinkedItem[]>(`/bugs/${bugId}/links`);
}

export function addLink(bugId: number, linkedBugId: number): Promise<LinkedItem[]> {
  return request<LinkedItem[]>(`/bugs/${bugId}/links`, {
    method: 'POST',
    body: JSON.stringify({ linked_bug_id: linkedBugId }),
  });
}

export function removeLink(bugId: number, linkedBugId: number): Promise<void> {
  return request<void>(`/bugs/${bugId}/links/${linkedBugId}`, { method: 'DELETE' });
}

// Bug Portfolio Assessment
export function getBugPortfolioAssessment(bugId: number): Promise<BugPortfolioAssessment | null> {
  return request<BugPortfolioAssessment | null>(`/bugs/${bugId}/portfolio-assessment`);
}

// Integration profiles
export function getIntegrations(): Promise<IntegrationProfile[]> {
  return request<IntegrationProfile[]>('/integrations');
}

export function createIntegration(data: { name: string; platform: string; base_url: string; repo: string; access_token: string }): Promise<IntegrationProfile> {
  return request<IntegrationProfile>('/integrations', { method: 'POST', body: JSON.stringify(data) });
}

export function updateIntegration(id: number, data: { name?: string; platform?: string; base_url?: string; repo?: string; access_token?: string }): Promise<IntegrationProfile> {
  return request<IntegrationProfile>(`/integrations/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
}

// Returns ok:true on success, or ok:false with error + optional projects list on 409
export async function deleteIntegration(id: number): Promise<{ ok: true } | { ok: false; error: string; projects?: { id: number; name: string }[] }> {
  const res = await fetch(`${BASE}/integrations/${id}`, { method: 'DELETE', credentials: 'include' });
  if (res.status === 204) return { ok: true };
  const data = await res.json();
  return { ok: false, error: data.error ?? `HTTP ${res.status}`, projects: data.projects };
}
