import type {
  Bug, Project, User, Comment,
  BugFilters, CreateBugData, UpdateBugData, AddCommentData,
  CreateProjectData, UpdateProjectData,
  CreateUserData, UpdateUserData,
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
