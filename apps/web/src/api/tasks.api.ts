import { TaskStatus, TaskPriority } from '@corp/shared-types';
import type { Task as TaskBase } from '@corp/shared-types';
import { apiClient } from './client';

export { TaskStatus, TaskPriority };

export interface UserRef {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
}

export interface Task extends Omit<TaskBase, 'watchers'> {
  createdByUser?: UserRef;
  assignedToUser?: UserRef | null;
  watchers?: UserRef[];
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  chatId?: string;
}

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: UserRef;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  organizationId: string;
  chatId?: string;
  assignedTo?: string;
  dueDate?: string;
  watcherIds?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assignedTo?: string | null;
  dueDate?: string | null;
  watcherIds?: string[];
}

export interface TaskListResponse {
  items: Task[];
  total: number;
}

export interface MyTasksResponse {
  assigned: Task[];
  created: Task[];
  watching: Task[];
}

export function getTasks(orgId: string, filters?: TaskFilters): Promise<Task[]> {
  return apiClient
    .get<TaskListResponse>('/tasks', { params: { orgId, ...filters } })
    .then((r) => (r.data as unknown as TaskListResponse).items);
}

export function getMyTasks(orgId: string): Promise<MyTasksResponse> {
  return apiClient.get('/tasks/my', { params: { orgId } }).then((r) => r.data);
}

export function getTask(id: string): Promise<Task> {
  return apiClient.get(`/tasks/${id}`).then((r) => r.data);
}

export function createTask(input: CreateTaskInput): Promise<Task> {
  return apiClient.post('/tasks', input).then((r) => r.data);
}

export function updateTask(id: string, input: UpdateTaskInput): Promise<Task> {
  return apiClient.patch(`/tasks/${id}`, input).then((r) => r.data);
}

export function deleteTask(id: string): Promise<void> {
  return apiClient.delete(`/tasks/${id}`).then((r) => r.data);
}

export function assignTask(id: string, assignedTo: string | null): Promise<Task> {
  return apiClient.patch(`/tasks/${id}/assign`, { assignedTo }).then((r) => r.data);
}

export function addComment(taskId: string, content: string): Promise<TaskComment> {
  return apiClient.post(`/tasks/${taskId}/comments`, { content }).then((r) => r.data);
}

export function getComments(taskId: string): Promise<TaskComment[]> {
  return apiClient.get(`/tasks/${taskId}/comments`).then((r) => r.data);
}

// ─── Checklists ──────────────────────────────────────────────────────────────

export interface ChecklistItem {
  id: string;
  taskId: string;
  title: string;
  isDone: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export function getChecklist(taskId: string): Promise<ChecklistItem[]> {
  return apiClient.get(`/tasks/${taskId}/checklist`).then((r) => r.data);
}

export function addChecklistItem(taskId: string, title: string): Promise<ChecklistItem> {
  return apiClient.post(`/tasks/${taskId}/checklist`, { title }).then((r) => r.data);
}

export function updateChecklistItem(
  itemId: string,
  patch: { title?: string; isDone?: boolean; position?: number },
): Promise<ChecklistItem> {
  return apiClient.patch(`/tasks/checklist/${itemId}`, patch).then((r) => r.data);
}

export function removeChecklistItem(itemId: string): Promise<void> {
  return apiClient.delete(`/tasks/checklist/${itemId}`).then((r) => r.data);
}

// ─── Attachments ─────────────────────────────────────────────────────────────

export interface TaskAttachment {
  id: string;
  organizationId: string;
  uploaderId: string;
  taskId: string | null;
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  thumbnailKey?: string | null;
  createdAt: string;
}

export function getAttachments(taskId: string): Promise<TaskAttachment[]> {
  return apiClient.get(`/tasks/${taskId}/files`).then((r) => r.data);
}

export function attachFile(taskId: string, fileId: string): Promise<TaskAttachment> {
  return apiClient.post(`/tasks/${taskId}/files`, { fileId }).then((r) => r.data);
}

export function detachFile(taskId: string, fileId: string): Promise<void> {
  return apiClient.delete(`/tasks/${taskId}/files/${fileId}`).then((r) => r.data);
}
