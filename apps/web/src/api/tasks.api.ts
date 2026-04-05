import { apiClient } from './client';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: string;
  assigneeName?: string;
  assigneeAvatar?: string;
  organizationId: string;
  dueDate?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  assignedTo?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: string;
}

export function getTasks(orgId: string, filters?: TaskFilters): Promise<Task[]> {
  return apiClient.get(`/organizations/${orgId}/tasks`, { params: filters }).then((r) => r.data);
}

export function getMyTasks(orgId: string): Promise<Task[]> {
  return apiClient.get(`/organizations/${orgId}/tasks/my`).then((r) => r.data);
}

export function getTask(id: string): Promise<Task> {
  return apiClient.get(`/tasks/${id}`).then((r) => r.data);
}

export function createTask(data: Partial<Task>): Promise<Task> {
  return apiClient.post('/tasks', data).then((r) => r.data);
}

export function updateTask(id: string, data: Partial<Task>): Promise<Task> {
  return apiClient.patch(`/tasks/${id}`, data).then((r) => r.data);
}

export function deleteTask(id: string): Promise<void> {
  return apiClient.delete(`/tasks/${id}`).then((r) => r.data);
}

export function assignTask(id: string, assignedTo: string): Promise<Task> {
  return apiClient.patch(`/tasks/${id}/assign`, { assignedTo }).then((r) => r.data);
}

export function addComment(taskId: string, content: string): Promise<TaskComment> {
  return apiClient.post(`/tasks/${taskId}/comments`, { content }).then((r) => r.data);
}

export function getComments(taskId: string): Promise<TaskComment[]> {
  return apiClient.get(`/tasks/${taskId}/comments`).then((r) => r.data);
}
